#!/usr/bin/env node
/**
 * STARTUP EXTRACTOR - Extract startups from existing rss_articles
 * ================================================================
 * Processes all recent articles and extracts startup names using
 * enhanced pattern matching.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================================
// SECTOR KEYWORDS
// ============================================================================

const SECTOR_KEYWORDS = {
  'AI/ML': ['ai', 'artificial intelligence', 'machine learning', 'llm', 'gpt', 'neural', 'deep learning', 'generative ai', 'chatbot', 'openai', 'anthropic'],
  'Fintech': ['fintech', 'payments', 'banking', 'financial', 'insurtech', 'crypto', 'defi', 'neobank', 'lending', 'paytech'],
  'Healthcare': ['health', 'medical', 'biotech', 'pharma', 'telehealth', 'medtech', 'digital health', 'healthtech', 'clinical', 'therapy'],
  'Climate': ['climate', 'cleantech', 'sustainability', 'renewable', 'energy', 'carbon', 'green', 'solar', 'ev', 'battery', 'heat pump'],
  'Enterprise SaaS': ['b2b', 'saas', 'enterprise', 'workflow', 'productivity', 'automation', 'crm', 'erp'],
  'Consumer': ['consumer', 'dtc', 'e-commerce', 'retail', 'marketplace', 'shopping', 'd2c'],
  'Cybersecurity': ['cybersecurity', 'security', 'infosec', 'privacy', 'zero trust', 'encryption'],
  'DevTools': ['developer', 'devtools', 'api', 'infrastructure', 'devops', 'platform', 'sdk', 'open source'],
  'EdTech': ['education', 'edtech', 'learning', 'school', 'training', 'internship', 'student'],
  'PropTech': ['real estate', 'proptech', 'property', 'housing', 'mortgage'],
  'SpaceTech': ['space', 'satellite', 'rocket', 'aerospace', 'orbital', 'subsea', 'maritime'],
  'FoodTech': ['food', 'restaurant', 'delivery', 'agtech', 'agriculture'],
  'Logistics': ['logistics', 'supply chain', 'shipping', 'freight', 'warehouse'],
  'HRTech': ['hr', 'hiring', 'recruitment', 'talent', 'workforce', 'employee'],
  'Robotics': ['robotics', 'robot', 'automation', 'manufacturing', 'industrial'],
  'Defense': ['defense', 'defence', 'military', 'nato', 'security'],
};

// Common words that are NOT startup names
const EXCLUDE_WORDS = new Set([
  'the', 'and', 'for', 'its', 'has', 'are', 'was', 'were', 'been', 'have', 'will', 'can', 'this', 'that', 'with',
  'new', 'first', 'last', 'next', 'more', 'most', 'also', 'just', 'now', 'today', 'yesterday', 'tomorrow',
  'series', 'seed', 'round', 'funding', 'venture', 'capital', 'investment', 'investor', 'investors',
  'million', 'billion', 'company', 'startup', 'startups', 'companies', 'business', 'firm', 'firms',
  'ceo', 'cto', 'cfo', 'founder', 'founders', 'founded', 'led', 'backed', 'announces', 'announced',
  'raises', 'raised', 'secures', 'secured', 'closes', 'closed', 'lands', 'gets', 'receives', 'launches',
  'tech', 'technology', 'technologies', 'software', 'platform', 'solution', 'solutions', 'service', 'services',
  'global', 'world', 'market', 'markets', 'industry', 'sector', 'report', 'reports', 'news', 'update',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'week', 'month', 'year',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'techcrunch', 'crunchbase', 'venturebeat', 'forbes', 'bloomberg', 'reuters', 'wsj', 'times', 'post', 'alleywatch',
  'here', 'why', 'how', 'what', 'when', 'where', 'who', 'which', 'said', 'says', 'according', 'exclusive',
  'weekly', 'daily', 'monthly', 'annual', 'quarterly', 'review', 'briefing', 'roundup', 'newsletter',
  'pre-seed', 'extends', 'extend', 'adds', 'strategic', 'alternative', 'advance', 'scale',
  'united', 'states', 'america', 'york', 'francisco', 'london', 'europe', 'asia', 'china', 'india',
  'swedish', 'finnish', 'norwegian', 'danish', 'german', 'french', 'british', 'european', 'american',
  'baltic', 'polish', 'lithuanian', 'norwegian', 'denmark', 'sweden', 'finland', 'norway', 'ukraine', 'luxembourg',
  'selected', 'receives', 'launch', 'scale', 'push', 'make', 'every', 'product', 'internet', 'discoverable',
  // More false positives to exclude
  'join', 'children', 'experts', 'sources', 'data', 'health', 'learning', 'security', 'energy', 'nuclear',
  'materials', 'metals', 'express', 'creek', 'nickel', 'sustainability', 'used', 'oxford', 'as', 'at', 'but',
  'pets', 'culture', 'we', 'built', 'traditional', 'ever', 'since', 'markdown', 'mvps', 'nuance', 'studio',
  'services', 'administration', 'wednesday', 'pomodoro', 'mvp', 'rapidly', 'deployed', 'sector', 'snapshot',
  'billionaires', 'build', 'billionaire', 'fbi', 'confirms', 'apple', 'lastpass', 'tpuv7', 'sdrs', 'ai',
  'teams', 'benchmarks', 'anthropic', 'pediatrics'
]);

// ============================================================================
// EXTRACTION FUNCTIONS
// ============================================================================

function extractStartupsFromArticle(article) {
  const originalTitle = article.title || '';
  const originalContent = article.content || '';
  const fullText = `${originalTitle} ${originalContent}`;
  const lowerText = fullText.toLowerCase();
  
  const startups = [];
  const foundNames = new Set();
  
  // PATTERN 1: "CompanyName raises/secures €/$/X million/billion"
  const pattern1 = /\b([A-Z][a-zA-Z0-9\.]+(?:['']s)?)\s+(?:raises?|raised|secures?|secured|closes?|closed|lands?|gets?|receives?|announces?|announced|nabs?|bags?|extends?)\s+[€£\$]?([\d\.]+)\s*(million|M|billion|B|mn|bn)/gi;
  
  // PATTERN 2: "$X million/billion for/to CompanyName"
  const pattern2 = /[€£\$]?([\d\.]+)\s*(million|M|billion|B|mn|bn)(?:\s+(?:in\s+)?(?:funding|round|investment|raise|capital|financing))?\s+(?:for|to|into|in)\s+([A-Z][a-zA-Z0-9\.]+)/gi;
  
  // PATTERN 3: "CompanyName, a/the startup/company"
  const pattern3 = /\b([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?),?\s+(?:a|an|the)\s+(?:young\s+)?(?:startup|company|firm|platform|fintech|healthtech|edtech|saas|ai\s+company|tech\s+company)/gi;
  
  // PATTERN 4: "[Location]-based CompanyName"
  const pattern4 = /(?:[\w]+)-based\s+([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)/gi;
  
  // PATTERN 5: "CompanyName has raised/secured"
  const pattern5 = /\b([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)\s+has\s+(?:raised|secured|closed|received|landed)/gi;
  
  // PATTERN 6: Title starting with company name + funding verb
  const pattern6 = /^([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)\s+(?:Raises|Secures|Closes|Gets|Receives|Lands)/gi;
  
  const patterns = [pattern1, pattern2, pattern3, pattern4, pattern5, pattern6];
  
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(fullText)) !== null) {
      // Get the company name from the match
      let name = match[1] || match[3];
      if (!name) continue;
      
      // Clean up the name
      name = name.trim()
        .replace(/[,\.\(\)''"]+$/, '')
        .replace(/^(the|a|an)\s+/i, '')
        .replace(/'s$/i, '')
        .trim();
      
      if (!isValidStartupName(name)) continue;
      
      const normalizedName = name.toLowerCase();
      if (foundNames.has(normalizedName)) continue;
      foundNames.add(normalizedName);
      
      startups.push({
        name: name,
        source_url: article.url,
        source_name: article.source
      });
    }
  }
  
  // Special case: Extract from title if it's clearly about a company
  // E.g., "Wodan AI raises €2M..."
  if (originalTitle && /raises|secures|closes|funding|million|billion|series/i.test(originalTitle)) {
    // Try to get the first capitalized word(s) that aren't common words
    const titleMatch = originalTitle.match(/^([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)/);
    if (titleMatch) {
      let name = titleMatch[1].trim();
      const normalizedName = name.toLowerCase();
      
      // Additional check: skip if it starts with location words
      if (!/^(Swedish|Finnish|Norwegian|Danish|German|French|British|European|American|Baltic|Polish|Lithuanian)/i.test(name)) {
        if (isValidStartupName(name) && !foundNames.has(normalizedName)) {
          foundNames.add(normalizedName);
          startups.push({
            name: name,
            source_url: article.url,
            source_name: article.source
          });
        }
      }
    }
    
    // Also look for company names after location prefix
    // E.g., "Swedish Praktikverket raises..."
    const locationMatch = originalTitle.match(/(?:Swedish|Finnish|Norwegian|Danish|German|French|British|Lithuanian|Polish|Baltic)\s+([A-Z][a-zA-Z0-9]+)/i);
    if (locationMatch) {
      let name = locationMatch[1].trim();
      const normalizedName = name.toLowerCase();
      if (isValidStartupName(name) && !foundNames.has(normalizedName)) {
        foundNames.add(normalizedName);
        startups.push({
          name: name,
          source_url: article.url,
          source_name: article.source
        });
      }
    }
  }
  
  // Classify sectors
  const sectors = [];
  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      sectors.push(sector);
    }
  }
  
  return { startups, sectors: sectors.length > 0 ? sectors : ['General'] };
}

function isValidStartupName(name) {
  if (!name) return false;
  if (name.length < 2 || name.length > 40) return false;
  if (!/^[A-Z]/.test(name)) return false;
  
  const lowerName = name.toLowerCase();
  if (EXCLUDE_WORDS.has(lowerName)) return false;
  
  // Reject if all words are excluded
  const words = lowerName.split(/\s+/);
  if (words.every(w => EXCLUDE_WORDS.has(w))) return false;
  
  // Reject patterns that are clearly not company names
  if (/^(why|how|what|when|where|who|which|this|that)\b/i.test(name)) return false;
  if (/\d{4}/.test(name)) return false;  // Years
  if (/^[A-Z]+$/.test(name) && name.length < 3) return false;  // Short acronyms like "AI"
  
  // Reject names ending with verbs/action words (false positives from patterns)
  if (/\s+(has|have|had|raises|raised|secures|secured|closes|closed|is|are|was|were|goes|went|gets|got|lands|landed|receives|received|built|builds|confirms|shut|alum)$/i.test(name)) return false;
  
  // Reject names starting with action words
  if (/^(The|A|An|Used|Rapidly|Purchases|Ever|We|Traditional)\s+/i.test(name)) return false;
  
  // Reject single generic words
  const genericWords = ['weeks', 'deal', 'year', 'month', 'day', 'hours', 'minutes', 'bytes', 'users', 'customers'];
  if (genericWords.includes(lowerName)) return false;
  
  return true;
}

// ============================================================================
// MAIN PROCESSING
// ============================================================================

async function saveDiscoveredStartup(startup, sectors) {
  // Check if exists
  const { data: existing } = await supabase
    .from('discovered_startups')
    .select('id')
    .ilike('name', startup.name)
    .limit(1);
  
  if (existing && existing.length > 0) {
    return { skipped: true };
  }
  
  // Use correct column names for discovered_startups table
  const { error } = await supabase.from('discovered_startups').insert({
    name: startup.name,
    article_url: startup.source_url,
    rss_source: startup.source_name,
    description: `Discovered from ${startup.source_name}. Sectors: ${sectors.join(', ')}`,
    discovered_at: new Date().toISOString()
  });
  
  if (error) {
    console.log(`   ❌ Error saving ${startup.name}: ${error.message}`);
    return { error: true };
  }
  
  return { saved: true };
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🚀 STARTUP EXTRACTOR');
  console.log('═'.repeat(60));
  console.log('Processing existing articles to extract startup names...\n');
  
  // Get all articles, prioritizing funding-related ones
  const { data: articles, error } = await supabase
    .from('rss_articles')
    .select('id, title, content, url, source')
    .order('created_at', { ascending: false })
    .limit(1000);
  
  if (error) {
    console.error('❌ Error fetching articles:', error.message);
    return;
  }
  
  console.log(`📰 Found ${articles.length} articles to process\n`);
  
  let totalFound = 0;
  let totalSaved = 0;
  let totalSkipped = 0;
  
  for (const article of articles) {
    const { startups, sectors } = extractStartupsFromArticle(article);
    
    if (startups.length > 0) {
      console.log(`\n📄 "${article.title.substring(0, 60)}..."`);
      console.log(`   Found ${startups.length} startup(s): ${startups.map(s => s.name).join(', ')}`);
      console.log(`   Sectors: ${sectors.join(', ')}`);
      
      for (const startup of startups) {
        totalFound++;
        const result = await saveDiscoveredStartup(startup, sectors);
        if (result.saved) {
          totalSaved++;
          console.log(`   ✅ Saved: ${startup.name}`);
        } else if (result.skipped) {
          totalSkipped++;
        }
      }
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 EXTRACTION COMPLETE');
  console.log('═'.repeat(60));
  console.log(`📰 Articles processed: ${articles.length}`);
  console.log(`🔍 Startups found: ${totalFound}`);
  console.log(`✅ New startups saved: ${totalSaved}`);
  console.log(`⏭️  Already existed: ${totalSkipped}`);
  console.log('═'.repeat(60));
}

main().catch(console.error);
