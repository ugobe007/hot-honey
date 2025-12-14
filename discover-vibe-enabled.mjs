#!/usr/bin/env node

/**
 * 🔥 VIBE-ENABLED STARTUP DISCOVERY
 * 
 * Discovers startups from RSS feeds with VIBE format extraction
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import Parser from 'rss-parser';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY,
});

const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'content'],
      ['description', 'description'],
    ]
  }
});

console.log('🔥 HOT MONEY STARTUP DISCOVERY WITH VIBE FORMAT\n');
console.log('═══════════════════════════════════════════\n');

async function extractStartupsWithAI(articles, sourceName) {
  if (articles.length === 0) return [];

  console.log(`\n🤖 Using AI to extract VIBE data from ${articles.length} articles...`);

  // Prepare article summaries for AI
  const articleTexts = articles.map((article, idx) => 
    `[Article ${idx + 1}]\nTitle: ${article.title}\nContent: ${article.contentSnippet || article.description || ''}\nLink: ${article.link || article.url}\n`
  ).join('\n---\n');

  const prompt = `You are a startup analyst. Extract startup information from these news articles.

For each startup found, extract:

VIBE SCORE (Qualitative Story - 5 Points):
1. VALUE_PROPOSITION: One-line tagline/pitch (what they do)
2. PROBLEM: Specific customer pain point being solved
3. SOLUTION: How they solve it (product/service)
4. MARKET_SIZE: Total addressable market or growth opportunity
5. TEAM_COMPANIES: Notable previous companies of founders/team (array)

ADDITIONAL DATA:
- SECTORS: Industry categories (array: e.g., ["HealthTech", "AI/ML"])
- FUNDING_AMOUNT: Amount raised (e.g., "$5M Series A")
- FUNDING_STAGE: Stage (Seed, Series A, B, etc.)
- INVESTORS: Investor names mentioned (array)
- WEBSITE: Company website URL

Articles:
${articleTexts}

RESPONSE FORMAT (JSON):
{
  "startups": [
    {
      "name": "CompanyName",
      "website": "https://...",
      "description": "Brief description",
      "vibe_score": {
        "value_proposition": "Tagline here",
        "problem": "Problem they're solving",
        "solution": "How they solve it",
        "market_size": "$XB market opportunity",
        "team_companies": ["Google", "Tesla"]
      },
      "sectors": ["HealthTech", "AI/ML"],
      "funding_amount": "$5M Series A",
      "funding_stage": "Series A",
      "investors_mentioned": ["Sequoia", "a16z"],
      "article_title": "Article title",
      "article_url": "https://..."
    }
  ]
}

Only include startups with solid information. Skip if too vague.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    
    // Map vibe_score to individual fields
    const startups = (result.startups || []).map(s => ({
      name: s.name,
      website: s.website,
      description: s.description,
      value_proposition: s.vibe_score?.value_proposition || s.value_proposition,
      problem: s.vibe_score?.problem || s.problem,
      solution: s.vibe_score?.solution || s.solution,
      market_size: s.vibe_score?.market_size || s.market_size,
      team_companies: s.vibe_score?.team_companies || s.team_companies || [],
      sectors: s.sectors || [],
      funding_amount: s.funding_amount,
      funding_stage: s.funding_stage,
      investors_mentioned: s.investors_mentioned || [],
      article_url: s.article_url || articles[0]?.link,
      article_title: s.article_title || articles[0]?.title,
      article_date: articles[0]?.isoDate,
      rss_source: sourceName,
    }));

    console.log(`   ✅ AI extracted ${startups.length} startups with VIBE data`);
    return startups;

  } catch (error) {
    console.error('   ❌ AI extraction failed:', error.message);
    return [];
  }
}

async function main() {
  console.log('📡 Fetching active RSS sources...\n');

  const { data: sources, error } = await supabase
    .from('rss_sources')
    .select('*')
    .eq('active', true);

  if (error || !sources || sources.length === 0) {
    console.error('❌ No active RSS sources found');
    return;
  }

  console.log(`Found ${sources.length} active RSS sources\n`);

  const allStartups = [];

  // Process each source
  for (const source of sources) {
    try {
      console.log(`📰 Processing: ${source.name}`);
      
      const feed = await parser.parseURL(source.url);
      
      // Get recent articles (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentArticles = (feed.items || [])
        .filter(item => {
          if (!item.isoDate) return true;
          return new Date(item.isoDate) >= thirtyDaysAgo;
        })
        .slice(0, 20); // Limit to 20 articles per feed

      console.log(`   📅 ${recentArticles.length} recent articles`);

      if (recentArticles.length > 0) {
        const startups = await extractStartupsWithAI(recentArticles, source.name);
        allStartups.push(...startups);
        console.log(`   ✅ Found ${startups.length} startups`);
      }

      // Wait between sources
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`Error parsing feed ${source.name}:`, error.message);
      console.log(`   ✅ Found 0 startups`);
    }
  }

  console.log(`\n\n💾 Saving ${allStartups.length} startups to database...\n`);

  let saved = 0;
  let skipped = 0;

  for (const startup of allStartups) {
    try {
      // Check if exists
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

      // Insert with VIBE format
      const { error } = await supabase
        .from('discovered_startups')
        .insert({
          name: startup.name,
          website: startup.website,
          description: startup.description,
          value_proposition: startup.value_proposition,
          problem: startup.problem,
          solution: startup.solution,
          market_size: startup.market_size,
          team_companies: startup.team_companies,
          sectors: startup.sectors,
          funding_amount: startup.funding_amount,
          funding_stage: startup.funding_stage,
          investors_mentioned: startup.investors_mentioned,
          article_url: startup.article_url,
          article_title: startup.article_title,
          article_date: startup.article_date,
          rss_source: startup.rss_source,
          website_verified: false,
          website_status: startup.website ? 'not_checked' : null,
        });

      if (error) {
        console.error(`   ❌ Error saving ${startup.name}:`, error.message);
        console.error('   Full error:', JSON.stringify(error, null, 2));
      } else {
        console.log(`   ✅ Successfully saved: ${startup.name}`);
        saved++;
      }

    } catch (error) {
      console.error(`   ❌ Error processing ${startup.name}:`, error.message);
    }
  }

  console.log(`\n✅ Saved: ${saved} | Skipped (duplicates): ${skipped}`);
  console.log('\n═══════════════════════════════════════════');
  console.log('✨ DISCOVERY COMPLETE!\n');
  console.log(`Total startups discovered: ${allStartups.length}`);
  console.log('\n📊 View discovered startups:');
  console.log('   Go to: http://localhost:5173/admin/discovered-startups\n');
}

main().catch(console.error);
