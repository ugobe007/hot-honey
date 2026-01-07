#!/usr/bin/env node
/**
 * ENRICHMENT ORCHESTRATOR
 * =======================
 * Unified pipeline that implements the tiered gating matrix for cost-effective
 * startup enrichment. Replaces 50+ individual scripts with one intelligent system.
 * 
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        ENRICHMENT ORCHESTRATOR                          │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                         │
 * │  INGEST (Tier 0)     PARSE (Tier 1)      ENRICH (Tier 2)    LLM        │
 * │  ─────────────────   ──────────────      ─────────────────  ────────   │
 * │  • RSS feeds         • Meta tags         • Playwright       • GPT-4    │
 * │  • Directories         • JSON-LD           • Stagehand        • Claude   │
 * │  • Job boards          • Inference         • LinkedIn                    │
 * │  • Press pages         • Heuristics        • Crunchbase                  │
 * │                                                                         │
 * │  Cost: FREE          Cost: ~FREE         Cost: $0.01/page   $0.02/call │
 * │  Volume: 100%        Volume: 100%        Volume: ~10%       Volume: ~1%│
 * │                                                                         │
 * │                    GATING MATRIX                                        │
 * │                    ─────────────                                        │
 * │  Early GOD < 30  → STOP (don't waste resources)                        │
 * │  Early GOD 30-59 → Tier 1 only (inference engines)                     │
 * │  Early GOD 60-79 → Tier 1 + Tier 2 (browser enrichment)                │
 * │  Early GOD 80+   → Full pipeline (including selective LLM)             │
 * │                                                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * Run: node enrichment-orchestrator.js
 * Run with options:
 *   --dry-run         Preview what would happen without making changes
 *   --limit=N         Process only N startups
 *   --tier=N          Force a specific tier (0, 1, 2, or 3 for LLM)
 *   --startup=ID      Process a specific startup by ID
 *   --stats           Show pipeline statistics only
 *   --daemon          Run continuously
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Gating thresholds
  TIER_1_THRESHOLD: 30,   // Below this, don't enrich at all
  TIER_2_THRESHOLD: 60,   // Above this, use browser enrichment
  LLM_THRESHOLD: 80,      // Above this, selective LLM calls allowed
  
  // Score-moving field thresholds (only call LLM if field would move score by this much)
  SCORE_MOVING_THRESHOLD: 5,
  
  // Batch sizes
  BATCH_SIZE: 50,
  
  // Cost tracking
  COSTS: {
    TIER_0: 0,
    TIER_1: 0.0001,  // Minimal compute
    TIER_2: 0.01,    // Playwright/browser
    LLM: 0.02,       // Per LLM call
  },
  
  // Fields that move GOD score significantly
  SCORE_MOVING_FIELDS: [
    'traction_signals',      // +10-15 points if strong
    'funding_mentions',      // +5-10 points  
    'team_signals',          // +5-10 points
    'stage',                 // Affects investor matching
    'category_primary',      // Affects investor matching
  ],
  
  // Daemon intervals
  DAEMON_INTERVAL: 30 * 60 * 1000,  // 30 minutes
};

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

const log = {
  info: (msg) => console.log(`\x1b[36mℹ️  ${msg}\x1b[0m`),
  success: (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`),
  warn: (msg) => console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`),
  error: (msg) => console.log(`\x1b[31m❌ ${msg}\x1b[0m`),
  tier0: (msg) => console.log(`\x1b[90m[T0] ${msg}\x1b[0m`),
  tier1: (msg) => console.log(`\x1b[34m[T1] ${msg}\x1b[0m`),
  tier2: (msg) => console.log(`\x1b[35m[T2] ${msg}\x1b[0m`),
  llm: (msg) => console.log(`\x1b[33m[LLM] ${msg}\x1b[0m`),
  section: (msg) => console.log(`\n\x1b[1m${'═'.repeat(60)}\n${msg}\n${'═'.repeat(60)}\x1b[0m\n`),
};

// ============================================================================
// TIER 0: IDENTITY RESOLUTION & CANONICAL DOMAIN
// ============================================================================

/**
 * Extract canonical domain from various URL formats
 */
function extractCanonicalDomain(url) {
  if (!url) return null;
  
  try {
    // Clean URL
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    
    const parsed = new URL(cleanUrl);
    let domain = parsed.hostname.toLowerCase();
    
    // Remove www
    domain = domain.replace(/^www\./, '');
    
    // Skip generic hosts (these aren't canonical domains)
    const genericHosts = [
      'linktree.com', 'linktr.ee', 'notion.so', 'notion.site',
      'medium.com', 'substack.com', 'carrd.co', 'bio.link',
      'beacons.ai', 'lnk.bio', 'later.com', 'campsite.bio',
      'github.io', 'vercel.app', 'netlify.app', 'herokuapp.com',
      'webflow.io', 'framer.website', 'super.so'
    ];
    
    if (genericHosts.some(h => domain.endsWith(h))) {
      return null; // Not a canonical domain
    }
    
    return domain;
  } catch {
    return null;
  }
}

/**
 * Generate name aliases for deduplication
 */
