/**
 * SHARE MATCH MODAL
 * =================
 * Modal for sharing matches via link, email, or social
 * Color scheme: Light blue to violet
 */

import React, { useState } from 'react';
import { 
  X, 
  Link2, 
  Mail, 
  Twitter, 
  Linkedin, 
  Copy, 
  Check,
  Share2,
  MessageCircle
} from 'lucide-react';
import { MatchResult } from '../lib/matchingService';

interface ShareMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: MatchResult;
  startupName: string;
}

export default function ShareMatchModal({ 
  isOpen, 
  onClose, 
  match,
  startupName 
}: ShareMatchModalProps) {
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/match/${match.investor.id}?startup=${encodeURIComponent(startupName)}`;
  const shareText = `Check out this investor match: ${match.investor.name} (${match.score}% match) for ${startupName}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Investor Match: ${match.investor.name} for ${startupName}`);
    const body = encodeURIComponent(
      `I found a great investor match on Hot Match!\n\n` +
      `Investor: ${match.investor.name}\n` +
      `${match.investor.firm ? `Firm: ${match.investor.firm}\n` : ''}` +
      `Match Score: ${match.score}%\n\n` +
      `Check it out: ${shareUrl}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 2000);
  };

  const handleTwitterShare = () => {
    const text = encodeURIComponent(shareText);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const handleLinkedInShare = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Share Match</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Match Preview */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">{match.investor.name}</h3>
                <p className="text-sm text-slate-400">{match.investor.firm || match.investorType}</p>
              </div>
              <div className="px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold">
                {match.score}%
              </div>
            </div>
          </div>

          {/* Copy Link */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Share Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  copied
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-cyan-600 text-white hover:bg-cyan-500'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Share Options */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Share via</label>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={handleEmailShare}
                className="flex flex-col items-center gap-1 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                <Mail className={`w-6 h-6 ${emailSent ? 'text-emerald-400' : 'text-slate-300'}`} />
                <span className="text-xs text-slate-400">Email</span>
              </button>
              
              <button
                onClick={handleTwitterShare}
                className="flex flex-col items-center gap-1 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                <Twitter className="w-6 h-6 text-slate-300" />
                <span className="text-xs text-slate-400">Twitter</span>
              </button>
              
              <button
                onClick={handleLinkedInShare}
                className="flex flex-col items-center gap-1 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                <Linkedin className="w-6 h-6 text-slate-300" />
                <span className="text-xs text-slate-400">LinkedIn</span>
              </button>
              
              <button
                onClick={handleWhatsAppShare}
                className="flex flex-col items-center gap-1 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                <MessageCircle className="w-6 h-6 text-slate-300" />
                <span className="text-xs text-slate-400">WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
