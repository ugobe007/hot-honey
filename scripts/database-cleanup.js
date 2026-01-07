#!/usr/bin/env node
/**
 * DATABASE CLEANUP SCRIPT
 * =======================
 * Removes low-quality data from Hot Match database:
 * 
 * 1. Public companies (IPO'd, acquired by public companies)
 * 2. Late-stage companies that should be public
 * 3. Errant investor names (test data, gibberish, incomplete)
 * 4. Illogical venture descriptions (AI garbage, placeholder text)
 * 5. Investor cards with no URL or value proposition
 * 
 * Usage:
 *   node scripts/database-cleanup.js --audit     # Show what would be deleted
 *   node scripts/database-cleanup.js --execute   # Actually delete records
 *   node scripts/database-cleanup.js --dry-run   # Alias for --audit
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================
// CLEANUP RULES
// ============================================

// 1. PUBLIC COMPANIES - Known IPO'd or major acquired companies
const PUBLIC_COMPANIES = [
  // Tech Giants
  'google', 'alphabet', 'meta', 'facebook', 'amazon', 'apple', 'microsoft', 
  'netflix', 'nvidia', 'tesla', 'twitter', 'x corp', 'uber', 'lyft', 'airbnb',
  'doordash', 'instacart', 'coinbase', 'robinhood', 'affirm', 'toast',
  'snowflake', 'datadog', 'cloudflare', 'crowdstrike', 'okta', 'twilio',
  'zoom', 'docusign', 'dropbox', 'slack', 'salesforce', 'oracle', 'sap',
  'ibm', 'intel', 'amd', 'qualcomm', 'broadcom', 'cisco', 'vmware',
  'palantir', 'splunk', 'servicenow', 'workday', 'adobe', 'autodesk',
  'intuit', 'paypal', 'square', 'block', 'stripe', 'shopify', 'wix',
  'squarespace', 'hubspot', 'zendesk', 'atlassian', 'asana', 'monday.com',
  'gitlab', 'github', 'linkedin', 'indeed', 'glassdoor', 'yelp',
  'tripadvisor', 'booking.com', 'expedia', 'zillow', 'redfin', 'opendoor',
  'carvana', 'vroom', 'peloton', 'fitbit', 'gopro', 'sonos', 'roku',
  'spotify', 'pandora', 'soundcloud', 'tiktok', 'bytedance', 'snap',
  'snapchat', 'pinterest', 'reddit', 'discord', 'roblox', 'unity',
  'electronic arts', 'ea', 'activision', 'blizzard', 'take-two', 'zynga',
  'doximity', 'teladoc', 'livongo', 'amwell', '23andme', 'grail',
  'moderna', 'biontech', 'illumina', 'exact sciences', 'guardant',
  
  // Fintech Public
  'visa', 'mastercard', 'american express', 'amex', 'discover',
  'sofi', 'lemonade', 'root insurance', 'metromile', 'hippo',
  'marqeta', 'bill.com', 'flywire', 'payoneer', 'remitly',
  
  // E-commerce Public
  'etsy', 'wayfair', 'chewy', 'wish', 'poshmark', 'thredup',
  'farfetch', 'revolve', 'stitch fix', 'rent the runway',
  
  // Food/Delivery Public
  'grubhub', 'just eat', 'deliveroo', 'sweetgreen', 'shake shack',
  'chipotle', 'dominos', 'papa johns', 'wingstop', 'dutch bros',
  
  // Acquired by Big Tech (no longer startups)
  'youtube', 'instagram', 'whatsapp', 'oculus', 'giphy', 'fitbit',
  'nest', 'waze', 'mandiant', 'figma', 'activision blizzard',
  'whole foods', 'mgm', 'one medical', 'irobot', 'ring', 'eero',
  'twitch', 'audible', 'goodreads', 'imdb', 'zappos', 'pillpack',
  
  // Chinese Tech Giants
  'alibaba', 'tencent', 'baidu', 'jd.com', 'pinduoduo', 'meituan',
  'didi', 'nio', 'xpeng', 'li auto', 'bilibili', 'weibo',
  
  // Other Major Public
  'stubhub', 'ticketmaster', 'eventbrite', 'surveymonkey', 'momentive',
  'duolingo', 'coursera', 'udemy', 'chegg', '2u', 'instructure',
  'procore', 'samsara', 'braze', 'amplitude', 'applovin', 'ironsource',
  'digitalocean', 'linode', 'heroku', 'mongodb', 'elastic', 'confluent',
  'hashicorp', 'jfrog', 'sumo logic', 'new relic', 'dynatrace',
];

// 2. LATE STAGE INDICATORS - Companies that raised too much to be "startups"
const LATE_STAGE_PATTERNS = [
  /series [d-z]/i,
  /series [d-z]\+/i,
  /\$[5-9]\d{2}m/i,        // $500M+
  /\$[1-9]\d{3}m/i,        // $1B+
  /\$\d+(\.\d+)?\s*b/i,    // $XB (billions)
  /ipo/i,
  /going public/i,
  /pre-ipo/i,
  /spac/i,
  /unicorn/i,
  /decacorn/i,
];

// 3. ERRANT INVESTOR NAME PATTERNS
const BAD_INVESTOR_PATTERNS = [
  /^test/i,
  /^demo/i,
  /^sample/i,
  /^example/i,
  /^asdf/i,
  /^qwerty/i,
  /^xxx/i,
  /^aaa+$/i,
  /^investor\s*\d*$/i,
  /^vc\s*\d*$/i,
  /^angel\s*\d*$/i,
  /^fund\s*\d*$/i,
  /^user\s*\d*$/i,
  /^null$/i,
  /^undefined$/i,
  /^n\/a$/i,
  /^\s*$/,
  // Removed: /^[a-z]{2}$/i - too aggressive, 2-letter companies can be legitimate (CI, TV, etc.)
  /^[^a-z]*$/i,            // No letters at all
  /lorem ipsum/i,
  /placeholder/i,
  /coming soon/i,
  /tbd/i,
  /unknown/i,
];

// 3b. GARBAGE STARTUP NAME PATTERNS
// Only flag CLEAR garbage - be conservative to avoid false positives
const BAD_STARTUP_PATTERNS = [
  // Obvious test/demo names (exact matches only - not prefixes)
  /^test\s*$/i,              // Only "test" exactly, not "TestAI"
  /^demo\s*$/i,
  /^sample\s*$/i,
  /^example\s*$/i,
  /^asdf\s*$/i,
  /^qwerty\s*$/i,
  /^xxx\s*$/i,
  /^aaa+\s*$/i,
  /^startup\s*\d+\s*$/i,
  /^company\s*\d+\s*$/i,
  /^null\s*$/i,
  /^undefined\s*$/i,
  /^n\/a\s*$/i,
  /^\s*$/,
  /^[a-z]\s*$/i,              // Single letter only
  /^[^a-z]*\s*$/i,            // No letters at all (just numbers/symbols)
  /lorem ipsum/i,
  /placeholder/i,
  /coming soon/i,
  /tbd\s*$/i,
  /unknown\s*$/i,
  
  // CLEAR article fragments (very specific patterns)
  /priced\s+the/i,            // "Mistral priced the" (article fragment)
  /\s+as\s+he\s*$/i,          // Ends with "as he" (article fragment)
  /'s\s+gets/i,               // Possessive + verb (e.g., "Week's Gets")
  /^of\s+new\s*$/i,           // "of New" (article fragment)
  /^week's\s*$/i,             // "Week's" (article fragment)
  /^intends\s+to\s+use/i,     // "intends to use the capital" (article fragment)
  /^ago\s+/i,                 // "ago HIG Capital" (article fragment)
  /^year\s+letter/i,          // "Year Letter from" (article fragment)
  /^and\s+supporting/i,       // "and supporting the" (article fragment)
  /^m\s+in\s+fund\s*$/i,       // "M in Fund" (article fragment)
  /^ai\s+bejul/i,             // "ai Bejul" (article fragment)
  /^bellgeneral/i,            // "BellGeneral" (concatenated text)
  /^investor\s+relations/i,   // "Investor Relations" (page section)
  /^linexecutive/i,           // "LinExecutive" (concatenated text)
  /^external\s+affairs/i,      // "External Affairs" (page section)
  /^qwen\s+image\s+to/i,      // "Qwen Image to LoRA" (article about Qwen)
  /^mistral\s+priced/i,       // "Mistral priced the" (article fragment)
  /^finnish\s+iceye/i,        // "Finnish ICEYE" (article fragment)
  /^india's\s+/i,             // "India's Aryaag" (article fragment)
  /^'destiny'\s+gets/i,       // "'Destiny' Gets" (article fragment)
  /^every\s+answer/i,         // "Every answer" (article fragment)
  
  // Very specific article patterns (2-word fragments that are clearly articles)
  /^(can|with)\s+[A-Z][a-z]+\s*$/i, // "Can Europe", "With Nvidia" (2 words only, article fragments)
  
  // Common article starters that are clearly not company names (when followed by article words)
  /^(new|every|week|week's|month|year|day|today|yesterday|tomorrow|this|that|these|those)\s+(answer|article|news|update|report|story|gets|got)\s/i,
  /^(gets|got|getting|received|announces|announced|raises|raised|closes|closed|launches|launched)\s+(funding|capital|round|series|a|an|the)\s/i,
];

// 4. ILLOGICAL/GARBAGE DESCRIPTION PATTERNS
const BAD_DESCRIPTION_PATTERNS = [
  /technology company that appears/i,
  /appears to have/i,
  /appears to be/i,
  /seems to be/i,
  /information is limited/i,
  /not much is known/i,
  /details are scarce/i,
  /no information available/i,
  /unable to determine/i,
  /could not find/i,
  /placeholder/i,
  /lorem ipsum/i,
  /test description/i,
  /sample text/i,
  /coming soon/i,
  /under construction/i,
  /website under/i,
  /check back later/i,
  /more details coming/i,
  /discovered from/i,
  /scraped from/i,
  /extracted from/i,
  /\[insert/i,
  /\{company/i,
  /\{\{/,
  /\}\}/,
  /null|undefined|NaN/,
  /^[.\s]*$/,              // Only dots and spaces
  /^n\/a$/i,
  /^-+$/,                  // Only dashes
  /asdf|qwerty|zxcv/i,
];

// 5. MINIMUM REQUIREMENTS FOR INVESTORS
const INVESTOR_MIN_REQUIREMENTS = {
  needsWebsiteOrLinkedin: true,
  needsBioOrThesis: true,
  minBioLength: 20,
  needsSectors: true,
};

// ============================================
// CLEANUP FUNCTIONS
// ============================================

const stats = {
  publicCompanies: [],
  lateStage: [],
  badStartupNames: [],
  badInvestorNames: [],
  badDescriptions: [],
  incompleteInvestors: [],
};

/**
 * Check if a startup is a public company
 */
