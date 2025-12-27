require('dotenv').config();
const { supabase } = require('./lib/scraper-db');

const BAD_PATTERNS = [
  /^diverse as/i,
  /^stage venture/i,
  /^working with/i,
  /^How the/i,
  /^be in the/i,
  /^around the world/i,
  /^ML Cloud/i,
  /^Cloud Consumer/i,
  /^new and future/i,
  /^and investment/i,
  /^Venture Funds/i,
  /^and supporting/i,
  /^NotionFormer/i,
  /^collaborate closely/i,
  /^sits on the/i,
  /^day ago/i,
  /^now Private/i,
  /^min read/i,
  /^about angel/i,
  /^evolving trends/i,
  /^and capital$/i,
  /^we build/i,
  /^venture capital limited/i,
  /^Biggest Fund$/i,
  /^General partners$/i,
  /^ai Antoine/i,
  /^are built by/i,
  /AngelList wires/i,
  /\(Pehub\)/i,
  /\(Penews\)/i,
  /\(Tomtunguz\)/i,
  /\(Bvp\)$/i,
  /\(A16z\)$/i,
  /\(Lsvp\)$/i,
  /\(Matrixpartners\)$/i,
  /\(Panteracapital\)$/i,
  /Operating \(Dcvc\)/i,
  /stage VC fund/i,
  /The company intends/i,
  / and BIG Capital/i,
];

async function cleanup() {
  console.log('Cleaning up bad investor names\n');
  
  const { data: all } = await supabase.from('investors').select('id, name').limit(5000);
  let deleted = 0;
  
  for (const inv of all || []) {
    if (BAD_PATTERNS.some(p => p.test(inv.name))) {
      await supabase.from('investors').delete().eq('id', inv.id);
      console.log('  Deleted:', inv.name);
      deleted++;
    }
  }
  
  console.log('\nDeleted:', deleted);
  
  const { count } = await supabase.from('investors').select('id', { count: 'exact', head: true });
  console.log('Remaining investors:', count);
}

cleanup().then(() => process.exit(0));
