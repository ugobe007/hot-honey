/**
 * STARTUP SOURCES - Comprehensive list for scraper
 * Run with: node startup-sources.js
 * 
 * These sources provide fresh startup data for the matching engine.
 */

// ============================================
// ACCELERATOR & INCUBATOR PORTFOLIOS
// ============================================
const ACCELERATOR_SOURCES = [
  // Top Tier Accelerators
  { url: 'https://www.ycombinator.com/companies?batch=W25', name: 'Y Combinator W25', priority: 1 },
  { url: 'https://www.ycombinator.com/companies?batch=S24', name: 'Y Combinator S24', priority: 1 },
  { url: 'https://www.ycombinator.com/companies?batch=W24', name: 'Y Combinator W24', priority: 1 },
  { url: 'https://www.ycombinator.com/companies?batch=S23', name: 'Y Combinator S23', priority: 2 },
  { url: 'https://www.techstars.com/portfolio', name: 'Techstars', priority: 1 },
  { url: 'https://www.500.co/startups', name: '500 Global', priority: 1 },
  
  // Regional Accelerators
  { url: 'https://skydeck.berkeley.edu/portfolio/', name: 'Berkeley SkyDeck', priority: 2 },
  { url: 'https://www.plugandplaytechcenter.com/startups/', name: 'Plug and Play', priority: 2 },
  { url: 'https://www.alchemistaccelerator.com/portfolio', name: 'Alchemist Accelerator', priority: 2 },
  { url: 'https://www.startx.com/companies', name: 'StartX (Stanford)', priority: 2 },
  { url: 'https://www.dreamit.com/portfolio', name: 'Dreamit Ventures', priority: 2 },
  { url: 'https://www.gener8tor.com/companies', name: 'gener8tor', priority: 2 },
  { url: 'https://www.mucker.com/portfolio/', name: 'MuckerLab', priority: 2 },
  { url: 'https://www.luminate.co/portfolio', name: 'Luminate', priority: 3 },
  
  // Vertical-Specific Accelerators
  { url: 'https://www.rockhealth.com/companies/', name: 'Rock Health (Healthcare)', priority: 2 },
  { url: 'https://www.indiebio.co/startups', name: 'IndieBio (Biotech)', priority: 2 },
  { url: 'https://www.cleantechopen.org/portfolio', name: 'Cleantech Open', priority: 2 },
  { url: 'https://www.newlab.com/ventures', name: 'Newlab (DeepTech)', priority: 2 },
  { url: 'https://www.finvenlab.com/portfolio', name: 'FinVentures Lab (Fintech)', priority: 2 },
  
  // International Accelerators
  { url: 'https://www.antler.co/portfolio', name: 'Antler Global', priority: 2 },
  { url: 'https://www.seedcamp.com/portfolio/', name: 'Seedcamp (Europe)', priority: 2 },
  { url: 'https://www.entrepreneur-first.com/portfolio', name: 'Entrepreneur First', priority: 2 },
];

// ============================================
// PRODUCT DISCOVERY & LAUNCH PLATFORMS
// ============================================
const PRODUCT_PLATFORMS = [
  // Product Hunt Categories
  { url: 'https://www.producthunt.com/topics/artificial-intelligence', name: 'PH: AI', priority: 1 },
  { url: 'https://www.producthunt.com/topics/fintech', name: 'PH: Fintech', priority: 2 },
  { url: 'https://www.producthunt.com/topics/health', name: 'PH: Health', priority: 2 },
  { url: 'https://www.producthunt.com/topics/developer-tools', name: 'PH: DevTools', priority: 2 },
  { url: 'https://www.producthunt.com/topics/saas', name: 'PH: SaaS', priority: 2 },
  { url: 'https://www.producthunt.com/topics/marketing', name: 'PH: Marketing', priority: 3 },
  
  // BetaList
  { url: 'https://betalist.com/markets/artificial-intelligence', name: 'BetaList: AI', priority: 2 },
  { url: 'https://betalist.com/markets/fintech', name: 'BetaList: Fintech', priority: 2 },
  { url: 'https://betalist.com/markets/health', name: 'BetaList: Health', priority: 3 },
  
  // Other Launch Platforms
  { url: 'https://www.startupbase.io/', name: 'Startup Base', priority: 3 },
];

