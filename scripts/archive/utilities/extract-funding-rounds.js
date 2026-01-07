#!/usr/bin/env node
/**
 * AUTOMATED FUNDING ROUNDS EXTRACTION
 * 
 * Extracts funding rounds from RSS articles and saves to funding_rounds table.
 * Designed to run automatically via automation-engine.js
 * 
 * Features:
 * - Pattern-based extraction (no AI needed, avoids quota issues)
 * - Duplicate prevention
 * - Date validation (fixes future dates)
 * - Error handling and logging
 * - Startup name matching
 * 
 * Run: node extract-funding-rounds.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://unkpogyhhjbvxxjvmxlt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE1OTAzNSwiZXhwIjoyMDc2NzM1MDM1fQ.MYfYe8wDL1MYac1NHq2WkjFH27-eFUDi3Xn1hD5rLFA';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// UTILITY FUNCTIONS
// ============================================

function parseAmount(amountStr) {
  if (!amountStr) return null;
  const cleaned = amountStr.replace(/[$,]/g, '').trim();
  const match = cleaned.match(/^([\d.]+)([KMkmB]?)$/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const multipliers = { 'K': 1000, 'M': 1000000, 'B': 1000000000 };
  return value * (multipliers[unit] || 1);
}

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
}

async function findStartupByName(companyName) {
  if (!companyName) return null;
  
  const normalized = normalizeName(companyName);
  
  // Try exact match first
  const { data: exact } = await supabase
    .from('startup_uploads')
    .select('id, name')
    .ilike('name', companyName)
    .limit(1)
    .single();
  
  if (exact) return exact.id;
  
  // Try normalized match from first 200 startups
  const { data: all } = await supabase
    .from('startup_uploads')
    .select('id, name')
    .limit(200);
  
  if (all) {
    const match = all.find(s => normalizeName(s.name) === normalized);
    if (match) return match.id;
  }
  
  return null;
}

function extractFundingPattern(title, content) {
  if (!title) return { company: null, amount: null, roundType: null };
  
  const text = (title + ' ' + (content || '')).toLowerCase();
  
  // Extract company name (usually first part of title)
  const companyMatch = title.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  const company = companyMatch ? companyMatch[1] : null;
  
  // Extract amount
  const amountMatch = text.match(/\$([\d.]+)\s*([kmb])/i) || 
                      text.match(/\$([\d.]+)\s*million/i) ||
                      text.match(/([\d.]+)\s*million/i);
  const amount = amountMatch ? `$${amountMatch[1]}${amountMatch[2]?.toUpperCase() || 'M'}` : null;
  
  // Extract round type
  let roundType = 'seed';
  if (text.includes('series a') || text.includes('series_a')) roundType = 'series_a';
  else if (text.includes('series b') || text.includes('series_b')) roundType = 'series_b';
  else if (text.includes('series c') || text.includes('series_c')) roundType = 'series_c';
  else if (text.includes('series d') || text.includes('series_d')) roundType = 'series_d';
  else if (text.includes('pre-seed') || text.includes('preseed')) roundType = 'pre-seed';
  else if (text.includes('seed')) roundType = 'seed';
  else if (text.includes('angel')) roundType = 'angel';
  else if (text.includes('bridge')) roundType = 'bridge';
  
  return { company, amount, roundType };
}

async function checkDuplicate(startupId, roundType, amount, date) {
  const { data } = await supabase
    .from('funding_rounds')
    .select('id')
    .eq('startup_id', startupId)
    .eq('round_type', roundType)
    .eq('amount', amount)
    .eq('date', date)
    .limit(1)
    .single();
  
  return !!data;
}

// ============================================
// MAIN EXTRACTION FUNCTION
// ============================================

async function extractFundingRounds() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] 🔍 Starting funding rounds extraction...\n`);
  
  try {
    // Get RSS articles with funding keywords
    const { data: articles, error: fetchError } = await supabase
      .from('rss_articles')
      .select('*')
      .or('title.ilike.%funding%,title.ilike.%raises%,title.ilike.%investment%,title.ilike.%series%,title.ilike.%seed%')
      .order('published_at', { ascending: false })
      .limit(100);
    
    if (fetchError) {
      console.log('⚠️  rss_articles table error, trying startup_news...');
      const { data: newsArticles } = await supabase
        .from('startup_news')
        .select('*')
        .or('headline.ilike.%funding%,headline.ilike.%raises%')
        .limit(50);
      
      if (!newsArticles || newsArticles.length === 0) {
        console.log('ℹ️  No funding articles found');
        return { extracted: 0, skipped: 0, errors: 0 };
      }
      
      return await processArticles(newsArticles, 'startup_news');
    }
    
    if (!articles || articles.length === 0) {
      console.log('ℹ️  No RSS articles found');
      return { extracted: 0, skipped: 0, errors: 0 };
    }
    
    console.log(`📊 Found ${articles.length} articles to process\n`);
    return await processArticles(articles, 'rss_articles');
    
  } catch (error) {
    console.error(`❌ Extraction failed:`, error.message);
    return { extracted: 0, skipped: 0, errors: 1 };
  }
}

async function processArticles(articles, source) {
  let extracted = 0;
  let skipped = 0;
  let errors = 0;
  const today = new Date().toISOString().split('T')[0];
  
  for (const article of articles) {
    try {
      const title = article.title || article.headline || '';
      const content = article.content || article.summary || article.description || '';
      
      const { company, amount, roundType } = extractFundingPattern(title, content);
      
      if (!company || !amount) {
        skipped++;
        continue;
      }
      
      const startupId = await findStartupByName(company);
      if (!startupId) {
        skipped++;
        continue;
      }
      
      // Use article date, but if it's in the future, use today's date
      let date = article.published_at?.split('T')[0] || 
                 article.published_date?.split('T')[0] || 
                 today;
      const articleDate = new Date(date);
      const todayDate = new Date(today);
      if (articleDate > todayDate) {
        date = today;
      }
      
      const amountNum = parseAmount(amount);
      
      // Check for duplicate before inserting
      const isDuplicate = await checkDuplicate(startupId, roundType, amountNum, date);
      if (isDuplicate) {
        skipped++;
        continue;
      }
      
      // Insert funding round
      const { error: insertError } = await supabase
        .from('funding_rounds')
        .insert({
          startup_id: startupId,
          round_type: roundType,
          amount: amountNum,
          date: date,
          source: source,
          source_url: article.url || null,
          announced: true
        });
      
      if (insertError) {
        console.error(`❌ Error inserting ${company}: ${insertError.message}`);
        errors++;
      } else {
        console.log(`✅ ${company} - ${roundType} (${amount}) on ${date}`);
        extracted++;
      }
      
    } catch (error) {
      console.error(`❌ Error processing article:`, error.message);
      errors++;
    }
  }
  
  const duration = ((Date.now() - Date.now()) / 1000).toFixed(1);
  console.log(`\n📈 Summary: ${extracted} extracted, ${skipped} skipped, ${errors} errors`);
  
  return { extracted, skipped, errors };
}

// ============================================
// RUN EXTRACTION
// ============================================

if (require.main === module) {
  extractFundingRounds()
    .then((result) => {
      console.log(`\n✨ Extraction complete!`);
      process.exit(result.errors > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('\n❌ Extraction failed:', error);
      process.exit(1);
    });
}

module.exports = { extractFundingRounds };

