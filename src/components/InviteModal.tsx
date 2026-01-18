// InviteModal - Main referral/invite interface
// Prompt 24: "Invite 3, Get 7 Days Elite"

import { useState, useEffect } from 'react';
import { X, Gift, Copy, Check, Mail, Share2, Twitter, Linkedin, Users, Trophy, Sparkles } from 'lucide-react';
import { trackEvent } from '../lib/analytics';
import {
  createInvite,
  getInvites,
  copyInviteUrl,
  shareInvite,
  getShareMessage,
  getMilestoneProgress,
  MILESTONES,
  type Invite,
  type InviteStats
} from '../lib/referral';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InviteModal({ isOpen, onClose }: InviteModalProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [activeInviteUrl, setActiveInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load invites on mount
  useEffect(() => {
    if (isOpen) {
      loadInvites();
      trackEvent('invite_modal_opened');
    }
  }, [isOpen]);
  
  const loadInvites = async () => {
    setLoading(true);
    const data = await getInvites();
    if (data) {
      setInvites(data.invites);
      setStats(data.stats);
      // Set active URL to most recent pending invite
      const pendingInvite = data.invites.find(i => i.status === 'pending');
      setActiveInviteUrl(pendingInvite?.url || null);
    }
    setLoading(false);
  };
  
  const handleCreateInvite = async () => {
    setCreating(true);
    setError(null);
    
    const result = await createInvite();
    
    if (result.success && result.invite) {
      setActiveInviteUrl(result.invite.url);
      setInvites(prev => [result.invite!, ...prev]);
      if (stats) {
        setStats({ ...stats, total_sent: stats.total_sent + 1, pending: stats.pending + 1 });
      }
      trackEvent('invite_created');
    } else {
      setError(result.error || 'Failed to create invite');
    }
    
    setCreating(false);
  };
  
  const handleCopy = async () => {
    if (!activeInviteUrl) {
      await handleCreateInvite();
      return;
    }
    
    const success = await copyInviteUrl(activeInviteUrl);
    if (success) {
      setCopied(true);
      trackEvent('invite_url_copied');
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleShare = async () => {
    if (!activeInviteUrl) {
      await handleCreateInvite();
      return;
    }
    
    const success = await shareInvite(activeInviteUrl);
    if (!success) {
      // Fallback to copy
      handleCopy();
    } else {
      trackEvent('invite_native_shared');
    }
  };
  
  const handleTwitterShare = () => {
    if (!activeInviteUrl) return;
    const text = encodeURIComponent(getShareMessage(activeInviteUrl));
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
    trackEvent('invite_shared', { platform: 'twitter' });
  };
  
  const handleLinkedInShare = () => {
    if (!activeInviteUrl) return;
    const url = encodeURIComponent(activeInviteUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
    trackEvent('invite_shared', { platform: 'linkedin' });
  };
  
  const handleEmailShare = () => {
    if (!activeInviteUrl) return;
    const subject = encodeURIComponent('Join pyth - discover promising startups');
    const body = encodeURIComponent(getShareMessage(activeInviteUrl));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    trackEvent('invite_shared', { platform: 'email' });
  };
  
  if (!isOpen) return null;
  
  const progress = stats ? getMilestoneProgress(stats.accepted) : null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-transparent p-6 pb-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-orange-500/20 rounded-xl">
              <Gift className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Invite & Earn Elite</h2>
              <p className="text-sm text-slate-400">Share pyth with 3 friends → 7 days Elite free</p>
            </div>
          </div>
          
          {/* Progress bar */}
          {progress && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-300">
                  <span className="text-orange-400 font-semibold">{progress.current}</span>
                  /{progress.target} friends joined
                </span>
                <span className="text-orange-400 font-medium">
                  {progress.emoji} {progress.reward}
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* Invite URL input + copy */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Your invite link
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 overflow-hidden">
                    {activeInviteUrl ? (
                      <span className="text-sm text-slate-300 truncate">{activeInviteUrl}</span>
                    ) : (
                      <span className="text-sm text-slate-500">Click to generate link</span>
                    )}
                  </div>
                  <button
                    onClick={handleCopy}
                    disabled={creating}
                    className={`
                      flex items-center justify-center gap-2 px-4 py-2.5
                      font-medium rounded-lg transition-all duration-200
                      ${copied 
                        ? 'bg-green-500 text-white' 
                        : 'bg-orange-500 hover:bg-orange-600 text-white'}
                      disabled:opacity-50
                    `}
                  >
                    {creating ? (
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span className="hidden sm:inline">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span className="hidden sm:inline">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                {error && (
                  <p className="text-sm text-red-400 mt-2">{error}</p>
                )}
              </div>
              
              {/* Share buttons */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Share via
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {navigator.share && (
                    <button
                      onClick={handleShare}
                      className="flex flex-col items-center gap-1.5 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Share2 className="h-5 w-5 text-slate-300" />
                      <span className="text-xs text-slate-400">Share</span>
                    </button>
                  )}
                  <button
                    onClick={handleTwitterShare}
                    className="flex flex-col items-center gap-1.5 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Twitter className="h-5 w-5 text-sky-400" />
                    <span className="text-xs text-slate-400">Twitter</span>
                  </button>
                  <button
                    onClick={handleLinkedInShare}
                    className="flex flex-col items-center gap-1.5 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Linkedin className="h-5 w-5 text-blue-400" />
                    <span className="text-xs text-slate-400">LinkedIn</span>
                  </button>
                  <button
                    onClick={handleEmailShare}
                    className="flex flex-col items-center gap-1.5 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Mail className="h-5 w-5 text-slate-300" />
                    <span className="text-xs text-slate-400">Email</span>
                  </button>
                </div>
              </div>
              
              {/* Stats */}
              {stats && stats.total_sent > 0 && (
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                    <div className="text-lg font-bold text-white">{stats.total_sent}</div>
                    <div className="text-xs text-slate-400">Sent</div>
                  </div>
                  <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                    <div className="text-lg font-bold text-orange-400">{stats.opened}</div>
                    <div className="text-xs text-slate-400">Opened</div>
                  </div>
                  <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                    <div className="text-lg font-bold text-green-400">{stats.accepted}</div>
                    <div className="text-xs text-slate-400">Joined</div>
                  </div>
                </div>
              )}
              
              {/* Milestones */}
              <div className="border-t border-slate-700/50 pt-4">
                <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  Milestones
                </h4>
                <div className="space-y-2">
                  {MILESTONES.map((milestone) => {
                    const achieved = stats && stats.accepted >= milestone.count;
                    return (
                      <div 
                        key={milestone.count}
                        className={`
                          flex items-center justify-between p-2.5 rounded-lg
                          ${achieved 
                            ? 'bg-green-500/10 border border-green-500/20' 
                            : 'bg-slate-800/50'}
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <span className={achieved ? 'text-green-400' : 'text-slate-500'}>
                            {achieved ? '✓' : milestone.emoji}
                          </span>
                          <span className={achieved ? 'text-green-300' : 'text-slate-400'}>
                            {milestone.count} friends
                          </span>
                        </div>
                        <span className={`
                          text-sm font-medium
                          ${achieved ? 'text-green-400' : 'text-orange-400'}
                        `}>
                          {achieved ? 'Claimed!' : milestone.reward}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-slate-800/30 border-t border-slate-700/50">
          <p className="text-xs text-slate-500 text-center">
            <Sparkles className="h-3 w-3 inline mr-1" />
            Invite links expire after 30 days. Rewards stack!
          </p>
        </div>
      </div>
    </div>
  );
}
