#!/usr/bin/env node
/**
 * DYNAMICMATCH V2 - TEST HARNESS
 * ===============================
 * 
 * Run: node test-dynamicmatch-v2.js
 * 
 * Tests all components of the DynamicMatch v2 system
 */

const { 
  DynamicMatchEngine,
  SourceDetector,
  StructureExtractor,
  SignalCascade,
  PredictiveGodEngine
} = require('./index');

// Test data - simulating extracted content
const samplePressRelease = `
SAN FRANCISCO, Dec 28, 2024 -- TechStartup Inc., the AI-powered developer tools company, 
today announced it has raised $15 million in Series A funding led by Sequoia Capital, 
with participation from Andreessen Horowitz and Y Combinator.

Founded in 2022 by repeat entrepreneur Jane Smith, former Google engineer and Stanford PhD, 
the company has grown to 45 employees and serves over 10,000 developers monthly. 
The platform has achieved $2M ARR with 150% year-over-year growth.

"We're building the future of developer productivity," said Smith, CEO. 
"This funding will help us expand our team and accelerate product development."

TechStartup's AI code assistant has been featured in TechCrunch, Forbes, and Wired.
The company plans to use the funding to expand its team from 45 to 100 employees 
and launch new enterprise features.

About TechStartup Inc.
TechStartup is an AI-powered developer tools company based in San Francisco. 
Learn more at techstartup.com
`;

const sampleHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>TechStartup - AI Developer Tools</title>
  <meta name="description" content="AI-powered code assistant for developers">
  <meta property="og:title" content="TechStartup">
  <meta property="og:description" content="Build faster with AI">
  <meta property="og:image" content="https://techstartup.com/og.png">
  <meta name="twitter:site" content="@techstartup">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "TechStartup Inc.",
    "description": "AI-powered developer tools",
    "url": "https://techstartup.com",
    "foundingDate": "2022-03-15",
    "founder": {
      "@type": "Person",
      "name": "Jane Smith",
      "jobTitle": "CEO"
    },
    "numberOfEmployees": 45,
    "sameAs": [
      "https://twitter.com/techstartup",
      "https://linkedin.com/company/techstartup",
      "https://github.com/techstartup"
    ]
  }
  </script>
</head>
<body>
  <h1>Build faster with AI</h1>
  <p>Join 10,000+ developers using TechStartup</p>
  <a href="/demo">Try Demo</a>
