import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Vote {
  id: string;
  startup_id: string;
  user_id: string;
  vote_type: 'yes' | 'no';
  created_at: string;
}

export interface VoteCount {
  startup_id: string;
  yes_votes: number;
  no_votes: number;
  total_votes: number;
}

/**
 * Hook for managing votes with Supabase
 * Includes real-time updates and localStorage fallback
 */
export function useVotes(userId: string) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, VoteCount>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's votes
  const fetchUserVotes = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    // Skip Supabase for anonymous users
    if (userId.startsWith('anon_')) {
      // Just load from localStorage
      const localVotes = localStorage.getItem('myYesVotes');
      if (localVotes) {
        const parsed = JSON.parse(localVotes);
        setVotes(parsed.map((id: string) => ({
          id: `local_${id}`,
          startup_id: id,
          user_id: userId,
          vote_type: 'yes',
          created_at: new Date().toISOString(),
        })));
      }
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('votes')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.warn('Supabase votes error:', error);
        // Don't throw, just fall back to localStorage
        throw error;
      }
      
      setVotes(data || []);
      
      // Also sync to localStorage for backwards compatibility
      const yesVotes = (data || [])
        .filter(v => v.vote_type === 'yes')
        .map(v => v.startup_id);
      localStorage.setItem('myYesVotes', JSON.stringify(yesVotes));
      
      const votedIds = (data || []).map(v => v.startup_id);
      localStorage.setItem('votedStartups', JSON.stringify(votedIds));
      
    } catch (err: any) {
      console.error('Error fetching votes:', err);
      setError(err.message);
      
      // Fallback to localStorage if Supabase fails
      const localVotes = localStorage.getItem('myYesVotes');
      if (localVotes) {
        const parsed = JSON.parse(localVotes);
        setVotes(parsed.map((id: string) => ({
          id: `local_${id}`,
          startup_id: id,
          user_id: userId,
          vote_type: 'yes',
          created_at: new Date().toISOString(),
        })));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch vote counts for all startups
  const fetchVoteCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('vote_counts')
        .select('*');

      if (error) throw error;

      const countsMap: Record<string, VoteCount> = {};
      (data || []).forEach((count: any) => {
        countsMap[count.startup_id] = count;
      });
      setVoteCounts(countsMap);
    } catch (err: any) {
      console.error('Error fetching vote counts:', err);
    }
  };

  // Cast a vote
  const castVote = async (startupId: string, voteType: 'yes' | 'no') => {
    if (!userId) {
      setError('No user session');
      return false;
    }

    try {
      // Check if vote exists
      const { data: existingVote } = await supabase
        .from('votes')
        .select('*')
        .eq('user_id', userId)
        .eq('startup_id', startupId)
        .single();

      if (existingVote) {
        // Update existing vote
        const { error } = await supabase
          .from('votes')
          .update({ vote_type: voteType })
          .eq('id', existingVote.id);

        if (error) throw error;
      } else {
        // Insert new vote
        const { error } = await supabase
          .from('votes')
          .insert([{
            startup_id: startupId,
            user_id: userId,
            vote_type: voteType,
          }]);

        if (error) throw error;
      }

      // Refresh votes and counts
      await Promise.all([fetchUserVotes(), fetchVoteCounts()]);
      return true;
      
    } catch (err: any) {
      console.error('Error casting vote:', err);
      setError(err.message);
      
      // Fallback to localStorage
      const votedStartups = JSON.parse(localStorage.getItem('votedStartups') || '[]');
      if (!votedStartups.includes(startupId)) {
        votedStartups.push(startupId);
        localStorage.setItem('votedStartups', JSON.stringify(votedStartups));
      }
      
      if (voteType === 'yes') {
        const yesVotes = JSON.parse(localStorage.getItem('myYesVotes') || '[]');
        if (!yesVotes.includes(startupId)) {
          yesVotes.push(startupId);
          localStorage.setItem('myYesVotes', JSON.stringify(yesVotes));
        }
      }
      
      return false;
    }
  };

  // Remove a vote
  const removeVote = async (startupId: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('votes')
        .delete()
        .eq('user_id', userId)
        .eq('startup_id', startupId);

      if (error) throw error;

      await Promise.all([fetchUserVotes(), fetchVoteCounts()]);
      return true;
      
    } catch (err: any) {
      console.error('Error removing vote:', err);
      setError(err.message);
      
      // Fallback to localStorage
      const yesVotes = JSON.parse(localStorage.getItem('myYesVotes') || '[]');
      const updated = yesVotes.filter((id: string) => id !== startupId);
      localStorage.setItem('myYesVotes', JSON.stringify(updated));
      
      return false;
    }
  };

  // Clear all votes
  const clearAllVotes = async () => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('votes')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setVotes([]);
      localStorage.removeItem('myYesVotes');
      localStorage.removeItem('votedStartups');
      await fetchVoteCounts();
      return true;
      
    } catch (err: any) {
      console.error('Error clearing votes:', err);
      setError(err.message);
      return false;
    }
  };

  // Setup real-time subscription
  useEffect(() => {
    if (!userId) return;

    fetchUserVotes();
    fetchVoteCounts();

    // Subscribe to real-time vote changes
    const votesSubscription = supabase
      .channel('votes_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'votes' },
        () => {
          fetchVoteCounts(); // Refresh counts when any vote changes
        }
      )
      .subscribe();

    return () => {
      votesSubscription.unsubscribe();
    };
  }, [userId]);

  return {
    votes,
    voteCounts,
    isLoading,
    error,
    castVote,
    removeVote,
    clearAllVotes,
    getVoteForStartup: (startupId: string) => 
      votes.find(v => v.startup_id === startupId),
    hasVoted: (startupId: string) => {
      const vote = votes.find(v => v.startup_id === startupId);
      return vote ? vote.vote_type : null;
    },
    getYesVotes: () => 
      votes.filter(v => v.vote_type === 'yes').map(v => v.startup_id),
  };
}
