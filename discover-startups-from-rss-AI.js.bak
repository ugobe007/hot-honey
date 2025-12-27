#!/usr/bin/env node

/**
 * Discover Startups from RSS Feeds
 * 
 * This script scrapes RSS feeds for startup mentions and saves them to discovered_startups table
 * Run: node discover-startups-from-rss.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk').default;
const Parser = require('rss-parser');

// Check environment variables (support both VITE_ prefixed and non-prefixed)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_KEY must be set in .env file');
  console.error(`   Found: SUPABASE_URL=${!!SUPABASE_URL}, SERVICE_KEY=${!!SUPABASE_SERVICE_KEY}`);
  process.exit(1);
}

if (!ANTHROPIC_API_KEY) {
  console.error('❌ Missing ANTHROPIC_API_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'content'],
      ['description', 'description'],
    ]
  }
});

console.log('🚀 HOT MONEY HONEY - Startup Discovery Tool\n');
console.log('═══════════════════════════════════════════\n');

async function discoverStartupsFromRSS() {
  console.log('📡 Fetching active RSS sources...\n');
  
  // Get all active RSS sources
  const { data: sources, error: sourcesError } = await supabase
    .from('rss_sources')
    .select('*')
    .eq('active', true);

  if (sourcesError || !sources || sources.length === 0) {
    console.error('❌ Error fetching RSS sources:', sourcesError);
    return [];
  }

  console.log(`Found ${sources.length} active RSS sources\n`);

  const allStartups = [];
  const feedErrors = [];

  // Process each RSS source with retry logic
  for (const source of sources) {
    let attempts = 0;
    let startups = [];
    let lastError = null;
    while (attempts < 3) {
      try {
        console.log(`📠 Processing: ${source.name} (attempt ${attempts + 1})`);
        startups = await processRSSSource(source);
        if (startups.length > 0) break; // Success
        lastError = null;
      } catch (error) {
        lastError = error;
        console.error(`   ❌ Error processing ${source.name} (attempt ${attempts + 1}):`, error.message);
      }
      attempts++;
      if (attempts < 3) await new Promise(resolve => setTimeout(resolve, 2000));
    }
    if (lastError) {
      feedErrors.push({ name: source.name, url: source.url, error: lastError.message });
    }
    allStartups.push(...startups);
    console.log(`   ✅ Found ${startups.length} startups\n`);
    // Be respectful - wait between feeds
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n✨ Total startups discovered: ${allStartups.length}`);
  if (feedErrors.length > 0) {
    console.log(`\n⚠️  ${feedErrors.length} feeds had errors:`);
    feedErrors.forEach(e => console.log(`   - ${e.name}: ${e.error}`));
  }

  // Save to database
  if (allStartups.length > 0) {
    await saveDiscoveredStartups(allStartups);
  }

  return allStartups;
}

async function processRSSSource(source) {
  let attempts = 0;
  let lastError = null;
  while (attempts < 3) {
    try {
      // Parse RSS feed
      const feedData = await parser.parseURL(source.url);
      // Filter recent articles (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentArticles = feedData.items.filter((item) => {
        const pubDate = item.pubDate ? new Date(item.pubDate) : null;
        return !pubDate || pubDate >= thirtyDaysAgo;
      });
      if (recentArticles.length === 0) {
        return [];
      }
      console.log(`   📅 ${recentArticles.length} recent articles`);
      // Extract startups using AI (with retry)
      const startups = await extractStartupsFromArticles(recentArticles, source.name);
      return startups;
    } catch (error) {
      lastError = error;
      console.error(`Error parsing feed ${source.name} (attempt ${attempts + 1}):`, error.message);
      attempts++;
      if (attempts < 3) await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  // Optionally: mark feed inactive after 5 consecutive failures (not implemented here)
  return [];
}

async function extractStartupsFromArticles(articles, sourceName) {
  // Prepare articles text for AI
  const articlesText = articles
    .slice(0, 15)
    .map((item, i) => {
      const content = item.content || item.description || item.title || '';
      const cleanContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return `
ARTICLE ${i + 1}:
Title: ${item.title}
Date: ${item.pubDate || 'Unknown'}
URL: ${item.link}
Content: ${cleanContent.substring(0, 600)}...
`;
    })
    .join('\n---\n');

  const prompt = `You are a deal and startup discovery analyst. Extract ALL startups, funding rounds, mergers, acquisitions, partnerships, expansions, and major customer wins mentioned in these articles.

ARTICLES:
${articlesText}

EXTRACTION TASK:
Extract EVERY entity or deal that:
1. Is a technology startup, scaleup, or innovative company
2. Has any funding, merger, acquisition, partnership, expansion, or major customer win
3. Is mentioned with enough detail to be relevant

For each item, extract:
- Entity type (startup, funding, merger, acquisition, partnership, expansion, customer win)
- Company name (exact name as mentioned)
- Company website (if mentioned or can be inferred)
- Brief description (1-2 sentences)
- Deal type (funding, M&A, partnership, expansion, customer win)
- Funding amount (if mentioned)
- Funding stage (if mentioned)
- Investor names (if mentioned)
- Partner/customer names (if mentioned)
- Article URL
- Article title

RESPONSE FORMAT (JSON only):
{
  "deals": [
    {
      "entity_type": "startup|funding|merger|acquisition|partnership|expansion|customer_win",
      "name": "Company Name",
      "website": "https://example.com or null",
      "description": "Brief description",
      "deal_type": "funding|merger|acquisition|partnership|expansion|customer_win",
      "funding_amount": "$10M or null",
      "funding_stage": "Series A or null",
      "investors": ["Investor 1"] or [],
      "partners_customers": ["Partner/Customer 1"] or [],
      "article_url": "article url",
      "article_title": "article title"
    }
  ]
}`;

  let attempts = 0;
  let lastError = null;
  while (attempts < 3) {
    try {
      const message = await anthropic.messages.create({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 3000,
        messages: [
          {
            role: 'user',
            content: `You are a deal and startup discovery expert. Extract startup and deal information and return ONLY valid JSON.\n\n${prompt}`,
          },
        ],
      });
      let result = message.content[0]?.text?.trim();
      if (!result) {
        throw new Error('No result from AI');
      }
      // Clean markdown code blocks if present
      let jsonStr = result;
      if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      // Try to auto-correct malformed JSON
      try {
        jsonStr = jsonStr.replace(/\n\s*\{/g, '{').replace(/\n\s*\[/g, '[');
        if (!jsonStr.startsWith('{')) jsonStr = '{' + jsonStr.split('{').slice(1).join('{');
        if (!jsonStr.endsWith('}')) jsonStr = jsonStr.split('}')[0] + '}';
      } catch {}
      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        // Fallback: try to extract deals with regex
        console.error('   ⚠️  AI JSON parse failed, using regex fallback.');
        const dealRegex = /([A-Z][a-zA-Z0-9&\- ]+) (raised|acquired|merged|partnered|expanded|won) (\$[0-9.,]+[A-Za-z]*|Series [A-Z]|[A-Z][a-zA-Z0-9&\- ]+|a customer|a partnership|an acquisition|an expansion|a deal)/gi;
        const discoveredDeals = [];
        articles.forEach(article => {
          let matches = article.content.match(dealRegex);
          if (matches) {
            matches.forEach(m => {
              discoveredDeals.push({
                entity_type: 'deal',
                name: m.split(' ')[0],
                description: m,
                deal_type: 'unknown',
                article_url: article.link,
                article_title: article.title,
                rss_source: sourceName
              });
            });
          }
        });
        return discoveredDeals;
      }
      const dealsArray = parsed.deals || [];
      // Map to proper format
      const discoveredDeals = dealsArray.map((d) => {
        const matchingArticle = articles.find(a => a.link === d.article_url) || articles[0];
        return {
          entity_type: d.entity_type || 'startup',
          name: d.name,
          website: d.website && d.website !== 'null' ? d.website : null,
          description: d.description || '',
          deal_type: d.deal_type || null,
          funding_amount: d.funding_amount && d.funding_amount !== 'null' ? d.funding_amount : null,
          funding_stage: d.funding_stage && d.funding_stage !== 'null' ? d.funding_stage : null,
          investors_mentioned: Array.isArray(d.investors) && d.investors.length > 0 ? d.investors : null,
          partners_customers: Array.isArray(d.partners_customers) && d.partners_customers.length > 0 ? d.partners_customers : null,
          article_url: d.article_url || matchingArticle.link,
          article_title: d.article_title || matchingArticle.title,
          article_date: matchingArticle.pubDate || null,
          rss_source: sourceName,
        };
      });
      return discoveredDeals;
    } catch (error) {
      lastError = error;
      console.error('   ⚠️  Error extracting deals with AI (attempt ' + (attempts + 1) + '):', error.message);
      attempts++;
      if (attempts < 3) await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  // Fallback: try regex extraction if all attempts fail
  const dealRegex = /([A-Z][a-zA-Z0-9&\- ]+) (raised|acquired|merged|partnered|expanded|won) (\$[0-9.,]+[A-Za-z]*|Series [A-Z]|[A-Z][a-zA-Z0-9&\- ]+|a customer|a partnership|an acquisition|an expansion|a deal)/gi;
  const discoveredDeals = [];
  articles.forEach(article => {
    let matches = article.content.match(dealRegex);
    if (matches) {
      matches.forEach(m => {
        discoveredDeals.push({
          entity_type: 'deal',
          name: m.split(' ')[0],
          description: m,
          deal_type: 'unknown',
          article_url: article.link,
          article_title: article.title,
          rss_source: sourceName
        });
      });
    }
  });
  return discoveredDeals;
}

async function saveDiscoveredStartups(startups) {
  console.log(`\n💾 Saving ${startups.length} discovered startups to database...`);

  let saved = 0;
  let skipped = 0;

  for (const startup of startups) {
    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('discovered_startups')
        .select('id')
        .ilike('name', startup.name)
        .limit(1)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      // Insert new startup - ONLY use columns that exist in the table!
      const { error } = await supabase
        .from('discovered_startups')
        .insert({
          name: startup.name,
          website: startup.website,
          description: startup.description,
          funding_amount: startup.funding_amount,
          funding_stage: startup.funding_stage,
          investors_mentioned: startup.investors_mentioned,
          article_url: startup.article_url,
          // Note: article_title, article_date, rss_source columns don't exist
          // Store extra info in description if needed
          discovered_at: new Date().toISOString(),
          imported_to_startups: false
        });

      if (error) {
        console.error(`   ❌ Error saving ${startup.name}:`, error.message);
      } else {
        saved++;
      }

    } catch (error) {
      console.error(`   ❌ Error processing ${startup.name}:`, error.message);
    }
  }

  console.log(`\n✅ Saved: ${saved} | Skipped (duplicates): ${skipped}`);
}

async function main() {
  try {
    console.log('Starting RSS scraping for startup discovery...\n');
    
    // Discover startups from RSS feeds
    const startups = await discoverStartupsFromRSS();
    
    console.log('\n═══════════════════════════════════════════');
    console.log('✨ DISCOVERY COMPLETE!\n');
    console.log(`Total startups discovered: ${startups.length}`);
    console.log('\n📊 View discovered startups:');
    console.log('   Go to: http://localhost:5173/admin/discovered-startups');
    console.log('\n💡 Next steps:');
    console.log('   1. Review discovered startups in the admin panel');
    console.log('   2. Select startups to import into main database');
    console.log('   3. Export to CSV and bulk upload');
    console.log('\n═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error during startup discovery:', error);
    process.exit(1);
  }
}

main();
