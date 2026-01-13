#!/usr/bin/env node
/**
 * PYTHIA COMPREHENSIVE HEALTH CHECK
 * 
 * Complete system health check for Pythia including:
 * - Database connectivity and schema validation
 * - Overall system statistics
 * - Data freshness and activity
 * - Collection script status
 * - Scoring engine health
 * - Data quality checks
 * - Performance metrics
 * - Configuration validation
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { extractAllFeatures } = require('./feature-extractor');
const { computePythiaScore } = require('./scoring-engine');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Health check results
const healthStatus = {
  overall: 'unknown',
  checks: {},
  errors: [],
  warnings: []
};

/**
 * Helper: Check for constraint markers
 */
function hasConstraintMarkers(text) {
  const features = extractAllFeatures(text);
  return features.constraint.count > 0;
}

/**
 * Helper: Check for mechanism markers
 */
function hasMechanismMarkers(text) {
  const features = extractAllFeatures(text);
  return features.mechanism.count > 0;
}

/**
 * Helper: Check for reality contact markers
 */
function hasRealityContactMarkers(text) {
  const features = extractAllFeatures(text);
  const r = features.reality;
  return !!(r.hasMetrics || r.hasExperiments || r.hasShipping || r.hasPostmortem || r.count > 0);
}

/**
 * 1. Database Connectivity & Schema Check
 */
async function checkDatabaseHealth() {
  console.log('\n🔌 DATABASE HEALTH');
  console.log('─'.repeat(60));
  
  try {
    // Test connection
    const { data, error } = await supabase
      .from('pythia_speech_snippets')
      .select('id')
      .limit(1);
    
    if (error) {
      healthStatus.errors.push(`Database connection failed: ${error.message}`);
      healthStatus.checks.database = '❌ FAILED';
      console.log('   ❌ Connection: FAILED');
      console.log(`      Error: ${error.message}`);
      return false;
    }
    
    healthStatus.checks.database = '✅ OK';
    console.log('   ✅ Connection: OK');
    
    // Check table existence and structure
    const { data: snippets, error: snippetsError } = await supabase
      .from('pythia_speech_snippets')
      .select('*')
      .limit(0);
    
    const { data: scores, error: scoresError } = await supabase
      .from('pythia_scores')
      .select('*')
      .limit(0);
    
    if (snippetsError || scoresError) {
      healthStatus.errors.push(`Table structure issue: ${snippetsError?.message || scoresError?.message}`);
      console.log('   ⚠️  Table structure: ISSUES DETECTED');
      return false;
    }
    
    console.log('   ✅ Tables: OK (pythia_speech_snippets, pythia_scores)');
    return true;
  } catch (error) {
    healthStatus.errors.push(`Database check exception: ${error.message}`);
    healthStatus.checks.database = '❌ ERROR';
    console.log('   ❌ Database check failed:', error.message);
    return false;
  }
}

/**
 * 2. Overall System Statistics
 */
