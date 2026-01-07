require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function verify() {
  // Check approved startups with component scores > 25
  const { data } = await s.from('startup_uploads')
    .select('name, total_god_score, team_score, market_score, traction_score, vision_score')
    .eq('status', 'approved')
    .or('team_score.gt.25,market_score.gt.25,traction_score.gt.25,vision_score.gt.25')
    .limit(20);
  
  console.log('Approved startups with any component > 25:');
  if (data && data.length > 0) {
    data.forEach(d => console.log(`  ${d.name}: GOD=${d.total_god_score} V=${d.vision_score} M=${d.market_score} Tr=${d.traction_score} T=${d.team_score}`));
    console.log('\nTotal found: ' + data.length);
  } else {
    console.log('  None! All scores are properly capped.');
  }
}
verify();