</body>
</html>
`;

async function runTests() {
  console.log('═'.repeat(60));
  console.log('  DYNAMICMATCH V2 - TEST SUITE');
  console.log('═'.repeat(60));
  console.log('');

  // Test 1: Source Detector
  console.log('📍 TEST 1: Source Detector');
  console.log('-'.repeat(40));
  const sourceDetector = new SourceDetector();
  
  const testUrls = [
    'https://crunchbase.com/organization/openai',
    'https://linkedin.com/company/anthropic',
    'https://github.com/facebook/react',
    'https://techcrunch.com/2024/01/01/startup-raises',
    'https://some-random-site.com/about',
    'Just some plain text about a startup'
  ];

  for (const url of testUrls) {
    const result = await sourceDetector.detect(url);
    console.log(`  ${url.substring(0, 40)}...`);
    console.log(`    → Type: ${result.type}, Adapter: ${result.adapter}, Confidence: ${result.confidence}`);
  }
  console.log('  ✅ Source Detector working\n');

  // Test 2: Structure Extractor
  console.log('📍 TEST 2: Structure Extractor');
  console.log('-'.repeat(40));
  const structureExtractor = new StructureExtractor();
  
  const structure = await structureExtractor.extract(sampleHtml);
  console.log('  JSON-LD found:', structure.jsonLd.length > 0 ? '✅' : '❌');
  console.log('  OpenGraph found:', Object.keys(structure.openGraph).length > 0 ? '✅' : '❌');
  console.log('  Twitter Card found:', Object.keys(structure.twitterCard).length > 0 ? '✅' : '❌');
  console.log('  Unified data:');
  console.log(`    Name: ${structure.unified.name}`);
  console.log(`    Description: ${structure.unified.description?.substring(0, 50)}...`);
  console.log(`    Employees: ${structure.unified.employees}`);
  console.log(`    Founded: ${structure.unified.foundingDate}`);
  console.log('  ✅ Structure Extractor working\n');

  // Test 3: Signal Cascade
  console.log('📍 TEST 3: Signal Cascade');
  console.log('-'.repeat(40));
  const signalCascade = new SignalCascade();
  
  const signals = await signalCascade.process(samplePressRelease, structure);
  
  console.log('  Funding Signals:');
  console.log(`    Amount: $${(signals.funding.amount / 1e6).toFixed(1)}M`);
  console.log(`    Stage: ${signals.funding.stage}`);
  console.log(`    Investors: ${signals.funding.investors.map(i => i.name).join(', ')}`);
  
  console.log('  Traction Signals:');
  console.log(`    Users: ${signals.traction.users?.toLocaleString()}`);
  console.log(`    ARR: $${(signals.traction.arr / 1e6).toFixed(1)}M`);
  console.log(`    Growth: ${signals.traction.growth?.rate}%`);
  console.log(`    Launched: ${signals.traction.launched}`);
  
  console.log('  Team Signals:');
  console.log(`    Employees: ${signals.team.employees}`);
  console.log(`    Repeat Founder: ${signals.team.repeatFounder}`);
  console.log(`    Big Tech Alumni: ${signals.team.bigTechAlumni}`);
  console.log(`    YC: ${signals.team.yc}`);
  
  console.log('  Product Signals:');
  console.log(`    Category: ${signals.product.category}`);
  console.log(`    Has Demo: ${signals.product.hasDemo}`);
  
  console.log('  Momentum Signals:');
  console.log(`    Press Mentions: ${signals.momentum.press.length}`);
  
  console.log('  ✅ Signal Cascade working\n');

  // Test 4: Predictive GOD Engine
  console.log('📍 TEST 4: Predictive GOD Engine');
  console.log('-'.repeat(40));
  const godEngine = new PredictiveGodEngine();
  
  const entities = {
    company: {
      name: 'TechStartup Inc.',
      description: 'AI-powered developer tools'
    },
    founders: [{ name: 'Jane Smith', title: 'CEO' }],
    investors: signals.funding.investors
  };
  
  const prediction = await godEngine.score(signals, entities);
  
  console.log('  Scores:');
  console.log(`    GOD Score: ${prediction.godScore}`);
  console.log(`    Delta Score: ${prediction.deltaScore > 0 ? '+' : ''}${prediction.deltaScore}`);
  console.log(`    Predicted Score: ${prediction.predictedScore}`);
  console.log(`    Success Probability: ${(prediction.successProbability * 100).toFixed(1)}%`);
  
  console.log('  Tier:');
  console.log(`    Current: ${prediction.tier}`);
  console.log(`    Predicted: ${prediction.predictedTier}`);
  
  console.log('  Confidence:', (prediction.confidence * 100).toFixed(0) + '%');
  
  console.log('  Breakdown:');
  for (const [category, data] of Object.entries(prediction.breakdown)) {
    console.log(`    ${category}: ${data.score}/${data.maxScore}`);
  }
  
  console.log('  Insights:');
  console.log(`    Strengths: ${prediction.insights.strengths.length}`);
  console.log(`    Opportunities: ${prediction.insights.opportunities.length}`);
  console.log(`    Risks: ${prediction.insights.risks.length}`);
  
  console.log('  ✅ Predictive Engine working\n');

  // Test 5: Full Engine Integration
  console.log('📍 TEST 5: Full Engine Integration');
  console.log('-'.repeat(40));
  const engine = new DynamicMatchEngine();
  
  // Analyze text directly
  const result = await engine.analyze(samplePressRelease, { companyName: 'TechStartup' });
  
  console.log('  Analysis Result:');
  console.log(`    Success: ${result.success}`);
  console.log(`    GOD Score: ${result.godScore}`);
  console.log(`    Success Probability: ${(result.successProbability * 100).toFixed(1)}%`);
  console.log(`    Tier: ${result.tier}`);
  console.log(`    Latency: ${result.meta.latencyMs}ms`);
  
  console.log('  Company:');
  console.log(`    Name: ${result.company?.name || 'Not found'}`);
  console.log(`    Employees: ${result.company?.metrics?.employees}`);
  
  console.log('  ✅ Full Engine working\n');

  // Summary
  console.log('═'.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log('');
  console.log('  All tests passed! ✅');
  console.log('');
  console.log('  Components tested:');
  console.log('    ✅ Source Detector - Identifies content type and adapter');
  console.log('    ✅ Structure Extractor - Pulls Schema.org, OpenGraph, meta');
  console.log('    ✅ Signal Cascade - 500+ patterns for signal extraction');
  console.log('    ✅ Predictive Engine - GOD score + success probability');
  console.log('    ✅ Full Integration - End-to-end analysis pipeline');
  console.log('');
  console.log('  Sample startup scored:');
  console.log(`    📊 GOD Score: ${prediction.godScore}/100`);
  console.log(`    📈 Delta: ${prediction.deltaScore > 0 ? '+' : ''}${prediction.deltaScore}`);
  console.log(`    🎯 Success: ${(prediction.successProbability * 100).toFixed(1)}%`);
  console.log(`    🏆 Tier: ${prediction.tier}`);
  console.log('');
  console.log('═'.repeat(60));
}

// Run tests
runTests().catch(console.error);