async function checkSystemStatistics() {
  console.log('\n📊 SYSTEM STATISTICS');
  console.log('─'.repeat(60));
  
  try {
    // Total snippets
    const { count: totalSnippets, error: snippetsError } = await supabase
      .from('pythia_speech_snippets')
      .select('*', { count: 'exact', head: true });
    
    if (snippetsError) throw snippetsError;
    
    // Total scores
    const { count: totalScores, error: scoresError } = await supabase
      .from('pythia_scores')
      .select('*', { count: 'exact', head: true });
    
    if (scoresError) throw scoresError;
    
    // Unique entities with snippets
    const { data: entities, error: entitiesError } = await supabase
      .from('pythia_speech_snippets')
      .select('entity_id')
      .limit(10000);
    
    if (entitiesError) throw entitiesError;
    const uniqueEntities = new Set((entities || []).map(e => e.entity_id)).size;
    
    // Unique entities with scores
    const { data: scoredEntities, error: scoredError } = await supabase
      .from('pythia_scores')
      .select('entity_id')
      .limit(10000);
    
    if (scoredError) throw scoredError;
    const uniqueScoredEntities = new Set((scoredEntities || []).map(e => e.entity_id)).size;
    
    console.log(`   📝 Total Snippets: ${totalSnippets || 0}`);
    console.log(`   🎯 Total Scores: ${totalScores || 0}`);
    console.log(`   🏢 Entities with Snippets: ${uniqueEntities}`);
    console.log(`   ✅ Entities with Scores: ${uniqueScoredEntities}`);
    console.log(`   📈 Coverage: ${uniqueEntities > 0 ? ((uniqueScoredEntities / uniqueEntities) * 100).toFixed(1) : 0}%`);
    
    healthStatus.checks.statistics = '✅ OK';
    healthStatus.checks.totalSnippets = totalSnippets || 0;
    healthStatus.checks.totalScores = totalScores || 0;
    healthStatus.checks.uniqueEntities = uniqueEntities;
    
    if (totalSnippets === 0) {
      healthStatus.warnings.push('No snippets found in database');
    }
    if (uniqueScoredEntities < uniqueEntities * 0.5) {
      healthStatus.warnings.push(`Only ${((uniqueScoredEntities / uniqueEntities) * 100).toFixed(1)}% of entities have scores`);
    }
    
    return true;
  } catch (error) {
    healthStatus.errors.push(`Statistics check failed: ${error.message}`);
    healthStatus.checks.statistics = '❌ ERROR';
    console.log('   ❌ Error:', error.message);
    return false;
  }
}

/**
 * 3. Data Freshness & Activity
 */
async function checkDataFreshness(days = 7) {
  console.log('\n🕐 DATA FRESHNESS');
  console.log('─'.repeat(60));
  
  try {
    const now = new Date();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
    // Recent snippets
    const { data: recentSnippets, error: snippetsError } = await supabase
    .from('pythia_speech_snippets')
      .select('created_at')
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false })
      .limit(1);
    
    if (snippetsError) throw snippetsError;
    
    // Recent scores
    const { data: recentScores, error: scoresError } = await supabase
      .from('pythia_scores')
      .select('computed_at')
      .gte('computed_at', cutoffDate.toISOString())
      .order('computed_at', { ascending: false })
      .limit(1);
    
    if (scoresError) throw scoresError;
    
    // Count snippets by day
    const { data: dailySnippets, error: dailyError } = await supabase
      .from('pythia_speech_snippets')
      .select('created_at')
      .gte('created_at', cutoffDate.toISOString());
    
    if (dailyError) throw dailyError;
    
    const dailyCounts = {};
    (dailySnippets || []).forEach(s => {
      const date = new Date(s.created_at).toISOString().split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });
    
    const newestSnippet = recentSnippets && recentSnippets.length > 0 
      ? new Date(recentSnippets[0].created_at)
      : null;
    const newestScore = recentScores && recentScores.length > 0
      ? new Date(recentScores[0].computed_at)
      : null;
    
    if (newestSnippet) {
      const hoursAgo = Math.round((now - newestSnippet) / (1000 * 60 * 60));
      console.log(`   📝 Newest Snippet: ${hoursAgo} hours ago`);
      if (hoursAgo > 48) {
        healthStatus.warnings.push(`No new snippets in ${hoursAgo} hours`);
      }
    } else {
      console.log('   ⚠️  Newest Snippet: NONE (last 7 days)');
      healthStatus.warnings.push('No snippets collected in last 7 days');
    }
    
    if (newestScore) {
      const hoursAgo = Math.round((now - newestScore) / (1000 * 60 * 60));
      console.log(`   🎯 Newest Score: ${hoursAgo} hours ago`);
      if (hoursAgo > 72) {
        healthStatus.warnings.push(`No new scores computed in ${hoursAgo} hours`);
      }
    } else {
      console.log('   ⚠️  Newest Score: NONE (last 7 days)');
      healthStatus.warnings.push('No scores computed in last 7 days');
    }
    
    console.log(`   📅 Daily Activity (last ${days} days):`);
    const sortedDays = Object.entries(dailyCounts).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);
    sortedDays.forEach(([date, count]) => {
      console.log(`      ${date}: ${count} snippets`);
    });
    
    healthStatus.checks.freshness = '✅ OK';
    return true;
  } catch (error) {
    healthStatus.errors.push(`Freshness check failed: ${error.message}`);
    healthStatus.checks.freshness = '❌ ERROR';
    console.log('   ❌ Error:', error.message);
    return false;
  }
}

