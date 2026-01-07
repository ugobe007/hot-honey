require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fix() {
  // Find all startups with uncapped scores
  const { data: oldScores } = await s.from('startup_uploads')
    .select('id, name, status, team_score, market_score, traction_score')
    .or('team_score.gt.25,market_score.gt.25,traction_score.gt.25');
  
  console.log('Found ' + (oldScores?.length || 0) + ' with old scores:');
  
  if (!oldScores || oldScores.length === 0) {
    console.log('None found!');
    return;
  }
  
  oldScores.slice(0, 5).forEach(d => {
    console.log(`  ${d.name} (status=${d.status}): T=${d.team_score} M=${d.market_score} Tr=${d.traction_score}`);
  });
  
  // Force update them with capped scores
  console.log('\nForce updating...');
  let updated = 0;
  
  for (const startup of oldScores) {
    const newTeam = Math.min(startup.team_score || 0, 25);
    const newMarket = Math.min(startup.market_score || 0, 25);
    const newTraction = Math.min(startup.traction_score || 0, 25);
    const newTotal = newTeam + newMarket + newTraction + 15; // Add baseline
    
    const { error } = await s.from('startup_uploads').update({
      team_score: newTeam,
      market_score: newMarket,
      traction_score: newTraction,
      total_god_score: Math.min(newTotal, 75),
      updated_at: new Date().toISOString()
    }).eq('id', startup.id);
    
    if (!error) updated++;
  }
  
  console.log('Updated ' + updated + ' startups');
}
fix();
