/**
 * WATCHLIST HOOK
 * ==============
 * Manages user's startup watchlist
 * - Add/remove startups from watchlist
 * - Fetch watchlist with startup details
 * - Optimistic UI updates
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface WatchlistItem {
  startup_id: string;
  watched_at: string;
  startup: {
    id: string;
    name: string;
    tagline?: string;
    sectors?: string[];
    total_god_score?: number;
  } | null;
}

interface UseWatchlistResult {
  watchlist: WatchlistItem[];
  watchlistIds: Set<string>;
  isLoading: boolean;
  error: string | null;
  isWatching: (startupId: string) => boolean;
  addToWatchlist: (startupId: string) => Promise<boolean>;
  removeFromWatchlist: (startupId: string) => Promise<boolean>;
  toggleWatchlist: (startupId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const API_BASE = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:3002' : '');

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    };
  }
  return { 'Content-Type': 'application/json' };
}

export function useWatchlist(): UseWatchlistResult {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWatchlist = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/watchlist`, { headers });

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated - empty watchlist
          setWatchlist([]);
          setWatchlistIds(new Set());
          return;
        }
        throw new Error('Failed to fetch watchlist');
      }

      const data = await response.json();
      const items = data.items || [];
      setWatchlist(items);
      setWatchlistIds(new Set(items.map((item: WatchlistItem) => item.startup_id)));
    } catch (err) {
      console.error('[useWatchlist] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setWatchlist([]);
      setWatchlistIds(new Set());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();

    // Re-fetch when auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchWatchlist();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchWatchlist]);

  const isWatching = useCallback((startupId: string): boolean => {
    return watchlistIds.has(startupId);
  }, [watchlistIds]);

  const addToWatchlist = useCallback(async (startupId: string): Promise<boolean> => {
    try {
      setError(null);
      
      // Optimistic update
      setWatchlistIds(prev => new Set([...prev, startupId]));

      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/watchlist/add`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ startup_id: startupId })
      });

      if (!response.ok) {
        // Revert optimistic update
        setWatchlistIds(prev => {
          const next = new Set(prev);
          next.delete(startupId);
          return next;
        });
        
        if (response.status === 401) {
          setError('Please log in to watch startups');
          return false;
        }
        throw new Error('Failed to add to watchlist');
      }

      // Refresh full list to get startup details
      await fetchWatchlist();
      return true;
    } catch (err) {
      console.error('[useWatchlist] Add error:', err);
      setError(err instanceof Error ? err.message : 'Failed to add');
      return false;
    }
  }, [fetchWatchlist]);

  const removeFromWatchlist = useCallback(async (startupId: string): Promise<boolean> => {
    try {
      setError(null);
      
      // Optimistic update
      setWatchlistIds(prev => {
        const next = new Set(prev);
        next.delete(startupId);
        return next;
      });
      setWatchlist(prev => prev.filter(item => item.startup_id !== startupId));

      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/watchlist/remove`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ startup_id: startupId })
      });

      if (!response.ok) {
        // Revert optimistic update
        await fetchWatchlist();
        throw new Error('Failed to remove from watchlist');
      }

      return true;
    } catch (err) {
      console.error('[useWatchlist] Remove error:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove');
      return false;
    }
  }, [fetchWatchlist]);

  const toggleWatchlist = useCallback(async (startupId: string): Promise<boolean> => {
    if (isWatching(startupId)) {
      return removeFromWatchlist(startupId);
    } else {
      return addToWatchlist(startupId);
    }
  }, [isWatching, addToWatchlist, removeFromWatchlist]);

  return {
    watchlist,
    watchlistIds,
    isLoading,
    error,
    isWatching,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    refresh: fetchWatchlist
  };
}
