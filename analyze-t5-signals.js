require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function analyze() {
  const { data, error } = await s.from('startup_uploads')
    .select('name, total_god_score, traction_score, product_score, market_score, team_score, vision_score, is_launched, has_revenue, has_customers, mrr, latest_funding_amount, execution_signals, team_signals')
    .eq('status', 'approved')
    .lt('total_god_score', 35)
    .order('total_god_score', { ascending: true })
    .limit(15);

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('T5 STARTUPS - SIGNAL ANALYSIS');
  console.log('Found:', data?.length || 0, 'startups\n');
  
  (data || []).forEach(startup => {
    console.log(startup.name, '(GOD:', startup.total_god_score + ')');
    console.log('  Scores: Traction=' + (startup.traction_score || 0) + ' Product=' + (startup.product_score || 0) + ' Market=' + (startup.market_score || 0) + ' Team=' + (startup.team_score || 0));
    console.log('  Signals: launched=' + (startup.is_launched ? 'Y' : 'N') + ' revenue=' + (startup.has_revenue ? 'Y' : 'N') + ' customers=' + (startup.has_customers ? 'Y' : 'N'));
    console.log('  MRR: $' + (startup.mrr || 0) + ' | Funding: $' + (startup.latest_funding_amount || 0));
    console.log('  Exec signals:', startup.execution_signals || []);
    console.log('');
  });
}

analyze();