function isPublicCompany(startup) {
  const name = (startup.name || '').toLowerCase().trim();
  const description = (startup.description || startup.tagline || '').toLowerCase();
  
  // More precise matching: whole word or exact match only
  for (const publicCo of PUBLIC_COMPANIES) {
    // Exact match (case-insensitive)
    if (name === publicCo) {
      return { match: true, reason: `Exact name match: ${publicCo}` };
    }
    
    // Whole word match (not substring) - e.g., "intel" matches "Intel" but not "intelligent"
    const wordBoundaryRegex = new RegExp(`\\b${publicCo}\\b`, 'i');
    if (wordBoundaryRegex.test(name)) {
      // Additional check: if the name is longer, make sure it's not a false positive
      // Only match if publicCo is at the start or end, or if it's a reasonable compound
      const nameLower = name.toLowerCase();
      if (nameLower.startsWith(publicCo + ' ') || nameLower.endsWith(' ' + publicCo) || 
          nameLower === publicCo || nameLower.startsWith(publicCo + '-') || 
          nameLower.endsWith('-' + publicCo)) {
        // But exclude if it's clearly a different company (e.g., "GitLab CI" is about GitLab, but "CI" alone isn't GitLab)
        // If the name is much longer than the public company name, be more careful
        if (name.length <= publicCo.length + 5) {
          return { match: true, reason: `Name contains public company: ${publicCo}` };
        }
        // For longer names, only match if publicCo is at the very start
        if (nameLower.startsWith(publicCo + ' ')) {
          return { match: true, reason: `Name starts with public company: ${publicCo}` };
        }
      }
    }
  }
  
  // Check if description mentions IPO/public
  if (/\bipo\b/i.test(description) || /went public/i.test(description) || 
      /publicly traded/i.test(description) || /nasdaq|nyse/i.test(description)) {
    return { match: true, reason: 'Description indicates public company' };
  }
  
  return { match: false };
}

