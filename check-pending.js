const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: pending } = await supabase
    .from('startup_uploads')
    .select('id, name, total_god_score, website')
    .eq('status', 'pending')
    .order('total_god_score', { ascending: false });
  
  console.log('PENDING STARTUPS: ' + (pending?.length || 0));
  console.log('Score | Name                              | Website');
  console.log('-'.repeat(55));
  
  (pending || []).forEach(s => {
    const score = (s.total_god_score || 0).toString().padStart(5);
    const name = s.name.substring(0, 33).padEnd(33);
    const web = s.website ? 'Y' : 'N';
    console.log(score + ' | ' + name + ' | ' + web);
  });
  
  const above50 = (pending || []).filter(p => (p.total_god_score || 0) >= 50).length;
  console.log('\nGOD >= 50: ' + above50 + ' (pipeline auto-approves these)');
  console.log('GOD < 50: ' + ((pending?.length || 0) - above50) + ' (need manual review)');
}
check();
