import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type ReactionType = 'thumbs_up' | 'thumbs_down';

export interface Reaction {
  id: string;
  user_id: string;
  startup_id: string;
  reaction_type: ReactionType;
  created_at: string;
  updated_at: string;
}

export interface ReactionCounts {
  startup_id: string;
  thumbs_up_count: number;
  thumbs_down_count: number;
  total_reactions: number;
}

/**
 * Hook for managing social reactions (thumbs up/down)
 * This is SEPARATE from voting - reactions are social expression only
 * Does NOT affect stage advancement or trigger notifications
 */
export function useReactions(startupId?: string) {
  const [reactionCounts, setReactionCounts] = useState<Map<string, ReactionCounts>>(new Map());
  const [userReactions, setUserReactions] = useState<Map<string, ReactionType>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch reaction counts for a specific startup or all startups
   */
  const fetchReactionCounts = async (specificStartupId?: string) => {
    try {
      let query = supabase.from('reaction_counts').select('*');
      
      if (specificStartupId) {
        query = query.eq('startup_id', specificStartupId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const countsMap = new Map<string, ReactionCounts>();
      data?.forEach(count => {
        countsMap.set(count.startup_id, count);
      });
      
      setReactionCounts(countsMap);
    } catch (err: any) {
      console.error('Error fetching reaction counts:', err);
    }
  };

  /**
   * Fetch user's reactions (what they've reacted to)
   */
  const fetchUserReactions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('reactions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const reactionsMap = new Map<string, ReactionType>();
      data?.forEach(reaction => {
        reactionsMap.set(reaction.startup_id, reaction.reaction_type);
      });
      
      setUserReactions(reactionsMap);
    } catch (err: any) {
      console.error('Error fetching user reactions:', err);
    }
  };

  /**
   * Cast a reaction (thumbs up or thumbs down)
   * If user already reacted, update the reaction
   */
  const castReaction = async (
    userId: string,
    startupId: string,
    reactionType: ReactionType
  ) => {
    try {
      // Check if user already reacted
      const { data: existing } = await supabase
        .from('reactions')
        .select('*')
        .eq('user_id', userId)
        .eq('startup_id', startupId)
        .single();

      if (existing) {
        // Update existing reaction
        const { error } = await supabase
          .from('reactions')
          .update({ reaction_type: reactionType })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new reaction
        const { error } = await supabase
          .from('reactions')
          .insert({
            user_id: userId,
            startup_id: startupId,
            reaction_type: reactionType,
          });

        if (error) throw error;
      }

      // Update local state
      setUserReactions(prev => new Map(prev).set(startupId, reactionType));
      
      // Refresh counts
      await fetchReactionCounts(startupId);
    } catch (err: any) {
      console.error('Error casting reaction:', err);
      throw err;
    }
  };

  /**
   * Remove a reaction (undo thumbs up/down)
   */
  const removeReaction = async (userId: string, startupId: string) => {
    try {
      const { error } = await supabase
        .from('reactions')
        .delete()
        .eq('user_id', userId)
        .eq('startup_id', startupId);

      if (error) throw error;

      // Update local state
      setUserReactions(prev => {
        const newMap = new Map(prev);
        newMap.delete(startupId);
        return newMap;
      });

      // Refresh counts
      await fetchReactionCounts(startupId);
    } catch (err: any) {
      console.error('Error removing reaction:', err);
      throw err;
    }
  };

  /**
   * Check if user has reacted to a startup
   * Returns the reaction type or null
   */
  const hasReacted = (startupId: string): ReactionType | null => {
    return userReactions.get(startupId) || null;
  };

  /**
   * Get reaction counts for a specific startup
   */
  const getCounts = (startupId: string): ReactionCounts => {
    return reactionCounts.get(startupId) || {
      startup_id: startupId,
      thumbs_up_count: 0,
      thumbs_down_count: 0,
      total_reactions: 0,
    };
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchReactionCounts(startupId);
      setIsLoading(false);
    };

    loadData();

    // Setup real-time subscription for reaction changes
    const reactionSubscription = supabase
      .channel('reactions_changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
        },
        () => {
          fetchReactionCounts(startupId);
        }
      )
      .subscribe();

    return () => {
      reactionSubscription.unsubscribe();
    };
  }, [startupId]);

  return {
    reactionCounts,
    userReactions,
    isLoading,
    castReaction,
    removeReaction,
    hasReacted,
    getCounts,
    fetchUserReactions,
    refresh: () => fetchReactionCounts(startupId),
  };
}