/**
 * Check if startup name is garbage/invalid
 */
function isBadStartupName(startup) {
  const name = (startup.name || '').trim();
  
  if (!name || name.length < 2) {
    return { match: true, reason: 'Name too short or empty' };
  }
  
  for (const pattern of BAD_STARTUP_PATTERNS) {
    if (pattern.test(name)) {
      return { match: true, reason: `Name matches garbage pattern: ${pattern}` };
    }
  }
  
  // Check if name is just numbers or symbols (no letters)
  if (/^[^a-z]*$/i.test(name.trim())) {
    return { match: true, reason: 'Name contains no letters (only numbers/symbols)' };
  }
  
  // Check if name is too long (likely article title) - be conservative
  if (name.length > 150) {
    return { match: true, reason: `Name too long (${name.length} chars) - likely article title` };
  }
  
  // Check if name has too many words (likely article title) - be conservative
  const wordCount = name.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount > 12) {
    return { match: true, reason: `Name has too many words (${wordCount}) - likely article title` };
  }
  
  // Only flag longer names if they have VERY clear article patterns
  if (wordCount > 7) {
    // Very specific article patterns for long names
    if (/^(the|a|an|of|in|on|at|by|with|from|as|is|was|are|were|be|been|being|have|has|had|do|does|did|will|would|should|could|may|might|must|can)\s+[a-z]+\s+(the|a|an|of|in|on|at|by|with|from|as|is|was|are|were|be|been|being|have|has|had|do|does|did|will|would|should|could|may|might|must|can)\s+/i.test(name)) {
      return { match: true, reason: `Name has multiple article words and ${wordCount} words - likely article title` };
    }
  }
  
  return { match: false };
}

