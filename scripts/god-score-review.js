#!/usr/bin/env node
/**
 * GOD Score Comprehensive Review
 * Answers three key questions:
 * 1. What is the current GOD score number (average, distribution)
 * 2. How are the GOD industry numbers (by sector/industry)
 * 3. How is GOD comparing to VC benchmarks (component analysis)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function reviewGODScores() {
  console.log('\n🔍 GOD SCORE COMPREHENSIVE REVIEW');
  console.log('═'.repeat(60));
  
  try {
    // [1] CURRENT GOD SCORE STATISTICS
    console.log('\n[1] CURRENT GOD SCORE STATISTICS');
    console.log('─'.repeat(60));
    
    const { data: startups, error: statsError } = await supabase
      .from('startup_uploads')
      .select('total_god_score, status')
      .eq('status', 'approved');
    
    if (statsError) throw statsError;
    
    const withScores = (startups || []).filter(s => s.total_god_score !== null && s.total_god_score !== undefined);
    const withoutScores = (startups || []).filter(s => s.total_god_score === null || s.total_god_score === undefined);
    const scores = withScores.map(s => s.total_god_score);
    
    if (scores.length === 0) {
      console.log('⚠️  No startups with GOD scores found!');
      return;
    }
    
    const sorted = [...scores].sort((a, b) => a - b);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p25 = sorted[Math.floor(sorted.length * 0.25)];
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    
    const distribution = {
      elite: scores.filter(s => s >= 90).length,
      excellent: scores.filter(s => s >= 80 && s < 90).length,
      good: scores.filter(s => s >= 70 && s < 80).length,
      average: scores.filter(s => s >= 60 && s < 70).length,
      needsWork: scores.filter(s => s < 60).length,
    };
    
    console.log(`✅ Startups with scores: ${withScores.length}`);
    console.log(`⚠️  Startups without scores: ${withoutScores.length}`);
    console.log(`\n📊 Score Distribution:`);
    console.log(`   Average: ${avg.toFixed(2)}`);
    console.log(`   Median: ${median.toFixed(2)}`);
    console.log(`   Min: ${Math.min(...scores)}`);
    console.log(`   Max: ${Math.max(...scores)}`);
    console.log(`   P25: ${p25.toFixed(2)} | P75: ${p75.toFixed(2)}`);
    console.log(`\n📈 Score Categories:`);
    console.log(`   🏆 Elite (90+): ${distribution.elite} (${(distribution.elite / scores.length * 100).toFixed(1)}%)`);
    console.log(`   ⭐ Excellent (80-89): ${distribution.excellent} (${(distribution.excellent / scores.length * 100).toFixed(1)}%)`);
    console.log(`   ✅ Good (70-79): ${distribution.good} (${(distribution.good / scores.length * 100).toFixed(1)}%)`);
    console.log(`   📊 Average (60-69): ${distribution.average} (${(distribution.average / scores.length * 100).toFixed(1)}%)`);
    console.log(`   🔧 Needs Work (<60): ${distribution.needsWork} (${(distribution.needsWork / scores.length * 100).toFixed(1)}%)`);
    
    // [2] GOD SCORES BY INDUSTRY/SECTOR
    console.log('\n\n[2] GOD SCORES BY INDUSTRY/SECTOR');
    console.log('─'.repeat(60));
    
    const { data: industryData, error: industryError } = await supabase
      .from('startup_uploads')
      .select('sectors, total_god_score')
      .eq('status', 'approved')
      .not('total_god_score', 'is', null);
    
    if (industryError) throw industryError;
    
    // Use sectors only (industries column doesn't exist)
    const industryMap = new Map();
      
      (industryData || []).forEach(startup => {
        const industries = [
          ...(startup.sectors || [])
        ];
      
      industries.forEach(industry => {
        if (!industry) return;
        if (!industryMap.has(industry)) {
          industryMap.set(industry, []);
        }
        industryMap.get(industry).push(startup.total_god_score);
      });
    });
    
    const industryStats = Array.from(industryMap.entries())
      .map(([industry, scores]) => ({
        industry,
        count: scores.length,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
        min: Math.min(...scores),
        max: Math.max(...scores),
        highScorers: scores.filter(s => s >= 80).length
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 20);
    
    if (industryStats.length > 0) {
      console.log(`\n📊 Top Industries by Average GOD Score (showing top 20):\n`);
      industryStats.forEach((stat, idx) => {
        const pct = (stat.highScorers / stat.count * 100).toFixed(1);
        console.log(`${(idx + 1).toString().padStart(2)}. ${stat.industry.padEnd(25)} | Avg: ${stat.avg.toFixed(1)} | Count: ${stat.count.toString().padStart(4)} | High (80+): ${stat.highScorers} (${pct}%)`);
      });
    } else {
      console.log('⚠️  No industry data available');
    }
    
    // [3] GOD COMPONENT ANALYSIS (VC Benchmark Comparison)
    console.log('\n\n[3] GOD COMPONENT ANALYSIS (VC Benchmark Comparison)');
    console.log('─'.repeat(60));
    
    // Try to get all component scores, but handle missing columns gracefully
    let componentData;
    const { data: fullComponentData, error: componentError } = await supabase
      .from('startup_uploads')
      .select('team_score, traction_score, market_score, product_score, vision_score, ecosystem_score, grit_score, problem_validation_score')
      .eq('status', 'approved')
      .not('total_god_score', 'is', null);
    
    if (componentError) {
      // If columns don't exist, try without the optional ones
      if (componentError.message.includes('ecosystem_score') || componentError.message.includes('grit_score') || componentError.message.includes('problem_validation_score')) {
        console.log('\n⚠️  Note: Some GOD component columns are missing. Run migration: migrations/add_ecosystem_grit_scores.sql');
        console.log('   Using available component scores only...\n');
        
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('startup_uploads')
          .select('team_score, traction_score, market_score, product_score, vision_score')
          .eq('status', 'approved')
          .not('total_god_score', 'is', null);
        
        if (fallbackError) throw fallbackError;
        
        // Use fallback data for components that exist
        componentData = fallbackData;
      } else {
        throw componentError;
      }
    } else {
      componentData = fullComponentData;
    }
    
    // Check which columns actually exist in the data
    const availableKeys = componentData && componentData.length > 0 
      ? Object.keys(componentData[0]).filter(key => key.includes('_score'))
      : [];
    
    const allComponents = [
      { key: 'team_score', name: 'Team', ideal: 75, description: 'Technical founders, experience, domain expertise' },
      { key: 'traction_score', name: 'Traction', ideal: 70, description: 'Revenue, growth, customers, retention' },
      { key: 'market_score', name: 'Market', ideal: 70, description: 'TAM, market timing, problem importance' },
      { key: 'product_score', name: 'Product', ideal: 65, description: 'Launch status, demo, defensibility' },
      { key: 'vision_score', name: 'Vision', ideal: 65, description: 'Contrarian insights, creative strategy' },
      { key: 'ecosystem_score', name: 'Ecosystem', ideal: 60, description: 'Partners, advisors, platform deps' },
      { key: 'grit_score', name: 'Grit', ideal: 60, description: 'Pivots, iteration, customer feedback' },
      { key: 'problem_validation_score', name: 'Problem Validation', ideal: 65, description: 'Customer interviews, ICP clarity' }
    ];
    
    // Filter to only components that exist in the data
    const components = allComponents.filter(comp => availableKeys.includes(comp.key));
    
    if (components.length === 0) {
      console.log('\n⚠️  No component score columns found. Please run the migration to add GOD component scores.');
      return;
    }
    
    console.log('\n📊 Component Score Averages (vs Ideal VC Benchmarks):\n');
    
    components.forEach(comp => {
      const scores = (componentData || [])
        .map(s => s[comp.key])
        .filter(s => s !== null && s !== undefined && !isNaN(s));
      
      if (scores.length === 0) {
        console.log(`   ${comp.name.padEnd(20)} | No data available`);
        return;
      }
      
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const diff = avg - comp.ideal;
      const status = diff >= 5 ? '✅' : diff >= -5 ? '⚠️' : '❌';
      
      console.log(`   ${status} ${comp.name.padEnd(18)} | Avg: ${avg.toFixed(1).padStart(5)} | Ideal: ${comp.ideal} | Diff: ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}`);
      console.log(`      ${comp.description}`);
    });
    
    // Warn if some components are missing
    const missingComponents = allComponents.filter(comp => !availableKeys.includes(comp.key));
    if (missingComponents.length > 0) {
      console.log(`\n⚠️  Missing component columns: ${missingComponents.map(c => c.name).join(', ')}`);
      console.log(`   Run migration: migrations/add_ecosystem_grit_scores.sql`);
    }
    
    // [4] TOP 20 STARTUPS
    console.log('\n\n[4] TOP 20 STARTUPS BY GOD SCORE');
    console.log('─'.repeat(60));
    
    const { data: topStartups, error: topError } = await supabase
      .from('startup_uploads')
      .select('name, total_god_score, team_score, traction_score, market_score, product_score, vision_score, sectors, stage')
      .eq('status', 'approved')
      .not('total_god_score', 'is', null)
      .order('total_god_score', { ascending: false })
      .limit(20);
    
    if (topError) throw topError;
    
    if (topStartups && topStartups.length > 0) {
      console.log('\n🏆 Top 20 Startups:\n');
      topStartups.forEach((startup, idx) => {
        const sectors = startup.sectors?.slice(0, 2).join(', ') || 'N/A';
        console.log(`${(idx + 1).toString().padStart(2)}. ${startup.name.padEnd(30)} | Score: ${startup.total_god_score} | Stage: ${startup.stage || 'N/A'}`);
        console.log(`    Sectors: ${sectors}`);
      });
    }
    
    console.log('\n✅ Review complete!\n');
    
  } catch (error) {
    console.error('❌ Error reviewing GOD scores:', error.message);
    process.exit(1);
  }
}

reviewGODScores();
