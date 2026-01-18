/**
 * PHASE CHANGE ENGINE - GOD Score Integration Service
 * 
 * Purpose: Calculate and update phase-adjusted GOD scores for all startups
 * Run via: node server/services/phaseGodIntegration.js
 * PM2: Can be added to ecosystem.config.js for continuous updates
 */

import('dotenv/config');
import { createClient } from '@supabase/client';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ========================================
// PHASE-ADJUSTED GOD SCORE CALCULATION
// ========================================

/**
 * Calculate phase-adjusted GOD score for a single startup
 */
async function calculatePhaseAdjustedGod(startupId) {
  try {
    // Get base GOD score
    const { data: startup, error: startupError } = await supabase
      .from('startup_uploads')
      .select('id, name, total_god_score')
      .eq('id', startupId)
      .single();
    
    if (startupError || !startup) {
      return { success: false, error: 'Startup not found' };
    }
    
    const baseGodScore = startup.total_god_score || 0;
    
    // Get Phase Change Multiplier (PCM)
    const { data: phaseMultiplier, error: pcmError } = await supabase
      .from('startup_phase_multiplier')
      .select('pcm, goldilocks_phase_state, pvi_7d, domains_7d')
      .eq('startup_id', startupId)
      .single();
    
    // If no phase changes exist, PCM = 1.0 (no adjustment)
    const pcm = phaseMultiplier?.pcm || 1.0;
    const phaseAdjustedGod = baseGodScore * pcm;
    
    return {
      success: true,
      startup_id: startupId,
      startup_name: startup.name,
      base_god_score: baseGodScore,
      pcm,
      phase_adjusted_god_score: phaseAdjustedGod,
      goldilocks_state: phaseMultiplier?.goldilocks_phase_state || 'quiet',
      pvi_7d: phaseMultiplier?.pvi_7d || 0,
      domains_activated: phaseMultiplier?.domains_7d || 0,
    };
  } catch (error) {
    console.error(`Error calculating phase-adjusted GOD for ${startupId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Bulk update phase-adjusted GOD scores for all approved startups
 */
async function bulkUpdatePhaseAdjustedScores() {
  console.log('🚀 Starting bulk phase-adjusted GOD score update...');
  
  try {
    // Get all approved startups
    const { data: startups, error } = await supabase
      .from('startup_uploads')
      .select('id, name, total_god_score')
      .eq('status', 'approved');
    
    if (error) {
      console.error('Error fetching startups:', error);
      return;
    }
    
    console.log(`📊 Processing ${startups.length} startups...`);
    
    const results = {
      total: startups.length,
      updated: 0,
      with_phase_boost: 0,
      goldilocks_startups: [],
      errors: 0,
    };
    
    for (const startup of startups) {
      const result = await calculatePhaseAdjustedGod(startup.id);
      
      if (result.success) {
        results.updated++;
        
        // Track startups with phase boost (PCM > 1.2)
        if (result.pcm > 1.2) {
          results.with_phase_boost++;
          
          // Track Goldilocks candidates (surge or breakout state)
          if (result.goldilocks_state === 'surge' || result.goldilocks_state === 'breakout') {
            results.goldilocks_startups.push({
              name: result.startup_name,
              state: result.goldilocks_state,
              base_god: result.base_god_score,
              adjusted_god: result.phase_adjusted_god_score,
              boost_percent: ((result.pcm - 1) * 100).toFixed(1),
              domains: result.domains_activated,
            });
          }
        }
        
        // Log significant boosts
        if (result.pcm > 1.5) {
          console.log(`  ⚡ ${result.startup_name}: ${result.base_god_score.toFixed(1)} → ${result.phase_adjusted_god_score.toFixed(1)} (${result.goldilocks_state}, ${result.pcm.toFixed(2)}x)`);
        }
      } else {
        results.errors++;
      }
    }
    
    console.log('\n✅ Phase-adjusted GOD score update complete!');
    console.log(`📈 Total processed: ${results.total}`);
    console.log(`🎯 Updated: ${results.updated}`);
    console.log(`⚡ With phase boost (>1.2x): ${results.with_phase_boost}`);
    console.log(`🌟 Goldilocks candidates: ${results.goldilocks_startups.length}`);
    console.log(`❌ Errors: ${results.errors}`);
    
    if (results.goldilocks_startups.length > 0) {
      console.log('\n🔥 Goldilocks Startups (Surge/Breakout State):');
      results.goldilocks_startups
        .sort((a, b) => b.adjusted_god - a.adjusted_god)
        .slice(0, 10)
        .forEach((s, i) => {
          console.log(`  ${i + 1}. ${s.name} (${s.state})`);
          console.log(`     GOD: ${s.base_god.toFixed(1)} → ${s.adjusted_god.toFixed(1)} (+${s.boost_percent}%)`);
          console.log(`     Domains active: ${s.domains}/5`);
        });
    }
    
    // Log to ai_logs table
    await supabase.from('ai_logs').insert({
      type: 'phase_god_update',
      action: 'bulk_recalculation',
      status: 'success',
      output: {
        timestamp: new Date().toISOString(),
        results,
        goldilocks_count: results.goldilocks_startups.length,
        top_goldilocks: results.goldilocks_startups.slice(0, 5),
      },
    });
    
    return results;
    
  } catch (error) {
    console.error('❌ Bulk update failed:', error);
    
    await supabase.from('ai_logs').insert({
      type: 'phase_god_update',
      action: 'bulk_recalculation',
      status: 'error',
      output: { error: error.message },
    });
    
    throw error;
  }
}

/**
 * Get top startups by phase-adjusted GOD score
 */
async function getTopPhaseAdjustedStartups(limit = 50) {
  try {
    // Query combines base GOD score with phase multiplier
    const { data, error } = await supabase
      .rpc('get_top_phase_adjusted_startups', { result_limit: limit });
    
    if (error) {
      // Fallback: manual calculation
      console.log('Using fallback calculation method...');
      
      const { data: startups } = await supabase
        .from('startup_uploads')
        .select(`
          id,
          name,
          total_god_score,
          sectors,
          status
        `)
        .eq('status', 'approved')
        .order('total_god_score', { ascending: false })
        .limit(200);  // Get top 200, then re-rank with phase adjustment
      
      // Calculate phase-adjusted scores
      const adjusted = [];
      for (const startup of startups) {
        const result = await calculatePhaseAdjustedGod(startup.id);
        if (result.success) {
          adjusted.push({
            ...startup,
            phase_adjusted_god_score: result.phase_adjusted_god_score,
            pcm: result.pcm,
            goldilocks_state: result.goldilocks_state,
          });
        }
      }
      
      // Re-rank by phase-adjusted score
      return adjusted
        .sort((a, b) => b.phase_adjusted_god_score - a.phase_adjusted_god_score)
        .slice(0, limit);
    }
    
    return data;
    
  } catch (error) {
    console.error('Error fetching top phase-adjusted startups:', error);
    return [];
  }
}

/**
 * Get Goldilocks candidates (surge/breakout state)
 */
async function getGoldilocksCandidates() {
  try {
    const { data, error } = await supabase
      .from('startup_phase_multiplier')
      .select(`
        startup_id,
        goldilocks_phase_state,
        pvi_7d,
        domains_7d,
        avg_irrev_7d,
        pvi_accel_ratio,
        pcm
      `)
      .in('goldilocks_phase_state', ['surge', 'breakout'])
      .order('pvi_7d', { ascending: false });
    
    if (error) throw error;
    
    // Enrich with startup data
    const enriched = [];
    for (const phase of data) {
      const { data: startup } = await supabase
        .from('startup_uploads')
        .select('id, name, total_god_score, sectors')
        .eq('id', phase.startup_id)
        .eq('status', 'approved')
        .single();
      
      if (startup) {
        enriched.push({
          ...startup,
          ...phase,
          phase_adjusted_god_score: startup.total_god_score * phase.pcm,
        });
      }
    }
    
    return enriched;
    
  } catch (error) {
    console.error('Error fetching Goldilocks candidates:', error);
    return [];
  }
}

// ========================================
// CLI INTERFACE
// ========================================

async function main() {
  const command = process.argv[2] || 'update';
  
  switch (command) {
    case 'update':
    case 'recalculate':
      await bulkUpdatePhaseAdjustedScores();
      break;
      
    case 'top':
      const limit = parseInt(process.argv[3]) || 50;
      console.log(`\n🏆 Top ${limit} Startups by Phase-Adjusted GOD Score:\n`);
      const topStartups = await getTopPhaseAdjustedStartups(limit);
      topStartups.forEach((s, i) => {
        console.log(`${i + 1}. ${s.name}`);
        console.log(`   Phase-Adjusted GOD: ${s.phase_adjusted_god_score?.toFixed(1) || 'N/A'}`);
        console.log(`   Base GOD: ${s.total_god_score?.toFixed(1)}`);
        console.log(`   Multiplier: ${s.pcm?.toFixed(2)}x`);
        console.log(`   State: ${s.goldilocks_state || 'quiet'}\n`);
      });
      break;
      
    case 'goldilocks':
      console.log('\n🌟 Goldilocks Candidates (Surge/Breakout):\n');
      const candidates = await getGoldilocksCandidates();
      candidates.forEach((s, i) => {
        console.log(`${i + 1}. ${s.name} (${s.goldilocks_phase_state})`);
        console.log(`   Phase-Adjusted GOD: ${s.phase_adjusted_god_score.toFixed(1)}`);
        console.log(`   PVI (7d): ${s.pvi_7d.toFixed(2)}`);
        console.log(`   Domains Active: ${s.domains_7d}/5`);
        console.log(`   Multiplier: ${s.pcm.toFixed(2)}x\n`);
      });
      break;
      
    case 'single':
      const startupId = process.argv[3];
      if (!startupId) {
        console.error('Usage: node phaseGodIntegration.js single <startup_id>');
        process.exit(1);
      }
      const result = await calculatePhaseAdjustedGod(startupId);
      console.log('\n📊 Phase-Adjusted GOD Score:');
      console.log(JSON.stringify(result, null, 2));
      break;
      
    case 'help':
    default:
      console.log(`
Phase Change Engine - GOD Score Integration

Usage:
  node phaseGodIntegration.js [command] [options]

Commands:
  update          Recalculate phase-adjusted GOD scores for all startups
  top [N]         Show top N startups by phase-adjusted score (default: 50)
  goldilocks      Show all Goldilocks candidates (surge/breakout state)
  single <id>     Calculate phase-adjusted score for single startup
  help            Show this help message

Examples:
  node phaseGodIntegration.js update
  node phaseGodIntegration.js top 100
  node phaseGodIntegration.js goldilocks
  node phaseGodIntegration.js single 550e8400-e29b-41d4-a716-446655440000
      `);
      break;
  }
  
  process.exit(0);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export {
  calculatePhaseAdjustedGod,
  bulkUpdatePhaseAdjustedScores,
  getTopPhaseAdjustedStartups,
  getGoldilocksCandidates,
};
