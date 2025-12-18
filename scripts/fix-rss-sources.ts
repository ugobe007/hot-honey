/**
 * FIX RSS SOURCES - Diagnose and repair failing RSS feeds
 * 
 * This script:
 * 1. Checks all RSS sources
 * 2. Tests each one for validity
 * 3. Re-enables working sources
 * 4. Adds new reliable sources
 * 5. Reports on the status
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import Parser from 'rss-parser';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; HotMatchBot/1.0)'
  }
});

// New reliable RSS sources for startup/VC news
const NEW_RSS_SOURCES = [
  { name: 'TechCrunch Startups', url: 'https://techcrunch.com/category/startups/feed/', category: 'startups' },
  { name: 'TechCrunch Venture', url: 'https://techcrunch.com/category/venture/feed/', category: 'funding' },
  { name: 'VentureBeat', url: 'https://venturebeat.com/feed/', category: 'startups' },
  { name: 'Crunchbase News', url: 'https://news.crunchbase.com/feed/', category: 'funding' },
  { name: 'The Information', url: 'https://www.theinformation.com/feed', category: 'vc' },
  { name: 'Fortune Term Sheet', url: 'https://fortune.com/tag/term-sheet/feed/', category: 'funding' },
  { name: 'PitchBook News', url: 'https://pitchbook.com/news/feed', category: 'funding' },
  { name: 'Axios Pro Rata', url: 'https://www.axios.com/pro-rata', category: 'vc' },
  { name: 'StrictlyVC', url: 'https://www.strictlyvc.com/feed/', category: 'vc' },
  { name: 'EU Startups', url: 'https://www.eu-startups.com/feed/', category: 'startups' },
  { name: 'ArcticStartup', url: 'https://arcticstartup.com/feed/', category: 'startups' },
  { name: 'Sifted EU', url: 'https://sifted.eu/feed/', category: 'startups' },
  { name: 'YC Blog', url: 'https://www.ycombinator.com/blog/rss/', category: 'startups' },
  { name: 'a]6z Blog', url: 'https://a16z.com/feed/', category: 'vc' },
  { name: 'First Round Review', url: 'https://review.firstround.com/feed.xml', category: 'vc' },
  { name: 'Sequoia Arc', url: 'https://www.sequoiacap.com/feed/', category: 'vc' },
  { name: 'Bessemer Blog', url: 'https://www.bvp.com/atlas/rss.xml', category: 'vc' },
  { name: 'Index Ventures', url: 'https://www.indexventures.com/feed/', category: 'vc' },
  { name: 'GV Blog', url: 'https://www.gv.com/feed/', category: 'vc' },
  { name: 'NFX Essays', url: 'https://www.nfx.com/essays/feed.xml', category: 'vc' }
];

interface RSSSource {
  id: string;
  name: string;
  url: string;
  active: boolean;
  last_scraped: string | null;
  category?: string;
}

async function testFeed(url: string): Promise<{ valid: boolean; itemCount: number; error?: string }> {
  try {
    const feed = await parser.parseURL(url);
    return { valid: true, itemCount: feed.items?.length || 0 };
  } catch (error: any) {
    return { valid: false, itemCount: 0, error: error.message };
  }
}

async function diagnoseAndFix(): Promise<void> {
  console.log('\n' + '═'.repeat(60));
  console.log('🔧 RSS SOURCE DIAGNOSTIC & REPAIR');
  console.log('═'.repeat(60) + '\n');

  // Get all current sources
  const { data: sources, error } = await supabase
    .from('rss_sources')
    .select('*')
    .order('last_scraped', { ascending: true, nullsFirst: true });

  if (error) {
    console.error('❌ Failed to fetch RSS sources:', error.message);
    return;
  }

  console.log(`📊 Found ${sources?.length || 0} RSS sources in database\n`);

  // Separate active and inactive
  const activeSources = sources?.filter(s => s.active) || [];
  const inactiveSources = sources?.filter(s => !s.active) || [];

  console.log(`   ✅ Active: ${activeSources.length}`);
  console.log(`   ❌ Inactive: ${inactiveSources.length}\n`);

  // Test inactive sources to see if they work now
  console.log('━'.repeat(60));
  console.log('🔍 TESTING INACTIVE SOURCES...\n');

  let reactivated = 0;
  let stillBroken = 0;

  for (const source of inactiveSources) {
    process.stdout.write(`   Testing ${source.name}... `);
    const result = await testFeed(source.url);
    
    if (result.valid) {
      console.log(`✅ WORKS! (${result.itemCount} items) - Reactivating...`);
      await supabase
        .from('rss_sources')
        .update({ active: true })
        .eq('id', source.id);
      reactivated++;
    } else {
      console.log(`❌ Still failing: ${result.error?.substring(0, 50)}`);
      stillBroken++;
    }
  }

  console.log(`\n   Reactivated: ${reactivated}`);
  console.log(`   Still broken: ${stillBroken}\n`);

  // Test active sources to make sure they still work
  console.log('━'.repeat(60));
  console.log('🔍 VERIFYING ACTIVE SOURCES...\n');

  let activeWorking = 0;
  let activeNowBroken = 0;

  for (const source of activeSources.slice(0, 20)) { // Test first 20
    process.stdout.write(`   Testing ${source.name}... `);
    const result = await testFeed(source.url);
    
    if (result.valid) {
      console.log(`✅ OK (${result.itemCount} items)`);
      activeWorking++;
    } else {
      console.log(`⚠️  BROKEN - ${result.error?.substring(0, 40)}`);
      activeNowBroken++;
    }
  }

  console.log(`\n   Working: ${activeWorking}`);
  console.log(`   Newly broken: ${activeNowBroken}\n`);

  // Add new sources
  console.log('━'.repeat(60));
  console.log('➕ ADDING NEW RELIABLE RSS SOURCES...\n');

  const existingUrls = sources?.map(s => s.url.toLowerCase()) || [];
  let added = 0;
  let skipped = 0;

  for (const newSource of NEW_RSS_SOURCES) {
    if (existingUrls.includes(newSource.url.toLowerCase())) {
      console.log(`   ⏭️  ${newSource.name} - Already exists`);
      skipped++;
      continue;
    }

    process.stdout.write(`   Testing ${newSource.name}... `);
    const result = await testFeed(newSource.url);
    
    if (result.valid) {
      const { error: insertError } = await supabase
        .from('rss_sources')
        .insert({
          name: newSource.name,
          url: newSource.url,
          category: newSource.category,
          active: true
        });
      
      if (!insertError) {
        console.log(`✅ Added! (${result.itemCount} items)`);
        added++;
      } else {
        console.log(`⚠️  Insert failed: ${insertError.message}`);
      }
    } else {
      console.log(`❌ Not working: ${result.error?.substring(0, 40)}`);
    }
  }

  console.log(`\n   Added: ${added}`);
  console.log(`   Already existed: ${skipped}\n`);

  // Final summary
  console.log('━'.repeat(60));
  console.log('📊 FINAL STATUS\n');

  const { data: finalSources } = await supabase
    .from('rss_sources')
    .select('*');

  const finalActive = finalSources?.filter(s => s.active).length || 0;
  const finalInactive = finalSources?.filter(s => !s.active).length || 0;

  console.log(`   Total RSS Sources: ${finalSources?.length || 0}`);
  console.log(`   ✅ Active: ${finalActive}`);
  console.log(`   ❌ Inactive: ${finalInactive}`);
  console.log(`\n   🔄 Reactivated: ${reactivated} sources`);
  console.log(`   ➕ Added: ${added} new sources\n`);

  console.log('═'.repeat(60));
  console.log('✅ RSS SOURCE REPAIR COMPLETE');
  console.log('═'.repeat(60) + '\n');
}

diagnoseAndFix().catch(console.error);