function generateAliases(name) {
  if (!name) return [];
  
  const aliases = new Set();
  const original = name.trim();
  
  aliases.add(original);
  aliases.add(original.toLowerCase());
  
  // Remove common suffixes
  const suffixes = [' Inc', ' Inc.', ' LLC', ' Ltd', ' Ltd.', ' Co', ' Co.', ' Corp', ' Corporation', ' AI', ' Labs', ' HQ', ' io'];
  for (const suffix of suffixes) {
    if (original.endsWith(suffix)) {
      aliases.add(original.slice(0, -suffix.length).trim());
    }
  }
  
  // Remove spaces and special chars
  aliases.add(original.replace(/[\s\-_.]+/g, '').toLowerCase());
  
  // CamelCase to spaces
  aliases.add(original.replace(/([a-z])([A-Z])/g, '$1 $2'));
  
  return Array.from(aliases).filter(a => a.length > 1);
}

/**
 * Tier 0: Identity gate - ensure we have canonical domain
 */
async function tier0IdentityGate(startup) {
  const result = {
    passed: false,
    canonical_domain: null,
    aliases: [],
    identity_confidence: 0,
    issues: [],
  };
  
  // Try to extract canonical domain from website (backward compatible - canonical_domain column doesn't exist yet)
  const domain = startup.website ? extractCanonicalDomain(startup.website) : null;
  
  if (domain) {
    result.canonical_domain = domain;
    result.identity_confidence = 0.9;
  } else {
    // Try from other fields
    const altUrls = [
      startup.linkedin,
      startup.linkedin_url,
    ].filter(Boolean);
    
    for (const url of altUrls) {
      // Extract domain hints from social profiles
      const altDomain = extractCanonicalDomain(url);
      if (altDomain) {
        result.canonical_domain = altDomain;
        result.identity_confidence = 0.7;
        break;
      }
    }
    
    // If still no domain, check if we have at least a website URL (even if not canonical)
    if (!result.canonical_domain) {
      if (startup.website && startup.website.length > 5) {
        // We have a website, just not a canonical domain - still allow enrichment
        result.canonical_domain = extractCanonicalDomain(startup.website) || startup.website;
        result.identity_confidence = 0.6;
      } else {
        result.issues.push('CRITICAL: No website or canonical domain - cannot proceed to higher tiers');
        result.identity_confidence = 0.2;
      }
    }
  }
  
  // Generate aliases
  result.aliases = generateAliases(startup.name);
  
  // Check for problematic names
  const shortNames = ['Halo', 'Nova', 'Pilot', 'Scout', 'Beam', 'Flow', 'Sync', 'Core', 'Base'];
  if (shortNames.includes(startup.name)) {
    result.issues.push(`WARNING: Ambiguous name "${startup.name}" - high collision risk`);
    result.identity_confidence *= 0.5;
  }
  
  // Pass if we have either domain OR high enough confidence
  result.passed = result.canonical_domain !== null || result.identity_confidence > 0.5;
  
  return result;
}

// ============================================================================
// TIER 1: CHEAP PARSING & INFERENCE
// ============================================================================

/**
 * Estimate stage from signals (no API calls)
 */
function inferStage(startup) {
  const signals = [];
  const text = `${startup.name} ${startup.tagline || ''} ${startup.description || ''}`.toLowerCase();
  
  // Funding signals
  if (text.includes('series c') || text.includes('series d')) {
    return { stage: 'Series C+', confidence: 0.8, signals: ['funding_mention'] };
  }
  if (text.includes('series b')) {
    return { stage: 'Series B', confidence: 0.8, signals: ['funding_mention'] };
  }
  if (text.includes('series a')) {
    return { stage: 'Series A', confidence: 0.8, signals: ['funding_mention'] };
  }
  if (text.includes('seed round') || text.includes('raised seed')) {
    return { stage: 'Seed', confidence: 0.8, signals: ['funding_mention'] };
  }
  if (text.includes('pre-seed') || text.includes('preseed')) {
    return { stage: 'Pre-Seed', confidence: 0.8, signals: ['funding_mention'] };
  }
  
  // YC/Accelerator signals
  if (text.includes('yc ') || text.includes('y combinator') || text.includes('(yc')) {
    signals.push('yc_mention');
    return { stage: 'Seed', confidence: 0.7, signals };
  }
  if (text.includes('techstars') || text.includes('500 startups')) {
    signals.push('accelerator_mention');
    return { stage: 'Pre-Seed', confidence: 0.6, signals };
  }
  
  // Team size signals
  if (startup.team_size) {
    const teamSize = typeof startup.team_size === 'number' ? startup.team_size : parseInt(startup.team_size);
    if (teamSize === 1 || teamSize <= 5) {
      return { stage: 'Pre-Seed', confidence: 0.5, signals: ['team_size'] };
    }
    if (teamSize <= 10 || teamSize <= 25) {
      return { stage: 'Seed', confidence: 0.5, signals: ['team_size'] };
    }
    if (teamSize <= 50 || teamSize > 50) {
      return { stage: 'Series A', confidence: 0.5, signals: ['team_size'] };
    }
  }
  
  // Stealth/launch signals
  if (text.includes('stealth') || text.includes('coming soon') || text.includes('waitlist')) {
    return { stage: 'Pre-Seed', confidence: 0.6, signals: ['stealth_mode'] };
  }
  if (text.includes('just launched') || text.includes('beta')) {
    return { stage: 'Pre-Seed', confidence: 0.5, signals: ['early_product'] };
  }
  
  return { stage: 'Seed', confidence: 0.3, signals: ['default'] };
}

