#!/usr/bin/env node
/**
 * Simple RSS Feed Scraper
 * 
 * Scrapes RSS feeds WITHOUT AI - just extracts headlines and links.
 * Then we can enrich later with AI when credits are available.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Parser = require('rss-parser');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Export extractCompanyName for use in tiered-scraper-pipeline.js
module.exports = { extractCompanyName };

const parser = new Parser({
  timeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; HotMatchBot/1.0)',
    'Accept': 'application/rss+xml, application/xml, text/xml'
  }
});

// Keywords that indicate startup/funding news
const STARTUP_KEYWORDS = [
  'startup', 'funding', 'raised', 'series', 'seed', 'venture', 'launches',
  'founded', 'valuation', 'investment', 'investor', 'accelerator', 'incubator',
  'ai startup', 'fintech', 'healthtech', 'saas', 'million', 'billion'
];

// Extract company name from title (improved heuristics - only real company names)
function extractCompanyName(title) {
  if (!title || title.length < 5) return null;
  
  // Common words that are NOT company names (extensive list)
  const skipWords = new Set([
    // Articles and pronouns
    'the', 'a', 'an', 'this', 'that', 'these', 'those', 'our', 'your', 'their', 'my', 'his', 'her', 'its',
    // Question words
    'how', 'what', 'why', 'when', 'where', 'who', 'which',
    // Months
    'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
    // Common verbs/adjectives
    'talking', 'turning', 'competing', 'almost', 'even', 'new', 'old', 'big', 'small', 'dear', 'meet', 'welcoming',
    'congratulations', 'demo', 'reflections', 'abundant', 'gentle', 'quirky', 'rules', 'millions', 'billions',
    'partnerships', 'highlights', 'race', 'rapidly', 'empire', 'open', 'four', 'six', 'three', 'two', 'one', 'five',
    'seven', 'eight', 'nine', 'ten', 'first', 'second', 'third', 'last', 'next', 'previous',
    // Contractions
    'i\'ve', 'we\'re', 'what\'s', 'equity\'s', 'nvidia\'s', 'obsidian\'s', 'sweden\'s', 'it\'s', 'that\'s', 'there\'s',
    // Locations/adjectives
    'estonian', 'lithuanian', 'danish', 'swedish', 'indian', 'indian', 'india',
    // Common nouns
    'college', 'investors', 'vcs', 'funding', 'investment', 'startup', 'startups', 'company', 'companies',
    // Personal names (common first names that appear in titles)
    'jakub', 'ankit', 'dalton', 'tyler', 'sam', 'paul', 'john', 'jane', 'mike', 'dave',
    // Other common words
    'gpt-4o', 'gpt', 'chatgpt', 'ai', 'ml', 'saas', 'api',
    // Generic words that are NOT company names
    'mvps', 'mvp', 'resource', 'constraints', 'leadership', 'tips', 'transit', 'tech', 'show', 'hn', 'build', 'building',
    'modern', 'inside', 'wellbeing', 'benefits', 'healthcare', 'data', 'digital', 'fintech', 'every', 'fusion',
    'equity', 'dropout', 'moved', 'out', 'clicks', 'click', 'much', 'slc', 'zork', 'golden', 'team', 'culture',
    'investor', 'updates', 'launches', 'launch', 'saastr', 'european', 'software', 'tin', 'can', 'investments',
    'battlefield', 'and', 'most', 'coveted', 'startup', 'era', 'with', 'sandbar', 'stand', 'wars', 'break',
    'power', 'bank', 'finnish', 'swedish', 'estonian', 'danish'
  ]);
  
  // Generic single words that are NEVER company names
  const genericSingleWords = new Set([
    'building', 'modern', 'inside', 'outside', 'above', 'below', 'before', 'after', 'during', 'while',
    'mvps', 'mvp', 'tips', 'benefits', 'data', 'digital', 'fintech', 'tech', 'ai', 'ml', 'saas',
    'show', 'build', 'moved', 'out', 'in', 'on', 'at', 'for', 'with', 'about', 'from', 'to',
    'every', 'some', 'any', 'all', 'each', 'both', 'few', 'many', 'most', 'other', 'such',
    'transit', 'healthcare', 'wellbeing', 'equity', 'fusion', 'dropout', 'constraints', 'resource',
    'leadership', 'college', 'university', 'school', 'education', 'learning', 'click',
    // Note: Removed 'clicks' - "Clicks" is a valid company name
    'healthcare\'s', 'healthcare', 'much', 'slc', 'zork', 'golden', 'team', 'culture', 'investor',
    'updates', 'launches', 'launch', 'saastr', 'european', 'software', 'zork golden',
    'team culture', 'investor updates', 'investments', 'battlefield', 'and', 'coveted', 'startup',
    'era', 'sandbar', 'stand', 'wars', 'break', 'power', 'bank', 'finnish', 'swedish', 'estonian', 'danish'
    // Note: Removed 'tin' and 'can' - "Tin Can" is a valid company name
    // Note: Removed 'clicks' - "Clicks" is a valid company name
  ]);
  
  // Generic phrases that are NOT company names
  const genericPhrases = new Set([
    'most coveted startup', 'era with sandbar', 'power bank', 'tin can', 'finnish rundit',
    'swedish lovable', 'estonian mydello', 'danish evodiabio'
  ]);
  
  // Strong patterns that indicate company names (prioritize these)
  const strongPatterns = [
    // "$XM Series X for CompanyName" or "$XM to CompanyName"
    /\$[\d.]+[MBK]?\s+(?:series\s+[A-Z]|seed|round)\s+(?:for|to|in|at)\s+([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,2})/i,
    // "CompanyName raises $XM" (most common pattern)
    /^([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,2})\s+(?:raises|secures|closes|announces|launches|hires|partners|gets|receives)\s+\$/i,
    // "$XM for CompanyName"
    /\$[\d.]+[MBK]?\s+(?:for|to|in|at)\s+([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,2})/i,
    // "CompanyName: description" (only if followed by funding/launch keywords)
    /^([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,2}):\s*(?:raises|launches|secures|closes|announces|funding|investment)/i,
    // "Our investment in CompanyName" or "investment in CompanyName" (handle multi-word names)
    /(?:our\s+)?investment\s+in\s+([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,3})(?:\s|:|,|$)/i,
    // "according to CompanyName's" or "CompanyName's CEO" (handle multi-word names)
    /(?:according\s+to|from|by)\s+([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,3})'s/i,
    // "CompanyName CEO" or "CompanyName's CEO" - must be immediately before CEO (not separated by other words)
    // Match: "Sandbar CEO" but NOT "wearables era with Sandbar CEO"
    /([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,2})(?:'s)?\s+(?:CEO|CTO|CFO|COO|founder|co-founder)(?:\s|$|:)/i,
    // "X firm CompanyName" or "X startup CompanyName" - extract the company name AFTER firm/startup
    // Match: "Fintech firm Marquis" → extract "Marquis"
    // Match: "Finnish startup MultivisionDx" → extract "MultivisionDx"
    // Match: "Lithuanian Repsense" → extract "Repsense"
    // Use word boundary to stop at the first word
    /(?:^|\s)(?:[A-Z][a-zA-Z0-9]+\s+)?(?:firm|startup|company|platform)\s+([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)(?:\s+(?:raises|secures|closes|launches|gets|receives|alerts))?/i,
    // "Country startup CompanyName" pattern (e.g., "Finnish startup MultivisionDx")
    /(?:finnish|lithuanian|swedish|estonian|danish|indian|german|french|british|american|us|uk)\s+startup\s+([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)/i,
    // "with CompanyName" (in context of funding/investment)
    /(?:with|from|by)\s+([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,2})(?:\s+(?:raises|secures|closes|announces|launches|hires|partners|gets|receives|alerts|alerts))/i,
    // "X joins CompanyName" or "CompanyName joins X" - extract the company
    /([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,2})\s+joins\s+([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,2})/i,
  ];
  
  for (let i = 0; i < strongPatterns.length; i++) {
    const pattern = strongPatterns[i];
    const match = title.match(pattern);
    if (match) {
      // Special handling for "X joins Y" pattern - extract Y (the company being joined)
      let name;
      if (i === 9 && match[2]) { // Pattern index 9 is the "joins" pattern
        name = match[2].trim();
      } else if (match[1]) {
        name = match[1].trim();
      } else {
        continue;
      }
      
      // Remove possessive forms (Nvidia's → Nvidia, Obsidian's → Obsidian, Healthcare's → Healthcare)
      name = name.replace(/'s$/, '');
      
      // Remove leading verbs (build Givefront → Givefront)
      name = name.replace(/^(build|building|built|create|creating|made|making|launch|launching|start|starting)\s+/i, '');
      
      // Remove trailing punctuation
      name = name.replace(/[,\.:;!?]+$/, '');
      
      // Remove trailing verbs/actions that got captured (e.g., "Marquis alerts" → "Marquis")
      name = name.replace(/\s+(alerts|raises|secures|closes|announces|launches|hires|partners|gets|receives|lands|nabs|bags|dozens|banks|credit|unions).*$/i, '');
      
      // Remove leading words that aren't company names (e.g., "era with Sandbar" → "Sandbar", "with Sandbar" → "Sandbar")
      // Apply multiple times to catch "era with" → "with" → ""
      let prevName = '';
      while (name !== prevName) {
        prevName = name;
        name = name.replace(/^(era|with|post|humane|ai|wearables|competing|in|the|a|an|most|coveted|startup)\s+/i, '');
      }
      
      // Trim whitespace
      name = name.trim();
      
      const firstWord = name.split(' ')[0].toLowerCase();
      const words = name.split(' ').filter(w => w.length > 0);
      
      // Reject if single word and it's generic
      if (words.length === 1 && genericSingleWords.has(firstWord)) {
        continue;
      }
      
      // Reject if first word is a skip word
      if (skipWords.has(firstWord)) {
        continue;
      }
      
      // Reject if name is too short or too long
      if (name.length < 3 || name.length > 50) {
        continue;
      }
      
      // Reject if it's just a number or starts with number (including "100+")
      if (/^\d+/.test(name) || /^\d+\+/.test(name) || /^\d+[+\-]/.test(name)) {
        continue;
      }
      
      // Reject if it looks like a phrase (has common phrase words)
      if (/\b(out|in|on|at|for|with|about|from|to|the|a|an|this|that|these|those)\b/i.test(name) && words.length <= 2) {
        continue;
      }
      
      // Reject if it's just a generic word (even after cleaning)
      if (genericSingleWords.has(name.toLowerCase())) {
        continue;
      }
      
      // Reject if it's a generic word like "Fintech", "Tech", "AI", etc. when used as a standalone name
      const lowerName = name.toLowerCase();
      const genericStandalone = ['fintech', 'tech', 'ai', 'ml', 'saas', 'software', 'data', 'digital', 'much', 'slc', 'european', 
           'investments', 'battlefield', 'and', 'coveted', 'startup', 'era', 'stand', 'wars', 
           'break', 'power', 'bank', 'finnish', 'swedish', 'estonian', 'danish'];
      
      // Only reject if it's a single word AND generic (two-word names like "Tin Can" are OK even if one word is generic)
      // Also allow known company names
      const allowedNames = ['clicks', 'sandbar', 'tin', 'can', 'greenstep', 'rundit', 'mercor', 'joon', 'marquis', 'evodiabio', 'blykalla', 'multivisiondx', 'zus', 'stack', 'founder'];
      if (words.length === 1 && genericStandalone.includes(lowerName) && !allowedNames.includes(lowerName)) {
        continue;
      }
      
      // Reject generic phrases
      if (genericPhrases.has(lowerName)) {
        continue;
      }
      
      // Handle location adjectives: "Finnish Rundit" → "Rundit", "Swedish Lovable" → "Lovable"
      if (/^(finnish|swedish|estonian|danish|indian|chinese|american|british|german|french)\s+/i.test(name)) {
        // Extract the word after the location
        const afterLocation = name.replace(/^(finnish|swedish|estonian|danish|indian|chinese|american|british|german|french)\s+/i, '').trim();
        if (afterLocation && afterLocation.length > 2 && afterLocation.length < 30 && 
            !genericSingleWords.has(afterLocation.toLowerCase()) && 
            !skipWords.has(afterLocation.split(' ')[0].toLowerCase())) {
          return afterLocation;
        }
        continue;
      }
      
      // Reject if it's just "and", "with", "era", "stand", "wars" as single words
      if (words.length === 1 && ['and', 'with', 'era', 'stand', 'wars', 'break', 'power', 'bank', 'investments', 'battlefield'].includes(lowerName)) {
        continue;
      }
      
      return name;
    }
  }
  
  // Weaker patterns (only if strong patterns didn't match)
  const weakPatterns = [
    /^([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,2})\s+(?:raises|secures|closes|announces|launches)/i,
    /(?:backed|invests|funds)\s+(?:in\s+)?([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,2})/i,
  ];
  
  for (const pattern of weakPatterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      const firstWord = name.split(' ')[0].toLowerCase();
      // More strict validation for weak patterns
      if (!skipWords.has(firstWord) && name.length > 4 && name.length < 50 && 
          !name.match(/^(The|A|An|This|That|How|What|Why|When|Where)/)) {
        return name;
      }
    }
  }
  
  // Fallback: Extract first capitalized word(s) if title looks like it mentions a company
  // Pattern: "CompanyName verb..." or "CompanyName's..." or "CompanyName, a..."
  const fallbackPatterns = [
    /^([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,2})\s+(?:annual|reboots|launches|announces|releases|introduces|unveils|partners|hires|raises|secures|closes|gets|receives|lands|nabs|bags)/i,
    /^([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,2})'s\s+/i, // "CompanyName's..."
    /^([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,2}),\s+(?:a|an|the)\s+/i, // "CompanyName, a..."
    /^([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,2})\s+(?:overtaken|overtakes|becomes|is|was|will|has|have)/i,
  ];
  
  for (const pattern of fallbackPatterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      let name = match[1].trim();
      
      // Remove possessive forms
      name = name.replace(/'s$/, '');
      
      // Remove leading verbs
      name = name.replace(/^(build|building|built|create|creating|made|making|launch|launching|start|starting)\s+/i, '');
      
      // Remove trailing punctuation
      name = name.replace(/[,\.:;!?]+$/, '');
      
      // Remove trailing verbs/actions that got captured (e.g., "Marquis alerts" → "Marquis")
      name = name.replace(/\s+(alerts|raises|secures|closes|announces|launches|hires|partners|gets|receives|lands|nabs|bags|dozens|banks|credit|unions).*$/i, '');
      
      // Remove leading words that aren't company names (e.g., "era with Sandbar" → "Sandbar", "with Sandbar" → "Sandbar")
      // Apply multiple times to catch "era with" → "with" → ""
      let prevName = '';
      while (name !== prevName) {
        prevName = name;
        name = name.replace(/^(era|with|post|humane|ai|wearables|competing|in|the|a|an|most|coveted|startup)\s+/i, '');
      }
      
      // Trim whitespace
      name = name.trim();
      
      const firstWord = name.split(' ')[0].toLowerCase();
      const words = name.split(' ').filter(w => w.length > 0);
      
      // Reject if single word and it's generic
      if (words.length === 1 && genericSingleWords.has(firstWord)) {
        continue;
      }
      
      // Reject if first word is a skip word
      if (skipWords.has(firstWord)) {
        continue;
      }
      
      // Reject if name is too short or too long
      if (name.length < 3 || name.length > 50) {
        continue;
      }
      
      // Reject if it's just a number or starts with number (including "100+")
      if (/^\d+/.test(name) || /^\d+\+/.test(name) || /^\d+[+\-]/.test(name)) {
        continue;
      }
      
      // Reject if it looks like a phrase
      if (/\b(out|in|on|at|for|with|about|from|to|the|a|an|this|that|these|those)\b/i.test(name) && words.length <= 2) {
        continue;
      }
      
      // Reject if it's just a generic word (even after cleaning)
      if (genericSingleWords.has(name.toLowerCase())) {
        continue;
      }
      
      return name;
    }
  }
  
  // Last resort: Extract first capitalized word(s) if title looks like company news
  // More lenient - extract from any title that might mention a company
  // BUT only if title has startup/funding keywords (to avoid extracting from random articles)
  const hasStartupKeyword = /(?:startup|funding|raised|raises|investment|investor|venture|capital|series|seed|launch|launches|announces|secures|closes|hires|partners|backed|invests|funds|overtaken|overtakes|becomes|sales|decline|valuation|valuation|unicorn|ipo|acquisition|acquired|joins|ceo|cto|cfo|founder|co-founder|tech|ai|ml|saas|platform|company|firm)/i.test(title);
  
  // Be more lenient - if title is short and has any tech/startup keywords, try to extract
  if (title.length < 300 && (hasStartupKeyword || title.length < 100)) {
    const words = title.split(' ');
    // Look for first 1-3 capitalized words that aren't skip words (increased from 4 to 8)
    for (let i = 0; i < Math.min(8, words.length); i++) {
      let word = words[i].replace(/[.,:;!?'"]/g, '');
      const lowerWord = word.toLowerCase();
      
      // Skip if it's a skip word or generic (but allow known company names)
      const allowedWords = ['clicks', 'sandbar', 'tin', 'can', 'greenstep', 'rundit', 'mercor', 'joon', 'marquis', 'evodiabio', 'blykalla', 'multivisiondx', 'zus'];
      if ((skipWords.has(lowerWord) || genericSingleWords.has(lowerWord)) && !allowedWords.includes(lowerWord)) {
        continue;
      }
      
      // Must start with capital letter and be reasonable length
      if (word && word[0] === word[0].toUpperCase() && word.length > 2 && word.length < 30) {
        // Remove possessive
        word = word.replace(/'s$/, '');
        
        // Reject if it's still generic after cleaning (but allow known company names)
        const wordLowerFirst = word.toLowerCase();
        const allowedWords = ['clicks', 'sandbar', 'tin', 'can', 'greenstep', 'rundit', 'mercor', 'joon', 'marquis', 'evodiabio', 'blykalla', 'multivisiondx', 'zus'];
        if (genericSingleWords.has(wordLowerFirst) && !allowedWords.includes(wordLowerFirst)) {
          continue;
        }
        
        // Check if next word is also capitalized (two-word company name)
        if (i + 1 < words.length) {
          let nextWord = words[i + 1].replace(/[.,:;!?'"]/g, '');
          if (nextWord && nextWord[0] === nextWord[0].toUpperCase() && nextWord.length > 2) {
            nextWord = nextWord.replace(/'s$/, '');
            if (!skipWords.has(nextWord.toLowerCase()) && !genericSingleWords.has(nextWord.toLowerCase())) {
              const twoWord = `${word} ${nextWord}`;
              if (twoWord.length < 40 && !genericSingleWords.has(twoWord.toLowerCase())) {
                return twoWord;
              }
            }
          }
        }
        
        // Single word - make sure it's not generic
        // But allow some common company names even if they're in the generic list
        const allowedSingleWords = ['clicks', 'sandbar', 'tin', 'can', 'greenstep', 'rundit', 'mercor', 'joon', 'marquis', 'evodiabio', 'blykalla', 'multivisiondx', 'zus', 'stack'];
        const wordLowerCheck = word.toLowerCase();
        if ((!genericSingleWords.has(wordLowerCheck) || allowedSingleWords.includes(wordLowerCheck)) && word.length > 2 && word.length < 30) {
          return word;
        }
      }
    }
  }
  
  return null;
}

// Detect sectors from text
function detectSectors(text) {
  const sectors = [];
  const lowerText = text.toLowerCase();
  
  const sectorKeywords = {
    'AI/ML': ['artificial intelligence', ' ai ', 'machine learning', 'deep learning', 'llm', 'gpt'],
    'FinTech': ['fintech', 'financial', 'banking', 'payments', 'neobank', 'crypto'],
    'HealthTech': ['healthtech', 'healthcare', 'medical', 'biotech', 'health tech'],
    'SaaS': ['saas', 'software as a service', 'b2b software', 'enterprise software'],
    'Climate': ['climate', 'cleantech', 'sustainability', 'carbon', 'renewable'],
    'EdTech': ['edtech', 'education', 'e-learning', 'online learning'],
    'E-Commerce': ['ecommerce', 'e-commerce', 'retail tech', 'marketplace'],
    'Cybersecurity': ['cybersecurity', 'security', 'infosec', 'cyber'],
    'Developer Tools': ['developer', 'devtools', 'api', 'infrastructure'],
    'Consumer': ['consumer', 'b2c', 'direct to consumer', 'd2c'],
  };
  
  for (const [sector, keywords] of Object.entries(sectorKeywords)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      sectors.push(sector);
    }
  }
  
  return sectors.length > 0 ? sectors : ['Technology'];
}

// Check if title is about startup/funding (more lenient)
function isStartupNews(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  // More lenient: if it has any startup keyword OR if it's from a startup-focused source
  const hasKeyword = STARTUP_KEYWORDS.some(kw => text.includes(kw));
  
  // Also accept if it mentions company names (capitalized words that look like company names)
  const hasCompanyName = /[A-Z][a-z]+ (raises|launches|secures|closes|announces|hires|partners)/i.test(text);
  
  // Accept funding-related numbers
  const hasFundingAmount = /\$[\d.]+[MB]|million|billion|funding|raised|investment/i.test(text);
  
  return hasKeyword || hasCompanyName || hasFundingAmount;
}

async function scrapeRssFeeds() {
  console.log('📡 Simple RSS Feed Scraper (No AI Required)\n');
  
  // Get active RSS sources
  const { data: sources } = await supabase
    .from('rss_sources')
    .select('id, name, url, category')
    .eq('active', true)
    .limit(20);
  
  console.log(`Found ${sources?.length || 0} active RSS sources\n`);
  
  let totalDiscovered = 0;
  let totalAdded = 0;
  
  for (const source of sources || []) {
    console.log(`\n📰 ${source.name}`);
    console.log(`   ${source.url}`);
    
    try {
      const feed = await parser.parseURL(source.url);
      const items = feed.items?.slice(0, 10) || [];
      
      console.log(`   Found ${items.length} items`);
      
      let added = 0;
      let skipped = 0;
      for (const item of items) {
        totalDiscovered++;
        
        // Skip if not startup-related
        if (!isStartupNews(item.title || '', item.contentSnippet || item.content || '')) {
          skipped++;
          continue;
        }
        
        // Try to extract company name (more lenient)
        let companyName = extractCompanyName(item.title || '');
        
        // Debug: Log first few extraction attempts
        if (!companyName && skipped < 3) {
          console.log(`   🔍 Debug: Title: "${(item.title || '').substring(0, 70)}..."`);
          console.log(`   🔍 Debug: No company name extracted`);
        }
        
        if (!companyName || companyName.length < 2) {
          skipped++;
          continue;
        }
        
        // Check if already exists in discovered_startups
        const { data: existingDiscovered } = await supabase
          .from('discovered_startups')
          .select('id')
          .ilike('name', companyName)
          .limit(1);
        
        if (existingDiscovered && existingDiscovered.length > 0) {
          skipped++;
          continue;
        }
        
        // Also check if already in startup_uploads
        const { data: existingUploaded } = await supabase
          .from('startup_uploads')
          .select('id')
          .ilike('name', companyName)
          .limit(1);
        
        if (existingUploaded && existingUploaded.length > 0) {
          skipped++;
          continue;
        }
        
        // Detect sectors
        const sectors = detectSectors(`${item.title} ${item.contentSnippet || ''}`);
        
        // Insert - using correct column names (with timeout handling)
        try {
          const insertPromise = supabase.from('discovered_startups').insert({
            name: companyName,
            description: (item.contentSnippet || item.title || '').slice(0, 500),
            website: item.link,
            rss_source: source.name,  // ✅ CORRECT - not "source"
            article_url: item.link,   // ✅ CORRECT - not "source_url"
            article_title: item.title || '',
            article_date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            sectors: sectors,
            discovered_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          });
          
          // Add 10-second timeout for database operations
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database timeout after 10s')), 10000)
          );
          
          const { error } = await Promise.race([insertPromise, timeoutPromise]);
          
          if (!error) {
            console.log(`   ✅ ${companyName} (${sectors.join(', ')})`);
            added++;
            totalAdded++;
          } else {
            console.log(`   ⚠️  ${companyName}: ${error.message}`);
            skipped++;
          }
        } catch (dbError) {
          console.log(`   ⚠️  ${companyName}: ${dbError.message}`);
          skipped++;
        }
      }
      
      if (skipped > 0 && added === 0) {
        console.log(`   ℹ️  ${skipped} items skipped (no company name found or duplicates)`);
      }
      
      // Update last_scraped
      await supabase.from('rss_sources')
        .update({ last_scraped: new Date().toISOString() })
        .eq('id', source.id);
      
      if (added > 0) {
        console.log(`   Added: ${added}`);
      }
      
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total discovered: ${totalDiscovered}`);
  console.log(`Total added: ${totalAdded}`);
  console.log('='.repeat(50));
}

// Run
scrapeRssFeeds().catch(console.error);