/**
 * Check if a startup is late stage
 */
function isLateStage(startup) {
  // Handle stage as string or array
  let stageStr = '';
  if (Array.isArray(startup.stage)) {
    stageStr = startup.stage.join(' ').toLowerCase();
  } else if (startup.stage) {
    stageStr = String(startup.stage).toLowerCase();
  }
  
  const description = (startup.description || startup.tagline || '').toLowerCase();
  const raiseAmount = startup.raise_amount || '';
  const name = (startup.name || '').toLowerCase();
  
  // Skip if name is clearly garbage (article fragment) - these should be caught by garbage name detection
  const garbageNamePatterns = [
    /^week's$/i,
    /^race$/i,
    /^european$/i,
    /^india's\s+/i,
    /^'destiny'\s+gets/i,
  ];
  for (const pattern of garbageNamePatterns) {
    if (pattern.test(name)) {
      return { match: false }; // Don't flag as late-stage if it's garbage
    }
  }
  
  for (const pattern of LATE_STAGE_PATTERNS) {
    if (pattern.test(stageStr) || pattern.test(description) || pattern.test(String(raiseAmount))) {
      return { match: true, reason: `Late stage indicator: ${pattern}` };
    }
  }
  
  // Check funding amount (parse from raise_amount string like "$500M")
  const fundingMatch = String(raiseAmount).match(/\$?([\d.]+)\s*(m|b)/i);
  if (fundingMatch) {
    let funding = parseFloat(fundingMatch[1]);
    if (fundingMatch[2].toLowerCase() === 'b') funding *= 1000; // Convert billions to millions
    if (funding > 500) { // Over $500M
      return { match: true, reason: `Funding too high: $${funding}M` };
    }
  }
  
  return { match: false };
}

