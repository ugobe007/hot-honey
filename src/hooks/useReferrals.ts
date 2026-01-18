import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Invite {
  id: string;
  token: string;
  status: 'created' | 'opened' | 'accepted' | 'expired';
  created_at: string;
  opened_at?: string;
  accepted_at?: string;
  expires_at: string;
}

interface ReferralStatus {
  activated_count: number;
  target: number;
  reward_active: boolean;
  reward_expires_at: string | null;
  invites: Invite[];
}

interface UseReferralsReturn {
  status: ReferralStatus | null;
  loading: boolean;
  error: string | null;
  createInvite: () => Promise<{ invite_url: string; token: string } | null>;
  refreshStatus: () => Promise<void>;
}

export function useReferrals(): UseReferralsReturn {
  const [status, setStatus] = useState<ReferralStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/referrals/status`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch referral status');
      }

      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error('[useReferrals] Error fetching status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createInvite = async (): Promise<{ invite_url: string; token: string } | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/invites/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create invite');
      }

      const data = await response.json();
      
      // Refresh status after creating invite
      await fetchStatus();
      
      return {
        invite_url: data.invite_url,
        token: data.token
      };
    } catch (err) {
      console.error('[useReferrals] Error creating invite:', err);
      setError(err instanceof Error ? err.message : 'Failed to create invite');
      return null;
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return {
    status,
    loading,
    error,
    createInvite,
    refreshStatus: fetchStatus
  };
}
