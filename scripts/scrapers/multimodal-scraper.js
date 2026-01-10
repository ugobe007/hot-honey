#!/usr/bin/env node
/**
 * MULTIMODAL SCRAPER - pyth ai
 * ==============================
 * A robust scraper that handles multiple data sources:
 * 
 * 1. RSS Feeds - Traditional RSS parsing
 * 2. Web Pages - Cheerio-based HTML scraping 
 * 3. API Sources - Direct API calls where available
 * 
 * Runs 24/7 and automatically falls back between methods.
 * 
 * Usage: node multimodal-scraper.js
 * PM2:   pm2 start multimodal-scraper.js --name scraper
 */

const { createClient } = require('@supabase/supabase-js');
const Parser = require('rss-parser');
const cheerio = require('cheerio');
require('dotenv').config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const rssParser = new Parser({ 
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; HotMatchBot/1.0; +https://hotmatch.ai)'
  }
});

const CONFIG = {
  CYCLE_DELAY: 15 * 60 * 1000,      // 15 minutes between full cycles
  SOURCE_DELAY: 3000,                // 3 seconds between sources
  MAX_ARTICLES_PER_SOURCE: 25,
  RETRY_FAILED_AFTER: 60 * 60 * 1000, // Retry failed sources after 1 hour
};

// ============================================================================
// RELIABLE DATA SOURCES - Mix of RSS and Web Scraping
// ============================================================================

const DATA_SOURCES = [
  // === WORKING RSS FEEDS ===
  { name: 'TechCrunch Startups', url: 'https://techcrunch.com/category/startups/feed/', type: 'rss', category: 'startups' },
  { name: 'TechCrunch Venture', url: 'https://techcrunch.com/category/venture/feed/', type: 'rss', category: 'funding' },
  { name: 'VentureBeat', url: 'https://venturebeat.com/feed/', type: 'rss', category: 'tech' },
  { name: 'Crunchbase News', url: 'https://news.crunchbase.com/feed/', type: 'rss', category: 'funding' },
  { name: 'EU-Startups', url: 'https://www.eu-startups.com/feed/', type: 'rss', category: 'startups' },
  { name: 'Sifted EU', url: 'https://sifted.eu/feed/', type: 'rss', category: 'startups' },
  { name: 'Tech.eu', url: 'https://tech.eu/feed/', type: 'rss', category: 'startups' },
  { name: 'SaaStr', url: 'https://www.saastr.com/feed/', type: 'rss', category: 'saas' },
  { name: 'Hacker News Best', url: 'https://hnrss.org/best', type: 'rss', category: 'tech' },
  { name: 'Hacker News Show', url: 'https://hnrss.org/show', type: 'rss', category: 'startups' },
  { name: 'Product Hunt', url: 'https://www.producthunt.com/feed', type: 'rss', category: 'products' },
  { name: 'Y Combinator Blog', url: 'https://www.ycombinator.com/blog/rss/', type: 'rss', category: 'vc' },
  { name: 'Paul Graham', url: 'http://www.aaronsw.com/2002/feeds/pgessays.rss', type: 'rss', category: 'insights' },
  { name: 'Andreessen Horowitz', url: 'https://a16z.com/feed/', type: 'rss', category: 'vc' },
  { name: 'First Round Review', url: 'https://review.firstround.com/feed.xml', type: 'rss', category: 'vc' },
  { name: 'NFX Essays', url: 'https://www.nfx.com/post/rss.xml', type: 'rss', category: 'vc' },
  
  // === WEB SCRAPING SOURCES ===
  { name: 'TechCrunch Funding Page', url: 'https://techcrunch.com/category/venture/', type: 'web', category: 'funding', selector: 'article' },
  { name: 'YC Companies', url: 'https://www.ycombinator.com/companies', type: 'web', category: 'startups', selector: '.company' },
  { name: 'Crunchbase Trending', url: 'https://www.crunchbase.com/discover/funding_rounds', type: 'web', category: 'funding', selector: '.funding-round' },
];

// ============================================================================
// FETCH UTILITIES
// ============================================================================

