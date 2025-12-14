#!/usr/bin/env node

/**
 * Disable Broken RSS Sources
 * This script identifies and disables RSS sources that don't work
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// List of sources to disable (not proper RSS feeds or have errors)
const BROKEN_SOURCES = [
  'Founders Today',           // Not an RSS feed
  'Morning News',             // Not an RSS feed
  'AI News',                  // Malformed HTML
  'Seeking Alpha Market News', // Not an RSS feed
  'SOSV News',                // Malformed HTML
  'TechCrunch News',          // Duplicate + malformed
  'Wired---Venture News',     // Malformed HTML
  'YC News',                  // Not an RSS feed (use hnrss.org instead)
  'Venture Beat',             // Rate limited (use /feed/ URL instead)
  'PitchBook',                // 403 Forbidden
  'The Information'           // 403 Forbidden
];

async function disableBrokenSources() {
  console.log('🔧 Cleaning up broken RSS sources...\n');

  for (const sourceName of BROKEN_SOURCES) {
    const { data: source, error: findError } = await supabase
      .from('rss_sources')
      .select('*')
      .eq('name', sourceName)
      .single();

    if (findError) {
      console.log(`⚠️  ${sourceName}: Not found`);
      continue;
    }

    if (source) {
      const { error: updateError } = await supabase
        .from('rss_sources')
        .update({ active: false })
        .eq('id', source.id);

      if (updateError) {
        console.log(`❌ ${sourceName}: Failed to disable`);
      } else {
        console.log(`✅ ${sourceName}: Disabled`);
      }
    }
  }

  console.log('\n📊 Summary:\n');

  // Show active sources
  const { data: activeSources } = await supabase
    .from('rss_sources')
    .select('name, url')
    .eq('active', true)
    .order('name');

  console.log(`Active RSS sources: ${activeSources?.length || 0}\n`);
  
  if (activeSources && activeSources.length > 0) {
    activeSources.forEach((source, i) => {
      console.log(`${i + 1}. ${source.name}`);
      console.log(`   ${source.url}`);
    });
  }

  console.log('\n✅ Cleanup complete! Run the scraper now:\n');
  console.log('   node run-rss-scraper.js\n');
}

disableBrokenSources().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