/**
 * 4. Collection Scripts Status
 */
async function checkCollectionScripts() {
  console.log('\n📥 COLLECTION SCRIPTS');
  console.log('─'.repeat(60));
  
  const scripts = [
    'collect-from-blogs.js',
    'collect-from-forums.js',
    'collect-from-company-domains.js',
    'collect-from-rss.js',
    'collect-from-github.js',
    'collect-from-social.js',
    'collect-snippets.js'
  ];
  
  const scriptDir = path.join(__dirname);
  let allExist = true;
  
  scripts.forEach(script => {
    const scriptPath = path.join(scriptDir, script);
    const exists = fs.existsSync(scriptPath);
    const status = exists ? '✅' : '❌';
    console.log(`   ${status} ${script}`);
    
    if (!exists) {
      allExist = false;
      healthStatus.warnings.push(`Collection script missing: ${script}`);
    }
  });
  
  // Check utils directory
  const utilsDir = path.join(scriptDir, 'utils');
  const utilsExists = fs.existsSync(utilsDir);
  console.log(`   ${utilsExists ? '✅' : '❌'} utils/ directory`);
  
  if (!utilsExists) {
    allExist = false;
    healthStatus.warnings.push('Utils directory missing');
  } else {
    const requiredUtils = [
      'tier-classifier.js',
      'startup-name-sanitizer.js',
      'domain-classifier.js'
    ];
    
    requiredUtils.forEach(util => {
      const utilPath = path.join(utilsDir, util);
      const exists = fs.existsSync(utilPath);
      const status = exists ? '✅' : '❌';
      console.log(`      ${status} ${util}`);
      
      if (!exists) {
        allExist = false;
        healthStatus.warnings.push(`Utility missing: ${util}`);
      }
    });
  }
  
  // Check feature-extractor.js (in root of pythia directory, not utils)
  const featureExtractorPath = path.join(scriptDir, 'feature-extractor.js');
  const featureExtractorExists = fs.existsSync(featureExtractorPath);
  console.log(`   ${featureExtractorExists ? '✅' : '❌'} feature-extractor.js`);
  
  if (!featureExtractorExists) {
    allExist = false;
    healthStatus.warnings.push('feature-extractor.js missing (should be in scripts/pythia/)');
  }
  
  healthStatus.checks.collectionScripts = allExist ? '✅ OK' : '⚠️  ISSUES';
  return allExist;
}

/**
 * 5. Scoring Engine Health
 */