async function fetchWithRetry(url, options = {}, retries = 3) {
  const fetch = (await import('node-fetch')).default;
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    ...options.headers
  };

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { 
        ...options, 
        headers,
        timeout: 15000 
      });
      
      if (response.ok) {
        return response;
      }
      
      if (response.status === 403 || response.status === 429) {
        console.log(`   ⚠️  Rate limited, waiting ${(i + 1) * 5}s...`);
        await sleep((i + 1) * 5000);
        continue;
      }
      
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(2000);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// RSS SCRAPER
// ============================================================================

async function scrapeRSS(source) {
  try {
    const feed = await rssParser.parseURL(source.url);
    const articles = [];
    
    for (const item of (feed.items || []).slice(0, CONFIG.MAX_ARTICLES_PER_SOURCE)) {
      articles.push({
        title: item.title || 'Untitled',
        url: item.link || item.guid,
        content: item.contentSnippet || item.content || item.summary || '',
        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        source: source.name,
        category: source.category
      });
    }
    
    return { success: true, articles, method: 'rss' };
  } catch (error) {
    return { success: false, error: error.message, method: 'rss' };
  }
}

// ============================================================================
// WEB SCRAPER (Cheerio)
// ============================================================================

async function scrapeWeb(source) {
  try {
    const response = await fetchWithRetry(source.url);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const articles = [];
    
    // Generic article extraction
    const selectors = [
      'article',
      '.post',
      '.entry',
      '.article',
      '.news-item',
      '.funding-round',
      '.company-card',
      '[data-type="article"]'
    ];
    
    for (const selector of selectors) {
      $(selector).each((i, el) => {
        if (articles.length >= CONFIG.MAX_ARTICLES_PER_SOURCE) return false;
        
        const $el = $(el);
        
        // Try to find title
        const title = $el.find('h1, h2, h3, .title, .headline').first().text().trim() ||
                     $el.find('a').first().text().trim();
        
        // Try to find link
        const link = $el.find('a').first().attr('href') ||
                    $el.find('[href]').first().attr('href');
        
        // Try to find content
        const content = $el.find('p, .excerpt, .summary, .description').first().text().trim() ||
                       $el.text().substring(0, 500).trim();
        
        // Try to find date
        const dateText = $el.find('time, .date, .published').first().text() ||
                        $el.find('[datetime]').attr('datetime');
        
        if (title && title.length > 5 && link) {
          const fullUrl = link.startsWith('http') ? link : new URL(link, source.url).href;
          
          articles.push({
            title: title.substring(0, 500),
            url: fullUrl,
            content: content.substring(0, 2000),
            published_at: dateText ? new Date(dateText).toISOString() : new Date().toISOString(),
            source: source.name,
            category: source.category
          });
        }
      });
      
      if (articles.length > 0) break; // Found articles with this selector
    }
    
    // If no articles found with selectors, try to extract links from page
    if (articles.length === 0) {
      $('a').each((i, el) => {
        if (articles.length >= 10) return false;
        
        const $a = $(el);
        const href = $a.attr('href');
        const text = $a.text().trim();
        
        // Look for startup/funding related links
        if (href && text.length > 10 && text.length < 200) {
          const keywords = ['startup', 'funding', 'raises', 'series', 'seed', 'million', 'venture', 'launch', 'founded'];
          const isRelevant = keywords.some(kw => text.toLowerCase().includes(kw) || href.toLowerCase().includes(kw));
          
          if (isRelevant) {
            const fullUrl = href.startsWith('http') ? href : new URL(href, source.url).href;
            articles.push({
              title: text,
              url: fullUrl,
              content: '',
              published_at: new Date().toISOString(),
              source: source.name,
              category: source.category
            });
          }
        }
      });
    }
    
    return { success: articles.length > 0, articles, method: 'web' };
  } catch (error) {
    return { success: false, error: error.message, method: 'web' };
  }
}

// ============================================================================
// STARTUP EXTRACTION FROM ARTICLES - ENHANCED
// ============================================================================

