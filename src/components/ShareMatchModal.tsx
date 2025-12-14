import React, { useState } from 'react';
import { Share2, Copy, Check, X } from 'lucide-react';

interface ShareMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  startupName: string;
  investorName: string;
  matchScore: number;
  matchUrl: string;
}

const ShareMatchModal: React.FC<ShareMatchModalProps> = ({
  isOpen,
  onClose,
  startupName,
  investorName,
  matchScore,
  matchUrl,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareText = `🚀 Check out this ${matchScore}% match between ${startupName} and ${investorName} on Hot Money!`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(matchUrl);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(matchUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareToTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const shareToLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      '_blank',
      'width=600,height=600'
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-3xl p-8 max-w-md w-full border-2 border-purple-500/50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 p-2 rounded-xl">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Share This Match</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Match Info */}
        <div className="bg-white/10 rounded-xl p-4 mb-6 border border-white/20">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-2xl">🚀</span>
            <span className="text-white font-semibold">{startupName}</span>
            <span className="text-xl">↔</span>
            <span className="text-white font-semibold">{investorName}</span>
            <span className="text-2xl">💼</span>
          </div>
          <div className="text-center">
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 font-bold px-4 py-1 rounded-full text-sm">
              {matchScore}% Match
            </span>
          </div>
        </div>

        {/* Share Options */}
        <div className="space-y-3 mb-6">
          {/* Copy Link */}
          <button
            onClick={copyToClipboard}
            className="w-full bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 text-white font-semibold transition-all flex items-center justify-center gap-3"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 text-green-400" />
                <span className="text-green-400">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          {/* Twitter */}
          <button
            onClick={shareToTwitter}
            className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 rounded-xl p-4 text-white font-semibold transition-all flex items-center justify-center gap-3 shadow-lg"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>Share on Twitter</span>
          </button>

          {/* LinkedIn */}
          <button
            onClick={shareToLinkedIn}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 rounded-xl p-4 text-white font-semibold transition-all flex items-center justify-center gap-3 shadow-lg"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z" />
            </svg>
            <span>Share on LinkedIn</span>
          </button>
        </div>

        {/* URL Display */}
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <p className="text-xs text-gray-400 mb-1">Share URL:</p>
          <p className="text-white text-sm font-mono truncate">{matchUrl}</p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ShareMatchModal;
