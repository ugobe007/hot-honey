#!/usr/bin/env node
/**
 * Collect Pythia Snippets from Forum Posts (Hacker News, Reddit)
 * Tier 1/2 sources - Earned/hard-to-fake content (depending on source)
 *
 * Writes to table: pythia_speech_snippets (Supabase public schema)
 *
 * Uses:
 * - Hacker News Search API (Algolia, free public)
 * - (TODO) Reddit API
 *
 * Collects comments/posts where founders discuss their startups.
 *
 * Fixes in this version:
 * - ✅ Correct Algolia tag logic (no more tags="comment,story" intersection → 0 hits)
 * - ✅ Two-pass HN search (story + comment) with merge/dedupe
 * - ✅ Better name matching for common/short startup names
 * - ✅ Founder-likeness gate to reduce random chatter saved as "Tier 1"
 * - ✅ Better progress denominator (filteredStartups.length)
 * - ✅ Optional domain/url query support (if present in DB)
 * - ✅ More useful debug logs: hits vs kept vs reasons
 *
 * USAGE (with dedicated env file):
 *   DOTENV_CONFIG_PATH=.env.pyth node -r dotenv/config scripts/pythia/collect-from-forums.js 5
 */

console.log('🧠 forums collector file:', __filename);

// Load dotenv (supports DOTENV_CONFIG_PATH override)
require('dotenv').config();

// ═══════════════════════════════════════════════════════════════════════════
// HARD-FAIL ENV VALIDATION — Script dies immediately if misconfigured
// ═══════════════════════════════════════════════════════════════════════════
function need(name, fallbackNames = []) {
  // Check primary name first, then fallbacks
  let v = process.env[name];
  if (!v) {
    for (const fallback of fallbackNames) {
      v = process.env[fallback];
      if (v) break;
    }
  }
  if (!v) {
    console.error(`❌ FATAL: Missing env var: ${name}`);
    console.error(`   Checked: ${[name, ...fallbackNames].join(', ')}`);
    console.error(`   Hint: Run with DOTENV_CONFIG_PATH=.env.pyth node -r dotenv/config ...`);
    process.exit(1);
  }
  if (v.startsWith('your_') || v.startsWith('sb_secret_XXXX') || v === 'XXXXXXXXXXXX') {
    console.error(`❌ FATAL: Placeholder env var detected: ${name}`);
    console.error(`   Value starts with: ${v.slice(0, 20)}...`);
    console.error(`   Please replace with real credentials in .env.pyth`);
    process.exit(1);
  }
  return v;
}

// Debug flag (print exactly one HN request per run)
let _debugPrinted = false;
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');
const { isNonCompanyDomain } = require('./utils/domain-classifier');
const { sanitizeStartupName, looksLikeHeadline } = require('./utils/startup-name-sanitizer');

// ═══════════════════════════════════════════════════════════════════════════
// SUPABASE INITIALIZATION — Now with hard-fail validation
// ═══════════════════════════════════════════════════════════════════════════
const supabaseUrl = need('SUPABASE_URL', ['VITE_SUPABASE_URL']);
const supabaseKey = need('SUPABASE_SECRET_KEY', ['SUPABASE_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']);

const supabase = createClient(supabaseUrl, supabaseKey);

// Tripwire: Log which Supabase project we're writing to (safe to show URL, key prefix only)
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('🔌 PYTH Collector connecting to Supabase');
console.log('═══════════════════════════════════════════════════════════════');
console.log('   URL:', supabaseUrl);
console.log('   Key prefix:', String(supabaseKey).slice(0, 12) + '...');
console.log('   Key length:', String(supabaseKey).length, 'chars');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

/**
 * Generate hash for deduplication
 */
function hashText(text) {
  return crypto.createHash('md5').update(text.trim().toLowerCase()).digest('hex');
}

/**
 * Normalize company domain (reject news hosts)
 * Robust to bare domains (screenhance.com) and full URLs
 */
function normalizeCompanyDomain(input) {
  if (!input) return null;
  try {
    const u = new URL(input.startsWith('http') ? input : `https://${input}`);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    
    // Reject known news/publisher/aggregator hosts
    const nonCompanyHosts = new Set([
      'wellfound.com', 'angel.co', 'linkedin.com',
      'pulse2.com', 'tech.eu', 'rockhealth.com', 'techcrunch.com', 'venturebeat.com',
      'theinformation.com', 'crunchbase.com', 'pitchbook.com', 'cbinsights.com',
      'cointelegraph.com', 'fintechnews.org', 'arcticstartup.com', 'mattermark.com',
      'axios.com', 'finsmes.com'
    ]);
    
    if (nonCompanyHosts.has(host)) return null;
    return host;
  } catch {
    return null;
  }
}

/**
 * Clean HN text (remove HTML, normalize whitespace, normalize apostrophes)
 */
function cleanHNText(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'") // Normalize Unicode apostrophes (' ' ‛ ′) to straight apostrophe
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize domain (remove protocol, www, path)
 */
function normalizeDomain(domain) {
  if (!domain) return null;
  return domain
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, ''); // strip path
}

/**
 * Get the most recent source_created_at_i for a startup (for incremental collection)
 * @param {string} startupId - Startup UUID
 * @returns {Promise<number>} - Last created_at_i or 0 if none found
 */
async function getLastHNCreatedAtIForStartup(startupId) {
  try {
    // startupId MUST be a UUID string that matches pythia_speech_snippets.entity_id
    const { data, error } = await supabase
      .from('pythia_speech_snippets')
      .select('source_created_at_i')
      .eq('entity_type', 'startup')
      .eq('entity_id', startupId)
      .eq('source_type', 'forum_post')
      .in('tier', [1, 2])
      .not('source_item_id', 'is', null)
      .not('source_created_at_i', 'is', null)
      .order('source_created_at_i', { ascending: false })
      .limit(1);

    if (error) {
      console.warn(`   ⚠️  Error fetching last created_at_i: ${error.message}`);
      return 0;
    }

    const lastCreatedAtI = data?.[0]?.source_created_at_i ?? 0;
    
    // Debug log to diagnose cursor lookup (only log first few to avoid spam)
    if (Math.random() < 0.1) { // Log ~10% of calls for debugging
      console.log('🧭 Cursor lookup', {
        startupId: startupId?.substring(0, 8) + '...',
        hasUuidLike: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(startupId),
        gotRow: !!data?.[0],
        lastCreatedAtI,
      });
    }

    return lastCreatedAtI;
  } catch (e) {
    console.warn(`   ⚠️  Exception fetching last created_at_i: ${e.message}`);
    return 0;
  }
}

