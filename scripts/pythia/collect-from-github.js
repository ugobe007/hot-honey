#!/usr/bin/env node
/**
 * E1.3: GitHub Issues/Discussions Collector
 * 
 * Collects founder/team speech from GitHub Issues and Discussions (Tier 1 - "earned" speech)
 * 
 * Uses stored GitHub data from Module C1:
 * - github_primary_repo (exact repo URL)
 * - github_repo_urls (all repos)
 * - github_org (org context)
 * 
 * Collects:
 * - Issue comments by repo owners/contributors (Tier 1)
 * - Discussion posts/comments (Tier 1)
 * - Founder/team replies in issues (Tier 1)
 * 
 * Implementing EXACTLY as specified in architecture document.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// GitHub API base URL (no auth required for public repos)
const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Generate hash for deduplication
 */
function hashText(text) {
  return crypto.createHash('md5').update(text.trim().toLowerCase()).digest('hex');
}

/**
 * Extract org/repo from GitHub URL
 */
function extractOrgRepo(githubUrl) {
  if (!githubUrl) return null;
  
  try {
    const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
    if (match && match[1] && match[2]) {
      return `${match[1]}/${match[2].replace(/\.git$/, '')}`;
    }
  } catch (e) {
    // Invalid URL
  }
  
  return null;
}

/**
 * Check if comment is from repo owner/contributor (founder/team)
 */
function isTeamMember(comment, orgRepo) {
  if (!comment || !orgRepo) return false;
  
  const [org] = orgRepo.split('/');
  const author = comment.user?.login || comment.author?.login;
  
  // Author is the org owner (high confidence it's team)
  if (author && author.toLowerCase() === org.toLowerCase()) {
    return true;
  }
  
  // Author is a collaborator (check association)
  const association = comment.author_association;
  return association === 'OWNER' || association === 'MEMBER' || association === 'COLLABORATOR';
}

/**
 * Check if text looks like founder/team speech
 */
function hasFounderSpeech(text) {
  if (!text || text.length < 100) return false;
  
  const textLower = text.toLowerCase();
  
  // Founder/team speech indicators
  const founderPatterns = [
    /\b(we|i|our team|our company|we built|we're building|we've built|we ship|we deployed)\b/i,
    /\b(founder|cofounder|co-founder|ceo|cto|i founded|we started)\b/i,
    /\b(our product|our service|our platform|our startup)\b/i
  ];
  
  return founderPatterns.some(pattern => pattern.test(text));
}

/**
 * Clean GitHub markdown/HTML from text
 */
