require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Top VC firms with real data
const VC_FIRM_DATA = {
  'a16z': { full_name: 'Andreessen Horowitz', website: 'https://a16z.com', fund_size: 35000000000, geo: ['US', 'Global'], notable: ['Facebook', 'Twitter', 'Airbnb', 'Coinbase', 'GitHub', 'Stripe'], thesis: 'Invests in software eating the world - consumer, enterprise, crypto, bio across all stages' },
  'sequoia': { full_name: 'Sequoia Capital', website: 'https://sequoiacap.com', fund_size: 85000000000, geo: ['US', 'Global'], notable: ['Apple', 'Google', 'PayPal', 'YouTube', 'Instagram', 'WhatsApp', 'Stripe'], thesis: 'Partners with daring founders from idea to IPO and beyond' },
  'founders fund': { full_name: 'Founders Fund', website: 'https://foundersfund.com', fund_size: 11000000000, geo: ['US'], notable: ['SpaceX', 'Palantir', 'Stripe', 'Airbnb', 'Anduril'], thesis: 'Invests in transformative technology companies' },
  'first round': { full_name: 'First Round Capital', website: 'https://firstround.com', fund_size: 1000000000, geo: ['US'], notable: ['Uber', 'Square', 'Notion', 'Roblox', 'Warby Parker'], thesis: 'Seed-stage investor helping entrepreneurs build remarkable companies' },
  'initialized': { full_name: 'Initialized Capital', website: 'https://initialized.com', fund_size: 700000000, geo: ['US'], notable: ['Coinbase', 'Instacart', 'Cruise', 'Flexport'], thesis: 'Backs technical founders at pre-seed and seed' },
  'greylock': { full_name: 'Greylock Partners', website: 'https://greylock.com', fund_size: 5000000000, geo: ['US'], notable: ['Facebook', 'LinkedIn', 'Airbnb', 'Discord', 'Figma'], thesis: 'Focus on consumer, enterprise, and crypto at Series A+' },
  'benchmark': { full_name: 'Benchmark', website: 'https://benchmark.com', fund_size: 3000000000, geo: ['US'], notable: ['eBay', 'Twitter', 'Uber', 'Snapchat', 'Instagram', 'Discord'], thesis: 'Equal partnership model, early-stage focus' },
  'lightspeed': { full_name: 'Lightspeed Venture Partners', website: 'https://lsvp.com', fund_size: 18000000000, geo: ['US', 'Global'], notable: ['Snapchat', 'Affirm', 'Mulesoft', 'Nest'], thesis: 'Multi-stage investor globally' },
  'nea': { full_name: 'New Enterprise Associates', website: 'https://nea.com', fund_size: 25000000000, geo: ['US', 'Global'], notable: ['Salesforce', 'Workday', 'Cloudflare', 'Robinhood', 'Databricks'], thesis: 'Stage-agnostic across technology and healthcare' },
  'accel': { full_name: 'Accel', website: 'https://accel.com', fund_size: 16000000000, geo: ['US', 'Europe'], notable: ['Facebook', 'Spotify', 'Slack', 'Dropbox', 'Crowdstrike'], thesis: 'Seed to growth in consumer and enterprise' },
  'index': { full_name: 'Index Ventures', website: 'https://indexventures.com', fund_size: 13000000000, geo: ['US', 'Europe'], notable: ['Dropbox', 'Figma', 'Notion', 'Discord', 'Roblox'], thesis: 'Backs exceptional entrepreneurs across US and Europe' },
  'bessemer': { full_name: 'Bessemer Venture Partners', website: 'https://bvp.com', fund_size: 6500000000, geo: ['US', 'Global'], notable: ['LinkedIn', 'Shopify', 'Twilio', 'Canva', 'Toast'], thesis: 'Multi-stage in cloud, consumer, healthcare, space' },
  'khosla': { full_name: 'Khosla Ventures', website: 'https://khoslaventures.com', fund_size: 15000000000, geo: ['US'], notable: ['Square', 'DoorDash', 'Affirm', 'Impossible Foods', 'OpenAI'], thesis: 'Audacious ideas in AI, sustainability, healthcare' },
  'dcvc': { full_name: 'DCVC', website: 'https://dcvc.com', fund_size: 3000000000, geo: ['US'], notable: ['Databricks', 'Planet Labs', 'Farmers Business Network'], thesis: 'Deep tech in AI, biology, materials, energy, space' },
  'lux': { full_name: 'Lux Capital', website: 'https://luxcapital.com', fund_size: 5000000000, geo: ['US'], notable: ['Anduril', 'Flexport', 'Desktop Metal'], thesis: 'Frontier science - AI, defense, robotics, materials' },
  'usv': { full_name: 'Union Square Ventures', website: 'https://usv.com', fund_size: 2000000000, geo: ['US'], notable: ['Twitter', 'Etsy', 'Coinbase', 'Cloudflare', 'MongoDB'], thesis: 'Networks, platforms, protocols - especially crypto' },
  'paradigm': { full_name: 'Paradigm', website: 'https://paradigm.xyz', fund_size: 10000000000, geo: ['US', 'Global'], notable: ['Uniswap', 'Coinbase', 'dYdX', 'OpenSea'], thesis: 'Crypto-native investor in DeFi and web3' },
  'lowercarbon': { full_name: 'Lowercarbon Capital', website: 'https://lowercarboncapital.com', fund_size: 2000000000, geo: ['US'], notable: ['Electric Hydrogen', 'Charm Industrial', 'Watershed'], thesis: 'Climate tech focused on decarbonization' },
  'yc': { full_name: 'Y Combinator', website: 'https://ycombinator.com', fund_size: 5000000000, geo: ['US', 'Global'], notable: ['Airbnb', 'Stripe', 'Dropbox', 'Coinbase', 'DoorDash'], thesis: 'Make something people want - earliest stages' },
  'playground': { full_name: 'Playground Global', website: 'https://playground.global', fund_size: 1500000000, geo: ['US'], notable: ['Nuro', 'Planet Labs', 'Carbon Robotics'], thesis: 'Deep tech in robotics, AI, breakthrough hardware' },
  'gv': { full_name: 'GV (Google Ventures)', website: 'https://gv.com', fund_size: 8000000000, geo: ['US', 'Europe'], notable: ['Uber', 'Slack', 'Stripe', 'GitLab', 'Robinhood'], thesis: 'Backs founders across all stages and sectors' },
  'kleiner': { full_name: 'Kleiner Perkins', website: 'https://kleinerperkins.com', fund_size: 4000000000, geo: ['US'], notable: ['Amazon', 'Google', 'Twitter', 'Spotify', 'Slack'], thesis: 'Backs bold ideas in tech and life sciences' },
  'ivp': { full_name: 'IVP', website: 'https://ivp.com', fund_size: 9000000000, geo: ['US'], notable: ['Twitter', 'Dropbox', 'Slack', 'Discord', 'Figma'], thesis: 'Growth-stage investor in consumer and enterprise' },
  'general catalyst': { full_name: 'General Catalyst', website: 'https://generalcatalyst.com', fund_size: 25000000000, geo: ['US', 'Global'], notable: ['Stripe', 'Airbnb', 'Snap', 'Kayak', 'Hubspot'], thesis: 'Stage-agnostic with responsible innovation focus' },
  'tiger': { full_name: 'Tiger Global', website: 'https://tigerglobal.com', fund_size: 80000000000, geo: ['US', 'Global'], notable: ['Facebook', 'LinkedIn', 'Spotify', 'Stripe', 'ByteDance'], thesis: 'High-velocity investing at growth stages' },
  'insight': { full_name: 'Insight Partners', website: 'https://insightpartners.com', fund_size: 90000000000, geo: ['US', 'Global'], notable: ['Twitter', 'Shopify', 'DocuSign', 'Qualtrics'], thesis: 'ScaleUp investing in software companies' },
  'coatue': { full_name: 'Coatue Management', website: 'https://coatue.com', fund_size: 75000000000, geo: ['US', 'Global'], notable: ['Instacart', 'DoorDash', 'Snap', 'Spotify'], thesis: 'Technology-focused crossover fund' },
  'andreessen': { full_name: 'Andreessen Horowitz', website: 'https://a16z.com', fund_size: 35000000000, geo: ['US', 'Global'], notable: ['Facebook', 'Twitter', 'Airbnb', 'Coinbase'], thesis: 'Software eating the world' },
};

