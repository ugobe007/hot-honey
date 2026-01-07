require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function deleteBad() {
  // Get all investors
  const { data: all } = await s.from('investors').select('id, name').limit(5000);
  
  // Patterns that indicate bad parsing (fragments of sentences)
  const badPatterns = [
    /^be in the/i,
    /^working with/i,
    /^with his/i,
    /^cost of/i,
    /^happyInvesting/i,
    /^evolving trends/i,
    /^team of former/i,
    /^stage venture/i,
    /^or choose an/i,
    /^schedule Limited/i,
    /^up Pinnacle/i,
    /^by AIX/i,
    /^across asset/i,
    /^makes our/i,
    /^re former/i,
    /^to Find My/i,
    /^place where/i,
    /^their private/i,
    /^to competitor/i,
    /^for early stage/i,
    /^we help/i,
    /^access additional/i,
    /^at Pantera/i,
    /^we build alongside/i,
    /^that matter to/i,
    /^an executive coach/i,
    /^article [A-Z]/i,
    /^ai [A-Z][a-z]+ [A-Z]/i,
    /^and Private/i,
    /^min read/i,
    /^at Tiger/i,
    /^token strategies/i,
    /^view profile/i,
    /^private equity firms/i,
    /^specifically for/i,
    /^about angel/i,
    /^preferences Foundation/i,
    /^ago AI/i,
    /^me hire/i,
    /^founded Pantera/i,
    /^deal or fund/i,
    /^as Managing/i,
    /^from our/i,
    /^and DataEric/i,
    /^around the world/i,
    /^and capital$/i,
    /^and General/i,
    /^re an incredible/i,
    /^and advice for/i,
    /^marketing product/i,
    /^from Vista/i,
    /^Scott is/i,
    /^General partners$/i,
    /^OperationsCollaborators/i,
    /^InvestingAbout/i,
    /^ResearchCaitlin/i,
    /^ResearchArjun/i,
    /^crypto partners$/i,
    /^blockchain group$/i,
  ];
  
  let deleted = 0;
  const toDelete = [];
  
  all.forEach(inv => {
    const isBad = badPatterns.some(pattern => pattern.test(inv.name));
    if (isBad) {
      toDelete.push(inv);
    }
  });
  
  console.log('Found', toDelete.length, 'bad investors to delete:\n');
  
  for (const inv of toDelete) {
    console.log(' ❌', inv.name);
    await s.from('investors').delete().eq('id', inv.id);
    deleted++;
  }
  
  console.log('\n✅ Deleted', deleted, 'bad investor records');
  
  // Verify count
  const { count } = await s.from('investors').select('id', { count: 'exact', head: true });
  console.log('Remaining investors:', count);
}
deleteBad();