/**
 * Check if investor name is errant/invalid
 */
function isBadInvestorName(investor) {
  const name = (investor.name || '').trim();
  
  if (!name || name.length < 2) {
    return { match: true, reason: 'Name too short or empty' };
  }
  
  for (const pattern of BAD_INVESTOR_PATTERNS) {
    if (pattern.test(name)) {
      return { match: true, reason: `Name matches bad pattern: ${pattern}` };
    }
  }
  
  // Check if name is just numbers
  if (/^\d+$/.test(name)) {
    return { match: true, reason: 'Name is only numbers' };
  }
  
  return { match: false };
}

/**
 * Check if description is illogical/garbage
 */
function isBadDescription(record) {
  const description = (record.description || record.tagline || record.bio || '').trim();
  
  if (!description) {
    return { match: false }; // Empty is handled elsewhere
  }
  
  for (const pattern of BAD_DESCRIPTION_PATTERNS) {
    if (pattern.test(description)) {
      return { match: true, reason: `Description matches garbage pattern: ${pattern}` };
    }
  }
  
  // Check if description is too short to be useful
  if (description.length < 10) {
    return { match: true, reason: `Description too short: ${description.length} chars` };
  }
  
  return { match: false };
}

/**
 * Check if investor card is incomplete
 */
function isIncompleteInvestor(investor) {
  const reasons = [];
  
  // Check website/linkedin (use blog_url since website doesn't exist)
  if (INVESTOR_MIN_REQUIREMENTS.needsWebsiteOrLinkedin) {
    const hasWebsite = investor.blog_url;
    const hasLinkedin = investor.linkedin_url;
    if (!hasWebsite && !hasLinkedin) {
      reasons.push('No website or LinkedIn URL');
    }
  }
  
  // Check bio/thesis
  if (INVESTOR_MIN_REQUIREMENTS.needsBioOrThesis) {
    const bio = investor.bio || investor.investment_thesis || '';
    if (bio.length < INVESTOR_MIN_REQUIREMENTS.minBioLength) {
      reasons.push(`Bio/thesis too short: ${bio.length} chars`);
    }
  }
  
  // Check sectors
  if (INVESTOR_MIN_REQUIREMENTS.needsSectors) {
    const sectors = investor.sectors || [];
    if (!sectors.length || sectors.length === 0) {
      reasons.push('No sectors defined');
    }
  }
  
  if (reasons.length > 0) {
    return { match: true, reasons };
  }
  
  return { match: false };
}

// ============================================
// MAIN AUDIT/CLEANUP FUNCTIONS
// ============================================

