require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fix() {
  // 1. Delete the bad "in new equity" investor
  const { error: deleteError } = await s.from('investors')
    .delete()
    .eq('name', 'in new equity');
  
  if (deleteError) {
    console.log('Error deleting:', deleteError.message);
  } else {
    console.log('✅ Deleted "in new equity" investor');
  }
  
  // 2. Find any other investors with object-type notable_investments
  const { data: allWithNotable } = await s.from('investors')
    .select('id, name, notable_investments')
    .not('notable_investments', 'is', null);
  
  let fixed = 0;
  for (const inv of allWithNotable || []) {
    if (inv.notable_investments && inv.notable_investments.length > 0) {
      const first = inv.notable_investments[0];
      // If first item is an object (not a string), fix it
      if (typeof first === 'object' && first !== null) {
        console.log('Found bad notable_investments for:', inv.name);
        // Try to extract string values from objects
        const fixedNotable = inv.notable_investments.map(item => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object') return item.name || item.company || String(item);
          return String(item);
        });
        
        const { error } = await s.from('investors')
          .update({ notable_investments: fixedNotable })
          .eq('id', inv.id);
        
        if (!error) {
          console.log('  Fixed:', fixedNotable.slice(0, 3).join(', '));
          fixed++;
        }
      }
    }
  }
  
  console.log('\n✅ Fixed', fixed, 'investors with bad notable_investments');
  
  // 3. Find other bad investor names (too short, weird patterns)
  const { data: badNames } = await s.from('investors')
    .select('id, name')
    .or('name.ilike.%in new%,name.ilike.%sits on%,name.ilike.%YanSenior%');
  
  console.log('\nOther potentially bad investor names:');
  badNames?.forEach(inv => console.log(' -', inv.name));
}
fix();
