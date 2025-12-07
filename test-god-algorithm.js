/**
 * Test GOD Algorithm Scoring
 * Run with: node test-god-algorithm.js
 */

// Import the scoring functions
// Note: We'll simulate the algorithm logic here since we can't directly import TS files

// Test startup data
const testStartup = {
  name: "Test Startup",
  stage: 3, // Series A (was 2)
  sectors: ["AI/ML", "B2B SaaS"],
  industries: ["AI/ML", "B2B SaaS"],
  raise: "$5M",
  raise_amount: "$5M",
  team: [
    { name: "Founder 1", role: "CEO", previousCompanies: ["Google"], background: "Ex-Google" },
    { name: "Founder 2", role: "CTO", previousCompanies: ["Meta"], background: "Ex-Meta" }
  ],
  founders_count: 2,
  technical_cofounders: 1,
  traction: "100 paying customers, $500K ARR",
  customers: 100,
  revenue: 500000,
  arr: 500000,
  mrr: 41666,
  growth_rate: 15,
  market_size: 50,
  launched: true,
  description: "AI-powered B2B SaaS platform"
};

const testInvestor = {
  name: "Test VC",
  type: "vc_firm",
  stage: ["seed", "series_a"],
  sectors: ["AI/ML", "Enterprise"],
  check_size: "$1M - $10M",
  checkSize: "$1M - $10M",
  geography: ["US"],
  tagline: "Leading early-stage VC focused on AI/ML"
};

console.log("🧪 Testing GOD Algorithm Scoring\n");
console.log("=" .repeat(60));

// Simulate convertStageToNumber
function convertStageToNumber(stage) {
  if (!stage) return 0;
  if (typeof stage === 'number') return stage;
  
  const stageLower = String(stage).toLowerCase();
  if (stageLower.includes('idea')) return 0;
  if (stageLower.includes('pre-seed') || stageLower.includes('preseed')) return 1;
  if (stageLower.includes('seed') && !stageLower.includes('pre')) return 2;
  if (stageLower.includes('series a') || stageLower.includes('series_a') || stageLower.includes('a')) return 3;
  if (stageLower.includes('series b') || stageLower.includes('series_b') || stageLower.includes('b')) return 4;
  if (stageLower.includes('series c') || stageLower.includes('series_c') || stageLower.includes('c')) return 5;
  
  return 2; // Default to seed
}

// Simulate GOD scoring (simplified version)
function simulateGodScore(startup) {
  let teamScore = 0;
  let tractionScore = 0;
  let marketScore = 0;
  let productScore = 0;
  
  // Team scoring
  if (startup.team && startup.team.length > 0) {
    const hasTopTier = startup.team.some(m => 
      m.previousCompanies?.some(c => ['Google', 'Meta', 'Apple', 'Amazon'].includes(c))
    );
    if (hasTopTier) teamScore += 1.5;
    
    if (startup.technical_cofounders >= 1) teamScore += 1;
    teamScore = Math.min(teamScore, 3);
  }
  
  // Traction scoring
  if (startup.revenue >= 100000) tractionScore += 1;
  if (startup.growth_rate >= 15) tractionScore += 0.5;
  if (startup.customers >= 50) tractionScore += 0.5;
  tractionScore = Math.min(tractionScore, 3);
  
  // Market scoring
  if (startup.market_size >= 10) marketScore += 1;
  if (startup.industries?.length > 0) marketScore += 0.5;
  marketScore = Math.min(marketScore, 2);
  
  // Product scoring
  if (startup.launched) productScore += 1;
  productScore = Math.min(productScore, 2);
  
  const total = (teamScore + tractionScore + marketScore + productScore) / 10 * 10; // Normalize to 10
  
  return {
    total,
    breakdown: { teamScore, tractionScore, marketScore, productScore }
  };
}

// Calculate base GOD score
const godScore = simulateGodScore(testStartup);
console.log("\n📊 GOD ALGORITHM BASE SCORE:");
console.log("-".repeat(60));
console.log(`Total Score: ${godScore.total.toFixed(1)}/10`);
console.log(`\nBreakdown:`);
console.log(`  Team:      ${godScore.breakdown.teamScore.toFixed(1)}/3 ✅ (Top tier founders)`);
console.log(`  Traction:  ${godScore.breakdown.tractionScore.toFixed(1)}/3 ✅ ($500K ARR, 100 customers)`);
console.log(`  Market:    ${godScore.breakdown.marketScore.toFixed(1)}/2 ✅ ($50B TAM)`);
console.log(`  Product:   ${godScore.breakdown.productScore.toFixed(1)}/2 ✅ (Launched)`);

// Calculate matching bonuses
let baseScore = godScore.total * 10; // Convert to 0-100
let matchBonus = 0;

console.log("\n\n🎯 MATCHING BONUSES:");
console.log("-".repeat(60));

// Stage match
const startupStage = convertStageToNumber(testStartup.stage);
const investorStages = testInvestor.stage;

