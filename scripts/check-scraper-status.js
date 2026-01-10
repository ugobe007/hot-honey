#!/usr/bin/env node
/**
 * Quick Scraper Status Check
 * Checks if scrapers are finding startups
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkScraperStatus() {
  console.log('\n🔍 SCRAPER STATUS CHECK\n');
  console.log('═'.repeat(60));

  try {
    // Check discovered_startups
    const { data: allDiscovered, count: totalDiscovered } = await supabase
      .from('discovered_startups')
      .select('*', { count: 'exact', head: false })
      .order('created_at', { ascending: false })
      .limit(10);

    const { count: unimportedCount } = await supabase
      .from('discovered_startups')
      .select('*', { count: 'exact', head: true })
      .eq('imported', false);

    // Check last 24 hours
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: discovered24h } = await supabase
      .from('discovered_startups')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last24h);

    // Check last 7 days
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: discovered7d } = await supabase
      .from('discovered_startups')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last7d);

    // Check RSS articles
    const { count: articles24h } = await supabase
      .from('rss_articles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last24h);

    // Check RSS sources
    const { data: rssSources } = await supabase
      .from('rss_sources')
      .select('id, name, enabled, last_scraped_at')
      .eq('enabled', true)
      .limit(10);

    console.log(`\n📊 DISCOVERED STARTUPS:`);
    console.log(`  Total in database: ${totalDiscovered || 0}`);
    console.log(`  Waiting to import: ${unimportedCount || 0}`);
    console.log(`  Discovered (last 24h): ${discovered24h || 0}`);
    console.log(`  Discovered (last 7d): ${discovered7d || 0}`);

    if (allDiscovered && allDiscovered.length > 0) {
      console.log(`\n📋 Recent Discoveries:`);
      allDiscovered.slice(0, 5).forEach((startup, idx) => {
        const date = new Date(startup.created_at).toLocaleString();
        const imported = startup.imported ? '✅' : '⏳';
        console.log(`  ${idx + 1}. ${imported} ${startup.company_name || 'Unknown'} (${startup.source || 'unknown'}) - ${date}`);
      });
    }

    console.log(`\n📰 RSS ARTICLES:`);
    console.log(`  Scraped (last 24h): ${articles24h || 0}`);

    console.log(`\n🔗 RSS SOURCES:`);
    if (rssSources && rssSources.length > 0) {
      console.log(`  Active sources: ${rssSources.length}`);
      rssSources.forEach(source => {
        const lastScraped = source.last_scraped_at 
          ? new Date(source.last_scraped_at).toLocaleString()
          : 'Never';
        console.log(`    - ${source.name}: last scraped ${lastScraped}`);
      });
    } else {
      console.log(`  ⚠️  No enabled RSS sources found`);
    }

    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    
    if ((discovered24h || 0) === 0) {
      console.log(`  ⚠️  No startups discovered in last 24h - scrapers may not be running`);
      console.log(`     Run: node scripts/discover-more-startups.js --days=7`);
    }

    if ((unimportedCount || 0) > 0) {
      console.log(`  ⚠️  ${unimportedCount} startups waiting to be imported`);
      console.log(`     Run: node scripts/approve-all-discovered-startups.js`);
    }

    if ((articles24h || 0) === 0) {
      console.log(`  ⚠️  No RSS articles scraped in last 24h - RSS scraper may not be running`);
      console.log(`     Check: node scripts/core/simple-rss-scraper.js`);
    }

    if ((discovered24h || 0) > 0 && (unimportedCount || 0) === 0) {
      console.log(`  ✅ Scrapers are working! All discovered startups have been imported.`);
    }

    console.log('\n');

  } catch (error) {
    console.error(`\n❌ Error checking scraper status:`, error.message);
    console.error(error);
  }
}

checkScraperStatus();
