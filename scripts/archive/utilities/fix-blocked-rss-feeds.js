#!/usr/bin/env node
/**
 * Fix Blocked RSS Feeds
 * 
 * Deactivates feeds that return 403 errors or have parsing issues
 */

require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Feeds to deactivate (403 errors or parsing errors)
const BLOCKED_FEEDS = [
  'Axios Pro Rata', // 403
  'Dealroom', // 403
  'PitchBook News', // 403
  'Silicon Valley Business Journal', // 403
  'Sequoia Capital - Medium', // 403
];

const BROKEN_FEEDS = [
  'Y Combinator - Summer 2025 Batch', // Invalid RSS
  'Sequoia Capital - Stories', // Not RSS
  'HAX - Startups', // Invalid RSS
  'Y Combinator - All Companies', // Invalid RSS
  'Sequoia Capital - News', // Invalid RSS
  'VC Journal', // Not RSS
  'Y Combinator - Collaboration Industry', // Invalid RSS
  'The Generalist', // SSL error
  'a16z - News Content', // Not RSS
  'Startups.com Blog', // 429 rate limit
];

async function deactivateFeeds() {
  console.log('🔧 Deactivating blocked and broken RSS feeds...\n');
  
  let deactivated = 0;
  
  // Deactivate blocked feeds (403)
  for (const name of BLOCKED_FEEDS) {
    const { error } = await supabase
      .from('rss_sources')
      .update({ active: false })
      .eq('name', name);
    
    if (error) {
      console.log(`⚠️  ${name}: ${error.message}`);
    } else {
      console.log(`✅ Deactivated: ${name} (403 blocked)`);
      deactivated++;
    }
  }
  
  // Deactivate broken feeds
  for (const name of BROKEN_FEEDS) {
    const { error } = await supabase
      .from('rss_sources')
      .update({ active: false })
      .eq('name', name);
    
    if (error) {
      console.log(`⚠️  ${name}: ${error.message}`);
    } else {
      console.log(`✅ Deactivated: ${name} (parsing error)`);
      deactivated++;
    }
  }
  
  console.log(`\n✅ Deactivated ${deactivated} feeds`);
  
  // Show remaining active feeds
  const { data: active } = await supabase
    .from('rss_sources')
    .select('name, url')
    .eq('active', true)
    .limit(10);
  
  console.log(`\n📊 Remaining active feeds: ${active?.length || 0}`);
  if (active && active.length > 0) {
    console.log('\nTop 10 active feeds:');
    active.forEach(f => console.log(`  - ${f.name}`));
  }
}

deactivateFeeds().catch(console.error);

