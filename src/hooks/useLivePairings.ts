import { useState, useEffect, useCallback } from 'react';
import { LivePairing, LivePairingsState } from '../types/livePairings';

/**
 * Hook to fetch live signal pairings from the API
 * 
 * @param limit - Number of pairings to fetch (default 3, max 10)
 * @param enablePolling - Whether to poll for updates (default false - don't hammer the API)
 * @param pollingInterval - Polling interval in ms (default 30000 = 30s)
 */
export function useLivePairings(
  limit: number = 3,
  enablePolling: boolean = false,
  pollingInterval: number = 30000
): LivePairingsState & { refetch: () => void } {
  const [data, setData] = useState<LivePairing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const fetchPairings = useCallback(async () => {
    try {
      // Use relative URL in production, full URL in dev
      const baseUrl = import.meta.env.DEV 
        ? 'http://localhost:3002' 
        : '';
      
      const response = await fetch(`${baseUrl}/api/live-pairings?limit=${limit}`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      setData(result);
      setError(null);
      setLastUpdatedAt(new Date());
    } catch (err) {
      console.error('[useLivePairings] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load pairings');
      // Don't clear data on error - keep showing stale data
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // Initial fetch on mount
  useEffect(() => {
    fetchPairings();
  }, [fetchPairings]);

  // Optional polling (disabled by default)
  useEffect(() => {
    if (!enablePolling) return;

    const interval = setInterval(() => {
      fetchPairings();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [enablePolling, pollingInterval, fetchPairings]);

  return {
    data,
    loading,
    error,
    lastUpdatedAt,
    refetch: fetchPairings,
  };
}

export default useLivePairings;