async function auditStartups() {
  console.log('\n📊 Auditing startups...');
  
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, description, tagline, stage, raise_amount, status');
  
  if (error) {
    console.error('Error fetching startups:', error);
    return;
  }
  
  console.log(`   Found ${startups.length} total startups`);
  
  for (const startup of startups) {
    // Check bad name first (garbage detection)
    const nameCheck = isBadStartupName(startup);
    if (nameCheck.match) {
      stats.badStartupNames.push({
        id: startup.id,
        name: startup.name,
        reason: nameCheck.reason,
      });
      continue; // Skip other checks for garbage names
    }
    
    // Check public company
    const publicCheck = isPublicCompany(startup);
    if (publicCheck.match) {
      stats.publicCompanies.push({
        id: startup.id,
        name: startup.name,
        reason: publicCheck.reason,
      });
    }
    
    // Check late stage
    const lateCheck = isLateStage(startup);
    if (lateCheck.match && !publicCheck.match) {
      stats.lateStage.push({
        id: startup.id,
        name: startup.name,
        reason: lateCheck.reason,
      });
    }
    
    // Check bad description
    const descCheck = isBadDescription(startup);
    if (descCheck.match) {
      stats.badDescriptions.push({
        id: startup.id,
        name: startup.name,
        type: 'startup',
        reason: descCheck.reason,
      });
    }
  }
}

async function auditInvestors() {
  console.log('\n📊 Auditing investors...');
  
  const { data: investors, error } = await supabase
    .from('investors')
    .select('id, name, firm, bio, investment_thesis, sectors, blog_url, linkedin_url');
  
  if (error) {
    console.error('Error fetching investors:', error);
    return;
  }
  
  console.log(`   Found ${investors.length} total investors`);
  
  for (const investor of investors) {
    // Check bad name
    const nameCheck = isBadInvestorName(investor);
    if (nameCheck.match) {
      stats.badInvestorNames.push({
        id: investor.id,
        name: investor.name,
        firm: investor.firm,
        reason: nameCheck.reason,
      });
    }
    
    // Check bad description
    const descCheck = isBadDescription(investor);
    if (descCheck.match) {
      stats.badDescriptions.push({
        id: investor.id,
        name: investor.name,
        type: 'investor',
        reason: descCheck.reason,
      });
    }
    
    // Check incomplete
    const incompleteCheck = isIncompleteInvestor(investor);
    if (incompleteCheck.match) {
      stats.incompleteInvestors.push({
        id: investor.id,
        name: investor.name,
        firm: investor.firm,
        reasons: incompleteCheck.reasons,
      });
    }
  }
}

