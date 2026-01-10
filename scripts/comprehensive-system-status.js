#!/usr/bin/env node
/**
 * Comprehensive System Status Report
 * Shows everything: scripts, GOD scores, ML signals, data quality, templates
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPM2Status() {
  try {
    const output = execSync('pm2 list', { encoding: 'utf-8' });
    return output;
  } catch (error) {
    return 'PM2 not running or not installed';
  }
}

async function getGODScoreStatus() {
  const { data: scores, error } = await supabase
    .from('startup_uploads')
    .select('total_god_score, industry_god_score, primary_industry, status')
    .eq('status', 'approved')
    .not('total_god_score', 'is', null);
  
  if (error || !scores) return null;
  
  const total = scores.length;
  const withIndustry = scores.filter(s => s.industry_god_score).length;
  const avgOverall = scores.reduce((sum, s) => sum + (s.total_god_score || 0), 0) / total;
  const avgIndustry = scores
    .filter(s => s.industry_god_score)
    .reduce((sum, s) => sum + (s.industry_god_score || 0), 0) / (withIndustry || 1);
  
  const distribution = {
    '0-39': scores.filter(s => (s.total_god_score || 0) < 40).length,
    '40-59': scores.filter(s => (s.total_god_score || 0) >= 40 && (s.total_god_score || 0) < 60).length,
    '60-79': scores.filter(s => (s.total_god_score || 0) >= 60 && (s.total_god_score || 0) < 80).length,
    '80-100': scores.filter(s => (s.total_god_score || 0) >= 80).length,
  };
  
  return { total, withIndustry, avgOverall, avgIndustry, distribution };
}

async function getMLSignals() {
  const { count: recommendations } = await supabase
    .from('ml_recommendations')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  
  const { count: trainingRuns } = await supabase
    .from('ml_training_runs')
    .select('id', { count: 'exact', head: true });
  
  const { data: recentTraining } = await supabase
    .from('ml_training_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  return {
    pendingRecommendations: recommendations || 0,
    totalTrainingRuns: trainingRuns || 0,
    lastTraining: recentTraining?.created_at || null
  };
}

async function getDataQuality() {
  // Startup data completeness
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('arr, mrr, growth_rate, customer_count, team_size, stage, sectors, tagline, description, website, extracted_data, total_god_score')
    .eq('status', 'approved')
    .limit(1000);
  
  if (!startups || startups.length === 0) return null;
  
  const total = startups.length;
  const completeness = {
    arr: startups.filter(s => s.arr && s.arr > 0).length,
    mrr: startups.filter(s => s.mrr && s.mrr > 0).length,
    growth_rate: startups.filter(s => s.growth_rate).length,
    customer_count: startups.filter(s => s.customer_count && s.customer_count > 0).length,
    team_size: startups.filter(s => s.team_size && s.team_size > 0).length,
    stage: startups.filter(s => s.stage).length,
    sectors: startups.filter(s => s.sectors && Array.isArray(s.sectors) && s.sectors.length > 0).length,
    tagline: startups.filter(s => s.tagline).length,
    description: startups.filter(s => s.description && s.description.length > 50).length,
    website: startups.filter(s => s.website).length,
    extracted_data: startups.filter(s => s.extracted_data && Object.keys(s.extracted_data).length > 0).length,
    god_score: startups.filter(s => s.total_god_score).length,
  };
  
  // Investor data completeness
  const { data: investors } = await supabase
    .from('investors')
    .select('name, description, sectors, check_size, stage_preferences, thesis, website, linkedin')
    .limit(500);
  
  const investorTotal = investors?.length || 0;
  const investorCompleteness = investorTotal > 0 ? {
    name: investors.filter(i => i.name).length,
    description: investors.filter(i => i.description && i.description.length > 50).length,
    sectors: investors.filter(i => i.sectors && Array.isArray(i.sectors) && i.sectors.length > 0).length,
    check_size: investors.filter(i => i.check_size).length,
    stage_preferences: investors.filter(i => i.stage_preferences && Array.isArray(i.stage_preferences) && i.stage_preferences.length > 0).length,
    thesis: investors.filter(i => i.thesis && i.thesis.length > 50).length,
    website: investors.filter(i => i.website).length,
  } : {};
  
  return { startups: { total, completeness }, investors: { total: investorTotal, completeness: investorCompleteness } };
}

async function getTemplatesStatus() {
  const { data: templates } = await supabase
    .from('service_templates')
    .select('id, name, slug, is_active, category');
  
  const total = templates?.length || 0;
  const active = templates?.filter(t => t.is_active).length || 0;
  const categories = {};
  
  templates?.forEach(t => {
    categories[t.category] = (categories[t.category] || 0) + 1;
  });
  
  return { total, active, categories, templates: templates || [] };
}

async function getMatchingEngineStatus() {
  const { count: totalMatches } = await supabase
    .from('startup_investor_matches')
    .select('id', { count: 'exact', head: true });
  
  const { count: highQualityMatches } = await supabase
    .from('startup_investor_matches')
    .select('id', { count: 'exact', head: true })
    .gte('match_score', 70);
  
  const { data: recentMatches } = await supabase
    .from('startup_investor_matches')
    .select('match_score')
    .order('created_at', { ascending: false })
    .limit(1000);
  
  const avgMatchScore = recentMatches && recentMatches.length > 0
    ? recentMatches.reduce((sum, m) => sum + (m.match_score || 0), 0) / recentMatches.length
    : 0;
  
  return {
    totalMatches: totalMatches || 0,
    highQualityMatches: highQualityMatches || 0,
    avgMatchScore: Math.round(avgMatchScore * 10) / 10
  };
}

async function getDiscoveryStatus() {
  const { count: discovered } = await supabase
    .from('discovered_startups')
    .select('id', { count: 'exact', head: true })
    .eq('imported_to_startups', false);
  
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: last24h } = await supabase
    .from('discovered_startups')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', yesterday);
  
  return {
    unimported: discovered || 0,
    discovered24h: last24h || 0
  };
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔥 COMPREHENSIVE SYSTEM STATUS REPORT');
  console.log('='.repeat(80) + '\n');
  
  // 1. PM2 Status
  console.log('📦 RUNNING SCRIPTS (PM2):');
  console.log('-'.repeat(80));
  const pm2Status = await checkPM2Status();
  console.log(pm2Status);
  console.log('');
  
  // 2. GOD Scores
  console.log('🎯 GOD SCORES STATUS:');
  console.log('-'.repeat(80));
  const godStatus = await getGODScoreStatus();
  if (godStatus) {
    console.log(`   Total Scored Startups: ${godStatus.total}`);
    console.log(`   With Industry Scores: ${godStatus.withIndustry} (${Math.round(godStatus.withIndustry / godStatus.total * 100)}%)`);
    console.log(`   Average Overall GOD Score: ${godStatus.avgOverall.toFixed(1)}/100`);
    if (godStatus.withIndustry > 0) {
      console.log(`   Average Industry GOD Score: ${godStatus.avgIndustry.toFixed(1)}/100`);
    }
    console.log(`   Distribution:`);
    console.log(`     Low (0-39):    ${godStatus.distribution['0-39']} (${Math.round(godStatus.distribution['0-39'] / godStatus.total * 100)}%)`);
    console.log(`     Medium (40-59): ${godStatus.distribution['40-59']} (${Math.round(godStatus.distribution['40-59'] / godStatus.total * 100)}%)`);
    console.log(`     High (60-79):   ${godStatus.distribution['60-79']} (${Math.round(godStatus.distribution['60-79'] / godStatus.total * 100)}%)`);
    console.log(`     Elite (80-100): ${godStatus.distribution['80-100']} (${Math.round(godStatus.distribution['80-100'] / godStatus.total * 100)}%)`);
  } else {
    console.log('   ⚠️  Could not fetch GOD score data');
  }
  console.log('');
  
  // 3. ML Engine Signals
  console.log('🤖 ML ENGINE SIGNALS:');
  console.log('-'.repeat(80));
  const mlSignals = await getMLSignals();
  console.log(`   Pending Recommendations: ${mlSignals.pendingRecommendations}`);
  console.log(`   Total Training Runs: ${mlSignals.totalTrainingRuns}`);
  console.log(`   Last Training: ${mlSignals.lastTraining || 'Never'}`);
  console.log('');
  
  // 4. Matching Engine
  console.log('🎯 MATCHING ENGINE STATUS:');
  console.log('-'.repeat(80));
  const matchingStatus = await getMatchingEngineStatus();
  console.log(`   Total Matches: ${matchingStatus.totalMatches.toLocaleString()}`);
  console.log(`   High Quality (70+): ${matchingStatus.highQualityMatches.toLocaleString()}`);
  console.log(`   Average Match Score: ${matchingStatus.avgMatchScore}/100`);
  console.log('');
  
  // 5. Data Quality
  console.log('📊 DATA QUALITY (Startup Profiles):');
  console.log('-'.repeat(80));
  const dataQuality = await getDataQuality();
  if (dataQuality?.startups) {
    const s = dataQuality.startups;
    console.log(`   Total Startups Analyzed: ${s.total}`);
    console.log(`   Data Completeness:`);
    console.log(`     ARR:              ${s.completeness.arr} (${Math.round(s.completeness.arr / s.total * 100)}%)`);
    console.log(`     MRR:              ${s.completeness.mrr} (${Math.round(s.completeness.mrr / s.total * 100)}%)`);
    console.log(`     Growth Rate:      ${s.completeness.growth_rate} (${Math.round(s.completeness.growth_rate / s.total * 100)}%)`);
    console.log(`     Customer Count:   ${s.completeness.customer_count} (${Math.round(s.completeness.customer_count / s.total * 100)}%)`);
    console.log(`     Team Size:        ${s.completeness.team_size} (${Math.round(s.completeness.team_size / s.total * 100)}%)`);
    console.log(`     Stage:            ${s.completeness.stage} (${Math.round(s.completeness.stage / s.total * 100)}%)`);
    console.log(`     Sectors:          ${s.completeness.sectors} (${Math.round(s.completeness.sectors / s.total * 100)}%)`);
    console.log(`     Description:      ${s.completeness.description} (${Math.round(s.completeness.description / s.total * 100)}%)`);
    console.log(`     Website:          ${s.completeness.website} (${Math.round(s.completeness.website / s.total * 100)}%)`);
    console.log(`     Extracted Data:   ${s.completeness.extracted_data} (${Math.round(s.completeness.extracted_data / s.total * 100)}%)`);
    console.log(`     GOD Score:        ${s.completeness.god_score} (${Math.round(s.completeness.god_score / s.total * 100)}%)`);
  }
  console.log('');
  
  if (dataQuality?.investors && dataQuality.investors.total > 0) {
    console.log('📊 DATA QUALITY (Investor Profiles):');
    console.log('-'.repeat(80));
    const i = dataQuality.investors;
    console.log(`   Total Investors Analyzed: ${i.total}`);
    console.log(`   Data Completeness:`);
    console.log(`     Name:             ${i.completeness.name} (${Math.round(i.completeness.name / i.total * 100)}%)`);
    console.log(`     Description:      ${i.completeness.description} (${Math.round(i.completeness.description / i.total * 100)}%)`);
    console.log(`     Sectors:          ${i.completeness.sectors} (${Math.round(i.completeness.sectors / i.total * 100)}%)`);
    console.log(`     Check Size:       ${i.completeness.check_size} (${Math.round(i.completeness.check_size / i.total * 100)}%)`);
    console.log(`     Stage Prefs:      ${i.completeness.stage_preferences} (${Math.round(i.completeness.stage_preferences / i.total * 100)}%)`);
    console.log(`     Thesis:           ${i.completeness.thesis} (${Math.round(i.completeness.thesis / i.total * 100)}%)`);
    console.log(`     Website:          ${i.completeness.website} (${Math.round(i.completeness.website / i.total * 100)}%)`);
    console.log('');
  }
  
  // 6. Templates Status
  console.log('📝 FOUNDER TOOLKIT TEMPLATES:');
  console.log('-'.repeat(80));
  const templates = await getTemplatesStatus();
  console.log(`   Total Templates: ${templates.total}`);
  console.log(`   Active Templates: ${templates.active}`);
  console.log(`   Categories:`);
  Object.entries(templates.categories).forEach(([cat, count]) => {
    console.log(`     ${cat}: ${count}`);
  });
  console.log('');
  
  // 7. Discovery Status
  console.log('🔍 STARTUP DISCOVERY:');
  console.log('-'.repeat(80));
  const discovery = await getDiscoveryStatus();
  console.log(`   Unimported Discovered: ${discovery.unimported}`);
  console.log(`   Discovered (Last 24h): ${discovery.discovered24h}`);
  console.log(`   Rate: ${(discovery.discovered24h / 24).toFixed(1)} startups/hour`);
  console.log(`   Projected Daily: ${(discovery.discovered24h / 24 * 24).toFixed(0)} startups/day`);
  console.log('');
  
  console.log('='.repeat(80));
  console.log('✅ Status report complete');
  console.log('='.repeat(80) + '\n');
}

main().catch(console.error);

