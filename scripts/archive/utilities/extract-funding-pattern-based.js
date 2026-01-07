#!/usr/bin/env node
/**
 * Extract funding rounds using pattern matching (no AI needed)
 * This version uses regex patterns to extract funding info
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://unkpogyhhjbvxxjvmxlt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE1OTAzNSwiZXhwIjoyMDc2NzM1MDM1fQ.MYfYe8wDL1MYac1NHq2WkjFH27-eFUDi3Xn1hD5rLFA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
  const normalized = normalizeName(companyName);
  const { data: exact } = await supabase.from('startup_uploads').select('id, name').ilike('name', companyName).limit(1).single();
  if (exact) return exact.id;
  const { data: all } = await supabase.from('startup_uploads').select('id, name').limit(100);
  if (all) {
    const match = all.find(s => normalizeName(s.name) === normalized);
    if (match) return match.id;
  }
  return null;
}

function extractFundingPattern(title, content) {
  const text = (title + ' ' + (content || '')).toLowerCase();
  
  // Extract company name (usually first part of title)
  const companyMatch = title.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  const company = companyMatch ? companyMatch[1] : null;
  
  // Extract amount
  const amountMatch = text.match(/\$([\d.]+)\s*([kmb])/i) || text.match(/\$([\d.]+)\s*million/i);
  const amount = amountMatch ? `$${amountMatch[1]}${amountMatch[2]?.toUpperCase() || 'M'}` : null;
  
  // Extract round type
  let roundType = 'seed';
  if (text.includes('series a') || text.includes('series_a')) roundType = 'series_a';
  else if (text.includes('series b') || text.includes('series_b')) roundType = 'series_b';
  else if (text.includes('series c') || text.includes('series_c')) roundType = 'series_c';
  else if (text.includes('pre-seed') || text.includes('preseed')) roundType = 'pre-seed';
  else if (text.includes('seed')) roundType = 'seed';
  else if (text.includes('angel')) roundType = 'angel';
  
  return { company, amount, roundType };
}

async function extractFunding() {
  console.log('🔍 Extracting funding using pattern matching...\n');
  
  const { data: articles } = await supabase
    .from('rss_articles')
    .select('*')
    .or('title.ilike.%funding%,title.ilike.%raises%,title.ilike.%investment%,title.ilike.%series%')
    .order('published_at', { ascending: false })
    .limit(50);
  
  if (!articles || articles.length === 0) {
    console.log('ℹ️  No articles found');
    return;
  }
  
  console.log(`📊 Found ${articles.length} articles\n`);
  
  let extracted = 0;
  let skipped = 0;
  
  for (const article of articles) {
    try {
      const { company, amount, roundType } = extractFundingPattern(article.title, article.content);
      
      if (!company || !amount) {
        skipped++;
        continue;
      }
      
      const startupId = await findStartupByName(company);
      if (!startupId) {
        skipped++;
        continue;
      }
      
      const date = article.published_at?.split('T')[0] || new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('funding_rounds')
        .select('id')
        .eq('startup_id', startupId)
        .eq('round_type', roundType)
        .eq('date', date)
        .limit(1)
        .single();
      
      if (existing) {
        skipped++;
        continue;
      }
      
      const { error } = await supabase.from('funding_rounds').insert({
        startup_id: startupId,
        round_type: roundType,
        amount: parseAmount(amount),
        date: date,
        source: 'rss_articles',
        source_url: article.url,
        announced: true
      });
      
      if (error) {
        console.error(`❌ ${company}: ${error.message}`);
      } else {
        console.log(`✅ ${company} - ${roundType} (${amount})`);
        extracted++;
      }
    } catch (error) {
      console.error(`❌ Error:`, error.message);
    }
  }
  
  console.log(`\n📈 Summary: ${extracted} extracted, ${skipped} skipped`);
}

extractFunding().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });





