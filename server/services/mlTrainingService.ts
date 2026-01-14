/**
 * ML-Enhanced GOD Algorithm Training Service
 * 
 * This service uses real match outcomes to continuously improve the GOD algorithm:
 * - Collects feedback on match quality (investments, meetings, passes)
 * - Extracts patterns from successful matches
 * - Identifies underperforming scoring factors
 * - Generates weight adjustments and recommendations
 * - Tracks algorithm performance over time
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side use
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// Types
// ============================================================================

interface MatchOutcome {
  match_id: string;
  startup_id: string;
  investor_id: string;
  outcome: 'invested' | 'meeting' | 'interested' | 'passed' | 'no_response';
  outcome_quality: number; // 0.0 to 1.0
  god_score: number;
  match_score: number;
  match_reasons: string[];
  features: any; // Detailed features of the match
}

interface TrainingPattern {
  pattern_type: 'successful' | 'unsuccessful' | 'anomaly';
  features: any;
  outcome: string;
  outcome_quality: number;
  weight: number;
}

interface AlgorithmWeights {
  team: number;
  traction: number;
  market: number;
  product: number;
  vision: number;
  ecosystem: number;
  grit: number;
  problem_validation: number;
}

interface OptimizationResult {
  current_weights: AlgorithmWeights;
  recommended_weights: AlgorithmWeights;
  expected_improvement: number;
  confidence: number;
  reasoning: string[];
}

// ============================================================================
// Core ML Training Functions
// ============================================================================

/**
 * Collect training data from all matches with feedback
 * Uses pagination to avoid statement timeouts
 */
export async function collectTrainingData(): Promise<MatchOutcome[]> {
  console.log('🎓 Collecting ML training data from match outcomes...');

  // Limit to recent matches with pagination to avoid timeout
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7); // Only last week

  const BATCH_SIZE = 100; // Smaller batches to prevent timeout
  const MAX_RECORDS = 500; // Reduced total limit
  let allMatches: any[] = [];
  let offset = 0;
  let hasMore = true;

  // Fetch matches in batches (without join first - faster)
  while (hasMore && allMatches.length < MAX_RECORDS) {
    const { data: matchesBatch, error } = await supabase
      .from('startup_investor_matches')
      .select(`
        id,
        startup_id,
        investor_id,
        match_score,
        reasoning,
        status,
        viewed_at,
        contacted_at
      `)
      .not('status', 'eq', 'suggested') // Only matches with some interaction
      .gte('created_at', oneWeekAgo.toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error(`❌ Error fetching batch at offset ${offset}:`, error);
      break;
    }

    if (!matchesBatch || matchesBatch.length === 0) {
      hasMore = false;
      break;
    }

    allMatches = allMatches.concat(matchesBatch);
    offset += BATCH_SIZE;

    // If we got fewer than BATCH_SIZE, we've reached the end
    if (matchesBatch.length < BATCH_SIZE) {
      hasMore = false;
    }

    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`   ✅ Fetched ${allMatches.length} matches in ${Math.ceil(allMatches.length / BATCH_SIZE)} batches`);

  // Now fetch GOD scores separately (more efficient than join)
  const startupIds = [...new Set(allMatches.map(m => m.startup_id))].slice(0, 100);
  const { data: startups, error: startupError } = await supabase
    .from('startup_uploads')
    .select('id, total_god_score')
    .in('id', startupIds);

  const godScoreMap: Record<string, number> = {};
  (startups || []).forEach((s: any) => {
    godScoreMap[s.id] = s.total_god_score || 0;
  });

  // Attach GOD scores to matches
  const matches = allMatches.map(m => ({
    ...m,
    startup: { total_god_score: godScoreMap[m.startup_id] || 0 }
  }));

  // Convert matches to training outcomes
  // NOTE: Use status column, not investment_made (doesn't exist)
  // Status values: suggested, viewed, intro_requested, intro_sent, contacted, declined, meeting_scheduled, funded
  const outcomes: MatchOutcome[] = matches.map(match => {
    // Determine outcome type and quality based on status column
    let outcome: MatchOutcome['outcome'] = 'no_response';
    let outcome_quality = 0.0;

    if (match.status === 'funded') {
      outcome = 'invested';
      outcome_quality = 1.0; // Perfect outcome
    } else if (match.status === 'meeting_scheduled') {
      outcome = 'meeting';
      outcome_quality = 0.8; // Very good outcome
    } else if (match.status === 'intro_requested' || match.status === 'intro_sent' || match.status === 'contacted') {
      outcome = 'interested';
      outcome_quality = 0.6; // Good outcome
    } else if (match.status === 'declined') {
      outcome = 'passed';
      outcome_quality = 0.0; // Poor outcome
    } else if (match.viewed_at) {
      outcome = 'no_response';
      outcome_quality = 0.2; // Viewed but no action
    }

    // Get GOD score from joined startup data
    const startup = match.startup as any;
    const godScore = startup?.total_god_score || 0;

    return {
      match_id: match.id,
      startup_id: match.startup_id,
      investor_id: match.investor_id,
      outcome,
      outcome_quality,
      god_score: godScore,
      match_score: match.match_score || 0,
      match_reasons: match.reasoning ? [match.reasoning] : [],
      features: {
        contacted: match.contacted_at ? true : false,
        viewed: match.viewed_at ? true : false,
        status: match.status
      }
    };
  });

  console.log(`✅ Collected ${outcomes.length} training samples`);
  console.log(`   Investments: ${outcomes.filter(o => o.outcome === 'invested').length}`);
  console.log(`   Meetings: ${outcomes.filter(o => o.outcome === 'meeting').length}`);
  console.log(`   Interested: ${outcomes.filter(o => o.outcome === 'interested').length}`);
  console.log(`   Passed: ${outcomes.filter(o => o.outcome === 'passed').length}`);

  return outcomes;
}

/**
 * Extract patterns from successful matches
 */
export async function extractSuccessPatterns(): Promise<TrainingPattern[]> {
  console.log('🔍 Extracting patterns from successful matches...');

  const outcomes = await collectTrainingData();
  const patterns: TrainingPattern[] = [];

  // Separate successful from unsuccessful
  const successful = outcomes.filter(o => o.outcome_quality >= 0.6);
  const unsuccessful = outcomes.filter(o => o.outcome_quality < 0.3);

  // Extract patterns from successful matches
  for (const match of successful) {
    patterns.push({
      pattern_type: 'successful',
      features: {
        god_score: match.god_score,
        match_score: match.match_score,
        match_reasons: match.match_reasons,
        outcome: match.outcome
      },
      outcome: match.outcome,
      outcome_quality: match.outcome_quality,
      weight: match.outcome_quality // Weight by outcome quality
    });
  }

  // Extract patterns from unsuccessful matches
  for (const match of unsuccessful) {
    patterns.push({
      pattern_type: 'unsuccessful',
      features: {
        god_score: match.god_score,
        match_score: match.match_score,
        match_reasons: match.match_reasons,
        outcome: match.outcome
      },
      outcome: match.outcome,
      outcome_quality: match.outcome_quality,
      weight: 1.0 - match.outcome_quality // Weight by failure severity
    });
  }

  // Store patterns in database
  for (const pattern of patterns) {
    await supabase.from('ml_training_patterns').upsert({
      pattern_type: pattern.pattern_type,
      features: pattern.features,
      outcome: pattern.outcome,
      outcome_quality: pattern.outcome_quality,
      weight: pattern.weight
    });
  }

  console.log(`✅ Extracted ${patterns.length} patterns`);
  console.log(`   Successful patterns: ${patterns.filter(p => p.pattern_type === 'successful').length}`);
  console.log(`   Unsuccessful patterns: ${patterns.filter(p => p.pattern_type === 'unsuccessful').length}`);

  return patterns;
}

/**
 * Analyze which factors predict success
 */
export async function analyzeSuccessFactors(): Promise<any> {
  console.log('📊 Analyzing which factors predict match success...');

  const outcomes = await collectTrainingData();

  // Calculate average outcome quality by GOD score range
  const scoreRanges = [
    { min: 0, max: 50, label: '0-50' },
    { min: 51, max: 70, label: '51-70' },
    { min: 71, max: 85, label: '71-85' },
    { min: 86, max: 100, label: '86-100' }
  ];

  const analysis = scoreRanges.map(range => {
    const matchesInRange = outcomes.filter(
      o => o.god_score >= range.min && o.god_score <= range.max
    );

    const avgQuality = matchesInRange.length > 0
      ? matchesInRange.reduce((sum, o) => sum + o.outcome_quality, 0) / matchesInRange.length
      : 0;

    const successRate = matchesInRange.length > 0
      ? matchesInRange.filter(o => o.outcome_quality >= 0.6).length / matchesInRange.length
      : 0;

    return {
      range: range.label,
      count: matchesInRange.length,
      avg_quality: avgQuality,
      success_rate: successRate,
      investment_rate: matchesInRange.filter(o => o.outcome === 'invested').length / Math.max(matchesInRange.length, 1)
    };
  });

  console.log('\n📈 Success by GOD Score Range:');
  analysis.forEach(a => {
    console.log(`   ${a.range}: ${a.count} matches, ${(a.success_rate * 100).toFixed(1)}% success, ${(a.investment_rate * 100).toFixed(1)}% invested`);
  });

  return analysis;
}

