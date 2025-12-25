require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Top VC firms with real data
const VC_FIRM_DATA = {
  'a16z': {
    full_name: 'Andreessen Horowitz',
    website: 'https://a16z.com',
    description: 'Andreessen Horowitz (a16z) is a venture capital firm that backs bold entrepreneurs building the future through technology.',
    fund_size: 35000000000,
    founded: 2009,
    location: 'Menlo Park, CA',
    notable_investments: ['Facebook', 'Twitter', 'Airbnb', 'Coinbase', 'GitHub', 'Stripe', 'Slack', 'Instacart'],
    notable_exits: ['Facebook IPO', 'Coinbase IPO', 'GitHub acquired by Microsoft', 'Instagram acquired by Facebook'],
    thesis: 'Invests in software eating the world - consumer, enterprise, crypto, bio, fintech across all stages'
  },
  'sequoia': {
    full_name: 'Sequoia Capital',
    website: 'https://sequoiacap.com',
    description: 'Sequoia Capital is a venture capital firm focused on technology companies in the US, China, India, Israel, and Southeast Asia.',
    fund_size: 85000000000,
    founded: 1972,
    location: 'Menlo Park, CA',
    notable_investments: ['Apple', 'Google', 'Oracle', 'PayPal', 'YouTube', 'Instagram', 'WhatsApp', 'Stripe', 'DoorDash'],
    notable_exits: ['Google IPO', 'YouTube acquired by Google', 'WhatsApp acquired by Facebook', 'Instagram acquired by Facebook'],
    thesis: 'Partners with daring founders from idea to IPO and beyond'
  },
  'founders fund': {
    full_name: 'Founders Fund',
    website: 'https://foundersfund.com',
    description: 'Founders Fund invests in companies building revolutionary technologies.',
    fund_size: 11000000000,
    founded: 2005,
    location: 'San Francisco, CA',
    notable_investments: ['SpaceX', 'Palantir', 'Stripe', 'Airbnb', 'Spotify', 'Anduril', 'Neuralink'],
    notable_exits: ['Palantir IPO', 'Spotify IPO', 'Facebook IPO'],
    thesis: 'We wanted flying cars, instead we got 140 characters - invests in transformative technology'
  },
  'first round': {
    full_name: 'First Round Capital',
    website: 'https://firstround.com',
    description: 'First Round Capital is a seed-stage venture firm focused on building a community of technology entrepreneurs.',
    fund_size: 1000000000,
    founded: 2004,
    location: 'San Francisco, CA',
    notable_investments: ['Uber', 'Square', 'Notion', 'Roblox', 'Warby Parker', 'Blue Apron'],
    notable_exits: ['Uber IPO', 'Square IPO', 'Roblox IPO'],
    thesis: 'Seed-stage investor helping entrepreneurs build remarkable companies from day one'
  },
  'initialized': {
    full_name: 'Initialized Capital',
    website: 'https://initialized.com',
    description: 'Initialized Capital invests at the earliest stages, focusing on founders first.',
    fund_size: 700000000,
    founded: 2011,
    location: 'San Francisco, CA',
    notable_investments: ['Coinbase', 'Instacart', 'Cruise', 'Flexport', 'Opendoor'],
    notable_exits: ['Coinbase IPO', 'Cruise acquired by GM', 'Opendoor IPO'],
    thesis: 'Backs technical founders building transformative companies at pre-seed and seed'
  },
  'greylock': {
    full_name: 'Greylock Partners',
    website: 'https://greylock.com',
    description: 'Greylock Partners is a leading venture capital firm committed to building enduring companies.',
    fund_size: 5000000000,
    founded: 1965,
    location: 'Menlo Park, CA',
    notable_investments: ['Facebook', 'LinkedIn', 'Airbnb', 'Discord', 'Figma', 'Roblox', 'Coinbase'],
    notable_exits: ['LinkedIn IPO and Microsoft acquisition', 'Facebook IPO', 'Figma acquired by Adobe'],
    thesis: 'Focus on consumer, enterprise, and crypto at Series A and beyond'
  },
  'benchmark': {
    full_name: 'Benchmark',
    website: 'https://benchmark.com',
    description: 'Benchmark is an early-stage venture capital firm with a tradition of partnering with founders.',
    fund_size: 3000000000,
    founded: 1995,
    location: 'San Francisco, CA',
    notable_investments: ['eBay', 'Twitter', 'Uber', 'Snapchat', 'Instagram', 'Discord', 'Zillow'],
    notable_exits: ['eBay IPO', 'Twitter IPO', 'Uber IPO', 'Snapchat IPO'],
    thesis: 'Equal partnership model, one check size, early-stage focus'
  },
  'lightspeed': {
    full_name: 'Lightspeed Venture Partners',
    website: 'https://lsvp.com',
    description: 'Lightspeed Venture Partners is a global venture capital firm with offices worldwide.',
    fund_size: 18000000000,
    founded: 2000,
    location: 'Menlo Park, CA',
    notable_investments: ['Snapchat', 'Affirm', 'Mulesoft', 'AppDynamics', 'Nest', 'GrubHub'],
    notable_exits: ['Snapchat IPO', 'Affirm IPO', 'MuleSoft acquired by Salesforce'],
    thesis: 'Multi-stage investor in consumer, enterprise, fintech, and crypto globally'
  },
  'nea': {
    full_name: 'New Enterprise Associates',
    website: 'https://nea.com',
    description: 'NEA is a global venture capital firm investing in technology and healthcare companies.',
    fund_size: 25000000000,
    founded: 1977,
    location: 'Menlo Park, CA',
    notable_investments: ['Salesforce', 'Workday', 'Cloudflare', 'Robinhood', 'Plaid', 'Databricks'],
    notable_exits: ['Salesforce IPO', 'Workday IPO', 'Cloudflare IPO'],
    thesis: 'Stage-agnostic investor across technology and healthcare'
  },
  'accel': {
    full_name: 'Accel',
    website: 'https://accel.com',
    description: 'Accel is a global venture capital firm that partners with exceptional founders.',
    fund_size: 16000000000,
    founded: 1983,
    location: 'Palo Alto, CA',
    notable_investments: ['Facebook', 'Spotify', 'Slack', 'Dropbox', 'Etsy', 'Crowdstrike', 'UiPath'],
    notable_exits: ['Facebook IPO', 'Spotify IPO', 'Slack IPO', 'Crowdstrike IPO'],
    thesis: 'Seed to growth investor in consumer and enterprise technology'
  },
  'index': {
    full_name: 'Index Ventures',
    website: 'https://indexventures.com',
    description: 'Index Ventures is an international venture capital firm with offices in San Francisco and London.',
    fund_size: 13000000000,
    founded: 1996,
    location: 'San Francisco, CA',
    notable_investments: ['Dropbox', 'Figma', 'Notion', 'Discord', 'Roblox', 'Revolut', 'Deliveroo'],
    notable_exits: ['Dropbox IPO', 'Figma acquired by Adobe', 'Roblox IPO'],
    thesis: 'Backs exceptional entrepreneurs building defining companies across US and Europe'
  },
  'bessemer': {
    full_name: 'Bessemer Venture Partners',
    website: 'https://bvp.com',
    description: 'Bessemer Venture Partners is a global venture capital firm with a 100+ year track record.',
    fund_size: 6500000000,
    founded: 1911,
    location: 'Menlo Park, CA',
    notable_investments: ['LinkedIn', 'Shopify', 'Twilio', 'Canva', 'Toast', 'PagerDuty'],
    notable_exits: ['LinkedIn IPO', 'Shopify IPO', 'Twilio IPO', 'Toast IPO'],
    thesis: 'Multi-stage investor focused on cloud, consumer, healthcare, and space'
  },
  'khosla': {
    full_name: 'Khosla Ventures',
    website: 'https://khoslaventures.com',
    description: 'Khosla Ventures focuses on impactful technology investments in software, AI, and sustainability.',
    fund_size: 15000000000,
    founded: 2004,
    location: 'Menlo Park, CA',
    notable_investments: ['Square', 'DoorDash', 'Affirm', 'Impossible Foods', 'OpenAI', 'CommonSpirit'],
    notable_exits: ['Square IPO', 'DoorDash IPO', 'Affirm IPO'],
    thesis: 'Backs audacious ideas that transform industries - AI, sustainability, healthcare'
  },
  'dcvc': {
    full_name: 'DCVC',
    website: 'https://dcvc.com',
    description: 'DCVC invests in deep tech companies solving major problems in transformational ways.',
    fund_size: 3000000000,
    founded: 2011,
    location: 'Palo Alto, CA',
    notable_investments: ['Databricks', 'Planet Labs', 'Farmers Business Network', 'Zymergen'],
    notable_exits: ['Planet Labs IPO', 'Databricks growth'],
    thesis: 'Deep tech investor in AI, computational biology, materials, energy, space'
  },
  'lux': {
    full_name: 'Lux Capital',
    website: 'https://luxcapital.com',
    description: 'Lux Capital invests in emerging science and technology ventures at the outermost edges of what is possible.',
    fund_size: 5000000000,
    founded: 2000,
    location: 'New York, NY',
    notable_investments: ['Anduril', 'Flexport', 'Desktop Metal', 'Sarcos', 'Shapeways'],
    notable_exits: ['Desktop Metal IPO', 'Shapeways IPO'],
    thesis: 'Invests at the frontier of science - AI, defense, robotics, materials, space'
  },
  'usv': {
    full_name: 'Union Square Ventures',
    website: 'https://usv.com',
    description: 'Union Square Ventures is a thesis-driven venture capital firm based in New York City.',
    fund_size: 2000000000,
    founded: 2003,
    location: 'New York, NY',
    notable_investments: ['Twitter', 'Tumblr', 'Etsy', 'Coinbase', 'Cloudflare', 'MongoDB'],
    notable_exits: ['Twitter IPO', 'Tumblr acquired by Yahoo', 'Etsy IPO', 'Coinbase IPO'],
    thesis: 'Invests in networks, platforms, and protocols - particularly crypto and web3'
  },
  'paradigm': {
    full_name: 'Paradigm',
    website: 'https://paradigm.xyz',
    description: 'Paradigm is a crypto-focused investment firm committed to supporting the next generation of crypto companies.',
    fund_size: 10000000000,
    founded: 2018,
    location: 'San Francisco, CA',
    notable_investments: ['Uniswap', 'Coinbase', 'FTX', 'dYdX', 'OpenSea', 'Optimism'],
    notable_exits: ['Coinbase IPO'],
    thesis: 'Crypto-native investor backing the future of decentralized finance and web3'
  },
  'lowercarbon': {
    full_name: 'Lowercarbon Capital',
    website: 'https://lowercarboncapital.com',
    description: 'Lowercarbon Capital invests in technologies that reduce CO2 emissions and remove CO2 from the atmosphere.',
    fund_size: 2000000000,
    founded: 2020,
    location: 'San Francisco, CA',
    notable_investments: ['Electric Hydrogen', 'Charm Industrial', 'Watershed', 'Running Tide'],
    notable_exits: [],
    thesis: 'Climate tech investor focused on decarbonization across energy, transport, industry, and agriculture'
  },
  'yc': {
    full_name: 'Y Combinator',
    website: 'https://ycombinator.com',
    description: 'Y Combinator is a startup accelerator that has funded over 4,000 companies including Airbnb, Stripe, and Dropbox.',
    fund_size: 5000000000,
    founded: 2005,
    location: 'Mountain View, CA',
    notable_investments: ['Airbnb', 'Stripe', 'Dropbox', 'Coinbase', 'Instacart', 'DoorDash', 'Reddit'],
    notable_exits: ['Airbnb IPO', 'Stripe valuation', 'Dropbox IPO', 'Coinbase IPO', 'DoorDash IPO'],
    thesis: 'Make something people want - backs founders at the earliest stages'
  },
  'playground': {
    full_name: 'Playground Global',
    website: 'https://playground.global',
    description: 'Playground Global helps founders build transformative technology companies from day one.',
    fund_size: 1500000000,
    founded: 2015,
    location: 'Palo Alto, CA',
    notable_investments: ['Nuro', 'Planet Labs', 'Essential', 'Carbon Robotics'],
    notable_exits: ['Planet Labs IPO'],
    thesis: 'Deep tech investor focused on robotics, AI, and breakthrough hardware'
  }
};

