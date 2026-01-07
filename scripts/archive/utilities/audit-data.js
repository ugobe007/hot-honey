require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function audit() {
  let all = [];
  for (let i = 0; i < 4; i++) {
    const {data} = await s.from('startup_uploads').select('description, tagline, pitch, website, mrr, customer_count, team_size').eq('status', 'approved').range(i*1000, (i+1)*1000-1);
    if (data) all = all.concat(data);
  }
  
  let hasRealDesc = 0, hasRealTagline = 0, hasPitch = 0, hasWebsite = 0, hasMrr = 0, hasCustomers = 0;
  
  all.forEach(r => {
    if (r.description && r.description.length > 50 && !r.description.includes('company')) hasRealDesc++;
    if (r.tagline && r.tagline.length > 20 && !/- \w+ company$/i.test(r.tagline)) hasRealTagline++;
    if (r.pitch && r.pitch.length > 50) hasPitch++;
    if (r.website && r.website.length > 5) hasWebsite++;
    if (r.mrr > 0) hasMrr++;
    if (r.customer_count > 0) hasCustomers++;
  });
  
  console.log('DATA QUALITY AUDIT (n=' + all.length + ')');
  console.log('----------------------------------------');
  console.log('Real description (>50 chars):  ' + hasRealDesc + ' (' + (hasRealDesc/all.length*100).toFixed(1) + '%)');
  console.log('Real tagline (not generic):    ' + hasRealTagline + ' (' + (hasRealTagline/all.length*100).toFixed(1) + '%)');
  console.log('Has pitch content:             ' + hasPitch + ' (' + (hasPitch/all.length*100).toFixed(1) + '%)');
  console.log('Has website:                   ' + hasWebsite + ' (' + (hasWebsite/all.length*100).toFixed(1) + '%)');
  console.log('Has MRR > 0:                   ' + hasMrr + ' (' + (hasMrr/all.length*100).toFixed(1) + '%)');
  console.log('Has customers > 0:             ' + hasCustomers + ' (' + (hasCustomers/all.length*100).toFixed(1) + '%)');
}
audit();
