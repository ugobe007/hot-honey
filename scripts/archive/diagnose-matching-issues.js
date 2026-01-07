#!/usr/bin/env node
/**
 * MATCHING SYSTEM DIAGNOSTICS
 * ===========================
 * Identifies potential issues affecting match quality:
 * - Low GOD scores
 * - Missing data (sectors, stages, locations)
 * - Investor type issues
 * - Sector/stage mismatches
 * - Data quality problems
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function diagnoseMatchingIssues() {
  console.log('\n' + '═'.repeat(70));
  console.log('🔍 MATCHING SYSTEM DIAGNOSTICS');
  console.log('═'.repeat(70) + '\n');

  const issues = {
    startups: {
      lowGodScores: [],
      missingSectors: [],
      missingStages: [],
      missingGODDimensions: [],
      numericStages: [],
      total: 0
    },
    investors: {
      missingType: [],
      missingSectors: [],
      missingStages: [],
      garbageNames: [],
      total: 0
    },
    matching: {
      sectorMismatches: [],
      stageMismatches: [],
      potentialIssues: []
    }
  };

  // ============================================================================
  // STARTUP ISSUES
  // ============================================================================
  console.log('📊 Analyzing Startups...\n');

  const { data: startups, error: startupError } = await supabase
    .from('startup_uploads')
    .select('id, name, total_god_score, sectors, stage, team_score, market_score, product_score, traction_score, vision_score, status')
    .eq('status', 'approved')
    .limit(1000);

  if (startupError) {
    console.error('❌ Error fetching startups:', startupError);
    return;
  }

  issues.startups.total = startups.length;
  console.log(`   Total approved startups: ${startups.length}\n`);

  for (const startup of startups) {
    // Low GOD scores (< 30)
    if (startup.total_god_score !== null && startup.total_god_score < 30) {
      issues.startups.lowGodScores.push({
        id: startup.id,
        name: startup.name,
        score: startup.total_god_score
      });
    }

    // Missing sectors
    if (!startup.sectors || startup.sectors.length === 0) {
      issues.startups.missingSectors.push({
        id: startup.id,
        name: startup.name
      });
    }

    // Missing or numeric stages
    if (!startup.stage) {
      issues.startups.missingStages.push({
        id: startup.id,
        name: startup.name
      });
    } else if (typeof startup.stage === 'number') {
      issues.startups.numericStages.push({
        id: startup.id,
        name: startup.name,
        stage: startup.stage
      });
    }

    // Missing GOD dimensions
    const missingDimensions = [];
    if (startup.team_score === null || startup.team_score === undefined) missingDimensions.push('team');
    if (startup.market_score === null || startup.market_score === undefined) missingDimensions.push('market');
    if (startup.product_score === null || startup.product_score === undefined) missingDimensions.push('product');
    if (startup.traction_score === null || startup.traction_score === undefined) missingDimensions.push('traction');
    if (startup.vision_score === null || startup.vision_score === undefined) missingDimensions.push('vision');

    if (missingDimensions.length > 0) {
      issues.startups.missingGODDimensions.push({
        id: startup.id,
        name: startup.name,
        missing: missingDimensions
      });
    }
  }

  // ============================================================================
  // INVESTOR ISSUES
  // ============================================================================
  console.log('💰 Analyzing Investors...\n');

  const { data: investors, error: investorError } = await supabase
    .from('investors')
    .select('id, name, investor_type, sectors, stage')
    .not('name', 'ilike', '%(%') // Exclude known garbage
    .limit(1000);

  if (investorError) {
    console.error('❌ Error fetching investors:', investorError);
    return;
  }

  issues.investors.total = investors.length;
  console.log(`   Total investors: ${investors.length}\n`);

  const garbagePatterns = [
    /^(the|a|an|and|or|but|for|to|in|on|at|by|with|from|as|is|was|are|were|be|been|being|have|has|had|do|does|did|will|would|should|could|may|might|must|can)\s/i,
    /^(can|with)\s+[A-Z][a-z]+\s*$/,
    /^every\s+answer/i,
    /\s{3,}/, // Multiple spaces
    /^[a-z]/, // Starts with lowercase (likely sentence fragment)
  ];

  for (const investor of investors) {
    // Missing investor type
    if (!investor.investor_type) {
      issues.investors.missingType.push({
        id: investor.id,
        name: investor.name
      });
    }

    // Missing sectors
    if (!investor.sectors || investor.sectors.length === 0) {
      issues.investors.missingSectors.push({
        id: investor.id,
        name: investor.name
      });
    }

    // Missing stages
    if (!investor.stage || investor.stage.length === 0) {
      issues.investors.missingStages.push({
        id: investor.id,
        name: investor.name
      });
    }

    // Garbage names (additional patterns)
    const isGarbage = garbagePatterns.some(pattern => pattern.test(investor.name));
    if (isGarbage && investor.name.length > 50) {
      issues.investors.garbageNames.push({
        id: investor.id,
        name: investor.name
      });
    }
  }

  // ============================================================================
  // SECTOR/STAGE MISMATCHES
  // ============================================================================
  console.log('🔗 Analyzing Sector/Stage Alignment...\n');

  // Get unique sectors from startups
  const startupSectors = new Set();
  startups.forEach(s => {
    if (s.sectors && Array.isArray(s.sectors)) {
      s.sectors.forEach(sec => startupSectors.add(sec.toLowerCase()));
    }
  });

  // Get unique sectors from investors
  const investorSectors = new Set();
  investors.forEach(i => {
    if (i.sectors && Array.isArray(i.sectors)) {
      i.sectors.forEach(sec => investorSectors.add(sec.toLowerCase()));
    }
  });

  // Find sectors that exist in one but not the other
  const startupOnlySectors = [...startupSectors].filter(s => !investorSectors.has(s));
  const investorOnlySectors = [...investorSectors].filter(s => !startupSectors.has(s));

  // Get unique stages
  const startupStages = new Set();
  startups.forEach(s => {
    if (s.stage) {
      if (typeof s.stage === 'number') {
        const stageMap = { 0: 'Pre-Seed', 1: 'Seed', 2: 'Series A', 3: 'Series B', 4: 'Growth', 5: 'Late Stage' };
        startupStages.add(stageMap[s.stage] || 'Seed');
      } else if (Array.isArray(s.stage)) {
        s.stage.forEach(st => startupStages.add(String(st).toLowerCase()));
      } else {
        startupStages.add(String(s.stage).toLowerCase());
      }
    }
  });

  const investorStages = new Set();
  investors.forEach(i => {
    if (i.stage && Array.isArray(i.stage)) {
      i.stage.forEach(st => investorStages.add(String(st).toLowerCase()));
    }
  });

  const startupOnlyStages = [...startupStages].filter(s => !investorStages.has(s));
  const investorOnlyStages = [...investorStages].filter(s => !startupStages.has(s));

  // ============================================================================
  // REPORT
  // ============================================================================
  console.log('═'.repeat(70));
  console.log('📋 DIAGNOSTIC REPORT');
  console.log('═'.repeat(70) + '\n');

  // Startup Issues
  console.log('🚀 STARTUP ISSUES:');
  console.log('─'.repeat(50));
  console.log(`   Low GOD scores (< 30): ${issues.startups.lowGodScores.length} (${(issues.startups.lowGodScores.length / issues.startups.total * 100).toFixed(1)}%)`);
  if (issues.startups.lowGodScores.length > 0 && issues.startups.lowGodScores.length <= 10) {
    console.log('   Examples:');
    issues.startups.lowGodScores.slice(0, 5).forEach(s => {
      console.log(`     - ${s.name}: ${s.score}/100`);
    });
  }

  console.log(`\n   Missing sectors: ${issues.startups.missingSectors.length} (${(issues.startups.missingSectors.length / issues.startups.total * 100).toFixed(1)}%)`);
  console.log(`   Missing stages: ${issues.startups.missingStages.length} (${(issues.startups.missingStages.length / issues.startups.total * 100).toFixed(1)}%)`);
  console.log(`   Numeric stages: ${issues.startups.numericStages.length} (${(issues.startups.numericStages.length / issues.startups.total * 100).toFixed(1)}%)`);
  console.log(`   Missing GOD dimensions: ${issues.startups.missingGODDimensions.length} (${(issues.startups.missingGODDimensions.length / issues.startups.total * 100).toFixed(1)}%)`);

  // Investor Issues
  console.log('\n💰 INVESTOR ISSUES:');
  console.log('─'.repeat(50));
  console.log(`   Missing investor_type: ${issues.investors.missingType.length} (${(issues.investors.missingType.length / issues.investors.total * 100).toFixed(1)}%)`);
  console.log(`   Missing sectors: ${issues.investors.missingSectors.length} (${(issues.investors.missingSectors.length / issues.investors.total * 100).toFixed(1)}%)`);
  console.log(`   Missing stages: ${issues.investors.missingStages.length} (${(issues.investors.missingStages.length / issues.investors.total * 100).toFixed(1)}%)`);
  console.log(`   Potential garbage names: ${issues.investors.garbageNames.length}`);

  // Sector/Stage Mismatches
  console.log('\n🔗 SECTOR/STAGE ALIGNMENT:');
  console.log('─'.repeat(50));
  console.log(`   Startup-only sectors: ${startupOnlySectors.length}`);
  if (startupOnlySectors.length > 0 && startupOnlySectors.length <= 10) {
    console.log(`   Examples: ${startupOnlySectors.slice(0, 5).join(', ')}`);
  }
  console.log(`   Investor-only sectors: ${investorOnlySectors.length}`);
  if (investorOnlySectors.length > 0 && investorOnlySectors.length <= 10) {
    console.log(`   Examples: ${investorOnlySectors.slice(0, 5).join(', ')}`);
  }
  console.log(`   Startup-only stages: ${startupOnlyStages.length}`);
  if (startupOnlyStages.length > 0 && startupOnlyStages.length <= 5) {
    console.log(`   Examples: ${startupOnlyStages.slice(0, 5).join(', ')}`);
  }
  console.log(`   Investor-only stages: ${investorOnlyStages.length}`);
  if (investorOnlyStages.length > 0 && investorOnlyStages.length <= 5) {
    console.log(`   Examples: ${investorOnlyStages.slice(0, 5).join(', ')}`);
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('─'.repeat(50));
  
  const recommendations = [];
  
  if (issues.startups.lowGodScores.length > issues.startups.total * 0.1) {
    recommendations.push('⚠️  Many startups have low GOD scores - consider lowering minScore threshold or improving scoring');
  }
  
  if (issues.startups.missingSectors.length > issues.startups.total * 0.2) {
    recommendations.push('⚠️  Many startups missing sectors - sector matching will be limited');
  }
  
  if (issues.startups.numericStages.length > 0) {
    recommendations.push('✅ Numeric stages detected - ensure stage mapping is working (already fixed)');
  }
  
  if (issues.investors.missingType.length > issues.investors.total * 0.3) {
    recommendations.push('⚠️  Many investors missing investor_type - will default to VC preferences');
  }
  
  if (startupOnlySectors.length > 10 || investorOnlySectors.length > 10) {
    recommendations.push('⚠️  Significant sector mismatches - consider normalizing sector names');
  }
  
  if (issues.startups.missingGODDimensions.length > issues.startups.total * 0.1) {
    recommendations.push('⚠️  Many startups missing GOD dimensions - scores will default to 50');
  }

  if (recommendations.length === 0) {
    console.log('   ✅ No major issues detected!');
  } else {
    recommendations.forEach(r => console.log(`   ${r}`));
  }

  console.log('\n' + '═'.repeat(70));
  console.log('✅ Diagnostics complete');
  console.log('═'.repeat(70) + '\n');
}

diagnoseMatchingIssues().catch(console.error);

