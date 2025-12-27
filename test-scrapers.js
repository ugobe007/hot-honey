require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Parser = require('rss-parser');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const parser = new Parser({ timeout: 10000 });

async function runTests() {
  console.log('=== SCRAPER DIAGNOSTIC TEST ===\n');
  
  // Test 1: Database connection
  console.log('1. DATABASE CONNECTION');
  const { count: startupCount } = await supabase.from('startup_uploads').select('id', { count: 'exact', head: true });
  const { count: investorCount } = await supabase.from('investors').select('id', { count: 'exact', head: true });
  console.log('   Startups:', startupCount);
  console.log('   Investors:', investorCount);
  console.log('   Status: OK\n');
  
  // Test 2: RSS feeds working
  console.log('2. RSS FEED ACCESS');
  const testFeeds = [
    'https://www.alleywatch.com/feed/',
    'https://www.finsmes.com/feed',
    'https://techcrunch.com/feed/'
  ];
  for (const url of testFeeds) {
    try {
      const feed = await parser.parseURL(url);
      console.log('   OK:', url.split('/')[2], '-', feed.items.length, 'items');
    } catch (e) {
      console.log('   FAIL:', url.split('/')[2], '-', e.message.substring(0, 30));
    }
  }
  console.log('');
  
  // Test 3: Check table schema constraints
  console.log('3. TABLE SCHEMA');
  const { data: sample } = await supabase.from('startup_uploads').select('source_type, status').limit(5);
  const sourceTypes = [...new Set(sample.map(s => s.source_type))];
  const statuses = [...new Set(sample.map(s => s.status))];
  console.log('   Valid source_type:', sourceTypes);
  console.log('   Valid status:', statuses);
  console.log('');
  
  // Test 4: Test insert with correct schema
  console.log('4. TEST INSERT');
  const testName = 'TEST_SCRAPER_' + Date.now();
  const { data: inserted, error: insertErr } = await supabase.from('startup_uploads').insert({
    name: testName,
    tagline: 'Test startup',
    status: 'approved',
    source_type: 'url',
    stage: 2,
    total_god_score: 40
  }).select();
  
  if (insertErr) {
    console.log('   INSERT FAILED:', insertErr.message);
  } else {
    console.log('   INSERT OK:', inserted[0].id);
    // Clean up
    await supabase.from('startup_uploads').delete().eq('name', testName);
    console.log('   CLEANUP OK');
  }
  console.log('');
  
  // Test 5: Check funding pattern matching
  console.log('5. PATTERN MATCHING');
  const patterns = [
    /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+[Rr]aises?\s+\$?([\d\.]+)\s*([MmBb]|Million|Billion)/i,
  ];
  const testHeadlines = [
    'Crisp Raises $26M to Power Real-Time Retail Data',
    'Ciphero Raises $2.5M to Build AI-Native Security',
    'TechCrunch: The Latest News',
    'How to Build a Startup'
  ];
  for (const h of testHeadlines) {
    let matched = false;
    for (const p of patterns) {
      const m = h.match(p);
      if (m) {
        console.log('   MATCH:', h.substring(0, 40), '-> Name:', m[1], 'Amount:', m[2] + m[3]);
        matched = true;
        break;
      }
    }
    if (!matched) console.log('   NO MATCH:', h.substring(0, 40));
  }
  console.log('');
  
  // Test 6: Check active RSS sources
  console.log('6. RSS SOURCES STATUS');
  const { count: activeCount } = await supabase.from('rss_sources').select('id', { count: 'exact', head: true }).eq('active', true);
  const { count: totalCount } = await supabase.from('rss_sources').select('id', { count: 'exact', head: true });
  console.log('   Active:', activeCount, '/', totalCount);
  console.log('');
  
  // Test 7: Recent discoveries
  console.log('7. RECENT DISCOVERIES (last 24h)');
  const yesterday = new Date(Date.now() - 24*60*60*1000).toISOString();
  const { data: recent } = await supabase.from('startup_uploads').select('name, created_at').gte('created_at', yesterday).order('created_at', { ascending: false }).limit(5);
  if (recent && recent.length > 0) {
    recent.forEach(s => console.log('   ', s.name, '-', s.created_at.split('T')[0]));
  } else {
    console.log('   No new startups in last 24h');
  }
  
  console.log('\n=== DIAGNOSTIC COMPLETE ===');
}

runTests().catch(e => console.error('Test error:', e.message));
