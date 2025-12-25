require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  // Count investors with different data quality
  const { count: total } = await s.from('investors').select('id', { count: 'exact', head: true });
  
  const { count: withSectors } = await s.from('investors')
    .select('id', { count: 'exact', head: true })
    .not('sectors', 'eq', '{}');
  
  const { count: withNotable } = await s.from('investors')
    .select('id', { count: 'exact', head: true })
    .not('notable_investments', 'is', null);
  
  const { count: withCheckSize } = await s.from('investors')
    .select('id', { count: 'exact', head: true })
    .not('check_size_min', 'is', null);
  
  const { count: withPhoto } = await s.from('investors')
    .select('id', { count: 'exact', head: true })
    .not('photo_url', 'is', null);
  
  const { count: withBio } = await s.from('investors')
    .select('id', { count: 'exact', head: true })
    .not('bio', 'is', null)
    .neq('bio', '');
  
  const { count: withStage } = await s.from('investors')
    .select('id', { count: 'exact', head: true })
    .not('stage', 'eq', '{}');
    
  console.log('INVESTOR DATA QUALITY:');
  console.log('  Total investors:', total);
  console.log('  With sectors:', withSectors, `(${Math.round(withSectors/total*100)}%)`);
  console.log('  With notable investments:', withNotable, `(${Math.round(withNotable/total*100)}%)`);
  console.log('  With check size:', withCheckSize, `(${Math.round(withCheckSize/total*100)}%)`);
  console.log('  With photo:', withPhoto, `(${Math.round(withPhoto/total*100)}%)`);
  console.log('  With bio:', withBio, `(${Math.round(withBio/total*100)}%)`);
  console.log('  With stage:', withStage, `(${Math.round(withStage/total*100)}%)`);
  
  // Count high quality (has sectors + check size + bio)
  const { data: quality } = await s.from('investors')
    .select('id')
    .not('sectors', 'eq', '{}')
    .not('check_size_min', 'is', null)
    .not('bio', 'is', null);
  
  console.log('\n  HIGH QUALITY (sectors + check + bio):', quality?.length || 0);
}
check();
