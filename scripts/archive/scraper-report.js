require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  console.log('═'.repeat(65));
  console.log('    📊 SCRAPER & DATA ANALYSIS REPORT');
  console.log('═'.repeat(65));
  
  // 1. RSS Sources status
  const { data: sources } = await supabase.from('rss_sources').select('name, active, last_scraped');
  
  if (sources) {
    const active = sources.filter(s => s.active).length;
    const inactive = sources.filter(s => !s.active).length;
    const neverScraped = sources.filter(s => !s.last_scraped).length;
    
    console.log('\n📡 RSS SOURCES');
    console.log('   Total:', sources.length);
    console.log('   Active:', active);
    console.log('   Inactive:', inactive);
    console.log('   Never scraped:', neverScraped);
    
    const withDates = sources.filter(s => s.last_scraped).sort((a,b) => new Date(b.last_scraped) - new Date(a.last_scraped));
    if (withDates.length > 0) {
      console.log('\n   Most recent scrapes:');
      withDates.slice(0, 5).forEach(s => {
        console.log('    •', s.name, '-', new Date(s.last_scraped).toLocaleDateString());
      });
    }
  }
  
  // 2. GOD Score distribution
  console.log('\n🎯 GOD SCORE DISTRIBUTION');
  const { data: scores } = await supabase.from('startup_uploads')
    .select('total_god_score')
    .eq('status', 'approved')
    .not('total_god_score', 'is', null);
  
  if (scores && scores.length > 0) {
    const values = scores.map(s => s.total_god_score).filter(v => v);
    const avg = values.reduce((a,b) => a+b, 0) / values.length;
    const elite = values.filter(v => v >= 85).length;
    const good = values.filter(v => v >= 70 && v < 85).length;
    const mid = values.filter(v => v >= 50 && v < 70).length;
    const low = values.filter(v => v < 50).length;
    
    console.log('   Total scored:', values.length);
    console.log('   Average:', avg.toFixed(1));
    console.log('   Elite (85+):', elite, '(' + (elite/values.length*100).toFixed(1) + '%)');
    console.log('   Good (70-84):', good, '(' + (good/values.length*100).toFixed(1) + '%)');
    console.log('   Mid (50-69):', mid, '(' + (mid/values.length*100).toFixed(1) + '%)');
    console.log('   Low (<50):', low, '(' + (low/values.length*100).toFixed(1) + '%)');
  }
  
  // 3. Discovery pipeline check
  console.log('\n🔍 DISCOVERY PIPELINE');
  const { count: discovered } = await supabase.from('discovered_startups').select('*', { count: 'exact', head: true });
  const { count: uploaded } = await supabase.from('startup_uploads').select('*', { count: 'exact', head: true });
  const { count: investors } = await supabase.from('investors').select('*', { count: 'exact', head: true });
  
  console.log('   Discovered startups:', discovered);
  console.log('   Startup uploads:', uploaded);
  console.log('   Investors:', investors);
  
  // 4. Check inference columns on discovered_startups
  console.log('\n🧠 INFERENCE COLUMN COVERAGE');
  const { data: sample } = await supabase.from('discovered_startups')
    .select('has_technical_cofounder, is_launched, has_revenue, sectors, funding_stage, team_signals, grit_signals')
    .limit(200);
  
  if (sample && sample.length > 0) {
    const hasTC = sample.filter(s => s.has_technical_cofounder === true).length;
    const hasLaunch = sample.filter(s => s.is_launched === true).length;
    const hasRev = sample.filter(s => s.has_revenue === true).length;
    const hasSectors = sample.filter(s => s.sectors && s.sectors.length > 0).length;
    const hasStage = sample.filter(s => s.funding_stage).length;
    const hasTeam = sample.filter(s => s.team_signals && s.team_signals.length > 0).length;
    const hasGrit = sample.filter(s => s.grit_signals && s.grit_signals.length > 0).length;
    
    console.log('   Sample size:', sample.length);
    console.log('   has_technical_cofounder:', hasTC, '(' + (hasTC/sample.length*100).toFixed(0) + '%)');
    console.log('   is_launched:', hasLaunch, '(' + (hasLaunch/sample.length*100).toFixed(0) + '%)');
    console.log('   has_revenue:', hasRev, '(' + (hasRev/sample.length*100).toFixed(0) + '%)');
    console.log('   sectors:', hasSectors, '(' + (hasSectors/sample.length*100).toFixed(0) + '%)');
    console.log('   funding_stage:', hasStage, '(' + (hasStage/sample.length*100).toFixed(0) + '%)');
    console.log('   team_signals:', hasTeam, '(' + (hasTeam/sample.length*100).toFixed(0) + '%)');
    console.log('   grit_signals:', hasGrit, '(' + (hasGrit/sample.length*100).toFixed(0) + '%)');
    
    console.log('\n   ⚠️  NOTE: New columns added today - will populate on next scrape');
  }
  
  // 5. Top GOD Score startups
  console.log('\n⭐ TOP GOD SCORE STARTUPS');
  const { data: top } = await supabase.from('startup_uploads')
    .select('name, total_god_score, sectors, funding_stage')
    .eq('status', 'approved')
    .not('total_god_score', 'is', null)
    .order('total_god_score', { ascending: false })
    .limit(10);
  
  if (top) {
    top.forEach((s, i) => {
      const sectors = s.sectors ? s.sectors.slice(0, 2).join(', ') : '';
      console.log(`   ${i+1}. ${s.name} - Score: ${s.total_god_score} ${sectors ? '[' + sectors + ']' : ''}`);
    });
  }
  
  console.log('\n═'.repeat(65));
})();
