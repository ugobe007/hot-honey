/**
 * Quick GOD Algorithm Demo
 * Shows how the algorithm scores a sample startup
 */

import { calculateAdvancedMatchScore } from './src/services/matchingService';

console.log('\n🧠 GOD ALGORITHM DEMO');
console.log('═'.repeat(70) + '\n');

// Sample high-quality startup
const sampleStartup = {
  id: "demo-1",
  name: "AI Analytics Pro",
  description: "Enterprise AI analytics platform",
  tagline: "Transform business data with AI",
  stage: 2, // Series A
  industries: ["AI/ML", "B2B SaaS", "Enterprise"],
  sectors: ["AI/ML", "B2B SaaS"],
  raise_amount: "$5M",
  raise: "$5M",
  team: [
    { name: "CEO", background: "Ex-Google, 10 years AI experience" },
    { name: "CTO", background: "Ex-Meta ML engineer" }
  ],
  founders_count: 2,
  technical_cofounders: 2,
  traction: "$1M ARR, 30 enterprise customers, 100% YoY growth",
  revenue: 1000000,
  arr: 1000000,
  customers: 30,
  growth_rate: 10, // 10% MoM
  market_size: 50,
  problem: "Enterprises can't leverage AI insights",
  solution: "Plug-and-play AI analytics dashboard",
  product: "SaaS platform with ML models",
  launched: true,
  demo_available: true,
  defensibility: 'high'
};

// Sample VC investor
const sampleInvestor = {
  id: "demo-vc",
  name: "Top Tier Ventures",
  type: "Venture Capital",
  stage: ["seed", "series_a", "series_b"],
  sectors: ["AI/ML", "Enterprise", "B2B SaaS"],
  check_size: "$3M-$10M",
  geography: "US",
  tagline: "Leading Series A investor in enterprise AI"
};

console.log('📊 STARTUP: ' + sampleStartup.name);
console.log('   Stage: Series A | Raise: $5M');
console.log('   Traction: $1M ARR, 30 customers');
console.log('   Team: 2 technical co-founders with top-tier backgrounds');
console.log('');
console.log('💼 INVESTOR: ' + sampleInvestor.name);
console.log('   Focus: ' + sampleInvestor.sectors.join(', '));
console.log('   Stage: ' + sampleInvestor.stage.join(', '));
console.log('   Check Size: ' + sampleInvestor.check_size);
console.log('\n' + '─'.repeat(70) + '\n');

// Calculate match score with verbose output
const score = calculateAdvancedMatchScore(sampleStartup, sampleInvestor, true);

console.log('\n' + '═'.repeat(70));
console.log(`\n🎯 FINAL MATCH SCORE: ${score}/100\n`);
console.log('═'.repeat(70) + '\n');

// Interpret the score
if (score >= 90) {
  console.log('🌟 EXCEPTIONAL MATCH - Unicorn potential');
} else if (score >= 80) {
  console.log('🔥 STRONG MATCH - High-quality opportunity');
} else if (score >= 70) {
  console.log('✅ GOOD MATCH - Solid investment candidate');
} else if (score >= 60) {
  console.log('📊 MODERATE MATCH - Needs further evaluation');
} else {
  console.log('⚠️  WEAK MATCH - Significant gaps exist');
}

console.log('\n💡 The GOD algorithm evaluates:');
console.log('   • Team (30 points): Founder experience, technical depth');
console.log('   • Traction (30 points): Revenue, growth, customers');
console.log('   • Market (20 points): Market size, competition');
console.log('   • Product (20 points): Innovation, defensibility');
console.log('   • Vision, Ecosystem, Grit, Problem Validation (bonus points)');
console.log('   • Stage, Sector, Check Size matching (bonus points)');
console.log('\n✨ This ensures only high-quality matches!\n');
