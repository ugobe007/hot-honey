#!/usr/bin/env node
/**
 * Extract Missing Series A/B Startups from RSS Articles
 * 
 * This script:
 * 1. Finds RSS articles with Series A/B mentions that haven't been imported
 * 2. Extracts startup information from those articles using AI
 * 3. Saves to discovered_startups with correct funding_stage
 * 4. Then can be imported to startup_uploads with correct stage mapping
 */

// Load .env file - use override: true to ensure all vars are loaded
require('dotenv').config({ override: true });
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Looking for:');
  console.error('   - VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n   Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', ') || 'none');
  process.exit(1);
}

// Verify key is not empty
if (!supabaseKey || supabaseKey.trim() === '') {
  console.error('❌ SUPABASE_SERVICE_KEY is empty or invalid');
  process.exit(1);
}

console.log('✅ Supabase URL:', supabaseUrl);
console.log('✅ Supabase Key:', supabaseKey.substring(0, 20) + '...' + supabaseKey.substring(supabaseKey.length - 10));

// Create Supabase client with service role key
// Service role should automatically bypass RLS
const supabase = createClient(supabaseUrl, supabaseKey);

// Try multiple possible environment variable names for Anthropic API key
const anthropicApiKey = process.env.HOT_HOT_API_KEY
  || process.env.ANTHROPIC_API_KEY 
  || process.env.VITE_ANTHROPIC_API_KEY
  || process.env.ANTHROPIC_API_KEY_DEV
  || process.env.CLAUDE_API_KEY
  || process.env.OPENAI_API_KEY; // Some setups use OpenAI var name

if (!anthropicApiKey) {
  console.error('❌ Missing Anthropic API Key');
  console.error('   Looking for one of:');
  console.error('   - HOT_HOT_API_KEY (your current key)');
  console.error('   - ANTHROPIC_API_KEY');
  console.error('   - VITE_ANTHROPIC_API_KEY');
  console.error('   - ANTHROPIC_API_KEY_DEV');
  console.error('   - CLAUDE_API_KEY');
  console.error('\n   Available env vars with "API", "KEY", "HOT", or "ANTHROPIC":');
  const relevantVars = Object.keys(process.env)
    .filter(k => k.includes('API') || k.includes('KEY') || k.includes('ANTHROPIC') || k.includes('CLAUDE') || k.includes('HOT'))
    .sort();
  if (relevantVars.length > 0) {
    relevantVars.forEach(k => console.error(`   - ${k}`));
  } else {
    console.error('   (none found)');
  }
  
  // Check specifically for HOT_HOT_API_KEY
  if (process.env.HOT_HOT_API_KEY === undefined) {
    console.error('\n   ⚠️  HOT_HOT_API_KEY is NOT in environment variables');
    console.error('   Please add this line to your .env file:');
    console.error('   HOT_HOT_API_KEY=sk-ant-api03-...');
  } else if (!process.env.HOT_HOT_API_KEY || process.env.HOT_HOT_API_KEY.trim() === '') {
    console.error('\n   ⚠️  HOT_HOT_API_KEY exists but is empty');
    console.error('   Please set a value for HOT_HOT_API_KEY in your .env file');
  }
  
  console.error('\n   Make sure your .env file has:');
  console.error('   HOT_HOT_API_KEY=sk-ant-api03-...');
  console.error('\n   Get your API key from: https://platform.claude.com/settings/keys');
  process.exit(1);
}

console.log('✅ Anthropic Key:', anthropicApiKey.substring(0, 10) + '...' + anthropicApiKey.substring(anthropicApiKey.length - 10));

const anthropic = new Anthropic({
  apiKey: anthropicApiKey
});

const BATCH_SIZE = 10; // Process articles in batches to avoid rate limits