/**
 * Infer category/sector from text (no API calls)
 */
function inferCategory(startup) {
  const text = `${startup.name} ${startup.tagline || ''} ${startup.description || ''}`.toLowerCase();
  
  const categoryPatterns = {
    'AI/ML': ['artificial intelligence', ' ai ', 'machine learning', ' ml ', 'deep learning', 'neural', 'llm', 'gpt', 'nlp', 'computer vision'],
    'SaaS': ['saas', 'software as a service', 'subscription', 'platform', 'dashboard', 'analytics'],
    'Fintech': ['fintech', 'financial', 'banking', 'payment', 'lending', 'credit', 'insurance', 'insurtech', 'neobank'],
    'HealthTech': ['health', 'medical', 'healthcare', 'clinical', 'patient', 'diagnosis', 'therapeutic', 'biotech', 'pharma'],
    'E-Commerce': ['ecommerce', 'e-commerce', 'marketplace', 'retail', 'shopping', 'commerce', 'shopify'],
    'CleanTech': ['climate', 'clean energy', 'solar', 'renewable', 'sustainability', 'carbon', 'ev ', 'electric vehicle'],
    'Cybersecurity': ['security', 'cyber', 'privacy', 'encryption', 'authentication', 'identity', 'fraud'],
    'EdTech': ['education', 'learning', 'edtech', 'school', 'student', 'course', 'training'],
    'Robotics': ['robot', 'automation', 'autonomous', 'drone', 'manufacturing'],
    'Developer Tools': ['developer', 'api', 'sdk', 'devops', 'infrastructure', 'open source', 'github'],
    'Consumer': ['consumer', 'social', 'media', 'entertainment', 'gaming', 'lifestyle'],
    'Web3/Crypto': ['blockchain', 'crypto', 'web3', 'nft', 'defi', 'token', 'wallet', 'ethereum'],
    'Marketplace': ['marketplace', 'two-sided', 'platform connecting', 'buyers and sellers'],
  };
  
  const scores = {};
  for (const [category, patterns] of Object.entries(categoryPatterns)) {
    scores[category] = 0;
    for (const pattern of patterns) {
      if (text.includes(pattern)) {
        scores[category] += 1;
      }
    }
  }
  
  // Get top category
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] > 0) {
    return { 
      category: sorted[0][0], 
      confidence: Math.min(0.9, 0.3 + sorted[0][1] * 0.2),
      secondary: sorted.slice(1, 3).filter(s => s[1] > 0).map(s => s[0])
    };
  }
  
  return { category: 'SaaS', confidence: 0.2, secondary: [] }; // Default
}

/**
 * Extract traction signals from text (no API calls)
 */
function extractTractionSignals(startup) {
  const signals = [];
  const text = `${startup.tagline || ''} ${startup.description || ''}`.toLowerCase();
  
  // Revenue signals
  const revenueMatch = text.match(/\$?([\d.]+)\s*(k|m|mm|million|billion)?\s*(arr|mrr|revenue)/i);
  if (revenueMatch) {
    signals.push({
      type: 'revenue',
      value: revenueMatch[0],
      confidence: 0.7,
    });
  }
  
  // User signals
  const userMatch = text.match(/([\d,]+)\+?\s*(users|customers|clients|companies|businesses)/i);
  if (userMatch) {
    signals.push({
      type: 'users',
      value: userMatch[0],
      confidence: 0.7,
    });
  }
  
  // Growth signals
  const growthMatch = text.match(/(\d+)%?\s*(growth|mom|yoy|increase)/i);
  if (growthMatch) {
    signals.push({
      type: 'growth',
      value: growthMatch[0],
      confidence: 0.6,
    });
  }
  
  // Notable partnerships
  const bigCos = ['google', 'microsoft', 'amazon', 'apple', 'meta', 'nvidia', 'openai', 'salesforce'];
  for (const co of bigCos) {
    if (text.includes(co)) {
      signals.push({
        type: 'partnership',
        value: co,
        confidence: 0.5,
      });
    }
  }
  
  return signals;
}

/**
 * Tier 1: Full inference enrichment (cheap)
 */
async function tier1InferenceEnrichment(startup) {
  const result = {
    stage_estimate: null,
    category_primary: null,
    category_tags: [],
    traction_signals: [],
    one_liner: null,
    completeness_score: 0,
    fields_enriched: [],
  };
  
  // Stage inference
  if (!startup.stage || startup.stage === 0 || startup.stage === 'Unknown') {
    const stageResult = inferStage(startup);
    result.stage_estimate = stageResult;
    result.fields_enriched.push('stage');
  }
  
  // Category inference
  if (!startup.sectors || startup.sectors.length === 0) {
    const categoryResult = inferCategory(startup);
    result.category_primary = categoryResult.category;
    result.category_tags = categoryResult.secondary;
    result.fields_enriched.push('category');
  }
  
  // Traction signals
  const tractionSignals = extractTractionSignals(startup);
  if (tractionSignals.length > 0) {
    result.traction_signals = tractionSignals;
    result.fields_enriched.push('traction');
  }
  
  // One-liner (use tagline or first sentence of description)
  if (!startup.tagline && startup.description) {
    const firstSentence = startup.description.split(/[.!?]/)[0];
    if (firstSentence && firstSentence.length < 160) {
      result.one_liner = firstSentence.trim();
      result.fields_enriched.push('one_liner');
    }
  }
  
  // Calculate completeness
  const requiredFields = ['name', 'website', 'tagline', 'sectors', 'stage', 'description'];
  const presentFields = requiredFields.filter(f => {
    const val = startup[f];
    return val && (Array.isArray(val) ? val.length > 0 : true);
  });
  result.completeness_score = presentFields.length / requiredFields.length;
  
  return result;
}

