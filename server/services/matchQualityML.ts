/**
 * Machine Learning Quality Analysis for Match Engine
 * 
 * Analyzes match patterns to:
 * 1. Identify optimal similarity thresholds
 * 2. Detect anomalous/bad matches
 * 3. Track match quality trends over time
 * 4. Auto-tune scoring parameters
 * 
 * Uses statistical analysis and pattern recognition (no external ML libs needed)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface MatchAnalytics {
  total_matches: number;
  avg_similarity: number;
  median_similarity: number;
  similarity_std_dev: number;
  quality_distribution: {
    super_hot: number;
    hot: number;
    warm: number;
    cold: number;
  };
  investor_distribution: {
    over_utilized: string[]; // Investors matched too often
    under_utilized: string[]; // Investors rarely matched
  };
  anomalies: {
    low_similarity_high_score: any[]; // High hot score but low similarity
    high_similarity_low_score: any[]; // High similarity but low hot score
  };
  recommendations: string[];
}

interface MatchQualityMetrics {
  match_id: string;
  startup_id: string;
  startup_name: string;
  investor_id: string;
  investor_name: string;
  similarity_score: number;
  hot_score: number;
  quality_tier: string;
  is_anomaly: boolean;
  anomaly_reason?: string;
}

/**
 * Run comprehensive match quality analysis
 */
export async function analyzeMatchQuality(): Promise<MatchAnalytics> {
  console.log('🔬 Starting ML-based match quality analysis...');

  // Fetch all matches with startup and investor data
  const { data: matches, error } = await supabase
    .from('startup_investor_matches')
    .select(`
      id,
      startup_id,
      investor_id,
      match_score,
      fit_analysis,
      created_at,
      startup_uploads!inner(name),
      investors!inner(name)
    `)
    .order('created_at', { ascending: false });

  if (error || !matches) {
    console.error('❌ Error fetching matches:', error);
    throw error;
  }

  console.log(`📊 Analyzing ${matches.length} matches...`);

  // Calculate basic statistics
  const similarities = matches.map(m => (m.match_score || 0) / 100);
  const avgSimilarity = mean(similarities);
  const medianSimilarity = median(similarities);
  const stdDev = standardDeviation(similarities);

  // Analyze quality distribution
  const qualityDistribution = analyzeQualityDistribution(matches);

  // Analyze investor utilization
  const investorDistribution = analyzeInvestorUtilization(matches);

  // Detect anomalies
  const anomalies = detectAnomalies(matches, avgSimilarity, stdDev);

  // Generate recommendations
  const recommendations = generateRecommendations({
    avgSimilarity,
    medianSimilarity,
    stdDev,
    qualityDistribution,
    investorDistribution,
    anomalies,
    totalMatches: matches.length,
  });

  const analytics: MatchAnalytics = {
    total_matches: matches.length,
    avg_similarity: Math.round(avgSimilarity * 100) / 100,
    median_similarity: Math.round(medianSimilarity * 100) / 100,
    similarity_std_dev: Math.round(stdDev * 100) / 100,
    quality_distribution: qualityDistribution,
    investor_distribution: investorDistribution,
    anomalies,
    recommendations,
  };

  console.log('✅ Analysis complete!');
  return analytics;
}

/**
 * Analyze quality tier distribution
 */
function analyzeQualityDistribution(matches: any[]): any {
  const distribution = {
    super_hot: 0,
    hot: 0,
    warm: 0,
    cold: 0,
  };

  matches.forEach(match => {
    // Extract hot_score from fit_analysis JSONB field
    const hotScore = match.fit_analysis?.hot_score || 0;
    
    if (hotScore >= 9) distribution.super_hot++;
    else if (hotScore >= 7) distribution.hot++;
    else if (hotScore >= 5) distribution.warm++;
    else distribution.cold++;
  });

  return distribution;
}

/**
 * Analyze investor utilization patterns
 */
function analyzeInvestorUtilization(matches: any[]): any {
  const investorCounts: { [key: string]: { name: string; count: number } } = {};

  // Count matches per investor
  matches.forEach(match => {
    const investorId = match.investor_id;
    const investorName = match.investors?.name || 'Unknown';
    
    if (!investorCounts[investorId]) {
      investorCounts[investorId] = { name: investorName, count: 0 };
    }
    investorCounts[investorId].count++;
  });

  const counts = Object.values(investorCounts).map(i => i.count);
  const avgCount = mean(counts);
  const stdDev = standardDeviation(counts);

  // Identify over/under-utilized investors (>2 std dev from mean)
  const overUtilized: string[] = [];
  const underUtilized: string[] = [];

  Object.entries(investorCounts).forEach(([id, data]) => {
    if (data.count > avgCount + 2 * stdDev) {
      overUtilized.push(`${data.name} (${data.count} matches)`);
    } else if (data.count < avgCount - stdDev && data.count > 0) {
      underUtilized.push(`${data.name} (${data.count} matches)`);
    }
  });

  return {
    over_utilized: overUtilized,
    under_utilized: underUtilized,
  };
}

/**
 * Detect anomalous matches using statistical analysis
 */