async function checkScoringEngine() {
  console.log('\n🔮 SCORING ENGINE');
  console.log('─'.repeat(60));
  
  try {
    // Test scoring engine with sample data
    const testSnippets = [
      {
        text: "We're committing to ship this feature by Q2. We won't compromise on quality, and we've decided to focus only on enterprise customers.",
        tier: 1,
        source_type: 'forum_post',
        context_label: 'product',
        date_published: new Date().toISOString()
      },
      {
        text: "Our mechanism works by analyzing user behavior patterns, then applying machine learning algorithms to predict churn. We've seen 30% reduction in churn.",
        tier: 1,
        source_type: 'forum_post',
        context_label: 'technical',
        date_published: new Date().toISOString()
      }
    ];
    
    const result = computePythiaScore(testSnippets);
    
    if (result && typeof result.pythia_score === 'number' && result.pythia_score >= 0 && result.pythia_score <= 100) {
      console.log('   ✅ Scoring function: OK');
      console.log(`      Test score: ${result.pythia_score}/100`);
      console.log(`      Confidence: ${result.confidence.toFixed(2)}`);
      console.log(`      Constraint: ${result.breakdown.constraint_score.toFixed(1)}`);
      console.log(`      Mechanism: ${result.breakdown.mechanism_score.toFixed(1)}`);
      console.log(`      Reality: ${result.breakdown.reality_contact_score.toFixed(1)}`);
      
      healthStatus.checks.scoringEngine = '✅ OK';
      return true;
    } else {
      throw new Error('Invalid scoring result format');
    }
  } catch (error) {
    healthStatus.errors.push(`Scoring engine check failed: ${error.message}`);
    healthStatus.checks.scoringEngine = '❌ ERROR';
    console.log('   ❌ Error:', error.message);
    return false;
  }
}

/**
 * 6. Data Quality Checks
 */
async function checkDataQuality(days = 7) {
  console.log('\n🔍 DATA QUALITY');
  console.log('─'.repeat(60));
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Fetch recent snippets for quality checks
    const { data: snippets, error } = await supabase
      .from('pythia_speech_snippets')
      .select('*')
      .gte('created_at', cutoffDate.toISOString())
      .limit(1000);
    
    if (error) throw error;
    
    if (!snippets || snippets.length === 0) {
      console.log('   ⚠️  No recent snippets to check');
      healthStatus.checks.dataQuality = '⚠️  NO DATA';
      return true;
    }
    
    // Check for issues
    let issues = 0;
    const issuesList = [];
    
    // Check for missing required fields
    const missingText = snippets.filter(s => !s.text || s.text.trim().length === 0).length;
    const missingEntityId = snippets.filter(s => !s.entity_id).length;
    const missingTier = snippets.filter(s => !s.tier || ![1, 2, 3].includes(s.tier)).length;
    const missingSourceType = snippets.filter(s => !s.source_type).length;
    
    if (missingText > 0) {
      issues++;
      issuesList.push(`${missingText} snippets with missing/empty text`);
    }
    if (missingEntityId > 0) {
      issues++;
      issuesList.push(`${missingEntityId} snippets with missing entity_id`);
    }
    if (missingTier > 0) {
      issues++;
      issuesList.push(`${missingTier} snippets with invalid tier`);
    }
    if (missingSourceType > 0) {
      issues++;
      issuesList.push(`${missingSourceType} snippets with missing source_type`);
    }
    
    // Check for duplicates (same text_hash)
    const { data: duplicates, error: dupError } = await supabase
      .from('pythia_speech_snippets')
      .select('text_hash')
      .gte('created_at', cutoffDate.toISOString());
    
    if (!dupError && duplicates) {
      const hashCounts = {};
      duplicates.forEach(d => {
        if (d.text_hash) {
          hashCounts[d.text_hash] = (hashCounts[d.text_hash] || 0) + 1;
        }
      });
      
      const duplicateHashes = Object.entries(hashCounts).filter(([_, count]) => count > 1);
      if (duplicateHashes.length > 0) {
        const totalDuplicates = duplicateHashes.reduce((sum, [_, count]) => sum + count - 1, 0);
        if (totalDuplicates > snippets.length * 0.1) {
          issues++;
          issuesList.push(`${totalDuplicates} potential duplicate snippets (${duplicateHashes.length} unique hashes)`);
        }
      }
  }
  
  // Tier distribution
  const tierCounts = { 1: 0, 2: 0, 3: 0 };
  snippets.forEach(s => {
      if (s.tier && [1, 2, 3].includes(s.tier)) {
    tierCounts[s.tier] = (tierCounts[s.tier] || 0) + 1;
      }
    });
    
    const totalValid = tierCounts[1] + tierCounts[2] + tierCounts[3];
    const tier1Pct = totalValid > 0 ? (tierCounts[1] / totalValid) * 100 : 0;
    const tier3Pct = totalValid > 0 ? (tierCounts[3] / totalValid) * 100 : 0;
    
    console.log(`   📊 Tier Distribution:`);
    console.log(`      Tier 1: ${tierCounts[1]} (${tier1Pct.toFixed(1)}%)`);
    console.log(`      Tier 2: ${tierCounts[2]} (${((tierCounts[2] / totalValid) * 100).toFixed(1)}%)`);
    console.log(`      Tier 3: ${tierCounts[3]} (${tier3Pct.toFixed(1)}%)`);
    
    if (tier3Pct > 80) {
      issues++;
      issuesList.push(`High Tier 3 percentage (${tier3Pct.toFixed(1)}%) - mostly PR content`);
    }
    if (tier1Pct < 10 && totalValid > 10) {
      issues++;
      issuesList.push(`Low Tier 1 percentage (${tier1Pct.toFixed(1)}%) - need more earned content`);
    }
  
  // Feature markers
  let constraintCount = 0;
  let mechanismCount = 0;
  let realityCount = 0;
  
  snippets.forEach(snippet => {
      if (snippet.text) {
    if (hasConstraintMarkers(snippet.text)) constraintCount++;
    if (hasMechanismMarkers(snippet.text)) mechanismCount++;
    if (hasRealityContactMarkers(snippet.text)) realityCount++;
      }
    });
    
    console.log(`   🔍 Feature Markers:`);
    console.log(`      Constraint: ${constraintCount} (${((constraintCount / snippets.length) * 100).toFixed(1)}%)`);
    console.log(`      Mechanism: ${mechanismCount} (${((mechanismCount / snippets.length) * 100).toFixed(1)}%)`);
    console.log(`      Reality: ${realityCount} (${((realityCount / snippets.length) * 100).toFixed(1)}%)`);
    
    if (issues > 0) {
      console.log(`   ⚠️  Issues Found: ${issues}`);
      issuesList.forEach(issue => {
        console.log(`      - ${issue}`);
        healthStatus.warnings.push(`Data quality: ${issue}`);
      });
      healthStatus.checks.dataQuality = '⚠️  ISSUES';
    } else {
      console.log('   ✅ No quality issues detected');
      healthStatus.checks.dataQuality = '✅ OK';
    }
    
    return true;
  } catch (error) {
    healthStatus.errors.push(`Data quality check failed: ${error.message}`);
    healthStatus.checks.dataQuality = '❌ ERROR';
    console.log('   ❌ Error:', error.message);
    return false;
  }
}

