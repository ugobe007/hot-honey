require('dotenv').config();
const { supabase } = require('../lib/scraper-db');

async function monitor() {
  console.log('\n========================================');
  console.log('   HOT MATCH SCRAPER DASHBOARD');
  console.log('   ' + new Date().toLocaleString());
  console.log('========================================\n');

  // 1. Database counts
  const { count: startups } = await supabase.from('startup_uploads').select('id', { count: 'exact', head: true });
  const { count: investors } = await supabase.from('investors').select('id', { count: 'exact', head: true });
  const { count: matches } = await supabase.from('startup_investor_matches').select('id', { count: 'exact', head: true });
  
  console.log('DATABASE TOTALS');
  console.log('  Startups:', startups);
  console.log('  Investors:', investors);
  console.log('  Matches:', matches);

  // 2. Recent activity (24h)
  const yesterday = new Date(Date.now() - 24*60*60*1000).toISOString();
  const { count: newStartups } = await supabase.from('startup_uploads').select('id', { count: 'exact', head: true }).gte('created_at', yesterday);
  const { count: newInvestors } = await supabase.from('investors').select('id', { count: 'exact', head: true }).gte('created_at', yesterday);
  
  console.log('\nLAST 24 HOURS');
  console.log('  New startups:', newStartups);
  console.log('  New investors:', newInvestors);

  // 3. Data quality
  const { count: startupsNoSectors } = await supabase.from('startup_uploads').select('id', { count: 'exact', head: true }).or('sectors.is.null,sectors.eq.{}');
  const { count: investorsNoCheck } = await supabase.from('investors').select('id', { count: 'exact', head: true }).is('check_size_min', null);
  
  console.log('\nDATA QUALITY');
  console.log('  Startups missing sectors:', startupsNoSectors);
  console.log('  Investors missing check size:', investorsNoCheck);

  // 4. RSS sources
  const { count: activeSources } = await supabase.from('rss_sources').select('id', { count: 'exact', head: true }).eq('active', true);
  const { count: totalSources } = await supabase.from('rss_sources').select('id', { count: 'exact', head: true });
  
  console.log('\nRSS SOURCES');
  console.log('  Active:', activeSources, '/', totalSources);

  // 5. Recent startups
  const { data: recent } = await supabase.from('startup_uploads').select('name, created_at').order('created_at', { ascending: false }).limit(5);
  
  console.log('\nRECENT STARTUPS');
  recent?.forEach(s => console.log('  ', s.name, '-', s.created_at.split('T')[0]));

  // 6. Match distribution
  const { data: hotMatches } = await supabase.from('startup_investor_matches').select('id', { count: 'exact', head: true }).gte('match_score', 70);
  const { data: goodMatches } = await supabase.from('startup_investor_matches').select('id', { count: 'exact', head: true }).gte('match_score', 50).lt('match_score', 70);
  
  console.log('\nMATCH QUALITY');
  console.log('  Hot (70+):', hotMatches?.length || 'N/A');
  console.log('  Good (50-69):', goodMatches?.length || 'N/A');

  console.log('\n========================================\n');
}

monitor().then(() => process.exit(0));
