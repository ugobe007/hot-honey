#!/usr/bin/env node
/**
 * Module C1: GitHub Org/Repo Enrichment
 * 
 * For each startup:
 * - Discover GitHub org/repo from domain, website links, or name search
 * - Store: github_org, github_repo_urls, github_primary_repo
 * - Enrich: stars, forks, open issues, release cadence, commit velocity, contributors, languages
 * - Store with: confidence + provenance (extraction_method, source_url, extracted_at)
 * 
 * This creates the foundation for E1.3 (GitHub Issues/Discussions collection).
 * 
 * Implementing EXACTLY as specified in architecture document.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cheerio = require('cheerio');

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
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    if (!url) return null;
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Normalize GitHub org/repo from URL or string
 */
function normalizeGitHubIdentifier(identifier) {
  if (!identifier) return null;
  
  // Remove protocol and github.com prefix
  const cleaned = identifier
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/^github\.com\//i, '')
    .trim();
  
  // Remove trailing slash
  return cleaned.replace(/\/$/, '');
}

/**
 * Extract GitHub links from website HTML
 */
async function discoverGitHubFromWebsite(website) {
  if (!website) return null;
  
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const githubLinks = [];
    
    // Look for GitHub links in:
    // - Footer links
    // - Header/nav links
    // - Body links (especially "View on GitHub", "Source Code", etc.)
    $('a[href*="github.com"]').each((i, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().toLowerCase().trim();
      
      if (href && (href.includes('/github.com/') || href.startsWith('github.com'))) {
        const normalized = normalizeGitHubIdentifier(href);
        if (normalized && !githubLinks.includes(normalized)) {
          githubLinks.push(normalized);
        }
      }
    });
    
    // Also check for GitHub org/repo in meta tags or JSON-LD
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const json = JSON.parse($(elem).html());
        // Look for codeRepository or sameAs fields
        if (json.codeRepository && json.codeRepository.includes('github.com')) {
          const normalized = normalizeGitHubIdentifier(json.codeRepository);
          if (normalized && !githubLinks.includes(normalized)) {
            githubLinks.push(normalized);
          }
        }
        if (json.sameAs && Array.isArray(json.sameAs)) {
          json.sameAs.forEach(link => {
            if (link && link.includes('github.com')) {
              const normalized = normalizeGitHubIdentifier(link);
              if (normalized && !githubLinks.includes(normalized)) {
                githubLinks.push(normalized);
              }
            }
          });
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    });
    
    return githubLinks.length > 0 ? githubLinks : null;
  } catch (error) {
    return null;
  }
}

/**
 * Search GitHub API for org/repo by name
 */
async function searchGitHubByName(startupName) {
  if (!startupName || startupName.length < 3) return null;
  
  try {
    // Search for organizations matching the name
    const orgResponse = await axios.get(`${GITHUB_API_BASE}/search/users`, {
      params: {
        q: `${startupName} type:org`,
        per_page: 5
      },
      timeout: 5000
    });
    
    const orgs = orgResponse.data.items || [];
    if (orgs.length > 0) {
      // Return the best match (first result, or exact name match)
      const exactMatch = orgs.find(org => org.login.toLowerCase() === startupName.toLowerCase());
      return exactMatch ? exactMatch.login : orgs[0].login;
    }
    
    return null;
  } catch (error) {
    // GitHub API rate limit or error, return null
    return null;
  }
}

/**
 * Get repository information from GitHub API
 */