function detectAnomalies(matches: any[], avgSimilarity: number, stdDev: number): any {
  const lowSimHighScore: any[] = [];
  const highSimLowScore: any[] = [];

  matches.forEach(match => {
    const similarity = (match.match_score || 0) / 100;
    // Extract hot_score from fit_analysis JSONB
    const hotScore = match.fit_analysis?.hot_score || 0;
    const startupName = match.startups?.name || 'Unknown';
    const investorName = match.investors?.name || 'Unknown';

    // Anomaly 1: High hot score (7+) but low similarity (below avg - 1 std dev)
    if (hotScore >= 7 && similarity < (avgSimilarity - stdDev)) {
      lowSimHighScore.push({
        startup: startupName,
        investor: investorName,
        hot_score: hotScore,
        similarity: Math.round(similarity * 100),
        reason: `High quality startup (${hotScore}/10) matched with low similarity (${Math.round(similarity * 100)}%)`,
      });
    }

    // Anomaly 2: High similarity (above avg + 1 std dev) but low hot score (<5)
    if (similarity > (avgSimilarity + stdDev) && hotScore < 5) {
      highSimLowScore.push({
        startup: startupName,
        investor: investorName,
        hot_score: hotScore,
        similarity: Math.round(similarity * 100),
        reason: `Low quality startup (${hotScore}/10) matched with high similarity (${Math.round(similarity * 100)}%)`,
      });
    }
  });

  return {
    low_similarity_high_score: lowSimHighScore.slice(0, 10), // Top 10
    high_similarity_low_score: highSimLowScore.slice(0, 10), // Top 10
  };
}

/**
 * Generate actionable recommendations based on analysis
 */
function generateRecommendations(data: any): string[] {
  const recommendations: string[] = [];

  // Similarity threshold recommendations
  if (data.avgSimilarity < 0.35) {
    recommendations.push(
      `⚠️ Average similarity is low (${data.avgSimilarity}). Consider enriching startup/investor profiles with more descriptive text.`
    );
  } else if (data.avgSimilarity > 0.7) {
    recommendations.push(
      `✅ Excellent average similarity (${data.avgSimilarity})! Matches are highly relevant.`
    );
  }

  // Quality distribution recommendations
  const total = data.totalMatches;
  const superHotPct = (data.qualityDistribution.super_hot / total) * 100;
  const coldPct = (data.qualityDistribution.cold / total) * 100;

  if (superHotPct < 10) {
    recommendations.push(
      `💡 Only ${superHotPct.toFixed(1)}% of matches are super hot (9+). Focus on attracting higher-quality startups.`
    );
  }

  if (coldPct > 30) {
    recommendations.push(
      `⚠️ ${coldPct.toFixed(1)}% of matches are cold (<5). Consider raising quality bar or rejecting low-scoring startups.`
    );
  }

  // Investor utilization recommendations
  if (data.investorDistribution.over_utilized.length > 0) {
    recommendations.push(
      `📊 ${data.investorDistribution.over_utilized.length} investors are over-utilized (>2σ above average). Diversify matching to reduce investor fatigue.`
    );
  }

  if (data.investorDistribution.under_utilized.length > 5) {
    recommendations.push(
      `🎯 ${data.investorDistribution.under_utilized.length} investors are under-utilized. Review their profiles or sectors to improve matching.`
    );
  }

  // Anomaly recommendations
  if (data.anomalies.low_similarity_high_score.length > 5) {
    recommendations.push(
      `🔍 Found ${data.anomalies.low_similarity_high_score.length} high-quality startups with low similarity matches. May need to expand investor pool or adjust embeddings.`
    );
  }

  if (data.anomalies.high_similarity_low_score.length > 5) {
    recommendations.push(
      `⚠️ Found ${data.anomalies.high_similarity_low_score.length} low-quality startups with high similarity. Hot score may be too lenient.`
    );
  }

  // Standard deviation recommendations
  if (data.stdDev > 0.2) {
    recommendations.push(
      `📈 High similarity variance (σ=${data.stdDev.toFixed(2)}). Matches vary widely in quality - consider tightening similarity threshold.`
    );
  } else if (data.stdDev < 0.05) {
    recommendations.push(
      `📉 Low similarity variance (σ=${data.stdDev.toFixed(2)}). All matches are similar quality - may be too restrictive.`
    );
  }

  return recommendations;
}

/**
 * Get detailed metrics for specific matches (for review/debugging)
 */
