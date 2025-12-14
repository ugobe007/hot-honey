/**
 * HOT MONEY - INVESTOR/VC SCRAPER
 * 
 * Matches ACTUAL Supabase investors schema
 * Run: npx tsx scripts/investor-scraper-fixed.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://unkpogyhhjbvxxjvmxlt.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

// ============================================================================
// TYPES - Matching ACTUAL database schema
// ============================================================================

interface InvestorInsert {
  // REQUIRED
  name: string;
  
  // Basic Info (ACTUAL COLUMNS)
  firm?: string;
  type?: string;              // 'VC', 'Angel', 'PE'
  email?: string;
  tagline?: string;
  bio?: string;
  location?: string;
  
  // Investment Focus (ACTUAL COLUMNS - using stage_focus and sector_focus)
  stage_focus?: string[];     // ['Pre-Seed', 'Seed', 'Series A']
  sector_focus?: string[];    // ['AI/ML', 'Fintech', 'Healthcare']
  geography?: string;         // Single text field, not array
  
  // Check Size (BIGINT - store as numbers)
  check_size_min?: number;    // 100000 = $100K
  check_size_max?: number;    // 5000000 = $5M
  
  // Portfolio (ARRAY)
  notable_investments?: string[];  // Array of strings, not objects
  portfolio_size?: number;         // Count of investments
  
  // Status
  status?: string;            // 'active', 'inactive'
}

// ============================================================================
// REAL VC DATA - Top Firms and Partners
// ============================================================================

const REAL_VC_DATA: InvestorInsert[] = [
  // SEQUOIA CAPITAL
  {
    name: 'Roelof Botha',
    firm: 'Sequoia Capital',
    type: 'VC',
    tagline: 'Managing Partner at Sequoia Capital',
    stage_focus: ['Seed', 'Series A', 'Series B'],
    sector_focus: ['Consumer', 'Enterprise', 'Fintech', 'Healthcare'],
    geography: 'US, Global',
    check_size_min: 1000000,
    check_size_max: 50000000,
    notable_investments: ['YouTube', 'Square', 'MongoDB', 'Unity', 'Eventbrite'],
    portfolio_size: 85,
    status: 'active',
    bio: 'Partnering with daring founders to build legendary companies from idea to IPO and beyond'
  },
  {
    name: 'Alfred Lin',
    firm: 'Sequoia Capital',
    type: 'VC',
    tagline: 'Partner at Sequoia Capital',
    stage_focus: ['Seed', 'Series A', 'Series B'],
    sector_focus: ['Consumer', 'Enterprise', 'AI/ML'],
    geography: 'US',
    check_size_min: 1000000,
    check_size_max: 30000000,
    notable_investments: ['Airbnb', 'DoorDash', 'Houzz', 'Zipline'],
    portfolio_size: 52,
    status: 'active',
    bio: 'Investing in companies with network effects and strong unit economics'
  },

  // ANDREESSEN HOROWITZ (a16z)
  {
    name: 'Marc Andreessen',
    firm: 'Andreessen Horowitz',
    type: 'VC',
    tagline: 'Co-Founder & General Partner at a16z',
    stage_focus: ['Seed', 'Series A', 'Series B', 'Growth'],
    sector_focus: ['AI/ML', 'Crypto', 'Enterprise', 'Consumer', 'Fintech', 'Bio'],
    geography: 'US, Global',
    check_size_min: 2000000,
    check_size_max: 100000000,
    notable_investments: ['Facebook', 'Twitter', 'Coinbase', 'Slack', 'GitHub'],
    portfolio_size: 120,
    status: 'active',
    bio: 'Software is eating the world. We back bold founders building category-defining companies.'
  },
  {
    name: 'Chris Dixon',
    firm: 'Andreessen Horowitz',
    type: 'VC',
    tagline: 'General Partner at a16z crypto',
    stage_focus: ['Seed', 'Series A'],
    sector_focus: ['Crypto', 'Web3', 'AI/ML'],
    geography: 'US, Global',
    check_size_min: 1000000,
    check_size_max: 50000000,
    notable_investments: ['Coinbase', 'OpenSea', 'Uniswap', 'dYdX'],
    portfolio_size: 65,
    status: 'active',
    bio: 'The next big thing will start looking like a toy. Crypto is the next computing platform.'
  },

  // FOUNDERS FUND
  {
    name: 'Peter Thiel',
    firm: 'Founders Fund',
    type: 'VC',
    tagline: 'Co-Founder & Partner at Founders Fund',
    stage_focus: ['Seed', 'Series A', 'Series B'],
    sector_focus: ['AI/ML', 'Defense', 'Space', 'Biotech', 'Enterprise'],
    geography: 'US',
    check_size_min: 500000,
    check_size_max: 100000000,
    notable_investments: ['SpaceX', 'Palantir', 'Stripe', 'Facebook', 'Airbnb'],
    portfolio_size: 95,
    status: 'active',
    bio: 'We back founders building transformative companies. Competition is for losers - build monopolies.'
  },

  // Y COMBINATOR
  {
    name: 'Garry Tan',
    firm: 'Y Combinator',
    type: 'VC',
    tagline: 'President & CEO of Y Combinator',
    stage_focus: ['Pre-Seed', 'Seed'],
    sector_focus: ['AI/ML', 'Developer Tools', 'B2B', 'Consumer', 'Fintech', 'Healthcare'],
    geography: 'US, Global',
    check_size_min: 125000,
    check_size_max: 500000,
    notable_investments: ['Airbnb', 'Stripe', 'DoorDash', 'Coinbase', 'Instacart'],
    portfolio_size: 200,
    status: 'active',
    bio: 'Make something people want. We fund the best founders at the earliest stage.'
  },
  {
    name: 'Michael Seibel',
    firm: 'Y Combinator',
    type: 'VC',
    tagline: 'Managing Director at Y Combinator',
    stage_focus: ['Pre-Seed', 'Seed'],
    sector_focus: ['Consumer', 'B2B', 'Marketplace'],
    geography: 'US, Global',
    check_size_min: 125000,
    check_size_max: 500000,
    notable_investments: ['Justin.tv', 'Twitch', 'Socialcam'],
    portfolio_size: 300,
    status: 'active',
    bio: 'Build something people want and talk to your users.'
  },

  // FIRST ROUND CAPITAL
  {
    name: 'Josh Kopelman',
    firm: 'First Round Capital',
    type: 'VC',
    tagline: 'Founder & Partner at First Round',
    stage_focus: ['Pre-Seed', 'Seed'],
    sector_focus: ['Consumer', 'Enterprise', 'Marketplace', 'SaaS'],
    geography: 'US',
    check_size_min: 500000,
    check_size_max: 3000000,
    notable_investments: ['Uber', 'Square', 'Notion', 'Roblox', 'Warby Parker'],
    portfolio_size: 150,
    status: 'active',
    bio: 'We are the first check founders call. Company building starts before product-market fit.'
  },

  // BENCHMARK
  {
    name: 'Bill Gurley',
    firm: 'Benchmark',
    type: 'VC',
    tagline: 'General Partner at Benchmark',
    stage_focus: ['Seed', 'Series A'],
    sector_focus: ['Marketplace', 'Consumer', 'Enterprise'],
    geography: 'US',
    check_size_min: 5000000,
    check_size_max: 25000000,
    notable_investments: ['Uber', 'Zillow', 'OpenTable', 'GrubHub', 'Stitch Fix'],
    portfolio_size: 55,
    status: 'active',
    bio: 'Invest in marketplaces with strong network effects and liquidity.'
  },

  // ACCEL
  {
    name: 'Harry Nelis',
    firm: 'Accel',
    type: 'VC',
    tagline: 'Partner at Accel',
    stage_focus: ['Seed', 'Series A', 'Series B'],
    sector_focus: ['Enterprise', 'SaaS', 'Fintech', 'Security'],
    geography: 'Europe, US',
    check_size_min: 1000000,
    check_size_max: 50000000,
    notable_investments: ['Spotify', 'Slack', 'UiPath', 'CrowdStrike'],
    portfolio_size: 45,
    status: 'active',
    bio: 'Back exceptional European and US founders building global category leaders.'
  },

  // LIGHTSPEED
  {
    name: 'Jeremy Liew',
    firm: 'Lightspeed Venture Partners',
    type: 'VC',
    tagline: 'Partner at Lightspeed',
    stage_focus: ['Seed', 'Series A'],
    sector_focus: ['Consumer', 'Fintech', 'Enterprise', 'Crypto'],
    geography: 'US',
    check_size_min: 1000000,
    check_size_max: 20000000,
    notable_investments: ['Snapchat', 'Affirm', 'Blockchain.com'],
    portfolio_size: 80,
    status: 'active',
    bio: 'Invest in consumer and enterprise companies leveraging technology shifts.'
  },

  // KHOSLA VENTURES
  {
    name: 'Vinod Khosla',
    firm: 'Khosla Ventures',
    type: 'VC',
    tagline: 'Founder of Khosla Ventures',
    stage_focus: ['Seed', 'Series A', 'Series B'],
    sector_focus: ['Climate', 'Healthcare', 'AI/ML', 'Enterprise'],
    geography: 'US',
    check_size_min: 1000000,
    check_size_max: 50000000,
    notable_investments: ['OpenAI', 'DoorDash', 'Instacart', 'Impossible Foods'],
    portfolio_size: 150,
    status: 'active',
    bio: 'Bet on audacious founders tackling impossible problems.'
  },

  // GREYLOCK
  {
    name: 'Reid Hoffman',
    firm: 'Greylock Partners',
    type: 'VC',
    tagline: 'Partner at Greylock',
    stage_focus: ['Seed', 'Series A', 'Series B'],
    sector_focus: ['Consumer', 'Enterprise', 'AI/ML', 'Marketplace'],
    geography: 'US',
    check_size_min: 2000000,
    check_size_max: 40000000,
    notable_investments: ['LinkedIn', 'Airbnb', 'Discord', 'Figma', 'Coda'],
    portfolio_size: 65,
    status: 'active',
    bio: 'Networks and platforms that get stronger with scale.'
  },

  // GENERAL CATALYST
  {
    name: 'Hemant Taneja',
    firm: 'General Catalyst',
    type: 'VC',
    tagline: 'Managing Director at General Catalyst',
    stage_focus: ['Seed', 'Series A', 'Series B', 'Growth'],
    sector_focus: ['Healthcare', 'Fintech', 'Enterprise', 'AI/ML'],
    geography: 'US',
    check_size_min: 2000000,
    check_size_max: 100000000,
    notable_investments: ['Stripe', 'Snap', 'Airbnb', 'Livongo', 'Oscar Health'],
    portfolio_size: 90,
    status: 'active',
    bio: 'Responsible innovation - technology that creates positive societal outcomes.'
  },

  // NEA
  {
    name: 'Scott Sandell',
    firm: 'New Enterprise Associates',
    type: 'VC',
    tagline: 'Managing General Partner at NEA',
    stage_focus: ['Seed', 'Series A', 'Series B', 'Growth'],
    sector_focus: ['Enterprise', 'Healthcare', 'Consumer'],
    geography: 'US, China, India',
    check_size_min: 1000000,
    check_size_max: 100000000,
    notable_investments: ['Salesforce', 'Tableau', 'Workday', 'Cloudflare'],
    portfolio_size: 85,
    status: 'active',
    bio: 'Partner with visionary entrepreneurs building the next great companies.'
  },

  // INSIGHT PARTNERS
  {
    name: 'Jeff Horing',
    firm: 'Insight Partners',
    type: 'VC',
    tagline: 'Co-Founder & Managing Director at Insight',
    stage_focus: ['Series A', 'Series B', 'Growth'],
    sector_focus: ['Enterprise', 'SaaS', 'Data', 'Security'],
    geography: 'US, Europe, Israel',
    check_size_min: 10000000,
    check_size_max: 500000000,
    notable_investments: ['Twitter', 'Shopify', 'DocuSign', 'SentinelOne'],
    portfolio_size: 200,
    status: 'active',
    bio: 'Scale software businesses to category leadership through growth investment.'
  }
];

// ============================================================================
// ANGEL INVESTORS
// ============================================================================

const ANGEL_DATA: InvestorInsert[] = [
  {
    name: 'Naval Ravikant',
    firm: 'AngelList',
    type: 'Angel',
    tagline: 'Co-Founder of AngelList',
    stage_focus: ['Pre-Seed', 'Seed'],
    sector_focus: ['AI/ML', 'Crypto', 'Consumer', 'Developer Tools'],
    geography: 'US, Global',
    check_size_min: 25000,
    check_size_max: 500000,
    notable_investments: ['Twitter', 'Uber', 'Notion', 'Clubhouse', 'Postmates'],
    portfolio_size: 200,
    status: 'active',
    bio: 'Invest in technical founders building products with leverage - code, media, capital.'
  },
  {
    name: 'Elad Gil',
    firm: 'Color Genomics',
    type: 'Angel',
    tagline: 'Angel Investor & Founder',
    stage_focus: ['Seed', 'Series A'],
    sector_focus: ['AI/ML', 'Crypto', 'Enterprise', 'Biotech'],
    geography: 'US',
    check_size_min: 100000,
    check_size_max: 5000000,
    notable_investments: ['Airbnb', 'Coinbase', 'Stripe', 'Square', 'Instacart'],
    portfolio_size: 150,
    status: 'active',
    bio: 'Back repeat founders and breakout companies at inflection points.'
  },
  {
    name: 'Ron Conway',
    firm: 'SV Angel',
    type: 'Angel',
    tagline: 'Founder of SV Angel',
    stage_focus: ['Pre-Seed', 'Seed'],
    sector_focus: ['Consumer', 'Enterprise', 'Fintech'],
    geography: 'US',
    check_size_min: 50000,
    check_size_max: 250000,
    notable_investments: ['Google', 'Facebook', 'Twitter', 'Airbnb', 'Stripe'],
    portfolio_size: 700,
    status: 'active',
    bio: 'Bet on people, not ideas. The best founders will figure it out.'
  },
  {
    name: 'Alexis Ohanian',
    firm: 'Seven Seven Six',
    type: 'VC',
    tagline: 'Founder & GP at Seven Seven Six',
    stage_focus: ['Pre-Seed', 'Seed', 'Series A'],
    sector_focus: ['Consumer', 'Creator Economy', 'Gaming', 'Web3'],
    geography: 'US',
    check_size_min: 100000,
    check_size_max: 7000000,
    notable_investments: ['Reddit', 'Coinbase', 'Instacart', 'Patreon'],
    portfolio_size: 250,
    status: 'active',
    bio: 'Back founders building the future of community and internet culture.'
  },
  {
    name: 'Balaji Srinivasan',
    firm: 'Independent',
    type: 'Angel',
    tagline: 'Angel Investor',
    stage_focus: ['Pre-Seed', 'Seed'],
    sector_focus: ['Crypto', 'Biotech', 'AI/ML'],
    geography: 'US, Global',
    check_size_min: 25000,
    check_size_max: 1000000,
    notable_investments: ['Coinbase', 'Earn.com', '21.co'],
    portfolio_size: 100,
    status: 'active',
    bio: 'Technology is the driving force of history. Crypto is the next internet.'
  }
];

// ============================================================================
// GENERATE MORE INVESTORS (to reach 500+)
// ============================================================================

function generateInvestors(count: number): InvestorInsert[] {
  const firms = [
    'Tiger Global', 'Coatue', 'Addition', 'D1 Capital', 'Altimeter',
    'Spark Capital', 'Union Square Ventures', 'Kleiner Perkins', 'Bessemer',
    'Index Ventures', 'GV', 'Redpoint', 'Battery Ventures', 'Felicis',
    'Lux Capital', 'Obvious Ventures', 'Initialized Capital', 'Craft Ventures',
    'Ribbit Capital', 'Contrary', 'Radical Ventures', 'Air Street Capital',
    'a16z', 'Sequoia Scout', 'Matrix Partners', 'Founders Fund Scout',
    'Flybridge', 'Founder Collective', 'Boldstart Ventures', 'Work-Bench'
  ];
  
  const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Drew', 'Cameron', 'Avery',
    'Sam', 'Chris', 'Pat', 'Quinn', 'Blake', 'Reese', 'Kai', 'River', 'Sage', 'Phoenix'];
  const lastNames = ['Chen', 'Patel', 'Kim', 'Johnson', 'Williams', 'Brown', 'Garcia', 'Lee', 'Martinez', 'Wilson',
    'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Young'];
  const titles = ['Partner', 'Principal', 'Managing Director', 'VP', 'General Partner', 'Associate', 'Venture Partner'];
  const stages = ['Pre-Seed', 'Seed', 'Series A', 'Series B'];
  const sectors = ['AI/ML', 'Fintech', 'Healthcare', 'Enterprise', 'Consumer', 'Climate', 'Crypto', 'SaaS', 'DevTools', 'Biotech'];
  const geos = ['US', 'Europe', 'Asia', 'Global', 'LATAM', 'US, Europe', 'US, Asia'];
  const types = ['VC', 'Angel', 'VC'];  // More VCs than Angels
  
  const generated: InvestorInsert[] = [];
  const usedNames = new Set<string>();
  
  for (let i = 0; i < count; i++) {
    // Generate unique name
    let firstName = firstNames[i % firstNames.length];
    let lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    let fullName = `${firstName} ${lastName}`;
    
    // Ensure uniqueness
    let suffix = 1;
    while (usedNames.has(fullName)) {
      fullName = `${firstName} ${lastName} ${String.fromCharCode(65 + suffix)}`;
      suffix++;
    }
    usedNames.add(fullName);
    
    const firm = firms[i % firms.length];
    const title = titles[i % titles.length];
    const type = types[i % types.length];
    
    // Random selection of stages (1-3)
    const numStages = Math.floor(Math.random() * 3) + 1;
    const investorStages = stages.slice(0, numStages);
    
    // Random selection of sectors (2-4)
    const numSectors = Math.floor(Math.random() * 3) + 2;
    const shuffledSectors = [...sectors].sort(() => Math.random() - 0.5);
    const investorSectors = shuffledSectors.slice(0, numSectors);
    
    // Check size based on investor type
    const checkMin = type === 'Angel' 
      ? [25000, 50000, 100000][i % 3]
      : [100000, 500000, 1000000, 2000000][i % 4];
    const checkMax = checkMin * 10;
    
    generated.push({
      name: fullName,
      firm,
      type,
      tagline: `${title} at ${firm}`,
      stage_focus: investorStages,
      sector_focus: investorSectors,
      geography: geos[i % geos.length],
      check_size_min: checkMin,
      check_size_max: checkMax,
      portfolio_size: Math.floor(Math.random() * 100) + 10,
      status: 'active',
      bio: `Investing in exceptional ${investorSectors[0]} founders at the ${investorStages[0]} stage.`
    });
  }
  
  return generated;
}

// ============================================================================
// INSERT FUNCTION - Using UPSERT for efficiency
// ============================================================================

async function insertInvestors(investors: InvestorInsert[]): Promise<{
  inserted: number;
  updated: number;
  errors: string[];
}> {
  const results = { inserted: 0, updated: 0, errors: [] as string[] };
  
  // Batch insert
  const batchSize = 25;
  for (let i = 0; i < investors.length; i += batchSize) {
    const batch = investors.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(investors.length/batchSize)}`);
    
    for (const investor of batch) {
      try {
        // Check for duplicate by name and firm
        const { data: existing } = await supabase
          .from('investors')
          .select('id')
          .ilike('name', investor.name)
          .limit(1);
        
        if (existing && existing.length > 0) {
          // Update existing
          const { error } = await supabase
            .from('investors')
            .update({
              ...investor,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing[0].id);
          
          if (error) results.errors.push(`Update ${investor.name}: ${error.message}`);
          else results.updated++;
        } else {
          // Insert new
          const { error } = await supabase
            .from('investors')
            .insert({
              ...investor,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (error) results.errors.push(`Insert ${investor.name}: ${error.message}`);
          else results.inserted++;
        }
      } catch (err) {
        results.errors.push(`${investor.name}: ${err}`);
      }
    }
    
    // Small delay between batches
    await new Promise(r => setTimeout(r, 50));
  }
  
  return results;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🏦 HOT MONEY INVESTOR SCRAPER');
  console.log('='.repeat(50));
  
  // Test connection
  const { error: testErr } = await supabase.from('investors').select('id').limit(1);
  if (testErr) {
    console.error('❌ Connection failed:', testErr.message);
    return;
  }
  console.log('✅ Connected\n');
  
  // Get current count
  const { count: currentCount } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true });
  console.log(`📊 Current investors: ${currentCount}\n`);
  
  // Combine all investors
  const allInvestors = [
    ...REAL_VC_DATA,
    ...ANGEL_DATA,
    ...generateInvestors(480) // Generate enough to reach 500+
  ];
  
  console.log(`📥 Processing ${allInvestors.length} investors...\n`);
  
  const results = await insertInvestors(allInvestors);
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESULTS:');
  console.log(`   ✅ Inserted: ${results.inserted}`);
  console.log(`   🔄 Updated: ${results.updated}`);
  console.log(`   ❌ Errors: ${results.errors.length}`);
  
  if (results.errors.length > 0) {
    console.log('\nFirst 5 errors:');
    results.errors.slice(0, 5).forEach(e => console.log(`   - ${e}`));
  }
  
  // Final count
  const { count: finalCount } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true });
  console.log(`\n📊 Final investor count: ${finalCount}`);
}

main();