function generatePhotoUrl(name) {
  const colors = ['6366f1', '8b5cf6', 'ec4899', 'f43f5e', 'f97316', 'eab308', '22c55e', '14b8a6', '06b6d4', '3b82f6'];
  const color = colors[name.length % colors.length];
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=${color}&color=fff&bold=true`;
}

function generateLinkedInUrl(name) {
  const cleanName = name.replace(/\s*\([^)]+\)\s*$/, '').replace(/,.*$/, '').trim();
  const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '').replace(/^-+/, '');
  return `https://linkedin.com/in/${slug}`;
}

function matchFirm(investorName, firmName) {
  const text = ((investorName || '') + ' ' + (firmName || '')).toLowerCase();
  for (const [key, data] of Object.entries(VC_FIRM_DATA)) {
    if (text.includes(key) || (data.full_name && text.includes(data.full_name.toLowerCase()))) {
      return { key, data };
    }
  }
  return null;
}

async function enrichInvestors() {
  console.log('ENRICHING INVESTOR DATA v2\n');
  
  let all = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase.from('investors').select('*').range(offset, offset + 999);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    offset += 1000;
    if (data.length < 1000) break;
  }
  
  console.log('Total investors:', all.length);
  
  let enriched = 0, firmMatched = 0;
  
  for (const inv of all) {
    const updates = {};
    
    // Photo
    if (!inv.photo_url) {
      updates.photo_url = generatePhotoUrl(inv.name);
    }
    
    // LinkedIn
    if (!inv.linkedin_url) {
      updates.linkedin_url = generateLinkedInUrl(inv.name);
    }
    
    // Geography (use existing column)
    if (!inv.geography_focus || inv.geography_focus.length === 0) {
      updates.geography_focus = ['US'];
    }
    
    // Match to known firm
    const firmMatch = matchFirm(inv.name, inv.firm);
    if (firmMatch) {
      const fd = firmMatch.data;
      
      if (!inv.active_fund_size) updates.active_fund_size = fd.fund_size;
      if (!inv.notable_investments || inv.notable_investments.length === 0) {
        updates.notable_investments = fd.notable;
      }
      if (!inv.blog_url) updates.blog_url = fd.website;
      if (fd.geo) updates.geography_focus = fd.geo;
      
      // Better firm name
      if (inv.firm === inv.name) {
        updates.firm = fd.full_name;
      }
      
      // Better thesis
      if (!inv.investment_thesis || inv.investment_thesis.length < 50) {
        updates.investment_thesis = fd.thesis;
      }
      
      // Better bio
      if (!inv.bio || inv.bio.includes('Discovered from') || inv.bio.length < 30) {
        const cleanName = inv.name.replace(/\s*\([^)]+\)\s*$/, '').trim();
        updates.bio = `${cleanName} is a partner at ${fd.full_name}. ${fd.thesis}`;
      }
      
      firmMatched++;
    }
    
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('investors').update(updates).eq('id', inv.id);
      if (error) {
        console.log('Error updating', inv.name, ':', error.message);
      } else {
        enriched++;
        if (enriched <= 5) {
          console.log('Enriched:', inv.name);
          console.log('  Updates:', Object.keys(updates).join(', '));
        }
        if (enriched % 500 === 0) console.log('  Progress:', enriched);
      }
    }
  }
  
  console.log('\nTotal enriched:', enriched);
  console.log('Firm matches:', firmMatched);
  
  // Verify
  const { data: sample } = await supabase.from('investors')
    .select('name, firm, photo_url, linkedin_url, notable_investments, geography_focus, investment_thesis')
    .not('photo_url', 'is', null)
    .limit(5);
  
  console.log('\n--- Verification ---');
  if (sample) {
    sample.forEach(inv => {
      console.log('\n' + inv.name);
      console.log('  Firm:', inv.firm);
      console.log('  Photo:', inv.photo_url ? 'YES' : 'no');
      console.log('  LinkedIn:', inv.linkedin_url ? 'YES' : 'no');
      console.log('  Geo:', (inv.geography_focus || []).join(', '));
      console.log('  Notable:', (inv.notable_investments || []).slice(0, 3).join(', ') || 'none');
      console.log('  Thesis:', (inv.investment_thesis || '').substring(0, 60) + '...');
    });
  }
}

enrichInvestors();