// ============================================
// FUNDING NEWS & DATABASES
// ============================================
const FUNDING_SOURCES = [
  // News RSS Feeds (already integrated)
  { url: 'https://news.crunchbase.com/sections/venture/', name: 'Crunchbase Venture', priority: 1 },
  { url: 'https://techcrunch.com/category/startups/', name: 'TechCrunch Startups', priority: 1 },
  { url: 'https://www.cbinsights.com/research-unicorn-companies', name: 'CB Insights Unicorns', priority: 2 },
  
  // Funding Databases
  { url: 'https://tracxn.com/explore/Seed-Funded-Startups-in-United-States', name: 'Tracxn Seed', priority: 2 },
];

// ============================================
// ANGEL LISTS & DIRECTORIES
// ============================================
const DIRECTORY_SOURCES = [
  { url: 'https://wellfound.com/discover/startups', name: 'Wellfound (AngelList)', priority: 1 },
  { url: 'https://angel.co/companies', name: 'Angel.co', priority: 2 },
  { url: 'https://www.f6s.com/companies', name: 'F6S', priority: 2 },
  { url: 'https://www.startupranking.com/top', name: 'Startup Ranking', priority: 3 },
];

// ============================================
// VC PORTFOLIO PAGES (New Startups)
// ============================================
const VC_PORTFOLIO_SOURCES = [
  // Top VCs - Recent Investments
  { url: 'https://www.sequoiacap.com/our-companies/', name: 'Sequoia Portfolio', priority: 1 },
  { url: 'https://a16z.com/portfolio/', name: 'a16z Portfolio', priority: 1 },
  { url: 'https://www.accel.com/companies', name: 'Accel Portfolio', priority: 1 },
  { url: 'https://www.greylock.com/portfolio/', name: 'Greylock Portfolio', priority: 1 },
  { url: 'https://www.benchmark.com/portfolio/', name: 'Benchmark Portfolio', priority: 1 },
  { url: 'https://www.indexventures.com/companies', name: 'Index Ventures Portfolio', priority: 1 },
  { url: 'https://lsvp.com/portfolio/', name: 'Lightspeed Portfolio', priority: 2 },
  { url: 'https://www.generalcatalyst.com/portfolio', name: 'General Catalyst Portfolio', priority: 2 },
  { url: 'https://www.firstround.com/companies/', name: 'First Round Portfolio', priority: 2 },
  { url: 'https://www.khoslaventures.com/portfolio/', name: 'Khosla Portfolio', priority: 2 },
  
  // Seed Stage VCs
  { url: 'https://www.precursorvc.com/portfolio', name: 'Precursor VC Portfolio', priority: 2 },
  { url: 'https://www.initialized.com/companies', name: 'Initialized Capital Portfolio', priority: 2 },
  { url: 'https://www.founderscoop.com/portfolio', name: 'Founder Collective Portfolio', priority: 2 },
];

// ============================================
// UNIVERSITY STARTUP PROGRAMS
// ============================================
const UNIVERSITY_SOURCES = [
  { url: 'https://startx.com/companies', name: 'Stanford StartX', priority: 2 },
  { url: 'https://skydeck.berkeley.edu/portfolio/', name: 'Berkeley SkyDeck', priority: 2 },
  { url: 'https://entrepreneurship.mit.edu/startups/', name: 'MIT Startups', priority: 2 },
  { url: 'https://www.cmu.edu/swartz-center-for-entrepreneurship/education-and-resources/', name: 'CMU Swartz Center', priority: 3 },
  { url: 'https://www.hbs.edu/newventure/Pages/default.aspx', name: 'Harvard NVC', priority: 3 },
];

