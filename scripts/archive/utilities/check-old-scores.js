require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const { data } = await s.from('startup_uploads')
    .select('name, total_god_score, team_score, market_score, traction_score')
    .eq('status', 'approved')
    .gt('team_score', 25)
    .limit(10);
  
  console.log('Startups with old uncapped team_score > 25:');
  if (data) data.forEach(d => console.log(`  ${d.name}: GOD=${d.total_god_score} T=${d.team_score} M=${d.market_score} Tr=${d.traction_score}`));
}
check();