/**
 * Low-level HN search helper (supports both search and search_by_date)
 */
async function hnSearch({ query, tags, hitsPerPage = 50, minCreatedAtI = 0, endpoint = 'search_by_date' }) {
  const algoliaUrl = `https://hn.algolia.com/api/v1/${endpoint}`;
  const params = { query, tags, hitsPerPage: Math.min(hitsPerPage, 50) };

  const minCreatedAtISafe = minCreatedAtI > 0 ? Math.max(0, minCreatedAtI - 1) : 0;
  if (minCreatedAtISafe > 0) {
    params.numericFilters = `created_at_i>${minCreatedAtISafe}`;
  }

  if (!_debugPrinted) {
    const debugInfo = { ...params };
    if (minCreatedAtI > 0) {
      debugInfo._incremental = { minCreatedAtI, minCreatedAtISafe, numericFilters: params.numericFilters };
    }
    console.log('🧪 HN request:', algoliaUrl, debugInfo);
    _debugPrinted = true;
  }

  try {
    const res = await axios.get(algoliaUrl, { params, timeout: 10000 });
    return res.data?.hits || [];
  } catch (e) {
    return [];
  }
}

/**
 * Fetch HN comments for a specific story
 */
async function fetchHNCommentsForStory(storyId, minCreatedAtI = 0, limit = 80) {
  // Algolia doesn't have a perfect "all comments for story" endpoint,
  // but searching by story_id works well enough:
  const algoliaUrl = 'https://hn.algolia.com/api/v1/search_by_date';

  const numericFilters = [`story_id=${storyId}`];
  const minCreatedAtISafe = minCreatedAtI > 0 ? Math.max(0, minCreatedAtI - 1) : 0;
  if (minCreatedAtISafe > 0) {
    numericFilters.push(`created_at_i>${minCreatedAtISafe}`);
  }

  const params = {
    query: '',              // blank query
    tags: 'comment',
    hitsPerPage: Math.min(limit, 50),
    numericFilters: numericFilters.join(',')
  };

  // don't spam debug; keep your one-request policy
  try {
    const res = await axios.get(algoliaUrl, { params, timeout: 10000 });
    return res.data?.hits || [];
  } catch {
    return [];
  }
}

/**
 * Search Hacker News via Algolia API (comment + story cascade)
 * @param {string} query - Search query (startup name)
 * @param {string|null} domain - Optional domain for filtering
 * @param {number} limit - Max results
 * @param {boolean} useFounderKeywords - If true, add founder keywords to query
 * @param {number} minCreatedAtI - Minimum created_at_i (for incremental collection)
 */
async function searchHackerNews(query, domain, limit = 50, useFounderKeywords = false, minCreatedAtI = 0, metrics = null) {
  const dom = normalizeDomain(domain);
  const looksLikeDomain = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(query);

  const baseName = (query || '').trim();
  const qNameQuoted = looksLikeDomain ? baseName : `"${baseName}"`;
  const qNamePlain = looksLikeDomain ? baseName : baseName;

  // Build a small cascade (don't overquote everything)
  const q1 = useFounderKeywords
    ? `${qNamePlain} (founder OR cofounder OR "we built" OR "we're building" OR launched OR launching OR shipping OR demo OR beta OR hiring OR customers OR revenue OR ARR OR MRR)`
    : qNameQuoted;

  const q2 = (!useFounderKeywords && dom && !looksLikeDomain) ? `${qNamePlain} ${dom}` : null;
  const q3 = (dom && !useFounderKeywords) ? `${dom}` : null;

  // 1) comments first (best signal)
  const commentQueries = [q1, q2, q3].filter(Boolean);
  let hits = [];
  for (let idx = 0; idx < commentQueries.length; idx++) {
    const q = commentQueries[idx];
    const h = await hnSearch({
      query: q,
      tags: 'comment',
      hitsPerPage: Math.min(limit, 50),
      minCreatedAtI,
      endpoint: 'search_by_date'
    });
    hits.push(...h.map(x => ({ ...x, _type: 'comment' })));
    
    // Track query passes
    if (metrics) {
      if (useFounderKeywords) {
        metrics.commentQueryPasses.founderFallback++;
      } else {
        if (idx === 0) metrics.commentQueryPasses.q1++;
        else if (idx === 1) metrics.commentQueryPasses.q2++;
        else if (idx === 2) metrics.commentQueryPasses.q3++;
      }
    }
    
    if (hits.length >= limit) break;
  }

  // 2) story search (Show HN / Launch HN etc.) then expand to comments
  // Use "search" endpoint for stories (ranks better than by_date for titles)
  // and only do this if comment results are thin.
  if (hits.length < Math.min(10, limit)) {
    if (metrics) metrics.storyExpansionTriggered++;
    
    const storyQuery = dom ? `${qNamePlain} ${dom}` : qNamePlain;

    const storyHits = await hnSearch({
      query: storyQuery,
      tags: 'story',
      hitsPerPage: 20,
      minCreatedAtI: 0, // Stories don't support incremental well, so search all
      endpoint: 'search'
    });

    if (metrics) metrics.storyHitsTotal += storyHits.length;

    // Expand top stories to comments (cap so you don't explode runtime)
    for (const s of storyHits.slice(0, 5)) {
      const storyId = s.objectID || s.story_id || s.id;
      if (!storyId) continue;
      const storyComments = await fetchHNCommentsForStory(storyId, minCreatedAtI, 50);
      if (metrics) metrics.storyCommentsFetched += storyComments.length;
      hits.push(...storyComments.map(x => ({ ...x, _type: 'comment' })));
    }
  }

  // Dedupe by objectID
  const seen = new Set();
  const unique = [];
  for (const hit of hits) {
    if (!hit.objectID) continue;
    if (seen.has(hit.objectID)) continue;
    seen.add(hit.objectID);
    unique.push(hit);
  }

  return unique.slice(0, limit);
}

