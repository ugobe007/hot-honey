// Match Feedback Service
// Tracks investor responses to matches and feeds data back into the matching algorithm

import { supabase } from '../config/supabase.js';

export interface MatchFeedback {
  match_id: string;
  startup_id: string;
  investor_id: string;
  feedback_type: 'intro_sent' | 'meeting_scheduled' | 'investment_made' | 'passed' | 'no_response';
  feedback_date: string;
  investment_amount?: number;
  notes?: string;
  created_by: string;
}

export interface MatchMetrics {
  total_matches: number;
  intro_rate: number;
  meeting_rate: number;
  investment_rate: number;
  avg_match_score: number;
  top_sectors: string[];
  top_stages: number[];
}

/**
 * Record feedback for a match
 */
export async function recordMatchFeedback(feedback: MatchFeedback): Promise<void> {
  const { error } = await supabase
    .from('match_feedback')
    .insert({
      match_id: feedback.match_id,
      startup_id: feedback.startup_id,
      investor_id: feedback.investor_id,
      feedback_type: feedback.feedback_type,
      feedback_date: feedback.feedback_date,
      investment_amount: feedback.investment_amount,
      notes: feedback.notes,
      created_by: feedback.created_by,
      created_at: new Date().toISOString()
    });

  if (error) {
    throw new Error(`Failed to record feedback: ${error.message}`);
  }

  // Update match success metrics
  await updateMatchSuccessMetrics(feedback.match_id, feedback.feedback_type);
}

/**
 * Update success metrics for a match
 */
async function updateMatchSuccessMetrics(matchId: string, feedbackType: string): Promise<void> {
  const successScore = {
    'passed': 0,
    'no_response': 0.2,
    'intro_sent': 0.4,
    'meeting_scheduled': 0.7,
    'investment_made': 1.0
  }[feedbackType] || 0;

  await supabase
    .from('startup_investor_matches')
    .update({
      success_score: successScore,
      feedback_received: true,
      last_interaction: new Date().toISOString()
    })
    .eq('id', matchId);
}

/**
 * Get feedback for a specific match
 */
export async function getMatchFeedback(matchId: string): Promise<MatchFeedback[]> {
  const { data, error } = await supabase
    .from('match_feedback')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch feedback: ${error.message}`);
  }

  return data || [];
}

/**
 * Get aggregated metrics for all matches
 */
export async function getMatchMetrics(): Promise<MatchMetrics> {
  // Get all matches with feedback
  const { data: matches, error } = await supabase
    .from('startup_investor_matches')
    .select(`
      id,
      match_score,
      success_score,
      feedback_received,
      startup:startup_uploads(stage, industries),
      match_feedback(feedback_type)
    `)
    .not('success_score', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch metrics: ${error.message}`);
  }

  const totalMatches = matches?.length || 0;
  if (totalMatches === 0) {
    return {
      total_matches: 0,
      intro_rate: 0,
      meeting_rate: 0,
      investment_rate: 0,
      avg_match_score: 0,
      top_sectors: [],
      top_stages: []
    };
  }

  // Calculate rates
  const intros = matches?.filter(m => 
    m.match_feedback?.some((f: any) => f.feedback_type === 'intro_sent')
  ).length || 0;
  
  const meetings = matches?.filter(m => 
    m.match_feedback?.some((f: any) => f.feedback_type === 'meeting_scheduled')
  ).length || 0;
  
  const investments = matches?.filter(m => 
    m.match_feedback?.some((f: any) => f.feedback_type === 'investment_made')
  ).length || 0;

  // Calculate average match score
  const avgScore = matches?.reduce((sum, m) => sum + (m.match_score || 0), 0) / totalMatches;

  // Aggregate sectors and stages (simplified for now)
  const sectorCounts: Record<string, number> = {};
  const stageCounts: Record<number, number> = {};

  matches?.forEach(match => {
    const startup = match.startup as any;
    if (startup?.industries) {
      startup.industries.forEach((industry: string) => {
        sectorCounts[industry] = (sectorCounts[industry] || 0) + 1;
      });
    }
    if (startup?.stage) {
      stageCounts[startup.stage] = (stageCounts[startup.stage] || 0) + 1;
    }
  });

  const topSectors = Object.entries(sectorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sector]) => sector);

  const topStages = Object.entries(stageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([stage]) => parseInt(stage));

  return {
    total_matches: totalMatches,
    intro_rate: intros / totalMatches,
    meeting_rate: meetings / totalMatches,
    investment_rate: investments / totalMatches,
    avg_match_score: Math.round(avgScore * 100) / 100,
    top_sectors: topSectors,
    top_stages: topStages
  };
}

/**
 * Get performance data for improving matching algorithm
 * Returns matches with high success scores for training data
 */
export async function getSuccessfulMatchPatterns(): Promise<any[]> {
  const { data, error } = await supabase
    .from('startup_investor_matches')
    .select(`
      *,
      startup:startup_uploads(*),
      investor:investors(*)
    `)
    .gte('success_score', 0.7)
    .order('success_score', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Failed to fetch successful patterns: ${error.message}`);
  }

  return data || [];
}

/**
 * Get underperforming match patterns
 */
export async function getFailedMatchPatterns(): Promise<any[]> {
  const { data, error } = await supabase
    .from('startup_investor_matches')
    .select(`
      *,
      startup:startup_uploads(*),
      investor:investors(*)
    `)
    .lte('success_score', 0.2)
    .not('success_score', 'is', null)
    .order('success_score', { ascending: true })
    .limit(100);

  if (error) {
    throw new Error(`Failed to fetch failed patterns: ${error.message}`);
  }

  return data || [];
}
