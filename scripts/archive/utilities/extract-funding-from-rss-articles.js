#!/usr/bin/env node
/**
 * Extract funding rounds from RSS articles and save to funding_rounds table
 * 
 * This script:
 * 1. Reads RSS articles that mention funding
 * 2. Extracts funding information using AI
 * 3. Matches companies to startups
 * 4. Creates funding_rounds records
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Looking for:');
  console.error('   - VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n   Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('OPENAI')).join(', ') || 'none');
  console.error('\n   Make sure your .env file has:');
  console.error('   VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.error('   SUPABASE_SERVICE_KEY=your-service-key');
  console.error('   OPENAI_API_KEY=your-openai-key');
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Parse amount string to numeric
 */
function parseAmount(amountStr) {
  if (!amountStr || typeof amountStr !== 'string') return null;
  
  const cleaned = amountStr.replace(/[$,]/g, '').trim();
  const match = cleaned.match(/^([\d.]+)([KMkmB]?)$/);
  
  if (!match) return null;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  const multipliers = {
    'K': 1000,
    'M': 1000000,
    'B': 1000000000
  };
  
  return value * (multipliers[unit] || 1);
}

/**
 * Normalize company name for matching
 */
function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find startup by name (fuzzy match)
 */
async function findStartupByName(companyName) {
  const normalized = normalizeName(companyName);
  
  // Try exact match first
  const { data: exact } = await supabase
    .from('startup_uploads')
    .select('id, name')
    .ilike('name', companyName)
    .limit(1)
    .single();
  
  if (exact) return exact.id;
  
  // Try normalized match
  const { data: all } = await supabase
    .from('startup_uploads')
    .select('id, name')
    .limit(100);
  
  if (all) {
    const match = all.find(s => 
      normalizeName(s.name) === normalized
    );
    if (match) return match.id;
  }
  
  return null;
}

/**
 * Extract funding info from article using AI
 */
