require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function diagnostics() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  HOT HONEY DIAGNOSTICS');
  console.log('═══════════════════════════════════════════════════════════');
  
  // 1. Startup counts by source
  const { data: allStartups } = await s.from('startup_uploads').select('source_type, status, total_god_score, mrr, has_revenue, is_launched, has_technical_cofounder, sectors');
  
  console.log('\n📊 STARTUP OVERVIEW');
  console.log('  Total startups:', allStartups.length);
  
  const byStatus = {};
  allStartups.forEach(x => { byStatus[x.status] = (byStatus[x.status] || 0) + 1; });
  console.log('  By status:', byStatus);
  
  const bySource = {};
  allStartups.forEach(x => { bySource[x.source_type || 'unknown'] = (bySource[x.source_type || 'unknown'] || 0) + 1; });
  console.log('  By source:', bySource);
  
  // 2. Discovered startups (scraper pipeline)
  const { count: discoveredCount } = await s.from('discovered_startups').select('id', { count: 'exact', head: true });
  const { count: pendingDiscovered } = await s.from('discovered_startups').select('id', { count: 'exact', head: true }).eq('status', 'pending');
  const { count: processedDiscovered } = await s.from('discovered_startups').select('id', { count: 'exact', head: true }).eq('status', 'processed');
  
  console.log('\n🔍 SCRAPER PIPELINE');
  console.log('  Discovered startups:', discoveredCount);
  console.log('  Pending processing:', pendingDiscovered);
  console.log('  Processed:', processedDiscovered);
  
  // 3. Data coverage analysis
  const approved = allStartups.filter(x => x.status === 'approved');
  
  console.log('\n📈 DATA COVERAGE (Approved Startups)');
  console.log('  Total approved:', approved.length);
  
  const hasMRR = approved.filter(x => x.mrr && x.mrr > 0).length;
  const hasRevenue = approved.filter(x => x.has_revenue).length;
  const hasLaunched = approved.filter(x => x.is_launched).length;
  const hasTechCo = approved.filter(x => x.has_technical_cofounder).length;
  const hasSectors = approved.filter(x => x.sectors && x.sectors.length > 0).length;
  const hasGOD = approved.filter(x => x.total_god_score && x.total_god_score > 0).length;
  
  console.log('  Has MRR data:      ', hasMRR, '(' + Math.round(hasMRR/approved.length*100) + '%)');
  console.log('  Has revenue flag:  ', hasRevenue, '(' + Math.round(hasRevenue/approved.length*100) + '%)');
  console.log('  Is launched:       ', hasLaunched, '(' + Math.round(hasLaunched/approved.length*100) + '%)');
  console.log('  Has tech cofounder:', hasTechCo, '(' + Math.round(hasTechCo/approved.length*100) + '%)');
  console.log('  Has sectors:       ', hasSectors, '(' + Math.round(hasSectors/approved.length*100) + '%)');
  console.log('  Has GOD score:     ', hasGOD, '(' + Math.round(hasGOD/approved.length*100) + '%)');
  
  // 4. Data gaps - candidates for inference
  const noMRR = approved.filter(x => x.mrr === null || x.mrr === 0).length;
  const noLaunch = approved.filter(x => x.is_launched !== true).length;
  const noTech = approved.filter(x => x.has_technical_cofounder !== true).length;
  const noSectors = approved.filter(x => x.sectors === null || x.sectors.length === 0).length;
  
  console.log('\n⚠️  DATA GAPS (Inference Opportunities)');
  console.log('  Missing MRR:          ', noMRR, '(' + Math.round(noMRR/approved.length*100) + '%)');
  console.log('  Missing launch status:', noLaunch, '(' + Math.round(noLaunch/approved.length*100) + '%)');
  console.log('  Missing tech cofounder:', noTech, '(' + Math.round(noTech/approved.length*100) + '%)');
  console.log('  Missing sectors:      ', noSectors, '(' + Math.round(noSectors/approved.length*100) + '%)');
  
  // 5. GOD score distribution
  const scores = approved.filter(x => x.total_god_score).map(x => x.total_god_score);
  console.log('\n🎯 GOD SCORE DISTRIBUTION');
  console.log('  Min:', Math.min(...scores), '| Max:', Math.max(...scores), '| Avg:', (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1));
  console.log('  65+ (T1):', scores.filter(s => s >= 65).length);
  console.log('  55-64 (T2):', scores.filter(s => s >= 55 && s < 65).length);
  console.log('  48-54 (T3):', scores.filter(s => s >= 48 && s < 55).length);
  console.log('  44-47 (T4):', scores.filter(s => s >= 44 && s < 48).length);
}

diagnostics().catch(console.error);
