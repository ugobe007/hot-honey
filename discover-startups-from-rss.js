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

  // Process RSS sources in parallel batches of 5 (faster discovery)
  const BATCH_SIZE = 5;
  for (let i = 0; i < sources.length; i += BATCH_SIZE) {
    const batch = sources.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1} (${batch.length} sources)...`);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (source) => {
      try {
        console.log(`📰 Processing: ${source.name}`);
        const startups = await processRSSSource(source);
        console.log(`   ✅ Found ${startups.length} startups from ${source.name}`);
        return startups;
      } catch (error) {
        console.error(`   ❌ Error processing ${source.name}:`, error.message);
        return [];
      }
    });
    
    // Wait for batch to complete
    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(startups => allStartups.push(...startups));
    
    // Small delay between batches
    if (i + BATCH_SIZE < sources.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
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
    
    // Filter recent articles (last 7 days for faster processing, more frequent runs)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentArticles = feedData.items.filter((item) => {
      const pubDate = item.pubDate ? new Date(item.pubDate) : null;
      return !pubDate || pubDate >= sevenDaysAgo;
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
  // Prepare articles text for AI (increased from 15 to 25 for more startups per run)
  const articlesText = articles
    .slice(0, 25)
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
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: `You are a startup discovery expert. Extract startup information and return ONLY valid JSON.\n\n${prompt}`,
        },
      ],
    });

    const result = message.content[0]?.text?.trim();
    
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
  
  // Auto-import immediately after discovery (for ML training)
  if (saved > 0) {
    console.log(`\n🔄 Auto-importing ${saved} newly discovered startups...`);
    try {
      const { execSync } = require('child_process');
      execSync('node auto-import-pipeline.js', { 
        stdio: 'inherit',
        cwd: __dirname 
      });
      console.log('✅ Auto-import complete');
    } catch (error) {
      console.log('⚠️  Auto-import failed (will retry via automation-engine):', error.message);
    }
  }
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