// ============================================================================
// EARLY GOD SCORING (Cheap Pre-Score)
// ============================================================================

/**
 * Calculate Early GOD score using only Tier 0/1 data
 * This is a FAST approximation to gate expensive enrichment
 */
function calculateEarlyGodScore(startup, tier1Result) {
  let score = 0;
  const reasons = [];
  
  // Identity score (0-15 points) - backward compatible (canonical_domain column doesn't exist yet)
  const hasCanonicalDomain = startup.website && extractCanonicalDomain(startup.website);
  if (hasCanonicalDomain) {
    score += 10;
    reasons.push('+10: Has canonical domain');
  } else if (startup.website && startup.website.length > 5) {
    score += 5;
    reasons.push('+5: Has website');
  }
  
  // Completeness score (0-25 points) - More granular
  const hasName = startup.name && startup.name.length > 2;
  const hasWebsite = startup.website && startup.website.length > 5;
  const hasTagline = startup.tagline && startup.tagline.length > 20;
  const hasDescription = startup.description && startup.description.length > 50;
  const hasSectors = startup.sectors && startup.sectors.length > 0;
  const hasStage = startup.stage && startup.stage > 0;
  
  const completenessFields = [hasName, hasWebsite, hasTagline, hasDescription, hasSectors, hasStage];
  const completenessCount = completenessFields.filter(Boolean).length;
  const completenessPoints = Math.round((completenessCount / 6) * 25);
  score += completenessPoints;
  reasons.push(`+${completenessPoints}: ${completenessCount}/6 fields complete`);
  
  // Stage score (0-15 points) - More weight
  const stageScores = {
    'Pre-Seed': 5,
    'Seed': 10,
    'Series A': 15,
    'Series B': 12,
    'Series C+': 8,
  };
  const stageEstimate = tier1Result?.stage_estimate?.stage || (startup.stage ? String(startup.stage) : null);
  if (stageEstimate && stageScores[stageEstimate]) {
    score += stageScores[stageEstimate];
    reasons.push(`+${stageScores[stageEstimate]}: ${stageEstimate} stage`);
  } else if (startup.stage && startup.stage > 0) {
    // Map numeric stage to string
    const stageMap = { 1: 'Pre-Seed', 2: 'Seed', 3: 'Series A', 4: 'Series B', 5: 'Series C+' };
    const stageStr = stageMap[startup.stage] || 'Seed';
    if (stageScores[stageStr]) {
      score += stageScores[stageStr];
      reasons.push(`+${stageScores[stageStr]}: ${stageStr} stage (from DB)`);
    }
  }
  
  // Category clarity (0-15 points) - More weight
  if (tier1Result?.category_primary) {
    const category = typeof tier1Result.category_primary === 'string' 
      ? tier1Result.category_primary 
      : tier1Result.category_primary.category || tier1Result.category_primary;
    const confidence = typeof tier1Result.category_primary === 'object' 
      ? (tier1Result.category_primary.confidence || 0.5)
      : 0.7; // Default confidence for string
    const categoryPoints = Math.round(confidence * 15);
    score += categoryPoints;
    reasons.push(`+${categoryPoints}: Clear category (${category})`);
  } else if (hasSectors) {
    // Give partial credit for having sectors even if not inferred
    score += 5;
    reasons.push('+5: Has sectors (from DB)');
  }
  
  // Traction signals (0-20 points) - More weight
  const tractionSignals = tier1Result?.traction_signals || [];
  if (tractionSignals.length > 0) {
    const tractionPoints = Math.min(20, tractionSignals.length * 5);
    score += tractionPoints;
    reasons.push(`+${tractionPoints}: ${tractionSignals.length} traction signals`);
  }
  
  // Credibility signals (0-20 points) - More weight
  const text = `${startup.name} ${startup.tagline || ''} ${startup.description || ''}`.toLowerCase();
  
  if (text.includes('yc') || text.includes('y combinator')) {
    score += 15;
    reasons.push('+15: YC backed');
  } else if (text.includes('techstars') || text.includes('500 startups')) {
    score += 10;
    reasons.push('+10: Accelerator backed');
  }
  
  // Team signals (0-10 points)
  if (startup.team_size && startup.team_size > 1) {
    if (startup.team_size >= 5) {
      score += 10;
      reasons.push('+10: Large team (5+)');
    } else {
      score += 5;
      reasons.push('+5: Has team');
    }
  }
  
  // Description quality (0-10 points) - More granular
  if (startup.description) {
    if (startup.description.length > 200) {
      score += 10;
      reasons.push('+10: Very detailed description (200+ chars)');
    } else if (startup.description.length > 100) {
      score += 5;
      reasons.push('+5: Detailed description (100+ chars)');
    }
  }
  
  // Tagline quality (0-5 points)
  if (hasTagline && startup.tagline.length > 30) {
    score += 5;
    reasons.push('+5: Quality tagline');
  }
  
  return {
    score: Math.min(100, score),
    reasons,
    tier_recommendation: score < 30 ? 0 : score < 60 ? 1 : score < 80 ? 2 : 3,
  };
}

