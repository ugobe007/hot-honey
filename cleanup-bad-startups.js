require('dotenv').config();
const { supabase } = require('./lib/scraper-db');

const BAD_PATTERNS = [
  /^Nike /i,
  /^Google /i,
  /^Existing /i,
  /^Funding /i,
  / is expanding/i,
  / GAAP /i,
  / EPS$/i,
  / Issues$/i,
  /^The /i,
  / investors$/i,
  /^Norway$/i,
  /^Oxford$/i,
  /^Pfizer$/i,
];

async function cleanup() {
  console.log('Cleaning up bad startup names\n');
  
  const { data: all } = await supabase
    .from('startup_uploads')
    .select('id, name')
    .limit(3000);
  
  let deleted = 0;
  
  for (const s of all || []) {
    if (BAD_PATTERNS.some(p => p.test(s.name))) {
      await supabase.from('startup_uploads').delete().eq('id', s.id);
      console.log('  Deleted:', s.name);
      deleted++;
    }
  }
  
  console.log('\nDeleted:', deleted);
}

cleanup().then(() => process.exit(0));
