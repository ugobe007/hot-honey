#!/usr/bin/env node
/**
 * TRACK GOD SCORE HISTORY
 * ========================
 * 
 * Collects historical GOD scores for startups to enable ARIMA-based predictions.
 * 
 * Usage:
 *   node scripts/track-god-score-history.js [startup_id]
 * 
 * This creates/updates a history table that stores monthly GOD score snapshots.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const ARIMA = require('arima');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Get or create GOD score history for a startup
 */
async function getGodScoreHistory(startupId) {
  // Check if history table exists, if not create it
  // For now, we'll use a simple approach: store in a JSONB column or separate table
  
  const { data, error } = await supabase
    .from('startup_uploads')
    .select('id, total_god_score, god_score_history')
    .eq('id', startupId)
    .single();

  if (error || !data) {
    return null;
  }

  // Get history from god_score_history JSONB column, or create empty array
  let history = data.god_score_history || [];
  
  // Add current score if it's different from last entry
  const currentScore = data.total_god_score || 0;
  if (history.length === 0 || history[history.length - 1].score !== currentScore) {
    history.push({
      score: currentScore,
      timestamp: new Date().toISOString(),
      month: new Date().toISOString().substring(0, 7) // YYYY-MM
    });
    
    // Keep only last 12 months
    if (history.length > 12) {
      history = history.slice(-12);
    }
    
    // Update history
    await supabase
      .from('startup_uploads')
      .update({ god_score_history: history })
      .eq('id', startupId);
  }

  // Return just the scores array for ARIMA
  return history.map(h => h.score);
}

/**
 * Predict future GOD scores using ARIMA
 */
function predictGodScore(godScoreHistory, months = 6) {
  if (!godScoreHistory || godScoreHistory.length < 3) {
    return null;
  }

  try {
    // Use AutoARIMA to find best parameters
    const autoarima = new ARIMA({ 
      auto: true,
      verbose: false 
    }).train(godScoreHistory);

    // Predict next N months
    const [predictions, errors] = autoarima.predict(months);

    if (!predictions || predictions.length === 0) {
      return null;
    }

    return {
      predictions: predictions.map(p => Math.round(p)),
      errors: errors || [],
      avgPredicted: Math.round(predictions.reduce((sum, p) => sum + p, 0) / predictions.length),
      currentScore: godScoreHistory[godScoreHistory.length - 1],
      delta: Math.round((predictions.reduce((sum, p) => sum + p, 0) / predictions.length - godScoreHistory[godScoreHistory.length - 1]) * 10) / 10
    };
  } catch (error) {
    console.error('ARIMA prediction error:', error.message);
    return null;
  }
}

/**
 * Example usage
 */
async function example() {
  const startupId = process.argv[2];
  
  if (!startupId) {
    console.log('Usage: node scripts/track-god-score-history.js <startup_id>');
    console.log('\nExample:');
    console.log('  node scripts/track-god-score-history.js a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    return;
  }

  console.log('═'.repeat(60));
  console.log('📊 GOD SCORE HISTORY & PREDICTION');
  console.log('═'.repeat(60));
  console.log('');

  // Get history
  const history = await getGodScoreHistory(startupId);
  
  if (!history || history.length === 0) {
    console.log('❌ No history found for startup:', startupId);
    return;
  }

  console.log('📈 Historical Scores:');
  console.log('  ' + history.join(' → '));
  console.log('');

  // Predict future
  const prediction = predictGodScore(history, 6);
  
  if (prediction) {
    console.log('🔮 ARIMA Prediction (next 6 months):');
    console.log('  Current Score:', prediction.currentScore);
    console.log('  Predicted Scores:', prediction.predictions.join(', '));
    console.log('  Average Predicted:', prediction.avgPredicted);
    console.log('  Delta (Δ):', prediction.delta > 0 ? '+' : '', prediction.delta);
    console.log('');
    console.log('  Example: GOD Score:', prediction.currentScore, '→', prediction.avgPredicted, `(Δ ${prediction.delta > 0 ? '+' : ''}${prediction.delta})`);
  } else {
    console.log('⚠️  Not enough data for prediction (need at least 3 data points)');
  }

  console.log('');
  console.log('═'.repeat(60));
}

// Run if called directly
if (require.main === module) {
  example().catch(console.error);
}

module.exports = {
  getGodScoreHistory,
  predictGodScore
};