/**
 * 7. Source Distribution & Activity
 */
async function checkSourceDistribution(days = 7) {
  console.log('\n📡 SOURCE DISTRIBUTION');
  console.log('─'.repeat(60));
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const { data: snippets, error } = await supabase
      .from('pythia_speech_snippets')
      .select('source_type, tier')
      .gte('created_at', cutoffDate.toISOString());
    
    if (error) throw error;
    
    if (!snippets || snippets.length === 0) {
      console.log('   ⚠️  No recent snippets');
      healthStatus.checks.sourceDistribution = '⚠️  NO DATA';
      return true;
    }
    
  const sourceCounts = {};
  snippets.forEach(s => {
      const source = s.source_type || 'unknown';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });
  
  const sortedSources = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1]);
    
    console.log('   Top Sources:');
    sortedSources.slice(0, 10).forEach(([source, count]) => {
      const pct = ((count / snippets.length) * 100).toFixed(1);
      console.log(`      ${source}: ${count} (${pct}%)`);
    });
    
    // Check for source diversity
    if (sortedSources.length < 3 && snippets.length > 10) {
      healthStatus.warnings.push(`Low source diversity: only ${sortedSources.length} source types`);
    }
    
    healthStatus.checks.sourceDistribution = '✅ OK';
    return true;
  } catch (error) {
    healthStatus.errors.push(`Source distribution check failed: ${error.message}`);
    healthStatus.checks.sourceDistribution = '❌ ERROR';
    console.log('   ❌ Error:', error.message);
    return false;
  }
}