async function extractMissingSeriesAB() {
  console.log('🔍 Finding RSS articles with Series A/B that haven\'t been imported...\n');

  try {
    // Step 1: Find unimported RSS articles with Series A/B mentions
    console.log('📰 Searching RSS articles...');
    const { data: articles, error: articlesError } = await supabase
      .from('rss_articles')
      .select('id, title, url, content, published_at, created_at')
      .or('title.ilike.%Series A%,content.ilike.%Series A%,title.ilike.%Series B%,content.ilike.%Series B%')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('published_at', { ascending: false })
      .limit(200);

    if (articlesError) {
      console.error('❌ Error fetching RSS articles:', articlesError);
      return;
    }

    if (!articles || articles.length === 0) {
      console.log('⚠️  No RSS articles with Series A/B mentions found');
      return;
    }

    console.log(`✅ Found ${articles.length} RSS articles with Series A/B mentions\n`);

    // Step 2: Filter out articles that are already imported
    console.log('🔍 Checking which articles are already imported...');
    const { data: allDiscovered } = await supabase
      .from('discovered_startups')
      .select('article_url');

    const importedUrls = new Set(
      (allDiscovered || []).map(ds => {
        try {
          const url = new URL(ds.article_url);
          return url.hostname + url.pathname;
        } catch {
          return ds.article_url;
        }
      })
    );

    const unimportedArticles = articles.filter(article => {
      try {
        const url = new URL(article.url);
        const urlKey = url.hostname + url.pathname;
        return !importedUrls.has(urlKey);
      } catch {
        return !importedUrls.has(article.url);
      }
    });

    console.log(`✅ Found ${unimportedArticles.length} unimported articles (${articles.length - unimportedArticles.length} already imported)\n`);

    if (unimportedArticles.length === 0) {
      console.log('✅ All Series A/B articles have been imported!');
      return;
    }

    // Step 3: Extract startups from unimported articles using AI
    console.log(`🤖 Extracting startups from ${unimportedArticles.length} articles...\n`);

    let totalExtracted = 0;
    let totalSaved = 0;
    let errors = 0;

    for (let i = 0; i < unimportedArticles.length; i += BATCH_SIZE) {
      const batch = unimportedArticles.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(unimportedArticles.length / BATCH_SIZE);

      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} articles)...`);

      for (const article of batch) {
        try {
          // Determine funding stage from article
          const isSeriesA = article.title?.includes('Series A') || article.content?.includes('Series A');
          const isSeriesB = article.title?.includes('Series B') || article.content?.includes('Series B');
          const fundingStage = isSeriesB ? 'Series B' : (isSeriesA ? 'Series A' : null);

          if (!fundingStage) {
            continue; // Skip if can't determine stage
          }

          // Prepare article text for AI extraction
          const articleText = `${article.title || ''}\n\n${article.content || ''}`.substring(0, 8000); // Limit to avoid token limits

          // Extract startup information using AI
          const prompt = `Extract ALL startup companies mentioned in this article that have ${fundingStage} funding.

ARTICLE:
${articleText}

For each startup with ${fundingStage} funding, extract:
- Company name (exact name as mentioned)
- Website URL (if mentioned)
- Brief description (1-2 sentences)
- Funding amount (if mentioned, e.g., "$10M")
- Investors mentioned (array of names)

IMPORTANT:
- Extract EVERY startup mentioned with ${fundingStage} funding
- ${fundingStage} is the funding stage - include it
- If multiple startups are mentioned, extract all of them
- If funding amount is mentioned, include it

RESPONSE FORMAT (JSON only):
{
  "startups": [
    {
      "name": "Company Name",
      "website": "https://example.com or null",
      "description": "Brief description",
      "funding_amount": "$10M or null",
      "funding_stage": "${fundingStage}",
      "investors": ["Investor 1", "Investor 2"] or []
    }
  ]
}`;

          const message = await anthropic.messages.create({
            model: 'claude-3-5-haiku-latest',
            max_tokens: 4000,
            system: 'You are a startup discovery expert. Extract startup information from articles and return ONLY valid JSON. Be aggressive - extract every startup with funding news.',
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
          });

          const result = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';
          
          if (!result) {
            console.log(`  ⏭️  ${article.title?.substring(0, 50)}... - No extraction result`);
            continue;
          }

          // Parse JSON response
          let jsonStr = result;
          if (jsonStr.includes('```')) {
            jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
          }

          const parsed = JSON.parse(jsonStr);
          const startups = parsed.startups || [];

          if (startups.length === 0) {
            console.log(`  ⏭️  ${article.title?.substring(0, 50)}... - No startups extracted`);
            continue;
          }

          console.log(`  ✅ ${article.title?.substring(0, 50)}... - Extracted ${startups.length} startup(s)`);
          totalExtracted += startups.length;

          // Save to discovered_startups
          for (const startup of startups) {
            try {
              // Check if startup already exists (by name)
              const { data: existing } = await supabase
                .from('discovered_startups')
                .select('id')
                .ilike('name', startup.name)
                .limit(1)
                .single();

              if (existing) {
                console.log(`    ⏭️  Skipping "${startup.name}" - already exists`);
                continue;
              }

              // Insert into discovered_startups
              // Use service role key to bypass RLS
              const { data: insertedData, error: insertError } = await supabase
                .from('discovered_startups')
                .insert({
                  name: startup.name,
                  website: startup.website && startup.website !== 'null' ? startup.website : null,
                  description: startup.description || null,
                  funding_amount: startup.funding_amount || null,
                  funding_stage: fundingStage, // Explicitly set to Series A or Series B
                  investors_mentioned: Array.isArray(startup.investors) && startup.investors.length > 0 
                    ? startup.investors 
                    : null,
                  article_url: article.url,
                  article_title: article.title,
                  article_date: article.published_at || article.created_at,
                  rss_source: 'series_a_b_extraction',
                  imported_to_startups: false,
                  discovered_at: new Date().toISOString()
                })
                .select();

              if (insertError) {
                console.error(`    ❌ Error saving "${startup.name}":`, insertError.message);
                console.error(`    ❌ Full error:`, JSON.stringify(insertError, null, 2));
                errors++;
              } else {
                totalSaved++;
                console.log(`    ✅ Saved "${startup.name}" (${fundingStage})`);
              }
            } catch (saveError) {
              console.error(`    ❌ Error processing startup "${startup.name}":`, saveError.message);
              errors++;
            }
          }

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (articleError) {
          console.error(`  ❌ Error processing article "${article.title?.substring(0, 50)}...":`, articleError.message);
          errors++;
        }
      }

      // Longer delay between batches
      if (i + BATCH_SIZE < unimportedArticles.length) {
        console.log(`  ⏸️  Waiting 3 seconds before next batch...\n`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    // Step 4: Summary
    console.log('\n📊 Extraction Summary:');
    console.log(`  ✅ Articles processed: ${unimportedArticles.length}`);
    console.log(`  ✅ Startups extracted: ${totalExtracted}`);
    console.log(`  ✅ Startups saved: ${totalSaved}`);
    console.log(`  ❌ Errors: ${errors}\n`);

    if (totalSaved > 0) {
      console.log('🎉 Successfully extracted missing Series A/B startups!');
      console.log('\n📝 Next steps:');
      console.log('  1. Review discovered_startups to verify quality');
      console.log('  2. Run: node scripts/approve-all-discovered-startups.js');
      console.log('  3. The approve script will now correctly map funding_stage to numeric stage\n');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

extractMissingSeriesAB();
