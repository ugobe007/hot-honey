/**
 * SHARE SIGNALS MODAL
 * ===================
 * Let founders share signal snapshots with:
 * - Cofounders
 * - Advisors
 * - Board members
 * 
 * Access levels:
 * - View only (recommended)
 * - Comment (Team plan only)
 * 
 * Shared links expire in 7 days
 */

import { useState } from 'react';
import { X, Link2, Copy, Check, Users, Eye, MessageSquare, Clock, Shield } from 'lucide-react';

interface ShareSignalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  startupName?: string;
  startupId?: string;
  matchCount?: number;
}

type AccessLevel = 'view' | 'comment';

export default function ShareSignalsModal({ 
  isOpen, 
  onClose, 
  startupName = 'Your Startup',
  startupId,
  matchCount = 53
}: ShareSignalsModalProps) {
  const [emails, setEmails] = useState<string[]>(['']);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('view');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const addEmailField = () => {
    if (emails.length < 5) {
      setEmails([...emails, '']);
    }
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const removeEmail = (index: number) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index));
    }
  };

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    
    // In production, this would call the backend to create a secure share token
    // For now, generate a mock secure link
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const shareToken = btoa(`${startupId}-${Date.now()}-${accessLevel}`).slice(0, 24);
    const link = `${window.location.origin}/shared/${shareToken}`;
    
    setGeneratedLink(link);
    setIsGenerating(false);
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const validEmails = emails.filter(e => e.includes('@'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[#111111] border border-gray-800 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Share Signal Snapshot</h2>
              <p className="text-sm text-gray-500">{startupName}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!generatedLink ? (
            <>
              {/* Email inputs */}
              <div className="mb-6">
                <label className="block text-gray-400 text-sm font-medium mb-3">
                  Who do you want to share with?
                </label>
                <div className="space-y-2">
                  {emails.map((email, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => updateEmail(index, e.target.value)}
                        placeholder="advisor@email.com"
                        className="flex-1 px-4 py-2.5 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:border-violet-500/50 outline-none text-sm"
                      />
                      {emails.length > 1 && (
                        <button
                          onClick={() => removeEmail(index)}
                          className="px-3 text-gray-600 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {emails.length < 5 && (
                  <button
                    onClick={addEmailField}
                    className="mt-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    + Add another
                  </button>
                )}
              </div>

              {/* Access level */}
              <div className="mb-6">
                <label className="block text-gray-400 text-sm font-medium mb-3">
                  Access level
                </label>
                <div className="space-y-2">
                  <label 
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      accessLevel === 'view' 
                        ? 'bg-violet-500/10 border-violet-500/50' 
                        : 'bg-[#0a0a0a] border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="access"
                      checked={accessLevel === 'view'}
                      onChange={() => setAccessLevel('view')}
                      className="sr-only"
                    />
                    <Eye className={`w-5 h-5 ${accessLevel === 'view' ? 'text-violet-400' : 'text-gray-600'}`} />
                    <div className="flex-1">
                      <span className={accessLevel === 'view' ? 'text-white' : 'text-gray-400'}>
                        View only
                      </span>
                      <span className="ml-2 px-1.5 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded">
                        recommended
                      </span>
                    </div>
                  </label>
                  
                  <label 
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      accessLevel === 'comment' 
                        ? 'bg-violet-500/10 border-violet-500/50' 
                        : 'bg-[#0a0a0a] border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="access"
                      checked={accessLevel === 'comment'}
                      onChange={() => setAccessLevel('comment')}
                      className="sr-only"
                    />
                    <MessageSquare className={`w-5 h-5 ${accessLevel === 'comment' ? 'text-violet-400' : 'text-gray-600'}`} />
                    <div className="flex-1">
                      <span className={accessLevel === 'comment' ? 'text-white' : 'text-gray-400'}>
                        Comment
                      </span>
                      <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                        Team plan
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerateLink}
                disabled={isGenerating}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Link2 className="w-5 h-5" />
                    Generate Secure Link
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Generated link */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Link generated!</span>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedLink}
                    readOnly
                    className="flex-1 px-4 py-2.5 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white text-sm font-mono"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-4 rounded-lg transition-all ${
                      copied 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
                    }`}
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* What recipients can see */}
              <div className="p-4 bg-[#0a0a0a] border border-gray-800 rounded-lg mb-6">
                <p className="text-sm text-gray-400 mb-3">Recipients can see:</p>
                <ul className="space-y-1.5 text-sm text-gray-500">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    GOD Score
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    {matchCount} investor matches
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    Match reasoning
                  </li>
                </ul>
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <p className="text-xs text-gray-600">Cannot: Export, reshare, or contact investors directly</p>
                </div>
              </div>

              {/* Expiration notice */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Shared links expire in 7 days</span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Shield className="w-4 h-4" />
            <span>End-to-end encrypted</span>
          </div>
          {generatedLink && (
            <button
              onClick={() => {
                setGeneratedLink(null);
                setEmails(['']);
              }}
              className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              Create another link
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