function cleanGitHubText(text) {
  if (!text) return '';
  
  return text
    .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]+`/g, '') // Remove inline code
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Convert markdown links to text
    .replace(/[#*_~]/g, '') // Remove markdown formatting
    .replace(/\n{3,}/g, '\n\n') // Normalize newlines
    .trim();
}

/**
 * Fetch issues for a repository
 */
async function fetchIssues(orgRepo, limit = 50) {
  if (!orgRepo) return [];
  
  try {
    const response = await axios.get(`${GITHUB_API_BASE}/repos/${orgRepo}/issues`, {
      params: {
        state: 'all', // open + closed
        sort: 'updated',
        direction: 'desc',
        per_page: Math.min(limit, 100)
      },
      timeout: 10000
    });
    
    // Filter out pull requests (they have pull_request field)
    return (response.data || []).filter(issue => !issue.pull_request);
  } catch (error) {
    if (error.response?.status === 404) {
      // Repo not found or private
      return [];
    }
    console.error(`   ⚠️  Error fetching issues for ${orgRepo}:`, error.message);
    return [];
  }
}

/**
 * Fetch comments for an issue
 */
async function fetchIssueComments(orgRepo, issueNumber) {
  if (!orgRepo || !issueNumber) return [];
  
  try {
    const response = await axios.get(`${GITHUB_API_BASE}/repos/${orgRepo}/issues/${issueNumber}/comments`, {
      params: {
        per_page: 100
      },
      timeout: 10000
    });
    
    return response.data || [];
  } catch (error) {
    return [];
  }
}

/**
 * Fetch discussions for a repository (if enabled)
 */
async function fetchDiscussions(orgRepo, limit = 50) {
  if (!orgRepo) return [];
  
  try {
    // Discussions API is GraphQL only, but we can try REST API for discussions
    // Note: Discussions might not be available via REST API for all repos
    // For now, we'll focus on Issues which are more widely available
    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Extract snippets from GitHub issues and comments
 */
async function extractSnippetsFromRepo(orgRepo, repoUrl, startupId) {
  const snippets = [];
  
  // Fetch issues
  const issues = await fetchIssues(orgRepo, 30); // Last 30 issues
  
  for (const issue of issues) {
    // Check if issue body is founder/team speech
    if (issue.body && hasFounderSpeech(issue.body)) {
      const cleanBody = cleanGitHubText(issue.body);
      if (cleanBody.length >= 140) {
        snippets.push({
          text: cleanBody.substring(0, 2000),
          source_url: issue.html_url,
          date_published: issue.created_at,
          is_team_member: isTeamMember(issue, orgRepo),
          context: 'technical'
        });
      }
    }
    
    // Fetch and process comments
    const comments = await fetchIssueComments(orgRepo, issue.number);
    
    for (const comment of comments) {
      if (comment.body && isTeamMember(comment, orgRepo) && hasFounderSpeech(comment.body)) {
        const cleanBody = cleanGitHubText(comment.body);
        if (cleanBody.length >= 140) {
          snippets.push({
            text: cleanBody.substring(0, 2000),
            source_url: comment.html_url,
            date_published: comment.created_at,
            is_team_member: true,
            context: 'technical'
          });
        }
      }
    }
  }
  
  return snippets;
}

/**
 * Collect snippets from GitHub for a startup
 */
async function collectFromGitHub(startup) {
  if (!startup.github_primary_repo) {
    return { saved: 0, skipped: 0, error: 'No GitHub repo' };
  }
  
  try {
    const orgRepo = extractOrgRepo(startup.github_primary_repo);
    if (!orgRepo) {
      return { saved: 0, skipped: 0, error: 'Invalid GitHub URL' };
    }
    
    console.log(`   🔍 Collecting from: ${orgRepo}`);
    
    // Extract snippets
    const snippets = await extractSnippetsFromRepo(
      orgRepo,
      startup.github_primary_repo,
      startup.id
    );
    
    if (snippets.length === 0) {
      return { saved: 0, skipped: 0, error: 'No snippets found' };
    }
    
    console.log(`   📝 Found ${snippets.length} snippets from ${orgRepo}`);
    
    // Save snippets
    let saved = 0;
    let skipped = 0;
    
    for (const snippet of snippets) {
      const textHash = hashText(snippet.text);
      
      // Check for duplicates
      const { data: existing } = await supabase
        .from('pythia_speech_snippets')
        .select('id')
        .eq('text_hash', textHash)
        .eq('entity_id', startup.id)
        .maybeSingle();
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Save snippet (Tier 1 - "earned" speech from GitHub)
      const { error } = await supabase
        .from('pythia_speech_snippets')
        .insert({
          entity_id: startup.id,
          entity_type: 'startup',
          text: snippet.text,
          source_url: snippet.source_url,
          date_published: snippet.date_published ? new Date(snippet.date_published).toISOString() : null,
          source_type: 'forum_post', // GitHub issues/discussions are forum-like
          tier: 1, // Tier 1 - high confidence "earned" speech
          context_label: snippet.context,
          text_hash: textHash
        });
      
      if (error) {
        console.error(`   ❌ Error saving snippet: ${error.message}`);
        skipped++;
      } else {
        saved++;
      }
    }
    
    return { saved, skipped, error: null };
  } catch (error) {
    return { saved: 0, skipped: 0, error: error.message };
  }
}

/**
 * Main collection function
 */
async function collectFromGitHubRepos(limit = 50) {
  console.log('\n💻 E1.3: GITHUB ISSUES/DISCUSSIONS COLLECTION');
  console.log('='.repeat(60));
  
  // Fetch startups with GitHub repos (from Module C1)
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, github_primary_repo, github_org')
    .eq('status', 'approved')
    .not('github_primary_repo', 'is', null)
    .limit(limit);
  
  if (error) {
    console.error('❌ Error fetching startups:', error.message);
    return;
  }
  
  if (!startups || startups.length === 0) {
    console.log('⚠️  No startups with GitHub repos found. Run `npm run github:enrich` first.');
    return;
  }
  
  console.log(`📊 Found ${startups.length} startups with GitHub repos\n`);
  
  let totalSaved = 0;
  let totalSkipped = 0;
  let processed = 0;
  let withSnippets = 0;
  
  for (const startup of startups) {
    processed++;
    
    const result = await collectFromGitHub(startup);
    
    if (result.error && result.error !== 'No snippets found') {
      console.error(`   ⚠️  ${startup.name}: ${result.error}`);
    } else if (result.saved > 0) {
      withSnippets++;
      console.log(`   ✅ ${startup.name}: ${result.saved} snippets saved, ${result.skipped} skipped`);
    }
    
    totalSaved += result.saved;
    totalSkipped += result.skipped;
    
    // Rate limiting (GitHub API allows 60 requests/hour unauthenticated)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (processed % 10 === 0) {
      console.log(`\n   📊 Progress: ${processed}/${startups.length} processed (${withSnippets} with snippets, ${totalSaved} total snippets saved)\n`);
    }
  }
  
  console.log(`\n✅ Done: ${totalSaved} snippets saved, ${totalSkipped} skipped`);
  console.log(`   📊 ${withSnippets} startups had GitHub snippets\n`);
}

// Run if called directly
if (require.main === module) {
  const limit = process.argv[2] ? parseInt(process.argv[2]) : 50;
  collectFromGitHubRepos(limit).catch(console.error);
}

module.exports = { collectFromGitHub, collectFromGitHubRepos };
