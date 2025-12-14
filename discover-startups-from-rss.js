#!/usr/bin/env node

/**
 * Discover Startups from RSS Feeds
 * 
 * This script scrapes RSS feeds for startup mentions and saves them to discovered_startups table
 * Run: node discover-startups-from-rss.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai').default;
const Parser = require('rss-parser');

// Check environment variables (support both VITE_ prefixed and non-prefixed)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_KEY must be set in .env file');
  console.error(`   Found: SUPABASE_URL=${!!SUPABASE_URL}, SERVICE_KEY=${!!SUPABASE_SERVICE_KEY}`);
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY (or VITE_OPENAI_API_KEY) in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
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

  // Process each RSS source
  for (const source of sources) {
    try {
      console.log(`📰 Processing: ${source.name}`);
      const startups = await processRSSSource(source);
      allStartups.push(...startups);
      console.log(`   ✅ Found ${startups.length} startups\n`);

      // Be respectful - wait between feeds
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`   ❌ Error processing ${source.name}:`, error.message);
    }
  }

  console.log(`\n✨ Total startups discovered: ${allStartups.length}`);

  // Save to database
  if (allStartups.length > 0) {
    await saveDiscoveredStartups(allStartups);
  }

  return allStartups;
}

async function processRSSSource(source) {
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

    // Extract startups using AI
    const startups = await extractStartupsFromArticles(recentArticles, source.name);

    return startups;

  } catch (error) {
    console.error(`Error parsing feed ${source.name}:`, error.message);
    return [];
  }
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

  const prompt = `You are a startup discovery analyst. Extract ALL startup companies mentioned in these articles.

ARTICLES:
${articlesText}

EXTRACTION TASK:
Extract EVERY startup/company mentioned that:
1. Is a technology startup or innovative company
2. Has any funding/product/launch news
3. Is mentioned with enough detail to be relevant

For each startup, extract:
- Company name (exact name as mentioned)
- Company website (if mentioned or can be inferred)
- Brief description (1-2 sentences)
- Funding amount (if mentioned)
- Funding stage (if mentioned)
- Investor names (if mentioned)

RESPONSE FORMAT (JSON only):
{
  "startups": [
    {
      "name": "Company Name",
      "website": "https://example.com or null",
      "description": "Brief description",
      "funding_amount": "$10M or null",
      "funding_stage": "Series A or null",
      "investors": ["Investor 1"] or [],
      "article_url": "article url",
      "article_title": "article title"
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a startup discovery expert. Extract startup information and return ONLY valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const result = completion.choices[0]?.message?.content?.trim();
    
    if (!result) {
      return [];
    }

    // Clean markdown code blocks if present
    let jsonStr = result;
    if (jsonStr.includes('```')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(jsonStr);
    const startupsArray = parsed.startups || [];

    // Map to proper format
    const discoveredStartups = startupsArray.map((s) => {
      const matchingArticle = articles.find(a => a.link === s.article_url) || articles[0];
      
      return {
        name: s.name,
        website: s.website && s.website !== 'null' ? s.website : null,
        description: s.description || '',
        funding_amount: s.funding_amount && s.funding_amount !== 'null' ? s.funding_amount : null,
        funding_stage: s.funding_stage && s.funding_stage !== 'null' ? s.funding_stage : null,
        investors_mentioned: Array.isArray(s.investors) && s.investors.length > 0 ? s.investors : null,
        article_url: s.article_url || matchingArticle.link,
        article_title: s.article_title || matchingArticle.title,
        article_date: matchingArticle.pubDate || null,
        rss_source: sourceName,
      };
    });

    return discoveredStartups;

  } catch (error) {
    console.error('   ⚠️  Error extracting startups with AI:', error.message);
    return [];
  }
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
