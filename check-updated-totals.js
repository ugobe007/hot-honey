#!/usr/bin/env node
/**
 * CHECK UPDATED TOTALS
 * 
 * Shows updated database totals after enrichment and cleanup.
 * 
 * Run: node check-updated-totals.js
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

async function checkUpdatedTotals() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        📊 UPDATED DATABASE TOTALS                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`⏰ ${new Date().toLocaleString()}\n`);

  // 1. Startup totals
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 STARTUPS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { count: totalUploads, error: uploadsError } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');

  const { count: totalDiscovered, error: discoveredError } = await supabase
    .from('discovered_startups')
    .select('*', { count: 'exact', head: true });

  console.log(`   📤 Approved Uploads: ${totalUploads || 0}`);
  console.log(`   🔍 Discovered Startups: ${totalDiscovered || 0}`);
  console.log(`   📊 Total Startups: ${(totalUploads || 0) + (totalDiscovered || 0)}`);

  // 2. Data completeness
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ DATA COMPLETENESS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Check startup_uploads completeness
  const { data: uploads, error: uploadsDataError } = await supabase
    .from('startup_uploads')
    .select('website, location, tagline, pitch')
    .eq('status', 'approved')
    .limit(1000);

  if (!uploadsDataError && uploads) {
    const withWebsite = uploads.filter(s => s.website).length;
    const withLocation = uploads.filter(s => s.location).length;
    const withTagline = uploads.filter(s => s.tagline).length;
    const withPitch = uploads.filter(s => s.pitch).length;
    const total = uploads.length;

    console.log(`   📤 startup_uploads (${total} sampled):`);
    console.log(`      Website: ${withWebsite}/${total} (${Math.round(withWebsite/total*100)}%)`);
    console.log(`      Location: ${withLocation}/${total} (${Math.round(withLocation/total*100)}%)`);
    console.log(`      Tagline: ${withTagline}/${total} (${Math.round(withTagline/total*100)}%)`);
    console.log(`      Pitch: ${withPitch}/${total} (${Math.round(withPitch/total*100)}%)`);
  }

  // Check discovered_startups completeness
  const { data: discovered, error: discoveredDataError } = await supabase
    .from('discovered_startups')
    .select('website, location, tagline, pitch')
    .limit(1000);

  if (!discoveredDataError && discovered) {
    const withWebsite = discovered.filter(s => s.website).length;
    const withLocation = discovered.filter(s => s.location).length;
    const withTagline = discovered.filter(s => s.tagline).length;
    const withPitch = discovered.filter(s => s.pitch).length;
    const total = discovered.length;

    console.log(`\n   🔍 discovered_startups (${total} sampled):`);
    console.log(`      Website: ${withWebsite}/${total} (${Math.round(withWebsite/total*100)}%)`);
    console.log(`      Location: ${withLocation}/${total} (${Math.round(withLocation/total*100)}%)`);
    console.log(`      Tagline: ${withTagline}/${total} (${Math.round(withTagline/total*100)}%)`);
    console.log(`      Pitch: ${withPitch}/${total} (${Math.round(withPitch/total*100)}%)`);
  }

  // 3. Investors
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('💰 INVESTORS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { count: totalInvestors, error: investorsError } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true });

  console.log(`   👥 Total Investors: ${totalInvestors || 0}`);

  // 4. Matches
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎯 MATCHES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { count: totalMatches, error: matchesError } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true });

  console.log(`   🎯 Total Matches: ${totalMatches || 0}`);

  // 5. Exits
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🚪 EXITS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { count: totalExits, error: exitsError } = await supabase
    .from('startup_exits')
    .select('*', { count: 'exact', head: true });

  const { data: exits, error: exitsDataError } = await supabase
    .from('startup_exits')
    .select('exit_value_numeric')
    .not('exit_value_numeric', 'is', null);

  const totalExitValue = exits && exits.length > 0
    ? exits.reduce((sum, e) => sum + parseFloat(e.exit_value_numeric || 0), 0)
    : 0;

  const formatCurrency = (value) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(2)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  };

  console.log(`   🚪 Total Exits: ${totalExits || 0}`);
  console.log(`   💰 Total Exit Value: ${formatCurrency(totalExitValue)}`);

  // 6. Recent activity
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🕐 RECENT ACTIVITY (Last 7 Days)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  const { count: recentDiscovered, error: recentDiscoveredError } = await supabase
    .from('discovered_startups')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgoISO);

  const { count: recentExits, error: recentExitsError } = await supabase
    .from('startup_exits')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgoISO);

  console.log(`   🔍 New Discoveries: ${recentDiscovered || 0}`);
  console.log(`   🚪 New Exits: ${recentExits || 0}`);

  console.log('\n' + '═'.repeat(63));
  console.log('✅ Summary complete\n');
}

checkUpdatedTotals().catch(console.error);