// Generate photo URL 
function generatePhotoUrl(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=6366f1&color=fff&bold=true`;
}

// Generate LinkedIn URL
function generateLinkedInUrl(name) {
  const cleanName = name.replace(/\s*\([^)]+\)\s*$/, '').trim();
  const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  return `https://linkedin.com/in/${slug}`;
}

// Match investor to firm data
function matchFirm(investorName, firmName) {
  const text = ((investorName || '') + ' ' + (firmName || '')).toLowerCase();
  
  for (const [key, data] of Object.entries(VC_FIRM_DATA)) {
    if (text.includes(key) || text.includes(data.full_name.toLowerCase())) {
      return { key, data };
    }
  }
  return null;
}

async function enrichInvestors() {
  console.log('ENRICHING INVESTOR DATA\n');
  
  // Load all investors
  let all = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase.from('investors')
      .select('*')
      .not('sectors', 'eq', '{}')
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    offset += 1000;
    if (data.length < 1000) break;
  }
  
  console.log('Total investors:', all.length);
  
  let enriched = 0;
  let firmMatched = 0;
  
  for (const inv of all) {
    const updates = {};
    
    // Add photo if missing
    if (!inv.photo_url) {
      updates.photo_url = generatePhotoUrl(inv.name);
    }
    
    // Add LinkedIn if missing
    if (!inv.linkedin_url) {
      updates.linkedin_url = generateLinkedInUrl(inv.name);
    }
    
    // Try to match to a known firm
    const firmMatch = matchFirm(inv.name, inv.firm);
    if (firmMatch) {
      const fd = firmMatch.data;
      
      // Update firm name
      if (inv.firm === inv.name || !inv.firm) {
        updates.firm = fd.full_name;
      }
      
      // Add firm data
      if (!inv.active_fund_size) updates.active_fund_size = fd.fund_size;
      if (!inv.location) updates.location = fd.location;
      if (!inv.notable_investments || inv.notable_investments.length === 0) {
        updates.notable_investments = fd.notable_investments;
      }
      if (!inv.blog_url) updates.blog_url = fd.website;
      
      // Update bio with firm description
      if (!inv.bio || inv.bio.includes('Discovered from')) {
        updates.bio = `Partner at ${fd.full_name}. ${fd.description}`;
      }
      
      // Update investment thesis
      if (!inv.investment_thesis || inv.investment_thesis.includes('Invests in SaaS')) {
        updates.investment_thesis = fd.thesis;
      }
      
      firmMatched++;
    } else {
      // For non-matched firms, add defaults
      if (!inv.location) updates.location = 'San Francisco, CA';
    }
    
    // Update if we have changes
    if (Object.keys(updates).length > 0) {
      await supabase.from('investors').update(updates).eq('id', inv.id);
      enriched++;
      
      if (enriched <= 10) {
        console.log('Enriched:', inv.name);
        if (firmMatch) console.log('  Matched to:', firmMatch.data.full_name);
      }
      if (enriched % 200 === 0) {
        console.log('  Progress:', enriched, '/', all.length);
      }
    }
  }
  
  console.log('\nTotal enriched:', enriched);
  console.log('Firm matches:', firmMatched);
  
  // Verify
  console.log('\n--- Verification ---');
  const { data: sample } = await supabase.from('investors')
    .select('name, firm, location, photo_url, notable_investments, active_fund_size')
    .not('notable_investments', 'is', null)
    .limit(5);
  
  sample.forEach(inv => {
    console.log('\n' + inv.name);
    console.log('  Firm:', inv.firm);
    console.log('  Location:', inv.location);
    console.log('  Fund Size:', inv.active_fund_size ? '$' + (inv.active_fund_size / 1000000000).toFixed(1) + 'B' : 'N/A');
    console.log('  Notable:', (inv.notable_investments || []).slice(0, 4).join(', '));
  });
}

enrichInvestors();