function printReport() {
  console.log('\n' + '='.repeat(70));
  console.log('📋 DATABASE CLEANUP REPORT');
  console.log('='.repeat(70));
  
  // 1. Bad Startup Names (Garbage)
  console.log('\n🗑️  GARBAGE STARTUP NAMES TO REMOVE:', stats.badStartupNames.length);
  if (stats.badStartupNames.length > 0) {
    stats.badStartupNames.slice(0, 20).forEach(s => {
      console.log(`   • "${s.name}" - ${s.reason}`);
    });
    if (stats.badStartupNames.length > 20) {
      console.log(`   ... and ${stats.badStartupNames.length - 20} more`);
    }
  }
  
  // 2. Public Companies
  console.log('\n🏢 PUBLIC COMPANIES TO REMOVE:', stats.publicCompanies.length);
  if (stats.publicCompanies.length > 0) {
    stats.publicCompanies.slice(0, 20).forEach(s => {
      console.log(`   • ${s.name} - ${s.reason}`);
    });
    if (stats.publicCompanies.length > 20) {
      console.log(`   ... and ${stats.publicCompanies.length - 20} more`);
    }
  }
  
  // 3. Late Stage
  console.log('\n🚀 LATE-STAGE COMPANIES TO REMOVE:', stats.lateStage.length);
  if (stats.lateStage.length > 0) {
    stats.lateStage.slice(0, 20).forEach(s => {
      console.log(`   • ${s.name} - ${s.reason}`);
    });
    if (stats.lateStage.length > 20) {
      console.log(`   ... and ${stats.lateStage.length - 20} more`);
    }
  }
  
  // 4. Bad Investor Names
  console.log('\n👤 ERRANT INVESTOR NAMES TO REMOVE:', stats.badInvestorNames.length);
  if (stats.badInvestorNames.length > 0) {
    stats.badInvestorNames.slice(0, 20).forEach(i => {
      console.log(`   • "${i.name}" (${i.firm || 'no firm'}) - ${i.reason}`);
    });
    if (stats.badInvestorNames.length > 20) {
      console.log(`   ... and ${stats.badInvestorNames.length - 20} more`);
    }
  }
  
  // 5. Bad Descriptions
  console.log('\n📝 ILLOGICAL DESCRIPTIONS:', stats.badDescriptions.length);
  const startupBadDesc = stats.badDescriptions.filter(d => d.type === 'startup');
  const investorBadDesc = stats.badDescriptions.filter(d => d.type === 'investor');
  console.log(`   Startups: ${startupBadDesc.length}, Investors: ${investorBadDesc.length}`);
  if (stats.badDescriptions.length > 0) {
    stats.badDescriptions.slice(0, 10).forEach(d => {
      console.log(`   • [${d.type}] ${d.name} - ${d.reason}`);
    });
    if (stats.badDescriptions.length > 10) {
      console.log(`   ... and ${stats.badDescriptions.length - 10} more`);
    }
  }
  
  // 6. Incomplete Investors
  console.log('\n⚠️  INCOMPLETE INVESTOR CARDS:', stats.incompleteInvestors.length);
  if (stats.incompleteInvestors.length > 0) {
    stats.incompleteInvestors.slice(0, 20).forEach(i => {
      console.log(`   • ${i.name} (${i.firm || 'no firm'}) - ${i.reasons.join(', ')}`);
    });
    if (stats.incompleteInvestors.length > 20) {
      console.log(`   ... and ${stats.incompleteInvestors.length - 20} more`);
    }
  }
  
  // Summary
  const totalStartupsToRemove = stats.badStartupNames.length + stats.publicCompanies.length + stats.lateStage.length;
  const totalInvestorsToRemove = stats.badInvestorNames.length + stats.incompleteInvestors.length;
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  console.log(`   Startups to remove:  ${totalStartupsToRemove}`);
  console.log(`   Investors to remove: ${totalInvestorsToRemove}`);
  console.log(`   Descriptions to fix: ${stats.badDescriptions.length}`);
  console.log('='.repeat(70));
  
  return {
    totalStartupsToRemove,
    totalInvestorsToRemove,
    badDescriptions: stats.badDescriptions.length,
  };
}