export async function getMatchQualityMetrics(limit: number = 50): Promise<MatchQualityMetrics[]> {
  const { data: matches, error } = await supabase
    .from('startup_investor_matches')
    .select(`
      id,
      startup_id,
      investor_id,
      match_score,
      fit_analysis,
      startup_uploads!inner(name),
      investors!inner(name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !matches) {
    console.error('Error fetching match metrics:', error);
    return [];
  }

  // Calculate averages for anomaly detection
  const similarities = matches.map(m => (m.match_score || 0) / 100);
  const avgSim = mean(similarities);
  const stdDev = standardDeviation(similarities);

  return matches.map(match => {
    // Extract hot_score from fit_analysis JSONB
    const hotScore = match.fit_analysis?.hot_score || 0;
    const similarity = (match.match_score || 0) / 100;
    
    let qualityTier = 'unknown';
    if (hotScore >= 9) qualityTier = 'super_hot';
    else if (hotScore >= 7) qualityTier = 'hot';
    else if (hotScore >= 5) qualityTier = 'warm';
    else qualityTier = 'cold';

    // Detect if this specific match is anomalous
    let isAnomaly = false;
    let anomalyReason = undefined;

    if (hotScore >= 7 && similarity < (avgSim - stdDev)) {
      isAnomaly = true;
      anomalyReason = 'High score, low similarity';
    } else if (similarity > (avgSim + stdDev) && hotScore < 5) {
      isAnomaly = true;
      anomalyReason = 'Low score, high similarity';
    }

    return {
      match_id: match.id,
      startup_id: match.startup_id,
      startup_name: match.startup_uploads?.[0]?.name || 'Unknown',
      investor_id: match.investor_id,
      investor_name: match.investors?.[0]?.name || 'Unknown',
      similarity_score: Math.round(similarity * 100) / 100,
      hot_score: hotScore,
      quality_tier: qualityTier,
      is_anomaly: isAnomaly,
      anomaly_reason: anomalyReason,
    };
  });
}

/**
 * Track match quality trends over time
 */
export async function getMatchQualityTrends(days: number = 30): Promise<any> {
  const { data: matches, error } = await supabase
    .from('startup_investor_matches')
    .select(`
      id,
      match_score,
      created_at,
      fit_analysis,
      startup_uploads!inner(name)
    `)
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true });

  if (error || !matches) {
    console.error('Error fetching trends:', error);
    return [];
  }

  // Group by week
  const weeklyData: { [key: string]: any } = {};

  matches.forEach(match => {
    const week = getWeekKey(new Date(match.created_at));
    
    if (!weeklyData[week]) {
      weeklyData[week] = {
        week,
        count: 0,
        similarities: [],
        hot_scores: [],
      };
    }

    weeklyData[week].count++;
    weeklyData[week].similarities.push((match.match_score || 0) / 100);
    // Extract hot_score from fit_analysis JSONB
    weeklyData[week].hot_scores.push(match.fit_analysis?.hot_score || 0);
  });

  // Calculate weekly averages
  return Object.values(weeklyData).map((week: any) => ({
    week: week.week,
    match_count: week.count,
    avg_similarity: mean(week.similarities),
    avg_hot_score: mean(week.hot_scores),
    quality_improving: week.hot_scores.filter((s: number) => s >= 7).length / week.count,
  }));
}

/**
 * Suggest optimal similarity threshold based on data
 */
export async function suggestOptimalThreshold(): Promise<any> {
  const analytics = await analyzeMatchQuality();

  const currentThreshold = 0.3; // From autoMatchService.ts
  let suggestedThreshold = currentThreshold;
  let reasoning = '';

  // If average similarity is high, can afford to be more selective
  if (analytics.avg_similarity > 0.5) {
    suggestedThreshold = 0.4;
    reasoning = 'Average similarity is high (>50%). Raising threshold to 0.4 will improve match quality without reducing volume significantly.';
  }
  // If average is low, might need to be more lenient
  else if (analytics.avg_similarity < 0.35) {
    suggestedThreshold = 0.25;
    reasoning = 'Average similarity is low (<35%). Lowering threshold to 0.25 will increase match volume. Consider enriching profiles instead.';
  }
  // If standard deviation is high, tighten threshold
  else if (analytics.similarity_std_dev > 0.2) {
    suggestedThreshold = currentThreshold + 0.05;
    reasoning = 'High variance in similarities. Raising threshold slightly will filter out low-quality matches.';
  }
  // Optimal range
  else {
    reasoning = 'Current threshold (0.3) appears optimal given the data distribution.';
  }

  return {
    current_threshold: currentThreshold,
    suggested_threshold: suggestedThreshold,
    reasoning,
    expected_impact: estimateThresholdImpact(analytics.median_similarity, currentThreshold, suggestedThreshold),
  };
}

/**
 * Helper: Calculate mean
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Helper: Calculate median
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Helper: Calculate standard deviation
 */
function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const squareDiffs = values.map(val => Math.pow(val - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

/**
 * Helper: Get week key (YYYY-Www)
 */
function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const week = Math.ceil(
    ((date.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7
  );
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Helper: Estimate impact of threshold change
 */
function estimateThresholdImpact(medianSim: number, currentThresh: number, newThresh: number): string {
  const diff = newThresh - currentThresh;
  
  if (Math.abs(diff) < 0.01) {
    return 'Minimal impact - thresholds are nearly identical';
  }

  if (diff > 0) {
    const reduction = Math.round((diff / medianSim) * 100);
    return `Raising threshold will reduce match volume by ~${reduction}% but improve quality`;
  } else {
    const increase = Math.round((Math.abs(diff) / medianSim) * 100);
    return `Lowering threshold will increase match volume by ~${increase}% but may reduce quality`;
  }
}
