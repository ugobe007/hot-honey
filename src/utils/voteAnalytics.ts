import { supabase } from '../lib/supabase';
import startupData from '../data/startupData';

export interface StartupVoteStats {
  startupId: string;
  totalYesVotes: number;
  totalNoVotes: number;
  recentYesVotes: number; // Last 24 hours
  trendingScore: number;
  lastVoteAt?: string;
}

export interface TrendingStartup {
  startup: any;
  stats: StartupVoteStats;
}

/**
 * Get vote counts for all startups from Supabase
 */
export async function getVoteStats(): Promise<Map<string, StartupVoteStats>> {
  const statsMap = new Map<string, StartupVoteStats>();

  try {
    // Fetch all votes from Supabase
    const { data: votes, error } = await supabase
      .from('votes')
      .select('startup_id, vote_type, voted_at, created_at');

    if (error) {
      console.error('Error fetching votes:', error);
      return statsMap;
    }

    if (!votes || votes.length === 0) {
      console.log('No votes found in database');
      return statsMap;
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Aggregate votes by startup
    votes.forEach((vote: any) => {
      const startupId = vote.startup_id.toString();
      
      if (!statsMap.has(startupId)) {
        statsMap.set(startupId, {
          startupId,
          totalYesVotes: 0,
          totalNoVotes: 0,
          recentYesVotes: 0,
          trendingScore: 0,
        });
      }

      const stats = statsMap.get(startupId)!;
      
      // Count total votes
      if (vote.vote_type === 'yes') {
        stats.totalYesVotes++;
      } else if (vote.vote_type === 'no') {
        stats.totalNoVotes++;
      }

      // Count recent votes (last 24h)
      const voteDate = new Date(vote.voted_at || vote.created_at);
      if (vote.vote_type === 'yes' && voteDate >= twentyFourHoursAgo) {
        stats.recentYesVotes++;
      }

      // Track last vote timestamp
      if (!stats.lastVoteAt || voteDate > new Date(stats.lastVoteAt)) {
        stats.lastVoteAt = voteDate.toISOString();
      }
    });

    // Calculate trending scores
    statsMap.forEach((stats) => {
      stats.trendingScore = calculateTrendingScore(stats);
    });

    console.log(`📊 Loaded vote stats for ${statsMap.size} startups`);
    return statsMap;
  } catch (error) {
    console.error('Error in getVoteStats:', error);
    return statsMap;
  }
}

/**
 * Calculate trending score based on:
 * - Recent vote velocity (70% weight)
 * - Total votes (20% weight)
 * - Recency (10% weight)
 */
function calculateTrendingScore(stats: StartupVoteStats): number {
  const velocityWeight = 0.7;
  const totalWeight = 0.2;
  const recencyWeight = 0.1;

  // Velocity score: recent votes in last 24h
  const velocityScore = stats.recentYesVotes * 10;

  // Total score: logarithmic scale for total votes
  const totalScore = Math.log10(stats.totalYesVotes + 1) * 20;

  // Recency score: bonus if voted recently
  let recencyScore = 0;
  if (stats.lastVoteAt) {
    const hoursSinceLastVote = (Date.now() - new Date(stats.lastVoteAt).getTime()) / (1000 * 60 * 60);
    recencyScore = Math.max(0, 100 - hoursSinceLastVote);
  }

  const finalScore = 
    velocityScore * velocityWeight +
    totalScore * totalWeight +
    recencyScore * recencyWeight;

  return Math.round(finalScore * 100) / 100;
}

/**
 * Get trending startups sorted by trending score
 */
export async function getTrendingStartups(limit: number = 10): Promise<TrendingStartup[]> {
  const statsMap = await getVoteStats();
  const trending: TrendingStartup[] = [];

  // Match stats with startup data
  statsMap.forEach((stats, startupId) => {
    const startup = startupData.find(s => s.id.toString() === startupId);
    if (startup) {
      trending.push({ startup, stats });
    }
  });

  // Sort by trending score (highest first)
  trending.sort((a, b) => b.stats.trendingScore - a.stats.trendingScore);

  return trending.slice(0, limit);
}

/**
 * Get top voted startups sorted by total YES votes
 */
export async function getTopVotedStartups(limit: number = 10): Promise<TrendingStartup[]> {
  const statsMap = await getVoteStats();
  const topVoted: TrendingStartup[] = [];

  statsMap.forEach((stats, startupId) => {
    const startup = startupData.find(s => s.id.toString() === startupId);
    if (startup) {
      topVoted.push({ startup, stats });
    }
  });

  // Sort by total YES votes (highest first)
  topVoted.sort((a, b) => b.stats.totalYesVotes - a.stats.totalYesVotes);

  return topVoted.slice(0, limit);
}

/**
 * Get vote count for a specific startup
 */
export async function getStartupVoteCount(startupId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('startup_id', startupId)
      .eq('vote_type', 'yes');

    if (error) {
      console.error('Error fetching vote count:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Error in getStartupVoteCount:', error);
    return 0;
  }
}

/**
 * Get recently approved startups from startup_uploads table
 */
export async function getRecentlyApprovedStartups(limit: number = 5): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('startup_uploads')
      .select('*')
      .eq('status', 'approved')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching approved startups:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getRecentlyApprovedStartups:', error);
    return [];
  }
}
