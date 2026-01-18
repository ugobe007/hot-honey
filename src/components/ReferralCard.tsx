import { useState } from 'react';
import { useReferrals } from '../hooks/useReferrals';
import { logEvent } from '../analytics';
import { Gift, Copy, Check, ExternalLink, Users } from 'lucide-react';

export default function ReferralCard() {
  const { status, loading, error, createInvite } = useReferrals();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [creatingInvite, setCreatingInvite] = useState(false);

  const handleCreateAndCopy = async () => {
    setCreatingInvite(true);
    
    // Track view event
    logEvent('referral_card_viewed', {
      activated_count: status?.activated_count || 0,
      reward_active: status?.reward_active || false
    });

    try {
      const result = await createInvite();
      if (result) {
        // Copy to clipboard
        await navigator.clipboard.writeText(result.invite_url);
        setCopiedToken(result.token);
        
        // Track copy event
        logEvent('invite_link_copied', {
          token: result.token
        });
        
        setTimeout(() => setCopiedToken(null), 3000);
      }
    } catch (err) {
      console.error('Failed to create/copy invite:', err);
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleCopyExisting = async (inviteUrl: string, token: string) => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedToken(token);
      
      logEvent('invite_link_copied', {
        token,
        existing: true
      });
      
      setTimeout(() => setCopiedToken(null), 3000);
    } catch (err) {
      console.error('Failed to copy invite:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600 text-sm">
          Failed to load referral status: {error}
        </div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const progressPercent = Math.min((status.activated_count / status.target) * 100, 100);
  const baseUrl = window.location.origin;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 border border-blue-100">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Refer Friends, Get Elite
            </h3>
            <p className="text-sm text-gray-600">
              Invite 3 friends → Unlock 7 days Elite access
            </p>
          </div>
        </div>
      </div>

      {/* Active Reward Banner */}
      {status.reward_active && status.reward_expires_at && (
        <div className="mb-4 bg-green-100 border border-green-300 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Check className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-semibold text-green-900">
                🎉 Elite Access Active!
              </p>
              <p className="text-xs text-green-700">
                Expires {new Date(status.reward_expires_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progress: {status.activated_count} / {status.target} activated
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(progressPercent)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {status.activated_count < status.target && (
          <p className="text-xs text-gray-500 mt-1">
            {status.target - status.activated_count} more friend{status.target - status.activated_count !== 1 ? 's' : ''} to unlock Elite
          </p>
        )}
      </div>

      {/* Create Invite Button */}
      <button
        onClick={handleCreateAndCopy}
        disabled={creatingInvite}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 mb-4 disabled:opacity-50"
      >
        {creatingInvite ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Creating invite...</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            <span>Copy Invite Link</span>
          </>
        )}
      </button>

      {/* Recent Invites */}
      {status.invites && status.invites.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Recent Invites</span>
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {status.invites.slice(0, 5).map((invite) => {
              const inviteUrl = `${baseUrl}/i/${invite.token}`;
              const isExpired = new Date(invite.expires_at) < new Date();
              
              return (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 bg-white rounded border border-gray-200 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          invite.status === 'accepted'
                            ? 'bg-green-100 text-green-700'
                            : invite.status === 'opened'
                            ? 'bg-blue-100 text-blue-700'
                            : isExpired
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {isExpired ? 'expired' : invite.status}
                      </span>
                      <span className="text-xs text-gray-500 truncate">
                        {new Date(invite.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {invite.accepted_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        Accepted {new Date(invite.accepted_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {invite.status !== 'accepted' && !isExpired && (
                    <button
                      onClick={() => handleCopyExisting(inviteUrl, invite.token)}
                      className="ml-2 p-2 hover:bg-gray-100 rounded transition-colors"
                      title="Copy invite link"
                    >
                      {copiedToken === invite.token ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <details className="group">
          <summary className="text-sm font-medium text-gray-700 cursor-pointer list-none flex items-center justify-between">
            <span>How it works</span>
            <ExternalLink className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform" />
          </summary>
          <div className="mt-3 text-xs text-gray-600 space-y-2 pl-4">
            <p>1. Share your unique invite link with friends</p>
            <p>2. When they sign up and watch their first startup, you get credit</p>
            <p>3. After 3 friends activate, you unlock 7 days of Elite access</p>
            <p className="text-gray-500 italic">
              Bonus: Your friends get 3 days Pro access when they sign up!
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