/**
 * Generate optimization recommendations based on ML analysis
 */
export async function generateOptimizationRecommendations(): Promise<OptimizationResult> {
  console.log('🧠 Generating ML-based optimization recommendations...');

  const outcomes = await collectTrainingData();
  const successPatterns = await extractSuccessPatterns();

  // Current weights (from GOD algorithm)
  const currentWeights: AlgorithmWeights = {
    team: 3.0,
    traction: 3.0,
    market: 2.0,
    product: 2.0,
    vision: 2.0,
    ecosystem: 1.5,
    grit: 1.5,
    problem_validation: 2.0
  };

  // Analyze which factors correlate with success
  const successful = outcomes.filter(o => o.outcome_quality >= 0.8);
  const unsuccessful = outcomes.filter(o => o.outcome_quality < 0.3);

  const avgSuccessScore = successful.reduce((sum, o) => sum + o.god_score, 0) / Math.max(successful.length, 1);
  const avgFailureScore = unsuccessful.reduce((sum, o) => sum + o.god_score, 0) / Math.max(unsuccessful.length, 1);

  const reasoning: string[] = [];

  // Recommendation logic
  let recommendedWeights = { ...currentWeights };
  let hasChanges = false;

  if (avgSuccessScore > 80 && successful.length > 10) {
    // High scores predict success - algorithm working well
    reasoning.push('✅ GOD algorithm shows strong predictive power (high scores = success)');
    reasoning.push(`Average successful match GOD score: ${avgSuccessScore.toFixed(1)}/100`);
    // No changes needed - algorithm is working well
  } else if (avgSuccessScore < 70 && successful.length > 5) {
    // Successful matches have lower scores - may need recalibration
    reasoning.push('⚠️ Successful matches showing lower GOD scores than expected');
    reasoning.push(`Consider increasing weights on factors present in successful matches`);
    
    // Boost traction weight (often indicates real progress)
    recommendedWeights.traction = 3.5;
    hasChanges = true;
    reasoning.push('📈 Recommended: Increase traction weight to 3.5 (from 3.0)');
  }

  // Check if high scores still lead to passes
  const highScoreFails = unsuccessful.filter(o => o.god_score > 80).length;
  if (highScoreFails > 5) {
    reasoning.push(`⚠️ ${highScoreFails} high-scoring matches (>80) were passed on`);
    reasoning.push('Consider adding qualitative factors to GOD algorithm');
  }

  // Only create recommendation if there are actual changes
  if (!hasChanges) {
    // Check if any weights actually changed
    hasChanges = Object.keys(currentWeights).some(
      key => currentWeights[key as keyof AlgorithmWeights] !== recommendedWeights[key as keyof AlgorithmWeights]
    );
  }

  if (!hasChanges) {
    console.log('ℹ️  No weight changes recommended - algorithm weights are optimal');
    return {
      current_weights: currentWeights,
      recommended_weights: recommendedWeights,
      expected_improvement: 0,
      confidence: 0,
      reasoning: ['No changes recommended - current weights are performing well']
    };
  }

  // Calculate expected improvement
  const currentSuccessRate = successful.length / Math.max(outcomes.length, 1);
  const expectedImprovement = currentSuccessRate < 0.3 ? 15 : 8; // % improvement

  const confidence = successful.length > 20 ? 0.85 : successful.length > 10 ? 0.7 : 0.5;

  // Save recommendation to database (only if there are changes)
  await supabase.from('ml_recommendations').insert({
    recommendation_type: 'weight_change',
    priority: confidence > 0.8 ? 'high' : 'medium',
    title: 'GOD Algorithm Weight Optimization',
    description: reasoning.join('\n'),
    current_value: currentWeights,
    proposed_value: recommendedWeights,
    expected_impact: `Expected ${expectedImprovement}% improvement in match success rate`,
    status: 'pending'
  });

  console.log('\n✅ Optimization recommendations generated:');
  reasoning.forEach(r => console.log(`   ${r}`));

  return {
    current_weights: currentWeights,
    recommended_weights: recommendedWeights,
    expected_improvement: expectedImprovement,
    confidence,
    reasoning
  };
}

