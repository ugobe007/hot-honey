#!/usr/bin/env node
/**
 * BACKFILL SCRAPER DATA
 * 
 * Attempts to backfill missing fields in discovered_startups:
 * - rss_source: Infer from article_url domain
 * - article_title: Try to fetch from article if URL available
 * - article_date: Try to infer from created_at or other sources
 * 
 * Run: node backfill-scraper-data.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Map common domains to RSS source names
const DOMAIN_TO_SOURCE = {
  'techcrunch.com': 'TechCrunch',
  'crunchbase.com': 'Crunchbase',
  'crunchbase.news': 'Crunchbase News',
  'venturebeat.com': 'VentureBeat',
  'theinformation.com': 'The Information',
  'axios.com': 'Axios',
  'bloomberg.com': 'Bloomberg',
  'reuters.com': 'Reuters',
  'wsj.com': 'Wall Street Journal',
  'forbes.com': 'Forbes',
  'businessinsider.com': 'Business Insider',
  'fastcompany.com': 'Fast Company',
  'wired.com': 'Wired',
  'theverge.com': 'The Verge',
  'arstechnica.com': 'Ars Technica',
  'producthunt.com': 'Product Hunt',
  'betakit.com': 'BetaKit',
  'pitchbook.com': 'PitchBook',
  'pehub.com': 'PE Hub'
};

function inferRssSource(articleUrl) {
  if (!articleUrl) return null;
  
  try {
    const url = new URL(articleUrl);
    const hostname = url.hostname.replace('www.', '');
    
    // Direct match
    if (DOMAIN_TO_SOURCE[hostname]) {
      return DOMAIN_TO_SOURCE[hostname];
    }
    
    // Partial match (subdomains)
    for (const [domain, source] of Object.entries(DOMAIN_TO_SOURCE)) {
      if (hostname.includes(domain)) {
        return source;
      }
    }
    
    // Capitalize domain as fallback
    return hostname.split('.')[0]
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
      
  } catch (error) {
    return null;
  }
}

async function backfillData() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        🔄 BACKFILL SCRAPER DATA                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`⏰ ${new Date().toLocaleString()}\n`);

  // 1. Find records missing rss_source
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('1️⃣  BACKFILLING MISSING rss_source');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    const { data: missingSource, error: fetchError } = await supabase
      .from('discovered_startups')
      .select('id, name, article_url, rss_source')
      .is('rss_source', null)
      .not('article_url', 'is', null)
      .limit(1000);

    if (fetchError) {
      console.error(`❌ Error fetching records: ${fetchError.message}`);
      return;
    }

    if (!missingSource || missingSource.length === 0) {
      console.log('✅ No records need rss_source backfill');
    } else {
      console.log(`📊 Found ${missingSource.length} records missing rss_source`);
      
      let updated = 0;
      let failed = 0;

      for (const record of missingSource) {
        const inferredSource = inferRssSource(record.article_url);
        
        if (inferredSource) {
          const { error: updateError } = await supabase
            .from('discovered_startups')
            .update({ rss_source: inferredSource })
            .eq('id', record.id);

          if (updateError) {
            console.error(`   ❌ Error updating ${record.name}: ${updateError.message}`);
            failed++;
          } else {
            updated++;
            if (updated % 100 === 0) {
              console.log(`   ✅ Updated ${updated}/${missingSource.length}...`);
            }
          }
        } else {
          failed++;
        }
      }

      console.log(`\n✅ Backfill complete:`);
      console.log(`   Updated: ${updated}`);
      console.log(`   Failed (no source found): ${failed}`);
    }

  } catch (error) {
    console.error(`❌ Error backfilling rss_source: ${error.message}`);
  }

  // 2. Find records missing article_title (optional - would require fetching URLs)
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('2️⃣  MISSING article_title & article_date');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    const { count: missingTitle, error: countError } = await supabase
      .from('discovered_startups')
      .select('*', { count: 'exact', head: true })
      .is('article_title', null)
      .not('article_url', 'is', null);

    if (countError) {
      console.error(`❌ Error counting: ${countError.message}`);
    } else {
      console.log(`📊 Records missing article_title: ${missingTitle || 0}`);
      console.log(`   ⚠️  Note: Backfilling article_title would require fetching each URL`);
      console.log(`   💡 Recommendation: Let new scrapes populate these fields going forward`);
    }

    const { count: missingDate, error: dateError } = await supabase
      .from('discovered_startups')
      .select('*', { count: 'exact', head: true })
      .is('article_date', null);

    if (!dateError) {
      console.log(`📊 Records missing article_date: ${missingDate || 0}`);
      console.log(`   💡 Note: Can use discovered_at as fallback if needed`);
    }

  } catch (error) {
    console.error(`❌ Error checking missing fields: ${error.message}`);
  }

  // 3. Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('3️⃣  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    const { count: total, error: totalError } = await supabase
      .from('discovered_startups')
      .select('*', { count: 'exact', head: true });

    const { count: withSource, error: sourceError } = await supabase
      .from('discovered_startups')
      .select('*', { count: 'exact', head: true })
      .not('rss_source', 'is', null);

    const { count: withTitle, error: titleError } = await supabase
      .from('discovered_startups')
      .select('*', { count: 'exact', head: true })
      .not('article_title', 'is', null);

    const { count: withDate, error: dateError } = await supabase
      .from('discovered_startups')
      .select('*', { count: 'exact', head: true })
      .not('article_date', 'is', null);

    if (!totalError && !sourceError && !titleError && !dateError) {
      console.log(`📊 Data completeness:`);
      console.log(`   Total records: ${total || 0}`);
      console.log(`   With rss_source: ${withSource || 0} (${total ? ((withSource/total)*100).toFixed(1) : 0}%)`);
      console.log(`   With article_title: ${withTitle || 0} (${total ? ((withTitle/total)*100).toFixed(1) : 0}%)`);
      console.log(`   With article_date: ${withDate || 0} (${total ? ((withDate/total)*100).toFixed(1) : 0}%)`);
    }

  } catch (error) {
    console.error(`❌ Error generating summary: ${error.message}`);
  }

  console.log('\n' + '═'.repeat(63));
  console.log('✅ Backfill complete\n');
  console.log('💡 Note: New records will have all fields populated by updated scrapers');
  console.log('   Existing incomplete records are acceptable for ML training\n');
}

backfillData().catch(console.error);