// ============================================================================
// TIER 2: BROWSER ENRICHMENT (Playwright/Stagehand)
// ============================================================================

/**
 * Tier 2: Browser-based enrichment (expensive)
 * Only called for high-potential startups
 */
async function tier2BrowserEnrichment(startup, options = {}) {
  const result = {
    success: false,
    fields_enriched: [],
    errors: [],
  };
  
  if (options.dryRun) {
    log.tier2(`[DRY RUN] Would browser-enrich: ${startup.name}`);
    return { ...result, success: true, dryRun: true };
  }
  
  // Check if Playwright/Stagehand is available
  try {
    // Try to fetch website meta tags with browser
    const url = startup.website;
    if (!url) {
      result.errors.push('No website URL');
      return result;
    }
    
    // For now, use simple fetch with timeout
    // In production, this would use Playwright/Stagehand
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(url.startsWith('http') ? url : `https://${url}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      result.errors.push(`HTTP ${response.status}`);
      return result;
    }
    
    const html = await response.text();
    
    // Extract meta description
    const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    
    if (metaMatch && metaMatch[1] && metaMatch[1].length > 30) {
      result.meta_description = metaMatch[1].trim();
      result.fields_enriched.push('meta_description');
    }
    
    // Extract title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      result.page_title = titleMatch[1].trim();
      result.fields_enriched.push('page_title');
    }
    
    // Extract JSON-LD
    const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([^<]+)<\/script>/i);
    if (jsonLdMatch) {
      try {
        result.json_ld = JSON.parse(jsonLdMatch[1]);
        result.fields_enriched.push('json_ld');
      } catch {}
    }
    
    // Extract social links
    const linkedinMatch = html.match(/href=["'](https?:\/\/(?:www\.)?linkedin\.com\/company\/[^"']+)["']/i);
    if (linkedinMatch) {
      result.linkedin_url = linkedinMatch[1];
      result.fields_enriched.push('linkedin_url');
    }
    
    const twitterMatch = html.match(/href=["'](https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^"']+)["']/i);
    if (twitterMatch) {
      result.twitter_url = twitterMatch[1];
      result.fields_enriched.push('twitter_url');
    }
    
    result.success = true;
    
  } catch (err) {
    result.errors.push(err.message);
  }
  
  return result;
}

// ============================================================================
// TIER 3: LLM ENRICHMENT (Most Expensive)
// ============================================================================

/**
 * Determine which fields need LLM enrichment
 */
function getScoreMovingMissingFields(startup, tier1Result, earlyGod) {
  const missing = [];
  
  // Check each score-moving field
  if (!startup.sectors || startup.sectors.length === 0) {
    if (!tier1Result?.category_primary || (typeof tier1Result.category_primary === 'object' && tier1Result.category_primary.confidence < 0.7)) {
      missing.push({ field: 'category', impact: 10, reason: 'Affects investor matching' });
    }
  }
  
  if (!startup.stage || startup.stage === 0 || startup.stage === 'Unknown') {
    if (!tier1Result?.stage_estimate || tier1Result.stage_estimate.confidence < 0.7) {
      missing.push({ field: 'stage', impact: 8, reason: 'Affects investor matching' });
    }
  }
  
  const tractionSignals = tier1Result?.traction_signals || [];
  if (tractionSignals.length === 0 && startup.description && startup.description.length > 100) {
    missing.push({ field: 'traction', impact: 15, reason: 'May have hidden traction signals' });
  }
  
  // Only return fields with impact >= threshold
  return missing.filter(m => m.impact >= CONFIG.SCORE_MOVING_THRESHOLD);
}

/**
 * Tier 3: LLM-based enrichment (very expensive)
 * Only called for top-tier startups with score-moving missing fields
 */
async function tier3LLMEnrichment(startup, missingFields, options = {}) {
  const result = {
    success: false,
    fields_enriched: [],
    errors: [],
    tokens_used: 0,
  };
  
  if (options.dryRun) {
    log.llm(`[DRY RUN] Would LLM-enrich ${missingFields.length} fields for: ${startup.name}`);
    return { ...result, success: true, dryRun: true };
  }
  
  // Check for OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    result.errors.push('No OPENAI_API_KEY configured');
    return result;
  }
  
  // Build focused prompt for only the missing fields
  const fieldsToExtract = missingFields.map(f => f.field).join(', ');
  
  const prompt = `Analyze this startup and extract ONLY these fields: ${fieldsToExtract}

Startup: ${startup.name}
Tagline: ${startup.tagline || 'N/A'}
Description: ${startup.description || 'N/A'}
Website: ${startup.website || 'N/A'}

Return JSON only:
{
  ${missingFields.map(f => `"${f.field}": "extracted value or null"`).join(',\n  ')}
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',  // Cheapest model that's still good
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0,
      }),
    });
    
    if (!response.ok) {
      result.errors.push(`OpenAI API error: ${response.status}`);
      return result;
    }
    
    const data = await response.json();
    result.tokens_used = data.usage?.total_tokens || 0;
    
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result.extracted = JSON.parse(jsonMatch[0]);
          result.fields_enriched = Object.keys(result.extracted).filter(k => result.extracted[k]);
          result.success = true;
        }
      } catch {
        result.errors.push('Failed to parse LLM response');
      }
    }
    
  } catch (err) {
    result.errors.push(err.message);
  }
  
  return result;
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Update startup with enriched data
 */
