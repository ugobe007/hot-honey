// Vote persistence service - handles both localStorage and Supabase
import { supabase } from './supabase';

export interface Vote {
  id?: string;
  startup_id: string;
  user_id: string | null;
  vote_type: 'yes' | 'no';
  voted_at: string;
}

/**
 * Save vote to both localStorage (cache) and Supabase (persistence)
 */
export async function saveVote(
  startupId: string,
  voteType: 'yes' | 'no',
  userId: string | null = null
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Save to localStorage immediately (optimistic update)
    const localVotes = getLocalVotes();
    const existingVoteIndex = localVotes.findIndex(v => v.startup_id === startupId);
    
    const newVote: Vote = {
      startup_id: startupId,
      user_id: userId,
      vote_type: voteType,
      voted_at: new Date().toISOString(),
    };

    if (existingVoteIndex >= 0) {
      localVotes[existingVoteIndex] = newVote;
    } else {
      localVotes.push(newVote);
    }
    
    localStorage.setItem('user_votes', JSON.stringify(localVotes));
    console.log('✅ Vote saved to localStorage:', startupId, voteType);

    // 2. Save to Supabase (if table exists)
    try {
      const { data, error } = await supabase
        .from('votes')
        .upsert({
          startup_id: startupId,
          user_id: userId || 'anonymous',
          vote_type: voteType,
          voted_at: newVote.voted_at,
        }, {
          onConflict: 'startup_id,user_id'
        })
        .select();

      if (error) {
        console.warn('⚠️ Could not save vote to Supabase (using localStorage only):', error.message);
        // Not critical - vote is saved locally
      } else {
        console.log('✅ Vote synced to Supabase:', data);
      }
    } catch (dbError) {
      console.warn('⚠️ Supabase votes table may not exist yet. Vote saved locally.');
    }

    return { success: true };
  } catch (error: any) {
    console.error('❌ Error saving vote:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all votes from localStorage
 */
export function getLocalVotes(): Vote[] {
  try {
    const votes = localStorage.getItem('user_votes');
    return votes ? JSON.parse(votes) : [];
  } catch (error) {
    console.error('Error reading local votes:', error);
    return [];
  }
}

/**
 * Check if user has voted on a startup
 */
export function hasVoted(startupId: string): 'yes' | 'no' | null {
  const votes = getLocalVotes();
  const vote = votes.find(v => v.startup_id === startupId);
  return vote ? vote.vote_type : null;
}

/**
 * Get all startup IDs the user has voted YES on
 */
export function getYesVotes(): string[] {
  const votes = getLocalVotes();
  return votes.filter(v => v.vote_type === 'yes').map(v => v.startup_id);
}

/**
 * Sync votes from Supabase (for cross-device support)
 */
export async function syncVotesFromSupabase(userId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.warn('Could not sync votes from Supabase:', error);
      return;
    }

    if (data && data.length > 0) {
      // Merge with local votes (Supabase is source of truth)
      const localVotes = getLocalVotes();
      const supabaseVotes = data.map(v => ({
        startup_id: v.startup_id,
        user_id: v.user_id,
        vote_type: v.vote_type as 'yes' | 'no',
        voted_at: v.voted_at,
      }));

      // Keep local votes for startups not in Supabase, add all Supabase votes
      const mergedVotes = [...supabaseVotes];
      localVotes.forEach(localVote => {
        if (!supabaseVotes.find(sv => sv.startup_id === localVote.startup_id)) {
          mergedVotes.push(localVote);
        }
      });

      localStorage.setItem('user_votes', JSON.stringify(mergedVotes));
      console.log(`✅ Synced ${data.length} votes from Supabase`);
    }
  } catch (error) {
    console.warn('Error syncing votes:', error);
  }
}

/**
 * Get vote counts for a startup from Supabase
 */
export async function getVoteCounts(startupId: string): Promise<{ yes: number; no: number }> {
  try {
    const { data, error } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('startup_id', startupId);

    if (error || !data) {
      return { yes: 0, no: 0 };
    }

    const yes = data.filter(v => v.vote_type === 'yes').length;
    const no = data.filter(v => v.vote_type === 'no').length;

    return { yes, no };
  } catch (error) {
    console.warn('Could not fetch vote counts:', error);
    return { yes: 0, no: 0 };
  }
}