/**
 * Check if startup name is ambiguous (common word/phrase)
 */
function isAmbiguousName(name) {
  const n = (name || '').trim().toLowerCase();
  // short names are almost always ambiguous
  if (n.length <= 4) return true;

  // add more as you see them
  const common = new Set([
    'lawyered', 'good', 'cancelled', 'stablecoins', 'kinetic', 'getaway', 'supper'
  ]);

  // single-word names are more likely ambiguous
  const singleWord = !/\s/.test(n);
  return singleWord && (common.has(n) || n.length <= 7);
}

/**
 * Check if name is a dangerously generic single word (should skip unless domain is strong)
 */
function isDangerouslyGenericSingleWord(name) {
  const n = (name || '').trim().toLowerCase();

  // If it's 1 word and common English-ish, it's dangerous unless we have a good domain.
  const oneWord = n && !/\s/.test(n);
  if (!oneWord) return false;

  // super common junk collisions
  const generic = new Set([
    'people','person','american','denmark','equity','average','much','stem','venmo','battlefield',
    'report','today','news','article','tool','alerts','even','york','porting','gloo'
  ]);

  if (generic.has(n)) return true;

  // very short single words are high collision
  if (n.length <= 6) return true;

  return false;
}

/**
 * Check if text has company/startup context
 */
function hasCompanyContext(text) {
  return /\b(startup|company|product|platform|service|customers?|users?|pricing|demo|beta|launch(ed|ing)?|shipping|we built|we're building|API|SDK|integration|ARR|revenue|MRR|raise|funding|hiring)\b/i
    .test(text);
}

/**
 * Check if name looks like a company name (contains company hints)
 */
const COMPANY_HINT_RE = /\b(inc|llc|ltd|limited|corp|corporation|gmbh|s\.a\.|sa|plc|ag|bv|kg|oy|pte|srl|spa|co\.|company|group|holdings|technologies|technology|tech|software|systems|labs?|robotics|bio|biotech|pharma|engine|checkout|payments?|capital|ventures?|partners?|fund|studio|games|ai|cloud|security|defense|energy)\b/i;

function looksLikeCompanyName(name) {
  return COMPANY_HINT_RE.test(name || '');
}

/**
 * Check if name looks like a person name (First Last format)
 * High precision: requires common first name + no company hints
 */
const COMMON_FIRST_NAMES_RE = /\b(mark|john|mike|michael|david|chris|james|robert|dan|peter|paul|alex|sam|tom|ben|ryan|kevin|jason|andrew|nick|steve|scott|tim|eric|adam|brian|bryan|matt|matthew|josh|jose|juan|li|wei|chen|wang|kim|lee|pat|taylor|jordan|morgan)\b/i;

function looksLikePersonName(name) {
  const s = (name || '').trim();
  if (!s) return false;

  // If it looks like a company, do NOT treat as person.
  if (looksLikeCompanyName(s)) return false;

  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 3) return false;

  // All parts must be Capitalized words (no dots, no symbols)
  if (!parts.every(p => /^[A-Z][a-z]+$/.test(p))) return false;

  // Require at least one "common first name" to be safe
  if (!COMMON_FIRST_NAMES_RE.test(parts[0])) return false;

  return true;
}

/**
 * Check if text contains startup name signal
 */
function hasNameSignal(text, startupName) {
  if (!startupName || startupName.length < 3) return false;
  const nameLower = startupName.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match (case-insensitive)
  if (textLower.includes(nameLower)) return true;
  
  // Word boundary match for multi-word names
  const words = nameLower.split(/\s+/).filter(w => w.length > 2);
  if (words.length > 1) {
    // All significant words must appear
    return words.every(word => textLower.includes(word));
  }
  
  return false;
}

/**
 * Founder-likeness signals:
 * We accept first-person building/operating statements and explicit founder mentions.
 */
function hasFounderSignal(text) {
  return (
    /(?:^|[\s\.])(?:we|i|our|my|us)\b/i.test(text) &&
    /\b(built|building|shipped|launched|started|founded|run|running|grew|tested|learned|fixed|broke|deploy|deployed)\b/i.test(text)
  ) || /\b(founder|cofounder|co-founder|i founded|i started|we founded|we started)\b/i.test(text);
}

/**
 * Detect possessive founder-like language
 * Captures "my company", "our product", "using our...", "our customers", etc.
 */
function isPossessiveFounderLike(text) {
  // Phrases that are *often* founder-like when they include "my/our" + work nouns
  const possessiveWorkNouns =
    /\b(my|our)\s+(company|startup|product|platform|app|service|tool|project|team|api|sdk|repo|library|model|feature|release|launch|beta|demo|customers|users)\b/i;

  // Indirect possessive constructions: "with our new…", "using our…"
  const indirectPossessive =
    /\b(with|using|built|building|shipping|launched|launching|released|rolling out|open[- ]sourced|deploying)\s+our\s+\w+/i;

  // "Our" + traction nouns (very founder-y)
  const possessiveTraction =
    /\bour\s+(customers|users|revenue|arr|mrr|growth|pipeline|churn|retention|conversion|waitlist)\b/i;

  // Exclude common non-founder "my …" patterns
  const anti =
    /\b(my|our)\s+(opinion|thoughts|guess|question|problem|issue|take|view|understanding|experience)\b/i;

  const hit = (possessiveWorkNouns.test(text) || indirectPossessive.test(text) || possessiveTraction.test(text));
  const blocked = anti.test(text);

  return hit && !blocked;
}

/**
 * Detect company-name + action founder patterns
 * Captures "We built Lawyered...", "Lawyered is our...", etc.
 */
function isCompanyActionFounderLike(text, companyName) {
  if (!companyName) return false;
  const name = companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape regex
  const re = new RegExp(
    `\\b(we|i)\\s+(built|building|made|creating|launched|launching|shipped|shipping|started|found(ed|ing)|work(ed)? on)\\s+${name}\\b` +
    `|\\b${name}\\b\\s+(is|was)\\s+(my|our)\\s+(company|startup|product|project)\\b`,
    'i'
  );
  return re.test(text);
}

/**
 * Extract substantive comments from HN search results.
 * Restraint-first: keep only text that looks like "earned speech," not random chatter.
 */