async function updateStartupWithEnrichment(startupId, enrichmentData, startup, options = {}) {
  if (options.dryRun) {
    log.info(`[DRY RUN] Would update startup ${startupId} with: ${Object.keys(enrichmentData).join(', ')}`);
    return true;
  }
  
  const updates = {};
  
  // Map enrichment data to database fields
  // Store new schema fields in extracted_data (backward compatible until migration runs)
  if (!updates.extracted_data) updates.extracted_data = startup.extracted_data || {};
  
  // Canonical domain (store in extracted_data - column doesn't exist yet)
  if (enrichmentData.canonical_domain) {
    updates.extracted_data.canonical_domain = enrichmentData.canonical_domain;
  }
  
  // Aliases (store in extracted_data)
  if (enrichmentData.aliases && enrichmentData.aliases.length > 0) {
    updates.extracted_data.aliases = enrichmentData.aliases;
  }
  
  // Stage (map to integer for current schema)
  if (enrichmentData.stage_estimate?.stage) {
    const stageMap = {
      'Pre-Seed': 1,
      'Seed': 2,
      'Series A': 3,
      'Series B': 4,
      'Series C+': 5,
    };
    updates.stage = stageMap[enrichmentData.stage_estimate.stage] || 2;
    // Store stage_estimate and confidence in extracted_data
    updates.extracted_data.stage_estimate = enrichmentData.stage_estimate.stage;
    updates.extracted_data.stage_confidence = enrichmentData.stage_estimate.confidence;
  }
  
  // Category/Sectors (use existing sectors column)
  if (enrichmentData.category_primary) {
    const category = typeof enrichmentData.category_primary === 'string' 
      ? enrichmentData.category_primary 
      : enrichmentData.category_primary.category || enrichmentData.category_primary;
    updates.sectors = [category, ...(enrichmentData.category_tags || [])].slice(0, 3);
    // Store category_primary in extracted_data
    updates.extracted_data.category_primary = category;
    updates.extracted_data.category_tags = enrichmentData.category_tags || [];
  }
  
  // Tagline/One-liner (use existing tagline column)
  if (enrichmentData.one_liner && !startup.tagline) {
    updates.tagline = enrichmentData.one_liner;
    updates.extracted_data.one_liner = enrichmentData.one_liner;
  }
  
  // Meta description (store in extracted_data)
  if (enrichmentData.meta_description) {
    updates.extracted_data.meta_description = enrichmentData.meta_description;
  }
  
  // Traction signals (store in extracted_data)
  if (enrichmentData.traction_signals?.length > 0) {
    updates.extracted_data.traction_signals = enrichmentData.traction_signals;
  }
  
  // Provenance tracking (store in extracted_data)
  if (enrichmentData.provenance) {
    updates.extracted_data.field_provenance = enrichmentData.provenance;
  }
  
  updates.updated_at = new Date().toISOString();
  
  // Only update fields that exist in current schema
  const safeUpdates = {
    stage: updates.stage,
    sectors: updates.sectors,
    tagline: updates.tagline,
    extracted_data: updates.extracted_data,
    updated_at: updates.updated_at
  };
  
  // Remove undefined fields
  Object.keys(safeUpdates).forEach(key => {
    if (safeUpdates[key] === undefined) {
      delete safeUpdates[key];
    }
  });
  
  if (Object.keys(safeUpdates).length === 0) {
    return true;
  }
  
  const { error } = await supabase
    .from('startup_uploads')
    .update(safeUpdates)
    .eq('id', startupId);
  
  if (error) {
    log.error(`Failed to update startup ${startupId}: ${error.message}`);
    return false;
  }
  
  return true;
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

/**
 * Process a single startup through the enrichment pipeline
 */
async function processStartup(startup, options = {}) {
  const startTime = Date.now();
  const stats = {
    startup_id: startup.id,
    startup_name: startup.name,
    tiers_used: [],
    cost_estimate: 0,
    fields_enriched: [],
    early_god_score: 0,
    final_tier: 0,
    duration_ms: 0,
  };
  
  try {
    // ========== TIER 0: Identity Gate ==========
    log.tier0(`Processing: ${startup.name}`);
    const tier0Result = await tier0IdentityGate(startup);
    stats.tiers_used.push(0);
    stats.cost_estimate += CONFIG.COSTS.TIER_0;
    
    if (!tier0Result.passed) {
      log.warn(`Identity gate failed for ${startup.name}: ${tier0Result.issues.join(', ')}`);
      stats.final_tier = 0;
      stats.duration_ms = Date.now() - startTime;
      return stats;
    }
    
    // Merge tier 0 results
    const enrichmentData = {
      canonical_domain: tier0Result.canonical_domain,
      aliases: tier0Result.aliases,
      provenance: {
        canonical_domain: { source: 'tier0_identity', timestamp: new Date().toISOString() },
      },
    };
    
    // ========== TIER 1: Inference Enrichment ==========
    log.tier1(`Running inference for: ${startup.name}`);
    const tier1Result = await tier1InferenceEnrichment(startup);
    stats.tiers_used.push(1);
    stats.cost_estimate += CONFIG.COSTS.TIER_1;
    stats.fields_enriched.push(...tier1Result.fields_enriched);
    
    // Calculate Early GOD score
    const earlyGod = calculateEarlyGodScore(startup, tier1Result);
    stats.early_god_score = earlyGod.score;
    
    log.info(`Early GOD Score: ${earlyGod.score}/100 (recommend tier ${earlyGod.tier_recommendation})`);
    
    // Merge tier 1 results
    Object.assign(enrichmentData, tier1Result);
    enrichmentData.provenance.stage = { source: 'tier1_inference', confidence: tier1Result.stage_estimate?.confidence };
    enrichmentData.provenance.category = { source: 'tier1_inference', confidence: tier1Result.category_primary?.confidence || 0.5 };
    
    // ========== GATING DECISION ==========
    if (options.forceTier !== undefined) {
      stats.final_tier = options.forceTier;
    } else if (earlyGod.score < CONFIG.TIER_1_THRESHOLD) {
      log.info(`Score ${earlyGod.score} < ${CONFIG.TIER_1_THRESHOLD} threshold - stopping at Tier 1`);
      stats.final_tier = 1;
    } else if (earlyGod.score < CONFIG.TIER_2_THRESHOLD) {
      log.info(`Score ${earlyGod.score} < ${CONFIG.TIER_2_THRESHOLD} - Tier 1 only`);
      stats.final_tier = 1;
    } else {
      // ========== TIER 2: Browser Enrichment ==========
      log.tier2(`Browser enrichment for: ${startup.name}`);
      const tier2Result = await tier2BrowserEnrichment(startup, options);
      stats.tiers_used.push(2);
      stats.cost_estimate += CONFIG.COSTS.TIER_2;
      stats.fields_enriched.push(...tier2Result.fields_enriched);
      stats.final_tier = 2;
      
      // Merge tier 2 results
      if (tier2Result.success) {
        if (tier2Result.meta_description) enrichmentData.meta_description = tier2Result.meta_description;
        if (tier2Result.linkedin_url) enrichmentData.linkedin_url = tier2Result.linkedin_url;
        if (tier2Result.twitter_url) enrichmentData.twitter_url = tier2Result.twitter_url;
        enrichmentData.provenance.meta_description = { source: 'tier2_browser', timestamp: new Date().toISOString() };
      }
      
      // ========== TIER 3: LLM (Only if score >= LLM_THRESHOLD) ==========
      if (earlyGod.score >= CONFIG.LLM_THRESHOLD) {
        const missingFields = getScoreMovingMissingFields(startup, tier1Result, earlyGod);
        
        if (missingFields.length > 0) {
          log.llm(`LLM enrichment for ${missingFields.length} score-moving fields: ${startup.name}`);
          const tier3Result = await tier3LLMEnrichment(startup, missingFields, options);
          stats.tiers_used.push(3);
          stats.cost_estimate += CONFIG.COSTS.LLM * (tier3Result.tokens_used / 1000);
          stats.fields_enriched.push(...tier3Result.fields_enriched);
          stats.final_tier = 3;
          
          // Merge tier 3 results
          if (tier3Result.success && tier3Result.extracted) {
            Object.assign(enrichmentData, tier3Result.extracted);
            for (const field of tier3Result.fields_enriched) {
              enrichmentData.provenance[field] = { source: 'tier3_llm', timestamp: new Date().toISOString() };
            }
          }
        }
      }
    }
    
    // ========== SAVE ENRICHMENT ==========
    enrichmentData.tier = stats.final_tier;
    await updateStartupWithEnrichment(startup.id, enrichmentData, startup, options);
    
    log.success(`Completed ${startup.name}: Tier ${stats.final_tier}, ${stats.fields_enriched.length} fields, $${stats.cost_estimate.toFixed(4)}`);
    
  } catch (err) {
    log.error(`Error processing ${startup.name}: ${err.message}`);
    stats.error = err.message;
  }
  
  stats.duration_ms = Date.now() - startTime;
  return stats;
}

/**
 * Get startups that need enrichment
 */
async function getStartupsToEnrich(limit = 50, startupId = null) {
  let query = supabase
    .from('startup_uploads')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  
  if (startupId) {
    query = query.eq('id', startupId);
  } else {
    // Prioritize startups that need enrichment (missing key fields)
    // Check if canonical_domain column exists, if not use website
    query = query
      .or('website.is.null,stage.is.null,sectors.is.null,tagline.is.null')
      .limit(limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    log.error(`Failed to fetch startups: ${error.message}`);
    return [];
  }
  
  // Filter out garbage names (very short, common words, etc.)
  const garbagePatterns = [
    /^(wars|stand|founder|stack|era|power|bank|greenstep|bid|in|with|the|a|an|and|or|but|for|to|of|at|by)$/i,
    /^.{1,2}$/, // 1-2 character names
    /^(era with|greenstep in)/i, // Phrase patterns
  ];
  
  const filtered = (data || []).filter(startup => {
    if (!startup.name || startup.name.length < 3) return false;
    const name = startup.name.trim();
    return !garbagePatterns.some(pattern => pattern.test(name));
  });
  
  if (filtered.length < (data?.length || 0)) {
    log.warn(`Filtered out ${(data?.length || 0) - filtered.length} garbage startup names`);
  }
  
  return filtered;
}

/**
 * Show pipeline statistics
 */
async function showStats() {
  log.section('ENRICHMENT PIPELINE STATISTICS');
  
  // Get counts by enrichment tier
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('website, stage, sectors, total_god_score, tagline, description')
    .eq('status', 'approved');
  
  const stats = {
    total: startups?.length || 0,
    with_website: startups?.filter(s => s.website && s.website.length > 5).length || 0,
    with_stage: startups?.filter(s => s.stage && s.stage > 0).length || 0,
    with_sectors: startups?.filter(s => s.sectors && s.sectors.length > 0).length || 0,
    with_tagline: startups?.filter(s => s.tagline && s.tagline.length > 20).length || 0,
    with_description: startups?.filter(s => s.description && s.description.length > 50).length || 0,
    with_god_score: startups?.filter(s => s.total_god_score > 0).length || 0,
  };
  
  const total = stats.total || 1; // Avoid division by zero
  
  console.log(`
📊 STARTUP ENRICHMENT STATUS
────────────────────────────
Total startups:           ${stats.total}
With website:             ${stats.with_website} (${Math.round(stats.with_website/total*100)}%)
With stage:               ${stats.with_stage} (${Math.round(stats.with_stage/total*100)}%)
With sectors:             ${stats.with_sectors} (${Math.round(stats.with_sectors/total*100)}%)
With tagline:             ${stats.with_tagline} (${Math.round(stats.with_tagline/total*100)}%)
With description:         ${stats.with_description} (${Math.round(stats.with_description/total*100)}%)
With GOD Score:           ${stats.with_god_score} (${Math.round(stats.with_god_score/total*100)}%)

💰 COST CONFIGURATION
────────────────────────────
Tier 1 threshold:    ${CONFIG.TIER_1_THRESHOLD} (below = stop)
Tier 2 threshold:    ${CONFIG.TIER_2_THRESHOLD} (above = browser)
LLM threshold:       ${CONFIG.LLM_THRESHOLD} (above = LLM allowed)
Score-moving min:    ${CONFIG.SCORE_MOVING_THRESHOLD} points
  `);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    dryRun: args.includes('--dry-run'),
    limit: parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '50'),
    forceTier: args.find(a => a.startsWith('--tier=')) ? parseInt(args.find(a => a.startsWith('--tier=')).split('=')[1]) : undefined,
    startupId: args.find(a => a.startsWith('--startup='))?.split('=')[1],
    showStats: args.includes('--stats'),
    daemon: args.includes('--daemon'),
  };
  
  log.section('🚀 ENRICHMENT ORCHESTRATOR');
  
  if (options.showStats) {
    await showStats();
    return;
  }
  
  if (options.dryRun) {
    log.warn('DRY RUN MODE - No changes will be made');
  }
  
  const runPipeline = async () => {
    const startups = await getStartupsToEnrich(options.limit, options.startupId);
    
    if (startups.length === 0) {
      log.info('No startups need enrichment');
      return;
    }
    
    log.info(`Processing ${startups.length} startups...`);
    
    const allStats = [];
    let totalCost = 0;
    
    for (const startup of startups) {
      const stats = await processStartup(startup, options);
      allStats.push(stats);
      totalCost += stats.cost_estimate;
      
      // Small delay between startups
      await new Promise(r => setTimeout(r, 100));
    }
    
    // Summary
    log.section('📊 PIPELINE SUMMARY');
    
    const tierCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const s of allStats) {
      tierCounts[s.final_tier] = (tierCounts[s.final_tier] || 0) + 1;
    }
    
    console.log(`
Processed:           ${allStats.length} startups
Total cost:          $${totalCost.toFixed(4)}
Avg cost/startup:    $${(totalCost / allStats.length).toFixed(5)}

By Final Tier:
  Tier 0 (stopped):   ${tierCounts[0]}
  Tier 1 (inference): ${tierCounts[1]}
  Tier 2 (browser):   ${tierCounts[2]}
  Tier 3 (LLM):       ${tierCounts[3]}

Avg Early GOD Score: ${(allStats.reduce((a, s) => a + s.early_god_score, 0) / allStats.length).toFixed(1)}
    `);
  };
  
  if (options.daemon) {
    log.info(`Running in daemon mode (every ${CONFIG.DAEMON_INTERVAL / 60000} minutes)`);
    
    await runPipeline();
    
    setInterval(async () => {
      log.section('🔄 DAEMON CYCLE');
      await runPipeline();
    }, CONFIG.DAEMON_INTERVAL);
    
    // Keep process alive in daemon mode
    log.info('Daemon mode active. Press Ctrl+C to stop.');
  } else {
    await runPipeline();
    // Explicitly exit after completion
    process.exit(0);
  }
}

// Run with proper error handling and exit
main()
  .then(() => {
    // Exit is handled in main() for non-daemon mode
    if (!process.argv.includes('--daemon')) {
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