async function extractFundingFromArticle(article) {
  const prompt = `Extract funding information from this article. Return JSON only.

Article Title: ${article.title || ''}
Article Content: ${article.content || article.description || ''}
Article URL: ${article.url || ''}
Article Date: ${article.published_at || article.created_at || ''}

Extract:
- company_name: The startup/company that received funding
- funding_amount: Amount (e.g., "$10M", "$5.5M")
- round_type: Round type (e.g., "seed", "series_a", "series_b")
- funding_date: Date of funding (YYYY-MM-DD format)
- lead_investor: Lead investor name (if mentioned)
- investors: Array of investor names

Return JSON format:
{
  "company_name": "Company Name",
  "funding_amount": "$10M",
  "round_type": "series_a",
  "funding_date": "2024-01-15",
  "lead_investor": "Investor Name",
  "investors": ["Investor 1", "Investor 2"]
}

If no funding info found, return: {"company_name": null}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a funding news extraction expert. Extract funding information from articles. Return valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('Error extracting funding:', error.message);
    return { company_name: null };
  }
}

/**
 * Main extraction function
 */
async function extractFundingFromRSS() {
  console.log('🔍 Extracting funding rounds from RSS articles...\n');
  
  // Get RSS articles (assuming they're stored somewhere)
  // Check if rss_articles table exists
  const { data: articles, error: fetchError } = await supabase
    .from('rss_articles')
    .select('*')
    .or('title.ilike.%funding%,title.ilike.%raises%,title.ilike.%investment%,title.ilike.%series%')
    .order('published_at', { ascending: false })
    .limit(100);
  
  if (fetchError) {
    console.log('⚠️  rss_articles table may not exist, trying alternative...');
    // Try startup_news table
    const { data: newsArticles } = await supabase
      .from('startup_news')
      .select('*')
      .or('headline.ilike.%funding%,headline.ilike.%raises%')
      .limit(50);
    
    if (!newsArticles || newsArticles.length === 0) {
      console.log('ℹ️  No funding articles found');
      return;
    }
    
    console.log(`📊 Found ${newsArticles.length} news articles\n`);
    
    let extracted = 0;
    let skipped = 0;
    
    for (const article of newsArticles) {
      try {
        const funding = await extractFundingFromArticle({
          title: article.headline,
          content: article.summary || article.content,
          url: article.url,
          published_at: article.published_date
        });
        
        if (!funding.company_name) {
          skipped++;
          continue;
        }
        
        const startupId = await findStartupByName(funding.company_name);
        if (!startupId) {
          console.log(`⚠️  No startup found: ${funding.company_name}`);
          skipped++;
          continue;
        }
        
        // Check for duplicate
        const { data: existing } = await supabase
          .from('funding_rounds')
          .select('id')
          .eq('startup_id', startupId)
          .eq('round_type', funding.round_type || 'seed')
          .eq('date', funding.funding_date || article.published_date?.split('T')[0])
          .limit(1)
          .single();
        
        if (existing) {
          skipped++;
          continue;
        }
        
        // Insert funding round
        const roundData = {
          startup_id: startupId,
          round_type: funding.round_type || 'seed',
          amount: parseAmount(funding.funding_amount),
          valuation: null,
          date: funding.funding_date || article.published_date?.split('T')[0] || new Date().toISOString().split('T')[0],
          lead_investor: funding.lead_investor || null,
          investors: funding.investors || [],
          source: 'rss_articles',
          source_url: article.url || null,
          announced: true
        };
        
        const { error: insertError } = await supabase
          .from('funding_rounds')
          .insert(roundData);
        
        if (insertError) {
          console.error(`❌ Error: ${insertError.message}`);
        } else {
          console.log(`✅ Extracted: ${funding.company_name} - ${funding.round_type} (${funding.funding_amount})`);
          extracted++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing article:`, error.message);
      }
    }
    
    console.log(`\n📈 Summary: ${extracted} extracted, ${skipped} skipped`);
    return;
  }
  
  if (!articles || articles.length === 0) {
    console.log('ℹ️  No RSS articles found');
    return;
  }
  
  console.log(`📊 Found ${articles.length} RSS articles\n`);
  
  let extracted = 0;
  let skipped = 0;
  
  for (const article of articles) {
    try {
      const funding = await extractFundingFromArticle(article);
      
      if (!funding.company_name) {
        skipped++;
        continue;
      }
      
      const startupId = await findStartupByName(funding.company_name);
      if (!startupId) {
        skipped++;
        continue;
      }
      
      // Check for duplicate and insert
      const { data: existing } = await supabase
        .from('funding_rounds')
        .select('id')
        .eq('startup_id', startupId)
        .eq('round_type', funding.round_type || 'seed')
        .limit(1)
        .single();
      
      if (existing) {
        skipped++;
        continue;
      }
      
      const roundData = {
        startup_id: startupId,
        round_type: funding.round_type || 'seed',
        amount: parseAmount(funding.funding_amount),
        date: funding.funding_date || article.published_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        lead_investor: funding.lead_investor || null,
        investors: funding.investors || [],
        source: 'rss_articles',
        source_url: article.url || null,
        announced: true
      };
      
      const { error: insertError } = await supabase
        .from('funding_rounds')
        .insert(roundData);
      
      if (insertError) {
        console.error(`❌ Error: ${insertError.message}`);
      } else {
        console.log(`✅ Extracted: ${funding.company_name} - ${funding.round_type}`);
        extracted++;
      }
      
    } catch (error) {
      console.error(`❌ Error:`, error.message);
    }
  }
  
  console.log(`\n📈 Summary: ${extracted} extracted, ${skipped} skipped`);
}

// Run extraction
extractFundingFromRSS()
  .then(() => {
    console.log('\n✨ Extraction complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Extraction failed:', error);
    process.exit(1);
  });

