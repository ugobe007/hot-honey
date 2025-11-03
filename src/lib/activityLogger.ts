import { supabase } from './supabase';

// List of names for anonymization
const ANONYMOUS_NAMES = [
  'Sarah', 'John', 'Mike', 'Emma', 'Alex', 'Lisa', 'David', 'Maria',
  'Chris', 'Anna', 'Tom', 'Sophie', 'James', 'Olivia', 'Ryan', 'Emily',
  'Daniel', 'Grace', 'Kevin', 'Sophia', 'Brian', 'Ava', 'Jason', 'Mia'
];

export type ActivityEventType = 
  | 'user_voted' 
  | 'startup_approved' 
  | 'startup_submitted'
  | 'startup_rejected'
  | 'funding_announced'
  | 'milestone_reached';

export interface ActivityData {
  eventType: ActivityEventType;
  startupId?: string;
  startupName?: string;
  userId?: string;
  userName?: string;
  voteType?: 'yes' | 'no';
  metadata?: Record<string, any>;
}

/**
 * Get a consistent anonymized name for a user ID
 */
function getAnonymizedName(userId: string | undefined): string {
  if (!userId) {
    return ANONYMOUS_NAMES[Math.floor(Math.random() * ANONYMOUS_NAMES.length)];
  }
  
  // Use hash of userId to consistently map to same name
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % ANONYMOUS_NAMES.length;
  return ANONYMOUS_NAMES[index];
}

/**
 * Log an activity event to the activities table
 */
export async function logActivity(data: ActivityData): Promise<boolean> {
  try {
    const displayName = data.userName || getAnonymizedName(data.userId);
    
    const { error } = await supabase
      .from('activities')
      .insert({
        event_type: data.eventType,
        startup_id: data.startupId,
        user_id: data.userId || 'anonymous',
        user_name: displayName,
        vote_type: data.voteType,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error logging activity:', error);
      return false;
    }

    console.log(`✅ Activity logged: ${data.eventType} by ${displayName}`);
    return true;
  } catch (error) {
    console.error('Failed to log activity:', error);
    return false;
  }
}

/**
 * Get recent activities from the database
 */
export async function getRecentActivities(limit: number = 20): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching activities:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    return [];
  }
}

/**
 * Get vote activity stats for the last hour
 */
export async function getRecentVoteStats(): Promise<{
  totalVotes: number;
  yesVotes: number;
  noVotes: number;
}> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('activities')
      .select('vote_type')
      .eq('event_type', 'user_voted')
      .gte('created_at', oneHourAgo);

    if (error) {
      console.error('Error fetching vote stats:', error);
      return { totalVotes: 0, yesVotes: 0, noVotes: 0 };
    }

    const votes = data || [];
    const yesVotes = votes.filter(v => v.vote_type === 'yes').length;
    const noVotes = votes.filter(v => v.vote_type === 'no').length;

    return {
      totalVotes: votes.length,
      yesVotes,
      noVotes,
    };
  } catch (error) {
    console.error('Failed to fetch vote stats:', error);
    return { totalVotes: 0, yesVotes: 0, noVotes: 0 };
  }
}

/**
 * Get recent user voting activities (for "Sarah voted YES" messages)
 */
export async function getRecentUserVotes(limit: number = 10): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('user_name, startup_id, vote_type, created_at, metadata')
      .eq('event_type', 'user_voted')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user votes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch user votes:', error);
    return [];
  }
}

/**
 * Get activities for a specific startup
 */
export async function getStartupActivities(startupId: string, limit: number = 20): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('startup_id', startupId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching startup activities:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch startup activities:', error);
    return [];
  }
}

/**
 * Get count of activities by type in a time range
 */
export async function getActivityCounts(hoursAgo: number = 24): Promise<Record<string, number>> {
  try {
    const timeAgo = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('activities')
      .select('event_type')
      .gte('created_at', timeAgo);

    if (error) {
      console.error('Error fetching activity counts:', error);
      return {};
    }

    const counts: Record<string, number> = {};
    (data || []).forEach((activity: any) => {
      counts[activity.event_type] = (counts[activity.event_type] || 0) + 1;
    });

    return counts;
  } catch (error) {
    console.error('Failed to fetch activity counts:', error);
    return {};
  }
}