async function executeCleanup() {
  console.log('\n🗑️  EXECUTING CLEANUP...');
  
  let deletedStartups = 0;
  let deletedInvestors = 0;
  let deletedMatches = 0;
  
  // Collect all startup IDs to delete
  const startupIdsToDelete = [
    ...stats.badStartupNames.map(s => s.id),
    ...stats.publicCompanies.map(s => s.id),
    ...stats.lateStage.map(s => s.id),
  ];
  
  // Collect all investor IDs to delete
  const investorIdsToDelete = [
    ...stats.badInvestorNames.map(i => i.id),
    ...stats.incompleteInvestors.map(i => i.id),
  ];
  
  // Remove duplicates
  const uniqueStartupIds = [...new Set(startupIdsToDelete)];
  const uniqueInvestorIds = [...new Set(investorIdsToDelete)];
  
  // Delete matches first (foreign key constraints) - in smaller batches
  if (uniqueStartupIds.length > 0) {
    console.log(`\n   Deleting matches for ${uniqueStartupIds.length} startups...`);
    // Delete matches in batches of 25 to avoid timeouts
    for (let i = 0; i < uniqueStartupIds.length; i += 25) {
      const batch = uniqueStartupIds.slice(i, i + 25);
      const { error: matchError1 } = await supabase
        .from('startup_investor_matches')
        .delete()
        .in('startup_id', batch);
      
      if (matchError1) {
        console.error(`   Error deleting startup matches batch ${i}-${i + batch.length}:`, matchError1.message);
      } else {
        deletedMatches += batch.length;
      }
    }
  }
  
  if (uniqueInvestorIds.length > 0) {
    console.log(`   Deleting matches for ${uniqueInvestorIds.length} investors...`);
    // Delete matches in batches of 10 to avoid timeouts (investors have many matches)
    for (let i = 0; i < uniqueInvestorIds.length; i += 10) {
      const batch = uniqueInvestorIds.slice(i, i + 10);
      const { error: matchError2 } = await supabase
        .from('startup_investor_matches')
        .delete()
        .in('investor_id', batch);
      
      if (matchError2) {
        console.error(`   Error deleting investor matches batch ${i}-${i + batch.length}:`, matchError2.message);
      } else {
        deletedMatches += batch.length;
      }
    }
  }
  
  // Delete queue entries for startups
  if (uniqueStartupIds.length > 0) {
    console.log(`   Deleting queue entries for ${uniqueStartupIds.length} startups...`);
    const { error: queueError } = await supabase
      .from('matching_queue')
      .delete()
      .in('startup_id', uniqueStartupIds);
    
    if (queueError) {
      console.error('   Error deleting queue entries:', queueError.message);
    }
  }
  
  // Delete startups
  if (uniqueStartupIds.length > 0) {
    console.log(`\n   Deleting ${uniqueStartupIds.length} startups...`);
    
    // Delete in batches of 50
    for (let i = 0; i < uniqueStartupIds.length; i += 50) {
      const batch = uniqueStartupIds.slice(i, i + 50);
      const { error } = await supabase
        .from('startup_uploads')
        .delete()
        .in('id', batch);
      
      if (error) {
        console.error(`   Error deleting startup batch ${i}-${i + batch.length}:`, error.message);
      } else {
        deletedStartups += batch.length;
        process.stdout.write(`\r   Deleted ${deletedStartups}/${uniqueStartupIds.length} startups`);
      }
    }
    console.log();
  }
  
  // Delete investors
  if (uniqueInvestorIds.length > 0) {
    console.log(`\n   Deleting ${uniqueInvestorIds.length} investors...`);
    
    // Delete in smaller batches of 10 to avoid timeouts
    for (let i = 0; i < uniqueInvestorIds.length; i += 10) {
      const batch = uniqueInvestorIds.slice(i, i + 10);
      const { error } = await supabase
        .from('investors')
        .delete()
        .in('id', batch);
      
      if (error) {
        console.error(`   Error deleting investor batch ${i}-${i + batch.length}:`, error.message);
        // Continue with next batch even if one fails
      } else {
        deletedInvestors += batch.length;
        process.stdout.write(`\r   Deleted ${deletedInvestors}/${uniqueInvestorIds.length} investors`);
      }
      
      // Small delay between batches to avoid overwhelming the database
      if (i + 10 < uniqueInvestorIds.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    console.log();
  }
  
  console.log('\n✅ CLEANUP COMPLETE');
  console.log(`   Startups deleted:  ${deletedStartups}`);
  console.log(`   Investors deleted: ${deletedInvestors}`);
  
  return { deletedStartups, deletedInvestors };
}

// ============================================
// MAIN
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const isExecute = args.includes('--execute');
  const isAudit = args.includes('--audit') || args.includes('--dry-run') || !isExecute;
  
  console.log('\n' + '🔥'.repeat(30));
  console.log('   HOT MATCH DATABASE CLEANUP');
  console.log('🔥'.repeat(30));
  console.log(`\n   Mode: ${isExecute ? '⚠️  EXECUTE (will delete data)' : '👁️  AUDIT (dry run)'}`);
  
  // Run audits
  await auditStartups();
  await auditInvestors();
  
  // Print report
  const summary = printReport();
  
  // Execute if requested
  if (isExecute) {
    console.log('\n⚠️  WARNING: This will permanently delete data!');
    console.log('   Press Ctrl+C within 5 seconds to cancel...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await executeCleanup();
  } else {
    console.log('\n💡 To execute cleanup, run:');
    console.log('   node scripts/database-cleanup.js --execute\n');
  }
}

main().catch(console.error);

