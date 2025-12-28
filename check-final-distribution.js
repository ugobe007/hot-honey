require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function summary() {
  const { data } = await s.from('startup_uploads')
    .select('total_god_score, traction_score, vision_score')
    .eq('status', 'approved')
    .not('total_god_score', 'is', null);

  const scores = data.map(x => x.total_god_score);
  const traction = data.map(x => x.traction_score || 0);
  const vision = data.map(x => x.vision_score || 0);
  
  console.log('FINAL GOD SCORE DISTRIBUTION');
  console.log('=============================');
  console.log('');
  console.log('GOD Score:');
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const avg = (scores.reduce((a,b) => a+b, 0) / scores.length).toFixed(1);
  console.log('  Min:', min, '| Max:', max, '| Avg:', avg);
  console.log('');
  console.log('Tier Distribution:');
  const t1 = scores.filter(s => s >= 65).length;
  const t2 = scores.filter(s => s >= 55 && s < 65).length;
  const t3 = scores.filter(s => s >= 48 && s < 55).length;
  const t4 = scores.filter(s => s >= 44 && s < 48).length;
  const below = scores.filter(s => s < 44).length;
  const total = scores.length;
  console.log('  T1 Elite (65+):     ', t1, '(' + Math.round(t1/total*100) + '%)');
  console.log('  T2 Strong (55-64):  ', t2, '(' + Math.round(t2/total*100) + '%)');
  console.log('  T3 Emerging (48-54):', t3, '(' + Math.round(t3/total*100) + '%)');
  console.log('  T4 Angels (44-47):  ', t4, '(' + Math.round(t4/total*100) + '%)');
  console.log('  Below 44:           ', below, '(' + Math.round(below/total*100) + '%)');
  console.log('');
  console.log('Component Averages:');
  const tractAvg = (traction.reduce((a,b) => a+b, 0) / traction.length).toFixed(1);
  const visAvg = (vision.reduce((a,b) => a+b, 0) / vision.length).toFixed(1);
  console.log('  Traction:', tractAvg, '(was 11.6)');
  console.log('  Vision:  ', visAvg, '(was 0.0)');
  console.log('');
  console.log('Zero Scores:');
  console.log('  Traction = 0:', traction.filter(t => t === 0).length);
  console.log('  Vision = 0:  ', vision.filter(v => v === 0).length);
}

summary().catch(console.error);