/**
 * 8. Configuration Validation
 */
async function checkConfiguration() {
  console.log('\n⚙️  CONFIGURATION');
  console.log('─'.repeat(60));
  
  let allGood = true;
  
  // Check environment variables
  if (!supabaseUrl) {
    console.log('   ❌ VITE_SUPABASE_URL: MISSING');
    healthStatus.errors.push('VITE_SUPABASE_URL not set');
    allGood = false;
  } else {
    console.log('   ✅ VITE_SUPABASE_URL: OK');
  }
  
  if (!supabaseKey) {
    console.log('   ❌ SUPABASE_SERVICE_KEY: MISSING');
    healthStatus.errors.push('SUPABASE_SERVICE_KEY not set');
    allGood = false;
  } else {
    console.log('   ✅ SUPABASE_SERVICE_KEY: OK');
  }
  
  // Check .env file exists
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    console.log('   ✅ .env file: EXISTS');
  } else {
    console.log('   ⚠️  .env file: NOT FOUND');
    healthStatus.warnings.push('.env file not found');
  }
  
  healthStatus.checks.configuration = allGood ? '✅ OK' : '❌ ISSUES';
  return allGood;
}

/**
 * Generate comprehensive health check report
 */
async function generateHealthCheckReport(days = 7) {
  console.log('\n' + '='.repeat(60));
  console.log('🔮 PYTHIA COMPREHENSIVE HEALTH CHECK');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Period: Last ${days} days`);
  
  // Run all checks
  await checkDatabaseHealth();
  await checkSystemStatistics();
  await checkDataFreshness(days);
  await checkCollectionScripts();
  await checkScoringEngine();
  await checkDataQuality(days);
  await checkSourceDistribution(days);
  await checkConfiguration();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 HEALTH CHECK SUMMARY');
  console.log('='.repeat(60));
  
  const checkCounts = {
    ok: 0,
    warning: 0,
    error: 0
  };
  
  Object.entries(healthStatus.checks).forEach(([key, value]) => {
    if (value.includes('✅')) checkCounts.ok++;
    else if (value.includes('⚠️')) checkCounts.warning++;
    else if (value.includes('❌')) checkCounts.error++;
  });
  
  console.log(`\n✅ Passed: ${checkCounts.ok}`);
  console.log(`⚠️  Warnings: ${checkCounts.warning}`);
  console.log(`❌ Errors: ${checkCounts.error}`);
  
  if (healthStatus.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    healthStatus.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
  }
  
  if (healthStatus.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    healthStatus.warnings.forEach(warning => {
      console.log(`   - ${warning}`);
    });
  }
  
  // Overall status
  if (checkCounts.error > 0) {
    healthStatus.overall = '❌ UNHEALTHY';
    console.log('\n❌ OVERALL STATUS: UNHEALTHY');
  } else if (checkCounts.warning > 0) {
    healthStatus.overall = '⚠️  DEGRADED';
    console.log('\n⚠️  OVERALL STATUS: DEGRADED');
  } else {
    healthStatus.overall = '✅ HEALTHY';
    console.log('\n✅ OVERALL STATUS: HEALTHY');
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  return healthStatus;
}

// Run if called directly
if (require.main === module) {
  const days = process.argv[2] ? parseInt(process.argv[2]) : 7;
  generateHealthCheckReport(days)
    .then(status => {
      process.exit(status.overall.includes('❌') ? 1 : 0);
    })
    .catch(error => {
      console.error('\n❌ FATAL ERROR:', error);
      process.exit(1);
    });
}

module.exports = { generateHealthCheckReport };
