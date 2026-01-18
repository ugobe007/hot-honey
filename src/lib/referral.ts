// Referral/Invite System Helpers
// Prompt 24: "Invite 3, Get 7 Days Elite"

import { supabase } from './supabase';

export interface Invite {
  id: string;
  token: string;
  url: string;
  status: 'pending' | 'opened' | 'accepted' | 'expired';
  invitee_email?: string;
  created_at: string;
  opened_at?: string;
  accepted_at?: string;
  expires_at: string;
}

export interface ReferralReward {
  reward_type: 'elite_7_days' | 'elite_14_days' | 'elite_30_days' | 'pro_7_days';
  reason: string;
  granted_at: string;
  expires_at: string;
  applied: boolean;
}

export interface InviteStats {
  total_sent: number;
  pending: number;
  opened: number;
  accepted: number;
  referral_code: string | null;
  referral_count: number;
  next_milestone: number; // How many more needed for next reward
  rewards: ReferralReward[];
}

export interface InviteResponse {
  invites: Invite[];
  stats: InviteStats;
}

// Local storage key for pending invite token (from /i/:token)
const PENDING_INVITE_KEY = 'pyth_pending_invite';

/**
 * Store invite token when user lands on /i/:token
 */
export function storePendingInvite(token: string): void {
  localStorage.setItem(PENDING_INVITE_KEY, JSON.stringify({
    token,
    timestamp: Date.now()
  }));
}

/**
 * Get stored pending invite (if any)
 */
export function getPendingInvite(): { token: string; timestamp: number } | null {
  try {
    const stored = localStorage.getItem(PENDING_INVITE_KEY);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    
    // Expire after 7 days
    if (Date.now() - data.timestamp > 7 * 24 * 60 * 60 * 1000) {
      clearPendingInvite();
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

/**
 * Clear pending invite (after accepting or expiration)
 */
export function clearPendingInvite(): void {
  localStorage.removeItem(PENDING_INVITE_KEY);
}

/**
 * Create a new invite
 */
export async function createInvite(email?: string): Promise<{ success: boolean; invite?: Invite; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';
    
    const res = await fetch(`${API_BASE}/api/invites/create`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ email })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to create invite' };
    }
    
    return { 
      success: true, 
      invite: {
        id: data.token,
        token: data.token,
        url: data.invite_url,
        status: 'pending',
        created_at: new Date().toISOString(),
        expires_at: data.expires_at
      }
    };
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

/**
 * Get all invites and stats for current user
 */
export async function getInvites(): Promise<InviteResponse | null> {
  try {
    const res = await fetch('/api/invites', {
      credentials: 'include'
    });
    
    if (!res.ok) return null;
    
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Get invite details by token (public)
 */
export async function getInviteByToken(token: string): Promise<{
  valid: boolean;
  token: string;
  inviter: { name: string; avatar?: string } | null;
  expires_at: string;
} | null> {
  try {
    const res = await fetch(`/api/invites/${token}`);
    
    if (!res.ok) return null;
    
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Accept an invite (called after signup/login)
 */
export async function acceptInvite(token: string): Promise<{
  success: boolean;
  inviter_rewarded?: boolean;
  reward?: string;
  error?: string;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';
    
    const res = await fetch(`${API_BASE}/api/invites/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ token })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      return { success: false, error: data.error };
    }
    
    // Clear the pending invite
    clearPendingInvite();
    
    return { 
      success: true,
      inviter_rewarded: data.inviter_progress?.activated_count >= 3
    };
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

/**
 * Generate share message for invite
 */
export function getShareMessage(inviteUrl: string): string {
  return `Hey! I've been using pyth to find promising startups before they blow up. Check it out: ${inviteUrl}`;
}

/**
 * Copy invite URL to clipboard
 */
export async function copyInviteUrl(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = url;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  }
}

/**
 * Share via native share API (mobile)
 */
export async function shareInvite(url: string): Promise<boolean> {
  if (!navigator.share) return false;
  
  try {
    await navigator.share({
      title: 'Join pyth',
      text: 'I\'ve been using pyth to find promising startups. Check it out!',
      url
    });
    return true;
  } catch {
    return false;
  }
}

// Referral milestones
export const MILESTONES = [
  { count: 3, reward: '7 days Elite', emoji: '🎉' },
  { count: 5, reward: '14 days Elite', emoji: '🚀' },
  { count: 10, reward: '30 days Elite', emoji: '👑' }
] as const;

/**
 * Get progress towards next milestone
 */
export function getMilestoneProgress(acceptedCount: number): {
  current: number;
  target: number;
  reward: string;
  emoji: string;
  progress: number; // 0-100
} {
  for (const milestone of MILESTONES) {
    if (acceptedCount < milestone.count) {
      return {
        current: acceptedCount,
        target: milestone.count,
        reward: milestone.reward,
        emoji: milestone.emoji,
        progress: Math.round((acceptedCount / milestone.count) * 100)
      };
    }
  }
  
  // All milestones achieved
  return {
    current: acceptedCount,
    target: acceptedCount,
    reward: 'All rewards claimed!',
    emoji: '🏆',
    progress: 100
  };
}