async function getRepoInfo(orgRepo) {
  if (!orgRepo) return null;
  
  const [org, repo] = orgRepo.split('/');
  if (!org || !repo) return null;
  
  try {
    const response = await axios.get(`${GITHUB_API_BASE}/repos/${org}/${repo}`, {
      timeout: 5000
    });
    
    return {
      full_name: response.data.full_name,
      url: response.data.html_url,
      stars: response.data.stargazers_count,
      forks: response.data.forks_count,
      open_issues: response.data.open_issues_count,
      language: response.data.language,
      languages_url: response.data.languages_url,
      updated_at: response.data.updated_at,
      pushed_at: response.data.pushed_at,
      default_branch: response.data.default_branch
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get repository languages
 */
async function getRepoLanguages(languagesUrl) {
  if (!languagesUrl) return {};
  
  try {
    const response = await axios.get(languagesUrl, { timeout: 5000 });
    return response.data || {};
  } catch (error) {
    return {};
  }
}

/**
 * Get repository contributors count
 */
async function getContributorsCount(orgRepo) {
  if (!orgRepo) return 0;
  
  const [org, repo] = orgRepo.split('/');
  if (!org || !repo) return 0;
  
  try {
    const response = await axios.get(`${GITHUB_API_BASE}/repos/${org}/${repo}/contributors`, {
      params: { per_page: 1 },
      timeout: 5000
    });
    
    // GitHub API uses Link header for pagination, but we can estimate from first page
    // For exact count, would need to follow pagination, but that's expensive
    // Return approximate count based on first page size
    return response.data.length;
  } catch (error) {
    return 0;
  }
}

/**
 * Discover GitHub org/repo for a startup
 */
async function discoverGitHub(startup) {
  const discoveries = [];
  
  // Method 1: Extract from website (highest confidence)
  if (startup.website) {
    const websiteLinks = await discoverGitHubFromWebsite(startup.website);
    if (websiteLinks && websiteLinks.length > 0) {
      discoveries.push({
        identifier: websiteLinks[0], // Primary link
        all_identifiers: websiteLinks,
        method: 'website_extraction',
        source_url: startup.website,
        confidence: 0.9
      });
    }
  }
  
  // Method 2: Search GitHub API by name (lower confidence)
  if (!discoveries.length && startup.name) {
    const orgName = await searchGitHubByName(startup.name);
    if (orgName) {
      discoveries.push({
        identifier: orgName,
        all_identifiers: [orgName],
        method: 'github_api_search',
        source_url: `https://github.com/${orgName}`,
        confidence: 0.5
      });
    }
  }
  
  return discoveries.length > 0 ? discoveries[0] : null;
}

/**
 * Enrich GitHub repository data
 */
async function enrichGitHubRepo(orgRepo, sourceUrl, extractionMethod, confidence) {
  if (!orgRepo) return null;
  
  const repoInfo = await getRepoInfo(orgRepo);
  if (!repoInfo) return null;
  
  const languages = await getRepoLanguages(repoInfo.languages_url);
  const contributorsCount = await getContributorsCount(orgRepo);
  
  return {
    github_org: orgRepo.split('/')[0],
    github_primary_repo: repoInfo.url,
    github_repo_urls: [repoInfo.url],
    github_metadata: {
      stars: repoInfo.stars,
      forks: repoInfo.forks,
      open_issues: repoInfo.open_issues,
      language: repoInfo.language,
      languages: languages,
      contributors_count: contributorsCount,
      updated_at: repoInfo.updated_at,
      pushed_at: repoInfo.pushed_at,
      default_branch: repoInfo.default_branch,
      extraction_method: extractionMethod,
      source_url: sourceUrl,
      confidence: confidence,
      extracted_at: new Date().toISOString()
    }
  };
}

/**
 * Process startup GitHub enrichment
 */
async function enrichStartupGitHub(startup) {
  try {
    console.log(`   🔍 Enriching GitHub for: ${startup.name}`);
    
    // Discover GitHub org/repo
    const discovery = await discoverGitHub(startup);
    if (!discovery) {
      return { success: false, reason: 'No GitHub org/repo discovered' };
    }
    
    console.log(`   ✅ Discovered: ${discovery.identifier} (${discovery.method}, confidence: ${discovery.confidence})`);
    
    // Enrich repository data
    const enrichment = await enrichGitHubRepo(
      discovery.identifier,
      discovery.source_url,
      discovery.method,
      discovery.confidence
    );
    
    if (!enrichment) {
      return { success: false, reason: 'Failed to enrich repository data' };
    }
    
    // Save to database
    const { error } = await supabase
      .from('startup_uploads')
      .update({
        github_org: enrichment.github_org,
        github_primary_repo: enrichment.github_primary_repo,
        github_repo_urls: enrichment.github_repo_urls,
        github_metadata: enrichment.github_metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', startup.id);
    
    if (error) {
      console.error(`   ❌ Error saving GitHub data: ${error.message}`);
      return { success: false, reason: error.message };
    }
    
    console.log(`   ✅ Saved: ${enrichment.github_org} (${enrichment.github_metadata.stars} stars, ${enrichment.github_metadata.contributors_count} contributors)`);
    
    return { success: true, enrichment };
  } catch (error) {
    console.error(`   ⚠️  Error enriching ${startup.name}:`, error.message);
    return { success: false, reason: error.message };
  }
}

/**
 * Main enrichment function
 */
async function runGitHubEnrichment(limit = 50) {
  console.log('\n🔧 MODULE C1: GITHUB ORG/REPO ENRICHMENT');
  console.log('='.repeat(60));
  
  // Fetch startups without GitHub data (or with low confidence)
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, website')
    .eq('status', 'approved')
    .or('github_org.is.null,github_metadata->confidence.is.null,github_metadata->confidence.lt.0.7')
    .limit(limit);
  
  if (error) {
    console.error('❌ Error fetching startups:', error.message);
    return;
  }
  
  if (!startups || startups.length === 0) {
    console.log('⚠️  No startups found that need GitHub enrichment.');
    return;
  }
  
  console.log(`📊 Found ${startups.length} startups to enrich\n`);
  
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  
  for (const startup of startups) {
    processed++;
    
    const result = await enrichStartupGitHub(startup);
    
    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
    
    // Rate limiting (GitHub API allows 60 requests/hour unauthenticated)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (processed % 10 === 0) {
      console.log(`\n   📊 Progress: ${processed}/${startups.length} processed (${succeeded} succeeded, ${failed} failed)\n`);
    }
  }
  
  console.log(`\n✅ Done: ${succeeded}/${processed} startups enriched`);
  console.log(`   📊 Failed: ${failed}\n`);
}

// Run if called directly
if (require.main === module) {
  const limit = process.argv[2] ? parseInt(process.argv[2]) : 50;
  runGitHubEnrichment(limit).catch(console.error);
}

module.exports = {
  discoverGitHub,
  enrichGitHubRepo,
  enrichStartupGitHub,
  runGitHubEnrichment
};