// ============================================
// COMBINED SOURCE LIST
// ============================================
const ALL_SOURCES = [
  ...ACCELERATOR_SOURCES,
  ...PRODUCT_PLATFORMS,
  ...FUNDING_SOURCES,
  ...DIRECTORY_SOURCES,
  ...VC_PORTFOLIO_SOURCES,
  ...UNIVERSITY_SOURCES,
];

// Remove duplicates by URL
const UNIQUE_SOURCES = ALL_SOURCES.filter((source, index, self) => 
  index === self.findIndex(s => s.url === source.url)
);

// Sort by priority
const SORTED_SOURCES = UNIQUE_SOURCES.sort((a, b) => a.priority - b.priority);

// Export for use in scraper
module.exports = {
  ALL_SOURCES: SORTED_SOURCES,
  ACCELERATOR_SOURCES,
  PRODUCT_PLATFORMS,
  FUNDING_SOURCES,
  DIRECTORY_SOURCES,
  VC_PORTFOLIO_SOURCES,
  UNIVERSITY_SOURCES,
  
  // Quick access functions
  getPriority1Sources: () => SORTED_SOURCES.filter(s => s.priority === 1),
  getPriority2Sources: () => SORTED_SOURCES.filter(s => s.priority <= 2),
  getByCategory: (category) => {
    const categories = {
      accelerators: ACCELERATOR_SOURCES,
      products: PRODUCT_PLATFORMS,
      funding: FUNDING_SOURCES,
      directories: DIRECTORY_SOURCES,
      vc_portfolios: VC_PORTFOLIO_SOURCES,
      universities: UNIVERSITY_SOURCES,
    };
    return categories[category] || [];
  }
};

// If running directly, print sources
if (require.main === module) {
  console.log('\n🚀 STARTUP SOURCES FOR SCRAPER\n');
  console.log('=' .repeat(60));
  console.log(`\n📊 Total Sources: ${SORTED_SOURCES.length}`);
  console.log(`   Priority 1: ${SORTED_SOURCES.filter(s => s.priority === 1).length}`);
  console.log(`   Priority 2: ${SORTED_SOURCES.filter(s => s.priority === 2).length}`);
  console.log(`   Priority 3: ${SORTED_SOURCES.filter(s => s.priority === 3).length}`);
  
  console.log('\n\n📋 BY CATEGORY:\n');
  
  console.log('🎯 ACCELERATORS (' + ACCELERATOR_SOURCES.length + '):');
  ACCELERATOR_SOURCES.forEach(s => console.log(`   [P${s.priority}] ${s.name}`));
  
  console.log('\n🚀 PRODUCT PLATFORMS (' + PRODUCT_PLATFORMS.length + '):');
  PRODUCT_PLATFORMS.forEach(s => console.log(`   [P${s.priority}] ${s.name}`));
  
  console.log('\n💰 FUNDING SOURCES (' + FUNDING_SOURCES.length + '):');
  FUNDING_SOURCES.forEach(s => console.log(`   [P${s.priority}] ${s.name}`));
  
  console.log('\n📂 DIRECTORIES (' + DIRECTORY_SOURCES.length + '):');
  DIRECTORY_SOURCES.forEach(s => console.log(`   [P${s.priority}] ${s.name}`));
  
  console.log('\n🏦 VC PORTFOLIOS (' + VC_PORTFOLIO_SOURCES.length + '):');
  VC_PORTFOLIO_SOURCES.forEach(s => console.log(`   [P${s.priority}] ${s.name}`));
  
  console.log('\n🎓 UNIVERSITY PROGRAMS (' + UNIVERSITY_SOURCES.length + '):');
  UNIVERSITY_SOURCES.forEach(s => console.log(`   [P${s.priority}] ${s.name}`));
  
  console.log('\n\nTo scrape all sources, run:');
  console.log('  node scrape-startup-sources.js\n');
}
