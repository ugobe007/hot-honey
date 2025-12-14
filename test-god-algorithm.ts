/**
 * GOD Algorithm Test Suite
 * Run this in Node.js to validate the GOD algorithm
 */

import { calculateAdvancedMatchScore, generateAdvancedMatches } from './src/services/matchingService';
import { validateGODAlgorithm, generateTestReport, analyzeScoreDistribution } from './src/services/matchingHelpers';

console.log('\n' + '═'.repeat(70));
console.log('🧪 GOD ALGORITHM TEST SUITE');
console.log('═'.repeat(70) + '\n');

// Test Case 1.1: High-Quality Startup
console.log('\n📋 TEST 1.1: High-Quality Startup\n');

const highQualityStartup = {
  name: "AI Enterprise Solutions",
  stage: 2, // Series A
  industries: ["AI/ML", "B2B SaaS", "Enterprise"],
  sectors: ["AI/ML", "B2B SaaS"],
  raise_amount: "$8M",
  raise: "$8M",
  team: [
    { name: "CEO", background: "Ex-Google AI lead, 10 years experience" },
    { name: "CTO", background: "Ex-Meta ML engineer" },
    { name: "Scientist", background: "PhD in Machine Learning" }
  ],
  founders_count: 3,
  technical_cofounders: 2,
  traction: "$2M ARR, 50 enterprise customers, 150% YoY growth",
  revenue: 2000000,
  arr: 2000000,
  customers: 50,
  growth_rate: 15, // 15% MoM = 150% YoY
  market_size: 75, // $75B
  problem: "Enterprise decision-making is slow and lacks AI insights",
  solution: "AI-powered analytics platform with 99.9% uptime",
  product: "AI-powered analytics platform",
  launched: true,
  demo_available: true,
  defensibility: 'high',
  description: "Transforming enterprise decision-making with AI"
};

const testInvestor = {
  id: "test-investor-1",
  name: "Top Tier VC",
  type: "Venture Capital",
  stage: ["series_a", "series_b"],
  sectors: ["AI/ML", "Enterprise", "B2B SaaS"],
  check_size: "$5M-$15M",
  geography: "US",
  tagline: "Leading Series A investor in enterprise AI"
};

const score1 = calculateAdvancedMatchScore(highQualityStartup, testInvestor, true);
console.log(`\n✅ Test 1.1 Result: ${score1}/100`);
console.log(`   Expected: 78-88, Got: ${score1}`);
console.log(`   Status: ${score1 >= 78 && score1 <= 88 ? '✅ PASS' : '⚠️  Outside range'}`);

// Test Case 1.2: Early-Stage Startup
console.log('\n\n📋 TEST 1.2: Early-Stage Startup\n');

const earlyStageStartup = {
  name: "Consumer App Idea",
  stage: 0, // Pre-seed
  industries: ["Consumer", "Mobile"],
  sectors: ["Consumer"],
  raise_amount: "$500K",
  raise: "$500K",
  team: [
    { name: "Founder 1", background: "Bootcamp graduate" },
    { name: "Founder 2", background: "First-time founder" }
  ],
  founders_count: 2,
  technical_cofounders: 1,
  traction: "500 beta users, no revenue",
  revenue: 0,
  arr: 0,
  customers: 500,
  users: 500,
  growth_rate: 5,
  market_size: 10,
  problem: "Making life easier",
  solution: "Mobile app concept",
  launched: false,
  demo_available: false,
  description: "Consumer mobile app"
};

const score2 = calculateAdvancedMatchScore(earlyStageStartup, testInvestor, true);
console.log(`\n✅ Test 1.2 Result: ${score2}/100`);
console.log(`   Expected: 35-48, Got: ${score2}`);
console.log(`   Status: ${score2 >= 35 && score2 <= 48 ? '✅ PASS' : '⚠️  Outside range'}`);

// Test Case 1.3: Unicorn Candidate
console.log('\n\n📋 TEST 1.3: Unicorn Candidate\n');

const unicornCandidate = {
  name: "FinTech Disruptor",
  stage: 3, // Series B
  industries: ["FinTech", "AI/ML", "B2B"],
  sectors: ["FinTech", "AI/ML"],
  raise_amount: "$50M",
  raise: "$50M",
  team: [
    { name: "CEO", background: "Founded & exited 2 companies ($100M+)" },
    { name: "CTO", background: "Ex-Stripe engineer" },
    { name: "CFO", background: "Ex-Square, Ex-Plaid" }
  ],
  founders_count: 3,
  technical_cofounders: 2,
  traction: "$20M ARR, 500 customers, 200% growth, profitable unit economics",
  revenue: 20000000,
  arr: 20000000,
  customers: 500,
  growth_rate: 20, // 20% MoM = 200%+ YoY
  market_size: 500,
  problem: "Financial infrastructure is outdated",
  solution: "Next-gen payment infrastructure, 10x faster than competitors",
  product: "Payment infrastructure platform",
  launched: true,
  demo_available: true,
  unique_ip: true,
  defensibility: 'high',
  backed_by: ["Y Combinator", "Sequoia"],
  description: "Rebuilding financial infrastructure for the AI age"
};