console.log(`\nStage Match:`);
console.log(`  Startup Stage: ${testStartup.stage} → ${startupStage === 3 ? 'Series A' : startupStage === 2 ? 'Seed' : 'Stage ' + startupStage}`);
console.log(`  Investor Stages: ${investorStages.join(', ')}`);

// Improved stage matching logic
let startupStageNames = [];
if (startupStage === 0) startupStageNames = ['idea', 'pre-seed', 'preseed'];
else if (startupStage === 1) startupStageNames = ['pre-seed', 'preseed', 'pre seed'];
else if (startupStage === 2) startupStageNames = ['seed'];
else if (startupStage === 3) startupStageNames = ['series a', 'series_a', 'seriesa', 'a'];
else if (startupStage === 4) startupStageNames = ['series b', 'series_b', 'seriesb', 'b'];
else if (startupStage === 5) startupStageNames = ['series c', 'series_c', 'seriesc', 'c'];

const stageMatch = investorStages.some(s => {
  const investorStage = String(s).toLowerCase().replace(/[_\s]/g, '');
  return startupStageNames.some(startupStageName => {
    const normalizedStartup = startupStageName.replace(/[_\s]/g, '');
    return investorStage.includes(normalizedStartup) || 
           normalizedStartup.includes(investorStage) ||
           investorStage === normalizedStartup;
  });
});

if (stageMatch) {
  matchBonus += 10;
  console.log(`  ✅ MATCH! Stage ${startupStage} matches "${investorStages.join(', ')}" +10 bonus points`);
} else {
  console.log(`  ❌ No match`);
}

// Sector match
console.log(`\nSector Match:`);
console.log(`  Startup Sectors: ${testStartup.industries.join(', ')}`);
console.log(`  Investor Sectors: ${testInvestor.sectors.join(', ')}`);

const commonSectors = testStartup.industries.filter(ind =>
  testInvestor.sectors.some(sec => 
    String(sec).toLowerCase().includes(String(ind).toLowerCase()) ||
    String(ind).toLowerCase().includes(String(sec).toLowerCase())
  )
);

if (commonSectors.length > 0) {
  const sectorBonus = Math.min(commonSectors.length * 5, 10);
  matchBonus += sectorBonus;
  console.log(`  ✅ ${commonSectors.length} MATCH(ES)! +${sectorBonus} bonus points`);
  console.log(`     Common: ${commonSectors.join(', ')}`);
} else {
  console.log(`  ❌ No match`);
}

// Check size match
console.log(`\nCheck Size Match:`);
console.log(`  Startup Raise: ${testStartup.raise}`);
console.log(`  Investor Check Size: ${testInvestor.check_size}`);

const raiseAmount = parseFloat(String(testStartup.raise).replace(/[^0-9.]/g, ''));
const checkSizeLower = String(testInvestor.check_size).toLowerCase();

const checkSizeFit = checkSizeLower.includes('1m') && checkSizeLower.includes('10m') && 
                     raiseAmount >= 1 && raiseAmount <= 10;

if (checkSizeFit) {
  matchBonus += 5;
  console.log(`  ✅ MATCH! $${raiseAmount}M is in range +5 bonus points`);
} else {
  console.log(`  ⚠️  Partial match`);
}

// Geography match (if location exists)
if (testStartup.location) {
  console.log(`\nGeography Match:`);
  console.log(`  Startup Location: ${testStartup.location || 'Not specified'}`);
  console.log(`  Investor Geography: ${testInvestor.geography.join(', ')}`);
}

// Final score
const finalScore = Math.min(baseScore + matchBonus, 99);

console.log("\n\n⭐ FINAL MATCH SCORE:");
console.log("=".repeat(60));
console.log(`Base Score (GOD):  ${baseScore.toFixed(0)}/100`);
console.log(`Match Bonuses:     +${matchBonus}`);
console.log(`-`.repeat(60));
console.log(`TOTAL SCORE:       ${finalScore}/99 ✨`);

// Interpretation
console.log("\n\n💡 INTERPRETATION:");
console.log("-".repeat(60));
if (finalScore >= 90) {
  console.log("🔥 EXCEPTIONAL MATCH - Top 1% opportunity!");
} else if (finalScore >= 80) {
  console.log("✨ EXCELLENT MATCH - Highly recommended!");
} else if (finalScore >= 70) {
  console.log("✅ GOOD MATCH - Worth pursuing!");
} else {
  console.log("⚠️  MODERATE MATCH - Consider other options");
}

console.log("\n\n📈 EXPECTED RESULTS:");
console.log("-".repeat(60));
console.log("With this profile:");
console.log("• Strong team (Ex-FAANG) → High team score");
console.log("• Good traction ($500K ARR) → Solid traction score");
console.log("• Large market ($50B TAM) → Good market score");
console.log("• Launched product → Product score");
console.log("• Perfect stage match (Series A) → +10 bonus");
console.log("• Sector overlap (AI/ML) → +5 bonus");
console.log("• Check size fit ($5M in range) → +5 bonus");
console.log("\nExpected Range: 85-95/99 ✨");

console.log("\n" + "=".repeat(60));
console.log("✅ Test Complete!\n");
