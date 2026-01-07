require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { DynamicMatch } = require('./lib/dynamicmatch');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const dm = new DynamicMatch();

async function enrichStartups() {
  // Get startups with websites but missing descriptions
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name, website, description')
    .eq('status', 'approved')
    .not('website', 'is', null)
    .limit(500);
  
  console.log('Found', startups?.length || 0, 'startups with websites\n');
  
  let enriched = 0;
  let failed = 0;
  
  for (const startup of (startups || [])) {
    // Skip if already has good description
    if (startup.description && startup.description.length > 100) continue;
    
    // Clean website URL
    let url = startup.website;
    if (!url.startsWith('http')) url = 'https://' + url;
    
    try {
      const result = await dm.extract(url);
      
      if (result.confidence > 20) {
        const updates = {};
        
        if (result.extracted.description && result.extracted.description.length > 50) {
          updates.description = result.extracted.description;
        }
        if (result.signals.has_revenue) {
          updates.has_revenue = true;
        }
        if (result.extracted.has_pricing) {
          updates.has_revenue = true; // Pricing page = likely has revenue
        }
        if (result.signals.funding_amount) {
          updates.latest_funding_amount = result.signals.funding_amount;
        }
        if (result.signals.employee_count) {
          updates.team_size = result.signals.employee_count;
        }
        
        if (Object.keys(updates).length > 0) {
          await supabase.from('startup_uploads').update(updates).eq('id', startup.id);
          enriched++;
          console.log('+ ' + startup.name + ':', Object.keys(updates).join(', '));
        }
      }
    } catch (e) {
      failed++;
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\nEnriched:', enriched, '| Failed:', failed);
  console.log('DynamicMatch stats:', dm.getStats());
}

enrichStartups();