const unicornInvestor = {
  id: "unicorn-investor",
  name: "Growth Equity Fund",
  type: "Growth Equity",
  stage: ["series_b", "series_c"],
  sectors: ["FinTech", "AI/ML", "Payments"],
  check_size: "$20M-$100M",
  geography: "Global",
  tagline: "Leading growth investor in fintech"
};

const score3 = calculateAdvancedMatchScore(unicornCandidate, unicornInvestor, true);
console.log(`\n✅ Test 1.3 Result: ${score3}/100`);
console.log(`   Expected: 90-98, Got: ${score3}`);
console.log(`   Status: ${score3 >= 90 && score3 <= 98 ? '✅ PASS' : '⚠️  Outside range'}`);

// Test Case 2: Matching Bonuses
console.log('\n\n' + '═'.repeat(70));
console.log('📋 TEST 2: Matching Bonus Validation');
console.log('═'.repeat(70) + '\n');

console.log('\n🧪 TEST 2.1: Perfect Match\n');

const perfectMatchStartup = {
  name: "Perfect Match Inc",
  stage: "series_a",
  industries: ["AI/ML", "B2B"],
  sectors: ["AI/ML", "B2B"],
  raise_amount: "$5M",
  raise: "$5M",
  team: [{ name: "CEO", background: "Strong" }],
  revenue: 1000000,
  market_size: 50,
  launched: true,
  geography: "US"
};

const perfectMatchInvestor = {
  id: "perfect-investor",
  name: "Perfect Fit VC",
  type: "VC",
  stage: ["seed", "series_a", "series_b"],
  sectors: ["AI/ML", "Enterprise"],
  check_size: "$1M-$15M",
  geography: "US"
};

const perfectScore = calculateAdvancedMatchScore(perfectMatchStartup, perfectMatchInvestor, true);
console.log(`\n✅ Perfect Match Score: ${perfectScore}/100`);
console.log(`   Expected bonuses: +20 (Stage +10, Sector +5-10, Check +5)`);

console.log('\n🧪 TEST 2.2: No Match\n');

const noMatchStartup = {
  name: "Wrong Fit Inc",
  stage: "series_c",
  industries: ["Healthcare", "B2B"],
  sectors: ["Healthcare"],
  raise_amount: "$80M",
  raise: "$80M",
  team: [{ name: "CEO" }],
  revenue: 10000000,
  market_size: 30,
  launched: true,
  geography: "Europe"
};

const noMatchInvestor = {
  id: "wrong-investor",
  name: "Seed Fund",
  type: "Seed",
  stage: ["seed", "pre_seed"],
  sectors: ["AI/ML", "FinTech"],
  check_size: "$500K-$2M",
  geography: "US"
};

const noMatchScore = calculateAdvancedMatchScore(noMatchStartup, noMatchInvestor, true);
console.log(`\n✅ No Match Score: ${noMatchScore}/100`);
console.log(`   Expected bonuses: +0 (no criteria match)`);

// Test Case 4: Edge Cases
console.log('\n\n' + '═'.repeat(70));
console.log('📋 TEST 4: Edge Cases & Error Handling');
console.log('═'.repeat(70) + '\n');

console.log('\n🧪 TEST 4.1: Missing Data\n');

const incompleteStartup = {
  name: "Mystery Startup"
  // Missing everything else
};

try {
  const score4 = calculateAdvancedMatchScore(incompleteStartup, testInvestor, true);
  console.log(`\n✅ Missing Data Result: ${score4}/100`);
  console.log(`   Status: ✅ PASS (no crash)`);
} catch (error) {
  console.log(`\n❌ Missing Data Result: CRASHED`);
  console.log(`   Error: ${error}`);
}

console.log('\n🧪 TEST 4.2: Null Values\n');

const nullStartup = {
  name: null,
  stage: undefined,
  industries: null,
  sectors: undefined,
  raise_amount: null
};

try {
  const score5 = calculateAdvancedMatchScore(nullStartup, testInvestor, true);
  console.log(`\n✅ Null Values Result: ${score5}/100`);
  console.log(`   Status: ✅ PASS (no crash)`);
} catch (error) {
  console.log(`\n❌ Null Values Result: CRASHED`);
  console.log(`   Error: ${error}`);
}

// Summary
console.log('\n\n' + '═'.repeat(70));
console.log('📊 TEST SUITE SUMMARY');
console.log('═'.repeat(70) + '\n');

const allScores = [score1, score2, score3, perfectScore, noMatchScore];
const stats = analyzeScoreDistribution(allScores);

console.log('Score Distribution:');
console.log(`   Min:     ${stats.min.toFixed(1)}`);
console.log(`   Max:     ${stats.max.toFixed(1)}`);
console.log(`   Average: ${stats.avg.toFixed(1)}`);
console.log(`   Std Dev: ${stats.std.toFixed(2)}`);

console.log('\n✅ Tests Completed!');
console.log('   Run this test suite after any changes to the GOD algorithm.');
console.log('   Expected: Scores should vary, no crashes, bonuses apply correctly.\n');

console.log('═'.repeat(70) + '\n');