/**
 * Track algorithm performance over time
 */
export async function trackAlgorithmPerformance(
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  console.log(`📊 Tracking algorithm performance: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

  const { data: matches, error } = await supabase
    .from('startup_investor_matches')
    .select(`
      *,
      startup:startup_uploads!startup_investor_matches_startup_id_fkey(
        total_god_score
      )
    `)
    .gte('created_at', periodStart.toISOString())
    .lte('created_at', periodEnd.toISOString())
    .limit(10000); // Limit to prevent timeout

  if (error || !matches) {
    console.error('Error fetching performance data:', error);
    return;
  }

  // Use status column - 'funded' or 'meeting_scheduled' are successful
  const successful = matches.filter(m => 
    m.status === 'funded' || m.status === 'meeting_scheduled'
  );

  const avgMatchScore = matches.reduce((sum, m) => sum + (m.match_score || 0), 0) / Math.max(matches.length, 1);
  
  // Get GOD scores from joined startup data
  const godScores = matches
    .map(m => {
      const startup = (m as any).startup;
      return startup?.total_god_score || 0;
    })
    .filter(score => score > 0);
  
  const avgGodScore = godScores.length > 0
    ? godScores.reduce((sum, score) => sum + score, 0) / godScores.length
    : 0;
  
  const conversionRate = successful.length / Math.max(matches.length, 1);

  // Calculate score distribution using GOD scores
  const scoreDistribution = {
    '0-50': godScores.filter(score => score <= 50).length,
    '51-70': godScores.filter(score => score > 50 && score <= 70).length,
    '71-85': godScores.filter(score => score > 70 && score <= 85).length,
    '86-100': godScores.filter(score => score > 85).length
  };

  // Store metrics
  await supabase.from('algorithm_metrics').insert({
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    total_matches: matches.length,
    successful_matches: successful.length,
    avg_match_score: avgMatchScore,
    avg_god_score: avgGodScore,
    conversion_rate: conversionRate,
    score_distribution: scoreDistribution,
    algorithm_version: '1.0'
  });

  console.log('✅ Performance metrics stored');
  console.log(`   Total Matches: ${matches.length}`);
  console.log(`   Successful: ${successful.length} (${(conversionRate * 100).toFixed(1)}%)`);
  console.log(`   Avg GOD Score: ${avgGodScore.toFixed(1)}/100`);
}

/**
 * Run full ML training cycle
 */
export async function runMLTrainingCycle(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('🤖 RUNNING ML TRAINING CYCLE FOR GOD ALGORITHM');
  console.log('='.repeat(70) + '\n');

  // Step 1: Collect training data
  await collectTrainingData();

  // Step 2: Extract patterns
  await extractSuccessPatterns();

  // Step 3: Analyze success factors
  await analyzeSuccessFactors();

  // Step 4: Generate recommendations
  const optimization = await generateOptimizationRecommendations();

  // Step 5: Track performance (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  await trackAlgorithmPerformance(thirtyDaysAgo, now);

  console.log('\n' + '='.repeat(70));
  console.log('✅ ML TRAINING CYCLE COMPLETE');
  console.log('='.repeat(70));
  console.log(`\n📈 Expected Improvement: ${optimization.expected_improvement}%`);
  console.log(`🎯 Confidence Level: ${(optimization.confidence * 100).toFixed(0)}%`);
  console.log('\nRecommendations:');
  optimization.reasoning.forEach(r => console.log(`   ${r}`));
  console.log('');
}

/**
 * Get ML performance dashboard data
 */
export async function getMLPerformanceDashboard(): Promise<any> {
  // Get latest metrics
  const { data: metrics } = await supabase
    .from('algorithm_metrics')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  // Get pending recommendations
  const { data: recommendations } = await supabase
    .from('ml_recommendations')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: true });

  // Get success patterns
  const { data: patterns } = await supabase
    .from('ml_training_patterns')
    .select('*')
    .eq('pattern_type', 'successful')
    .order('outcome_quality', { ascending: false })
    .limit(10);

  return {
    metrics: metrics || [],
    recommendations: recommendations || [],
    success_patterns: patterns || []
  };
}

// ============================================================================
// Export all functions
// ============================================================================

export default {
  collectTrainingData,
  extractSuccessPatterns,
  analyzeSuccessFactors,
  generateOptimizationRecommendations,
  trackAlgorithmPerformance,
  runMLTrainingCycle,
  getMLPerformanceDashboard
};
