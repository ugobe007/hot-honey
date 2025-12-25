require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const { data } = await s.from('startup_uploads').select('source_type, total_god_score').eq('status', 'approved');
  
  const bySource = {};
  data.forEach(x => {
    const src = x.source_type || 'unknown';
    if (typeof bySource[src] === 'undefined') bySource[src] = [];
    bySource[src].push(x.total_god_score || 0);
  });
  
  console.log('STARTUPS BY SOURCE:\n');
  Object.entries(bySource).forEach(([src, scores]) => {
    const avg = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
    const min = scores.length ? Math.min(...scores) : 0;
    const max = scores.length ? Math.max(...scores) : 0;
    console.log(src.padEnd(15) + scores.length.toString().padStart(5) + ' startups | GOD: ' + min + '-' + max + ' (avg ' + avg + ')');
  });
  
  console.log('\nThe problem: We are scraping already-funded startups from TechCrunch/YC');
  console.log('These all have traction, team, etc. so they score 40+ minimum');
  console.log('\nTo get "promising" (38-44) startups, we need to scrape:');
  console.log('  - Product Hunt (early launches)');
  console.log('  - Indie Hackers (bootstrapped)');
  console.log('  - HN Show/Launch (very early)');
  console.log('  - AngelList (pre-seed)');
}

check();