const SECTOR_KEYWORDS = {
  'AI/ML': ['ai', 'artificial intelligence', 'machine learning', 'llm', 'gpt', 'neural', 'deep learning', 'generative ai', 'chatbot', 'openai', 'anthropic', 'copilot'],
  'Fintech': ['fintech', 'payments', 'banking', 'financial', 'insurtech', 'crypto', 'defi', 'neobank', 'lending', 'paytech', 'regtech', 'wealthtech'],
  'Healthcare': ['health', 'medical', 'biotech', 'pharma', 'telehealth', 'medtech', 'digital health', 'healthtech', 'clinical', 'patient', 'therapy', 'diagnostic'],
  'Climate': ['climate', 'cleantech', 'sustainability', 'renewable', 'energy', 'carbon', 'green', 'solar', 'ev', 'battery', 'electric vehicle'],
  'Enterprise SaaS': ['b2b', 'saas', 'enterprise', 'workflow', 'productivity', 'automation', 'crm', 'erp', 'software-as-a-service'],
  'Consumer': ['consumer', 'dtc', 'e-commerce', 'retail', 'marketplace', 'shopping', 'd2c', 'direct-to-consumer'],
  'Cybersecurity': ['cybersecurity', 'security', 'infosec', 'privacy', 'zero trust', 'encryption', 'firewall', 'threat'],
  'DevTools': ['developer', 'devtools', 'api', 'infrastructure', 'devops', 'platform', 'sdk', 'open source', 'github', 'code'],
  'EdTech': ['education', 'edtech', 'learning', 'school', 'training', 'course', 'tutor', 'student'],
  'PropTech': ['real estate', 'proptech', 'property', 'housing', 'mortgage', 'construction', 'building'],
  'SpaceTech': ['space', 'satellite', 'rocket', 'aerospace', 'orbital', 'launch'],
  'FoodTech': ['food', 'restaurant', 'delivery', 'agtech', 'agriculture', 'farming', 'grocery'],
  'Logistics': ['logistics', 'supply chain', 'shipping', 'freight', 'warehouse', 'delivery', 'fleet'],
  'HRTech': ['hr', 'hiring', 'recruitment', 'talent', 'workforce', 'employee', 'payroll'],
  'LegalTech': ['legal', 'law', 'contract', 'compliance', 'litigation'],
};

// Common words that are NOT startup names
const EXCLUDE_WORDS = new Set([
  'the', 'and', 'for', 'its', 'has', 'are', 'was', 'were', 'been', 'have', 'will', 'can', 'this', 'that', 'with',
  'new', 'first', 'last', 'next', 'more', 'most', 'also', 'just', 'now', 'today', 'yesterday', 'tomorrow',
  'series', 'seed', 'round', 'funding', 'venture', 'capital', 'investment', 'investor', 'investors',
  'million', 'billion', 'company', 'startup', 'startups', 'companies', 'business', 'firm', 'firms',
  'ceo', 'cto', 'cfo', 'founder', 'founders', 'founded', 'led', 'backed', 'led by', 'announces', 'announced',
  'raises', 'raised', 'secures', 'secured', 'closes', 'closed', 'lands', 'gets', 'receives',
  'tech', 'technology', 'technologies', 'software', 'platform', 'solution', 'solutions', 'service', 'services',
  'global', 'world', 'market', 'markets', 'industry', 'sector', 'report', 'reports', 'news', 'update',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'techcrunch', 'crunchbase', 'venturebeat', 'forbes', 'bloomberg', 'reuters', 'wsj', 'times', 'post',
  'here', 'why', 'how', 'what', 'when', 'where', 'who', 'which', 'said', 'says', 'according', 'exclusive',
  'weekly', 'daily', 'monthly', 'annual', 'quarterly', 'review', 'briefing', 'roundup', 'newsletter',
  'pre-seed', 'seed round', 'series a', 'series b', 'series c', 'series d', 'series e', 'growth', 'late-stage',
  'united', 'states', 'america', 'york', 'francisco', 'london', 'europe', 'asia', 'china', 'india'
]);