function extractSubstantiveComments(hits, startupName, domain = null, debug = false) {
  const snippets = [];

  // Debug counters
  let tooShort = 0;
  let noSignal = 0;
  let tooManyUrls = 0;
  let tooLong = 0;
  let missingCommentText = 0;

  // Threshold constants
  const MIN_CHARS_DEFAULT = 180;   // non-founder comments
  const MIN_CHARS_FOUNDER = 80;    // founder claims can be shorter
  const MIN_CHARS_FOUNDER_WITH_DOMAIN = 60; // Lower when domainSignal is true

  // Debug probe counter for Lawyered (only show first 3 samples)
  let lawyeredProbeCount = 0;
  
  // Sanity check for story-comment fetch (first 3 or when debug and no snippets)
  let sanityCheckCount = 0;

  for (const hit of hits) {
    // Sanity check: verify story-comment fetch returns required fields (first 3)
    if (sanityCheckCount < 3 && (!hit.objectID || !hit.created_at_i)) {
      const sample = hits.find(h => h && (h.comment_text || h.story_text));
      if (sample) {
        console.log('🧪 HN sample shape:', {
          hasObjectID: !!sample.objectID,
          hasCreatedAtI: !!sample.created_at_i,
          hasCommentText: !!sample.comment_text,
          keys: Object.keys(sample).slice(0, 20),
        });
        sanityCheckCount = 3; // Only log once
      }
    }
    
    // Force comment_text only (defensive guard - skip story titles/metadata)
    const rawText = hit.comment_text || '';
    if (!rawText) {
      missingCommentText++;
      continue;
    }
    const cleanText = cleanHNText(rawText);
    if (!cleanText) {
      tooShort++;
      continue;
    }

    const textLower = cleanText.toLowerCase();

    // Check for founder-like signals (used for length threshold override)
    const explicitFounderLike =
      /\b(i am|i'm|we are|we're)\s+(the\s+)?(founder|cofounder|creator|builder)\b/i.test(cleanText) ||
      /\b(i built|we built|i made|we made|i created|we created)\b/i.test(cleanText) ||
      /\b(my company|our company|my startup|we just launched|we're launching|we launched|we raised)\b/i.test(cleanText) ||
      /\b(i work at|i'm on the team|i work on)\b/i.test(cleanText) ||
      /\b(launch(ed|ing)|shipping)\b/i.test(cleanText);
    
    // Add "Show HN founder" pattern that often lacks "we built"
    const showHNFounder =
      /\b(hi|hello)\b.*\b(i made|i built|i created|i'm the)\b/i.test(cleanText) &&
      /\b(feedback|questions|happy to answer)\b/i.test(cleanText);
    
    const possessiveFounderLike = isPossessiveFounderLike(cleanText);
    const actionFounderLike = isCompanyActionFounderLike(cleanText, startupName);
    const founderLike = explicitFounderLike || showHNFounder || possessiveFounderLike || actionFounderLike;

    // Domain signal: detect if domain is mentioned in comment text (needed for minChars calculation)
    const dom = domain ? normalizeDomain(domain) : null;
    const domainSignal = dom
      ? new RegExp(`\\b${dom.replace(/\./g, '\\.')}\\b`, 'i').test(cleanText)
      : false;

    // Debug probe for Lawyered (show first 3 samples that fail length)
    if (startupName.toLowerCase() === 'lawyered' && lawyeredProbeCount < 3) {
      if (cleanText.length < 180) {
        console.log('🧷 Lawyered sample:', {
          len: cleanText.length,
          expl: explicitFounderLike,
          poss: possessiveFounderLike,
          action: actionFounderLike,
          founderLike: founderLike,
          preview: cleanText.slice(0, 160)
        });
        lawyeredProbeCount++;
      }
    }

    // Apply founder-override length threshold
    // A) Lower founder min length slightly when domainSignal is true
    let minChars = MIN_CHARS_DEFAULT;
    if (founderLike) {
      minChars = (domainSignal && founderLike) ? MIN_CHARS_FOUNDER_WITH_DOMAIN : MIN_CHARS_FOUNDER;
    }
    if (cleanText.length < minChars) {
      tooShort++;
      continue;
    }

    const nameSignal = hasNameSignal(cleanText, startupName);
    
    // Ambiguous name filter: require domain or company context for common words
    const ambiguous = isAmbiguousName(startupName);
    if (ambiguous) {
      const ok = domainSignal || hasCompanyContext(cleanText);
      if (!ok) {
        noSignal++;
        continue;
      }
    }
    
    const founderSignalBase = hasFounderSignal(cleanText);
    const ownerSignal = possessiveFounderLike; // Possessive language is a soft founder signal
    const founderSignal = founderSignalBase || ownerSignal; // Count possessive as founder signal
    const companyRef = /\b(our startup|our company|our product|our service|our platform)\b/i.test(cleanText);
    
    // Treat domain mention as a strong company reference
    const companyRefStrong = companyRef || domainSignal;
    
    // Operator signal: mentions operational details (customers, revenue, metrics, incidents)
    const operatorSignal =
      /\b(we|i|our|my)\b/i.test(cleanText) &&
      /\b(customers?|users?|revenue|arr|mrr|churn|retention|deploy|latency|incident|outage|support|pricing)\b/i.test(cleanText);

    // Technical signal: mentions technical details (even without first-person)
    const technicalSignal =
      /\b(api|sdk|latency|throughput|benchmark|postgres|kafka|kubernetes|docker|gpu|finetune|prompt|inference|vector|retrieval|rag|pipeline|etl|schema|migration)\b/i.test(cleanText);

    // Product signal: mentions product/customer metrics (even without first-person)
    const productSignal =
      /\b(customer|users?|revenue|arr|mrr|churn|retention|pricing|sales|onboarding|activation|conversion)\b/i.test(cleanText);

    // companyRefStrong already includes domainSignal (set above)

    // Owner signal for Tier 2 (possessive language with action verb or sufficient length)
    const ownerSignalStrong = ownerSignal && (
      cleanText.length >= 110 ||
      /\b(launched|shipping|built|using|with our new|open[- ]sourced|deployed)\b/i.test(cleanText)
    );

    // E1 Enhancement: Source ladder (Tier 1 founder voice OR Tier 2 relevant discussion)
    // Tier 1: Founder-like comments ((nameSignal OR domainSignal) AND (founderSignal OR operatorSignal))
    // Tier 2: Relevant technical/market discussion ((nameSignal OR domainSignal) AND (technicalSignal OR productSignal OR companyRefStrong OR ownerSignalStrong))
    // Accept founder-like with len >= 80, technicalSignal with len >= 140, productSignal with len >= 160
    let isTier1 = (nameSignal || domainSignal) && (founderSignal || operatorSignal);
    
    // Tighten Tier 1 for ambiguous names: require stronger signals
    if (ambiguous) {
      // operatorSignal alone is not enough when name is a common word
      const strongFounder = founderLike || ownerSignal;
      const strongRef = domainSignal && hasCompanyContext(cleanText);
      isTier1 = (strongFounder || strongRef);
    }
    const isTier2 = (nameSignal || domainSignal) && (
      (technicalSignal && cleanText.length >= 140) ||
      (productSignal && cleanText.length >= 160) ||
      companyRefStrong ||
      ownerSignalStrong
    );

    if (!isTier1 && !isTier2) {
      noSignal++;
      continue;
    }

    const tier = isTier1 ? 1 : 2; // Assign tier based on signals

    // Skip if it's mostly URLs
    const urlCount = (cleanText.match(/https?:\/\/\S+/g) || []).length;
    if (urlCount > 2) {
      tooManyUrls++;
      continue;
    }

    if (cleanText.length > 2200) {
      tooLong++;
      continue;
    }

    // Calculate quality score for ranking
    let score = 0;
    if (founderLike) score += 3;
    if (technicalSignal) score += 2;
    if (productSignal) score += 1;
    if (/\d+/.test(cleanText)) score += 1; // Has numbers (traction/metrics)
    const urlCountInScore = (cleanText.match(/https?:\/\/\S+/g) || []).length;
    if (urlCountInScore > 2) score -= 2;
    if (cleanText.length < 120) score -= 1;

    // Build source URL: ALWAYS use HN comment permalink (objectID)
    // This ensures every comment has a stable, permanent URL
    // hit.url might be the story URL, which is not the comment permalink
    const sourceUrl = hit.objectID 
      ? `https://news.ycombinator.com/item?id=${hit.objectID}`
      : (hit.story_id ? `https://news.ycombinator.com/item?id=${hit.story_id}` : null);

    snippets.push({
      text: cleanText,
      source_url: sourceUrl,
      date_published: hit.created_at ? new Date(hit.created_at).toISOString() : null,
      context: 'technical',
      tier: tier, // Use dynamic tier (1 or 2)
      confidence: tier === 1 ? 'high' : 'medium',
      _score: score, // For ranking
      sourceCreatedAtI: hit.created_at_i || 0, // Copy Algolia timestamp directly (safer than _hit)
      sourceItemId: hit.objectID || null, // Store HN comment objectID for deduplication
      _debug: { nameSignal, domainSignal, founderSignal, companyRef, tier }
    });
  }

  if (debug) {
    console.log(`   🧪 Extract debug: kept=${snippets.length} tooShort=${tooShort} noSignal=${noSignal} tooManyUrls=${tooManyUrls} tooLong=${tooLong} missingCommentText=${missingCommentText}`);
  }
  
  // Sanity check: if we have hits but no snippets, log sample shape
  if (debug && snippets.length === 0 && hits.length > 0) {
    const sample = hits.find(h => h && (h.comment_text || h.story_text));
    if (sample) {
      console.log('🧪 HN sample shape:', {
        hasObjectID: !!sample.objectID,
        hasCreatedAtI: !!sample.created_at_i,
        hasCommentText: !!sample.comment_text,
        keys: Object.keys(sample).slice(0, 20),
      });
    }
  }

  return snippets;
}

/**
 * Determine if a startup should be skipped
 */
function shouldSkipStartup(startup, domain) {
  const name = (startup?.name || '').trim();
  if (!name) return { skip: true, reason: 'empty-name' };

  // Skip filters from main loop
  const SKIP_NAME_RE = /\b(ventures?|capital|partners|fund|management|holdings|sequoia|a16z|index ventures|accel|kleiner|greylock)\b/i;
  const GENERIC_RE = /^(ai|security|software|stablecoins?|crypto|blockchain|fintech)$/i;
  
  if (SKIP_NAME_RE?.test(name)) return { skip: true, reason: 'vc/investor-like' };
  if (GENERIC_RE?.test(name)) return { skip: true, reason: 'generic-term' };

  // Person-like only when no domain
  if (looksLikePersonName(name) && !domain) return { skip: true, reason: 'person-like-no-domain' };

  return { skip: false, reason: null };
}

/**
 * Collect snippets from Hacker News for a startup
 */
async function collectFromHN(startup, debug = false, metrics = null) {
  try {
    const rawName = (startup?.name || '').trim();
    
    // A) Sanitize startup name (remove article titles, headline fragments, etc.)
    const sanitizeResult = sanitizeStartupName(rawName);
    if (sanitizeResult.rejectReason) {
      const skipReason = sanitizeResult.rejectReason === 'headline-pattern' ? 'headline-pattern' : `bad-startup-name-${sanitizeResult.rejectReason}`;
      if (metrics) {
        if (skipReason === 'headline-pattern' || skipReason.startsWith('bad-startup-name-headline')) {
          metrics.headlineSkipped++;
        } else {
          metrics.badNameSkipped++;
        }
      }
      console.log(`   ⏭️  Skipping: ${rawName} (${skipReason})`);
      return { saved: 0, skipped: 0, extracted: 0, hits: 0, error: null, skipReason };
    }
    
    // Also check for headline patterns (looksLikeHeadline)
    if (looksLikeHeadline(rawName)) {
      if (metrics) metrics.headlineSkipped++;
      console.log(`   ⏭️  Skipping: ${rawName} (headline-pattern)`);
      return { saved: 0, skipped: 0, extracted: 0, hits: 0, error: null, skipReason: 'headline-pattern' };
    }
    
    const name = sanitizeResult.cleanName;
    
    const link = startup.website || startup.source_url || null;
    const domain = normalizeCompanyDomain(link);
    let normDomain = domain ? normalizeDomain(domain) : null;
    let domainSkipReason = null;
    
    // Fix 3: Stop treating non-company domains (publishers/investors/platforms) as company domains
    if (normDomain) {
      const nonCompanyCheck = isNonCompanyDomain(link, normDomain);
      if (nonCompanyCheck.isNonCompany) {
        domainSkipReason = `non-company-domain-${nonCompanyCheck.reason}`;
        normDomain = null; // Don't use non-company domains for search hinting
      }
    }

    // Hard generic-word defense: if name is dangerously generic and we don't have a company domain, skip
    if (isDangerouslyGenericSingleWord(name) && !normDomain) {
      console.log(`   ⏭️  Skipping: ${name} (dangerously-generic-no-domain)`);
      return { saved: 0, skipped: 0, extracted: 0, hits: 0, error: null, skipReason: 'dangerously-generic-no-domain' };
    }

    // ✅ Skip check (VC/investor-like names, etc.)
    const skip = shouldSkipStartup(startup, normDomain);
    if (skip.skip) {
      console.log(`   ⏭️  Skipping: ${name} (${skip.reason})`);
      return { saved: 0, skipped: 0, extracted: 0, hits: 0, error: skip.reason };
    }
    
    // Fix A: Get last collected created_at_i for incremental collection
    const lastCreatedAtI = await getLastHNCreatedAtIForStartup(startup.id);
    const incrementalActive = lastCreatedAtI > 0;
    if (metrics && incrementalActive) metrics.incrementalActive++;
    // Always log (even if 0) - this is the "truth serum" for debugging
    console.log(`   ⏱️  Incremental HN: lastCreatedAtI=${lastCreatedAtI} (tier1/2)`);
    
    // Fix 4: Quota gate - skip if >= 10 GOOD snippets in last 24h, BUT only if incremental is not active
    // If incremental is active, it already prevents reprocessing old comments, so quota gate is redundant
    if (!incrementalActive) {
      const { count: count24h, error: countError } = await supabase
        .from('pythia_speech_snippets')
        .select('*', { count: 'exact', head: true })
        .eq('entity_id', startup.id)
        .eq('source_type', 'forum_post')
        .in('tier', [1, 2]) // Only count good snippets (tier 1/2)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (!countError && count24h !== null && count24h >= 10) {
        console.log(`   ⏭️  Skipping: ${name} (already-has-recent-hn-snippets count24h=${count24h} tier1/2)`);
        return { saved: 0, skipped: 0, extracted: 0, hits: 0, error: null, skipReason: 'already-has-recent-hn-snippets' };
      }
    }

    // ✅ Only now announce the search
    if (domainSkipReason) {
      if (metrics) metrics.domainHintSkipped++;
      console.log(`   ⚠️  Domain hint skipped: ${domainSkipReason} (${domain || 'none'})`);
    }
    console.log(`   🔍 Searching HN for: "${name}"${normDomain ? ` + domain(${normDomain})` : ''}`);

    // Step 1: name-only + domain-only (merge hits for better recall)
    let allHits = [];

    // Fix C: For ambiguous names without domain, skip name-only search, go straight to founder keywords
    const ambiguous = isAmbiguousName(name);
    const nameLimit = ambiguous ? 30 : 50;
    
    // Step 1A: name-only (skip if ambiguous name without company domain)
    if (!ambiguous || normDomain) {
      const nameHits = await searchHackerNews(name, null, nameLimit, false, lastCreatedAtI, metrics);
      allHits.push(...nameHits);
    }

    // Step 1B: domain-only (if exists)
    if (normDomain) {
      const dom = normalizeDomain(normDomain);
      const domainHits = await searchHackerNews(dom, null, nameLimit, false, lastCreatedAtI, metrics);
      allHits.push(...domainHits);
    }

    // Dedupe by objectID
    const seen = new Set();
    let hits = [];
    for (const h of allHits) {
      if (!seen.has(h.objectID)) {
        seen.add(h.objectID);
        hits.push(h);
      }
    }

    // ✅ hits log only after actual HN request
    console.log(`   🧾 ${name}: hits=${hits.length}`);

    let snippets = extractSubstantiveComments(hits, name, normDomain, debug);
    const extracted = snippets.length;

    const tier1Count = snippets.filter(s => s.tier === 1).length;
    const tier2Count = snippets.filter(s => s.tier === 2).length;
    console.log(`   🧪 ${name}: extracted=${snippets.length} tier1=${tier1Count} tier2=${tier2Count}`);

    // Step 2: founder keywords fallback only if merged results produce nothing extracted
    // BUT: if incremental is active and we got hits but extracted=0, skip fallback (early exit optimization)
    const shouldSkipFallback = incrementalActive && hits.length > 0 && extracted === 0;
    if (!shouldSkipFallback && (hits.length === 0 || extracted === 0)) {
      if (debug) console.log(`   🔄 Fallback search with founder keywords...`);
      const fallbackHits = await searchHackerNews(name, null, 50, true, lastCreatedAtI, metrics); // No domain, use founder keywords
      // Merge + de-dupe hits (Algolia objectID is perfect for this)
      const byId = new Map();
      for (const h of [...hits, ...fallbackHits]) byId.set(h.objectID, h);
      hits = [...byId.values()];
      snippets = extractSubstantiveComments(hits, name, normDomain, debug);
      if (snippets.length > 0) {
        console.log(`   ✅ Fallback found ${snippets.length} snippets`);
      }
    } else if (shouldSkipFallback) {
      if (debug) console.log(`   ⏭️  Skipping fallback (incremental active, hits>0 but extracted=0)`);
    }

    if (hits.length === 0) {
      const skipReason = incrementalActive ? 'no-new-hn-comments' : 'no-hn-results';
      if (metrics && skipReason === 'no-new-hn-comments') metrics.incrementalNoNew++;
      return { saved: 0, skipped: 0, extracted: 0, hits: 0, error: null, skipReason };
    }

    if (snippets.length === 0) {
      return { saved: 0, skipped: 0, extracted: 0, hits: hits.length, error: null, skipReason: 'no-substantive-comments' };
    }

    let saved = 0;
    let skippedError = 0;
    let firstError = null;

    // Save at most 10 per startup (ranked by quality score)
    const toSave = snippets
      .sort((a, b) => (b._score || 0) - (a._score || 0))
      .slice(0, 10);

    console.log(`   💾 ${name}: saving ${toSave.length} (top 10 by score)`);

    for (const snippet of toSave) {
      const textHash = hashText(snippet.text);
      const sourceItemId = snippet.sourceItemId || null;
      const sourceCreatedAtI = snippet.sourceCreatedAtI || null;

      // Hardening: HN comments should always have sourceItemId and sourceCreatedAtI
      // Skip if missing (incremental depends on these)
      if (!sourceItemId || !sourceCreatedAtI) {
        if (debug) console.log(`   ⚠️  Skipping snippet: missing HN ids (sourceItemId=${sourceItemId}, sourceCreatedAtI=${sourceCreatedAtI})`);
        skippedError++;
        continue;
      }

      // Use RPC function for "insert-or-ignore" behavior (Option B)
      // This works with partial unique indexes where ON CONFLICT doesn't work in JS client
      // The function uses NOT EXISTS check to prevent duplicates
      const tierValue = snippet.tier || 2; // Ensure tier is always set (1 or 2)
      if (debug && saved === 0) {
        console.log(`   🔍 Debug: Saving snippet with tier=${tierValue}, source_item_id=${sourceItemId?.substring(0, 8)}...`);
      }
      const { error } = await supabase.rpc('insert_forum_snippet', {
        p_entity_id: startup.id,
        p_entity_type: 'startup',
        p_text: snippet.text,
        p_source_url: snippet.source_url, // Always HN comment permalink: https://news.ycombinator.com/item?id={objectID}
        p_date_published: snippet.date_published,
        p_source_type: 'forum_post', // HN content type bucket
        p_tier: tierValue, // Use dynamic tier from extraction (1 or 2)
        p_context_label: snippet.context,
        p_text_hash: textHash,
        p_source_created_at_i: sourceCreatedAtI, // Store Algolia timestamp for incremental collection (required for HN)
        p_source_item_id: sourceItemId // Store HN comment objectID for deduplication (required for HN)
      });

      if (error) {
        if (!firstError) firstError = error.message;
        console.error(`   ❌ INSERT ERROR`, { startup: name, msg: error.message, details: error.details, hint: error.hint });
        skippedError++;
      } else {
        saved++;
      }
    }

    // Fix 2: Add definitive save-result log
    console.log(`   📌 Save result: attempted=${toSave.length} upsertedOk=${saved} skippedError=${skippedError}${firstError ? ` firstError="${firstError.substring(0, 100)}"` : ''}`);

    return { saved, skipped: skippedError, extracted: snippets.length, hits: hits.length, error: null };
  } catch (err) {
    return { saved: 0, skipped: 0, extracted: 0, hits: 0, error: err.message };
  }
}

/**
 * Main collection function
 */
async function collectFromForums(limit = 50, source = 'hn') {
  console.log(`\n💬 Collecting snippets from ${source === 'hn' ? 'Hacker News' : 'Reddit'} forums...\n`);

  // Metrics tracking
  const METRICS = {
    storyExpansionTriggered: 0,
    storyHitsTotal: 0,
    storyCommentsFetched: 0,
    commentQueryPasses: { q1: 0, q2: 0, q3: 0, founderFallback: 0 },
    genericNameSkipped: 0,
    headlineSkipped: 0,
    badNameSkipped: 0,
    domainHintSkipped: 0,
    incrementalActive: 0,
    incrementalNoNew: 0,
  };

  // Step 1: Search reality check probe (test with known HN company)
  if (source === 'hn') {
    console.log('🔍 Reality check: Testing HN search with known company...');
    const testHits = await searchHackerNews('Stripe', null, 5, false);
    if (testHits.length === 0) {
      console.warn('⚠️  WARNING: HN search returned 0 hits for "Stripe" - Algolia endpoint may be broken!');
    } else {
      console.log(`✅ HN search working (found ${testHits.length} hits for "Stripe")`);
    }
    console.log('');
  }

  // Fetch NEW startups: get startups that don't have any forum_post snippets yet
  console.log('🔍 Finding startups without forum snippets...');
  
  // Step 1: Get all startup IDs that already have forum snippets
  const { data: startupsWithSnippets } = await supabase
    .from('pythia_speech_snippets')
    .select('entity_id')
    .eq('entity_type', 'startup')
    .eq('source_type', 'forum_post')
    .in('tier', [1, 2]);

  const existingStartupIds = new Set((startupsWithSnippets || []).map(s => s.entity_id));
  console.log(`   📊 Found ${existingStartupIds.size} startups with existing forum snippets`);

  // Step 2: Fetch all approved startups, then filter to get only NEW ones
  const { data: allStartups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, website, source_url, status')
    .eq('status', 'approved')
    .not('name', 'is', null)
    .limit(limit * 3); // Fetch more to account for filtering

  if (error) {
    console.error('❌ Error fetching startups:', error.message);
    return;
  }

  if (!allStartups || allStartups.length === 0) {
    console.log('⚠️  No startups found.');
    return;
  }

  // Step 3: Filter to get only NEW startups (without forum snippets)
  const startups = allStartups.filter(s => !existingStartupIds.has(s.id)).slice(0, limit);
  
  console.log(`   ✅ Selected ${startups.length} NEW startups (without forum snippets) from ${allStartups.length} total`);

  if (!startups || startups.length === 0) {
    console.log('⚠️  No startups found.');
    return;
  }

  const commonWords = new Set([
    'the','a','an','and','or','but','for','with','on','at','to','of','as','is','are','was','were','be','been','being',
    'have','has','had','do','does','did','will','would','should','could','may','might','must','can',
    // common ambiguous startup-name collisions:
    'route','test','demo','one','two','three','stellar','pulse','spark','flow'
  ]);

  // Skip filters: VCs, generic concepts, mega brands
  const SKIP_NAME_RE = /\b(ventures?|capital|partners|fund|management|holdings|sequoia|a16z|index ventures|accel|kleiner|greylock)\b/i;
  const GENERIC_RE = /^(ai|security|software|stablecoins?|crypto|blockchain|fintech)$/i;
  
  // Fix upstream junk: Filter headlines/junk patterns
  const HEADLINE_JUNK_RE = /\$|Series|Predictions|[\u{1F300}-\u{1F9FF}]/u; // $, Series, Predictions, emojis
  const FUNDING_MARKER_RE = /\$\d+[kKmMbB]|\d+[kKmMbB]\s*(funding|raise|round)/i;

  const filteredStartups = (startups || [])
    .filter(s => {
      const name = (s.name || '').trim();
      const nameLower = name.toLowerCase();
      if (!nameLower) return false;
      if (nameLower.length < 3) return false;
      if (commonWords.has(nameLower)) return false;
      // Skip VCs/investors
      if (SKIP_NAME_RE.test(name)) return false;
      // Skip generic category words
      if (GENERIC_RE.test(nameLower)) return false;
      // Skip headlines/junk (Fix upstream junk)
      if (HEADLINE_JUNK_RE.test(name)) return false;
      if (FUNDING_MARKER_RE.test(name)) return false;
      
      // A) Use sanitizer in the filter stage (early rejection)
      const sr = sanitizeStartupName(name);
      if (sr.rejectReason) {
        METRICS.badNameSkipped++;
        return false;
      }
      if (looksLikeHeadline(name)) {
        METRICS.headlineSkipped++;
        return false;
      }
      
      // B) Reject dangerously generic right there too (unless domain exists)
      const link = s.website || s.source_url || null;
      const dom = normalizeCompanyDomain(link);
      const normDom = dom ? normalizeDomain(dom) : null;
      
      if (isDangerouslyGenericSingleWord(sr.cleanName) && !normDom) {
        METRICS.genericNameSkipped++;
        return false;
      }
      
      return true;
    })
    .slice(0, limit);

  if (!filteredStartups || filteredStartups.length === 0) {
    console.log('⚠️  No startups found after filtering.');
    return;
  }

  console.log(`📊 Found ${filteredStartups.length} startups to search (filtered from ${(startups || []).length} total)\n`);
  console.log(`   📋 Sample startup names: ${filteredStartups.slice(0, 5).map(s => s.name).join(', ')}...\n`);

  // Probe insert test (temporary diagnostic)
  async function insertProbeRow() {
    if (filteredStartups.length === 0) {
      console.log('⚠️  Skipping probe insert (no startups to process)');
      return;
    }
    const probeText = `PYTHIA_PROBE_FORUM_POST ${Date.now()}`;
    const textHash = hashText(probeText);

    const { error } = await supabase
      .from('pythia_speech_snippets')
      .insert({
        entity_id: filteredStartups[0].id,
        entity_type: 'startup',
        text: probeText,
        source_url: 'https://news.ycombinator.com/',
        date_published: new Date().toISOString(),
        source_type: 'forum_post',
        tier: 2,
        context_label: 'probe',
        text_hash: textHash
      });

    if (error) {
      console.error('❌ PROBE INSERT FAILED:', error);
    } else {
      console.log('✅ PROBE INSERT OK');
    }
  }

  await insertProbeRow();

  let totalSaved = 0;
  let totalSkipped = 0;
  let processed = 0;
  let withResults = 0;
  let errors = 0;
  let noHNResults = 0;
  let noSubstantiveComments = 0;

  for (let i = 0; i < filteredStartups.length; i++) {
    const startup = filteredStartups[i];
    processed++;

    // Sentinel log to track loop progress
    const link = startup.website || startup.source_url || null;
    const domain = normalizeCompanyDomain(link);
    console.log(`\n➡️  Startup ${i+1}/${filteredStartups.length}: ${startup.name} (domain=${domain || 'none'})`);

    if (source === 'hn') {
      const debug = processed <= 5; // debug first 5 now (more useful)
      
      // Use result object pattern to preserve state even if logging errors
      const result = { hits: 0, extracted: 0, saved: 0, skipped: 0, skipReason: null, error: null };
      
      try {
        const collectResult = await collectFromHN(startup, debug, METRICS);
        Object.assign(result, collectResult);
      } catch (e) {
        result.error = e?.message || String(e);
      }
      
      // ✅ Processed log after each call (in finally-style pattern)
      const extra = result.error ? `, error=${result.error}` : (result.skipReason ? `, skip=${result.skipReason}` : '');
      console.log(`   ✅ Processed: ${startup.name} (hits=${result.hits}, extracted=${result.extracted}, saved=${result.saved}${extra})`);

      if (result.skipReason) {
        // Skip reasons are already logged by collectFromHN
        if (result.skipReason === 'no-hn-results' || result.skipReason === 'no-new-hn-comments') {
          noHNResults++;
        } else if (result.skipReason === 'no-substantive-comments') {
          noSubstantiveComments++;
        }
      } else if (result.error) {
        // Actual errors (exceptions, Supabase failures, etc.)
        errors++;
        if (debug) console.log(`   ⚠️  ${startup.name}: ${result.error}`);
      } else {
        // Track extracted count separately from saved count
        if (result.extracted > 0) {
          withResults++;
        }
        if (result.saved > 0) {
          console.log(`   ✅ ${startup.name}: ${result.saved} snippets saved, ${result.skipped} skipped (${result.extracted || 0} extracted)`);
        }
      }

      totalSaved += (result.saved || 0);
      totalSkipped += (result.skipped || 0);

      // Rate limiting (be respectful)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    // TODO: Add Reddit collection here

    // Progress update every 10 startups
    if (processed % 10 === 0) {
      console.log(`\n   📊 Progress: ${processed}/${filteredStartups.length} processed (${withResults} with results, ${totalSaved} total snippets saved)\n`);
    }
  }

  console.log(`\n✅ Done: ${totalSaved} snippets saved, ${totalSkipped} skipped`);
  console.log(`   📊 ${withResults} startups had forum posts`);
  console.log(`   📊 ${noHNResults} startups had no HN results`);
  console.log(`   📊 ${noSubstantiveComments} startups had HN results but no substantive comments`);
  console.log(`   📊 ${errors} errors`);
  
  // Print metrics block
  console.log('\n📈 Run metrics:', JSON.stringify(METRICS, null, 2));
}

// Run if called directly
if (require.main === module) {
  const limit = process.argv[2] ? parseInt(process.argv[2]) : 50;
  const source = process.argv[3] || 'hn';
  collectFromForums(limit, source).catch(console.error);
}

module.exports = { collectFromForums, collectFromHN };