function extractStartupsFromArticle(article) {
  const originalTitle = article.title || '';
  const originalContent = article.content || '';
  const fullText = `${originalTitle} ${originalContent}`;
  const lowerText = fullText.toLowerCase();
  
  const startups = [];
  const foundNames = new Set();
  
  // PATTERN 1: "CompanyName raises $X million/billion"
  const pattern1 = /\b([A-Z][a-zA-Z0-9\.]+(?:\s+[A-Z][a-zA-Z0-9\.]+){0,2})\s+(?:raises?|raised|secures?|secured|closes?|closed|lands?|gets?|receives?|announces?|announced|nabs?|bags?)\s+\$?([\d\.]+)\s*(million|M|billion|B|mn|bn)/gi;
  
  // PATTERN 2: "$X million/billion for CompanyName" or "funding for/to CompanyName"
  const pattern2 = /\$?([\d\.]+)\s*(million|M|billion|B|mn|bn)(?:\s+(?:in\s+)?(?:funding|round|investment|raise|capital))?\s+(?:for|to|into|in)\s+([A-Z][a-zA-Z0-9\.]+(?:\s+[A-Z][a-zA-Z0-9\.]+){0,2})/gi;
  
  // PATTERN 3: "CompanyName, a/the startup/company that..."
  const pattern3 = /\b([A-Z][a-zA-Z0-9\.]+(?:\s+[A-Z][a-zA-Z0-9\.]+){0,2}),?\s+(?:a|an|the)\s+(?:startup|company|firm|platform|fintech|healthtech|edtech|saas|ai\s+company|tech\s+company|software\s+company)/gi;
  
  // PATTERN 4: "startup CompanyName" or "company CompanyName"
  const pattern4 = /(?:startup|company|firm|platform)\s+([A-Z][a-zA-Z0-9\.]+(?:\s+[A-Z][a-zA-Z0-9\.]+){0,2})/gi;
  
  // PATTERN 5: "[Location]-based CompanyName"
  const pattern5 = /(?:[\w\-]+)-based\s+([A-Z][a-zA-Z0-9\.]+(?:\s+[A-Z][a-zA-Z0-9\.]+){0,2})/gi;
  
  // PATTERN 6: "CompanyName (backed by X)" or "CompanyName (founded by X)"
  const pattern6 = /\b([A-Z][a-zA-Z0-9\.]+(?:\s+[A-Z][a-zA-Z0-9\.]+){0,2})\s*\((?:backed|funded|founded|led|co-founded)/gi;
  
  // PATTERN 7: "investors in CompanyName" or "investment in CompanyName"
  const pattern7 = /(?:investors?\s+in|investment\s+in|invested\s+in|bet\s+on|backing)\s+([A-Z][a-zA-Z0-9\.]+(?:\s+[A-Z][a-zA-Z0-9\.]+){0,2})/gi;
  
  // PATTERN 8: Look for quoted company names "CompanyName"
  const pattern8 = /"([A-Z][a-zA-Z0-9\.]+(?:\s+[A-Z][a-zA-Z0-9\.]+){0,3})"/g;
  
  // PATTERN 9: CompanyName Inc./Corp./Ltd./Labs/AI/IO
  const pattern9 = /\b([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,2})\s+(?:Inc\.?|Corp\.?|Ltd\.?|LLC|Labs|\.AI|\.io|\.ai|Health|Tech|Therapeutics|Robotics|Ventures)/gi;
  
  // PATTERN 10: "led by [VC], CompanyName" (funding announcement pattern)  
  const pattern10 = /(?:led\s+by|from|with\s+participation)\s+[\w\s,&]+,?\s+([A-Z][a-zA-Z0-9\.]+(?:\s+[A-Z][a-zA-Z0-9\.]+){0,2})\s+(?:will|plans|aims|intends)/gi;
  
  const patterns = [pattern1, pattern2, pattern3, pattern4, pattern5, pattern6, pattern7, pattern8, pattern9, pattern10];
  
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(fullText)) !== null) {
      // Get the company name from the match (could be in different capture groups)
      let name = match[1] || match[3];
      if (!name) continue;
      
      name = name.trim()
        .replace(/[,\.\(\)]+$/, '')  // Remove trailing punctuation
        .replace(/^(the|a|an)\s+/i, '')  // Remove leading articles
        .trim();
      
      // Validation
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
  
  // Also try to extract from title if it looks like a funding announcement
  if (originalTitle && /raises?|funding|seed|series|million|billion|\$\d/i.test(originalTitle)) {
    // Extract first capitalized words that might be company name
    const titleMatch = originalTitle.match(/^([A-Z][a-zA-Z0-9\.]+(?:\s+[A-Z][a-zA-Z0-9\.]+){0,2})/);
    if (titleMatch) {
      const name = titleMatch[1].trim();
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
  
  return { startups, sectors };
}

function isValidStartupName(name) {
  if (!name) return false;
  
  // Length checks
  if (name.length < 2 || name.length > 50) return false;
  
  // Must start with capital letter
  if (!/^[A-Z]/.test(name)) return false;
  
  // Check against exclusion list
  const lowerName = name.toLowerCase();
  if (EXCLUDE_WORDS.has(lowerName)) return false;
  
  // Check each word against exclusion
  const words = lowerName.split(/\s+/);
  if (words.every(w => EXCLUDE_WORDS.has(w))) return false;
  
  // Reject if it's all common words
  if (words.length > 1 && words.filter(w => EXCLUDE_WORDS.has(w)).length === words.length) return false;
  
  // Reject if contains certain patterns
  if (/^(why|how|what|when|where|who|which|this|that|here|there)\b/i.test(name)) return false;
  if (/\d{4}/.test(name)) return false;  // Reject years
  if (/^(q[1-4]|h[12])\s/i.test(name)) return false;  // Reject Q1, H2, etc.
  
  // Reject names ending with verbs/action words (false positives from patterns)
  if (/\s+(has|have|had|raises|raised|secures|secured|closes|closed|is|are|was|were|goes|went|gets|got|lands|landed|receives|received|built|builds|confirms|shut|alum|expanding)$/i.test(name)) return false;
  
  // Reject names starting with action words
  if (/^(The|A|An|Used|Rapidly|Purchases|Ever|We|Traditional)\s+/i.test(name)) return false;
  
  // Must have at least one "real" word (not just "The Company")
  const meaningfulWords = words.filter(w => !EXCLUDE_WORDS.has(w) && w.length > 1);
  if (meaningfulWords.length === 0) return false;
  
  return true;
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function saveArticle(article) {
  // Check if exists
  const { data: existing } = await supabase
    .from('rss_articles')
    .select('id')
    .eq('url', article.url)
    .limit(1);
  
  if (existing && existing.length > 0) {
    return { skipped: true };
  }
  
  const { error } = await supabase.from('rss_articles').insert({
    title: article.title,
    url: article.url,
    content: article.content,
    source: article.source,
    published_at: article.published_at
  });
  
  if (error) {
    return { error: true, message: error.message };
  }
  
  return { saved: true };
}

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
    return { error: true, message: error.message };
  }
  
  return { saved: true };
}

async function updateSourceStatus(name, success, articlesFound) {
  // Log to ai_logs for tracking
  await supabase.from('ai_logs').insert({
    type: 'scraper',
    input: { source: name },
    output: { success, articles_found: articlesFound },
    status: success ? 'success' : 'error'
  });
}

// ============================================================================
// MAIN SCRAPING LOGIC
// ============================================================================

async function scrapeSource(source) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📡 ${source.name} (${source.type.toUpperCase()})`);
  
  let result;
  
  // Try RSS first for RSS sources
  if (source.type === 'rss') {
    result = await scrapeRSS(source);
    
    // If RSS fails, try web scraping as fallback
    if (!result.success) {
      console.log(`   ⚠️  RSS failed (${result.error}), trying web scrape...`);
      result = await scrapeWeb(source);
    }
  } else {
    // Web scraping sources
    result = await scrapeWeb(source);
  }
  
  if (!result.success) {
    console.log(`   ❌ Failed: ${result.error}`);
    await updateSourceStatus(source.name, false, 0);
    return { saved: 0, skipped: 0, startups: 0 };
  }
  
  console.log(`   ✅ Found ${result.articles.length} articles via ${result.method}`);
  
  let saved = 0, skipped = 0, startupsFound = 0;
  
  for (const article of result.articles) {
    // Save article
    const saveResult = await saveArticle(article);
    if (saveResult.saved) saved++;
    else if (saveResult.skipped) skipped++;
    
    // Extract startups
    const { startups, sectors } = extractStartupsFromArticle(article);
    for (const startup of startups) {
      const startupResult = await saveDiscoveredStartup(startup, sectors);
      if (startupResult.saved) startupsFound++;
    }
  }
  
  console.log(`   📊 Saved: ${saved} | Skipped: ${skipped} | Startups: ${startupsFound}`);
  await updateSourceStatus(source.name, true, result.articles.length);
  
  return { saved, skipped, startups: startupsFound };
}

async function runScrapingCycle() {
  console.log('\n' + '═'.repeat(60));
  console.log('🚀 MULTIMODAL SCRAPER - Starting Cycle');
  console.log('═'.repeat(60));
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`📊 Sources: ${DATA_SOURCES.length}`);
  
  let totalSaved = 0, totalSkipped = 0, totalStartups = 0;
  let successCount = 0, failCount = 0;
  
  // Also scrape RSS sources from database
  const { data: dbSources } = await supabase
    .from('rss_sources')
    .select('*')
    .eq('active', true)
    .limit(50);
  
  const allSources = [
    ...DATA_SOURCES,
    ...(dbSources || []).map(s => ({
      name: s.name,
      url: s.url,
      type: 'rss',
      category: s.category || 'general'
    }))
  ];
  
  // Remove duplicates by URL
  const uniqueSources = allSources.filter((source, index, self) =>
    index === self.findIndex(s => s.url === source.url)
  );
  
  console.log(`📊 Total unique sources: ${uniqueSources.length}`);
  
  for (const source of uniqueSources) {
    try {
      const result = await scrapeSource(source);
      totalSaved += result.saved;
      totalSkipped += result.skipped;
      totalStartups += result.startups;
      
      if (result.saved > 0 || result.skipped > 0) {
        successCount++;
      } else {
        failCount++;
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failCount++;
    }
    
    await sleep(CONFIG.SOURCE_DELAY);
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 CYCLE COMPLETE');
  console.log('═'.repeat(60));
  console.log(`✅ Successful sources: ${successCount}`);
  console.log(`❌ Failed sources: ${failCount}`);
  console.log(`📰 Articles saved: ${totalSaved}`);
  console.log(`⏭️  Articles skipped: ${totalSkipped}`);
  console.log(`🚀 Startups discovered: ${totalStartups}`);
  console.log(`⏰ Next cycle in ${CONFIG.CYCLE_DELAY / 60000} minutes`);
  console.log('═'.repeat(60) + '\n');
  
  // Log cycle stats
  await supabase.from('ai_logs').insert({
    type: 'scraper_cycle',
    input: { total_sources: uniqueSources.length },
    output: {
      successful: successCount,
      failed: failCount,
      articles_saved: totalSaved,
      startups_found: totalStartups
    },
    status: failCount < successCount ? 'success' : 'warning'
  });
}

// ============================================================================
// MAIN LOOP
// ============================================================================

let isRunning = true;

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  isRunning = false;
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  isRunning = false;
});

async function main() {
  console.log('═'.repeat(60));
  console.log('🔥 PYTH AI MULTIMODAL SCRAPER');
  console.log('═'.repeat(60));
  console.log('📡 RSS + Web Scraping Combined');
  console.log('🔄 Running 24/7 with auto-retry');
  console.log(`⏱️  Cycle every ${CONFIG.CYCLE_DELAY / 60000} minutes`);
  console.log('═'.repeat(60));
  
  while (isRunning) {
    try {
      await runScrapingCycle();
    } catch (error) {
      console.error('❌ Cycle error:', error.message);
    }
    
    if (isRunning) {
      console.log(`⏳ Waiting ${CONFIG.CYCLE_DELAY / 60000} minutes until next cycle...`);
      await sleep(CONFIG.CYCLE_DELAY);
    }
  }
  
  console.log('👋 Scraper stopped');
}

main().catch(console.error);
