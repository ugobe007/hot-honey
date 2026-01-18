// InviteButton - Quick invite CTA for nav/sidebar
// Prompt 24: Referral/Invite Loop

import { useState } from 'react';
import { Gift, Share2 } from 'lucide-react';
import { trackEvent } from '../lib/analytics';

interface InviteButtonProps {
  onClick: () => void;
  variant?: 'nav' | 'card' | 'hero';
  className?: string;
}

export default function InviteButton({ onClick, variant = 'nav', className = '' }: InviteButtonProps) {
  const [isPulsing, setIsPulsing] = useState(true);
  
  const handleClick = () => {
    trackEvent('invite_button_clicked', { variant });
    setIsPulsing(false);
    onClick();
  };
  
  if (variant === 'hero') {
    return (
      <button
        onClick={handleClick}
        className={`
          group relative flex items-center gap-2 px-6 py-3
          bg-gradient-to-r from-orange-500 to-amber-500
          hover:from-orange-600 hover:to-amber-600
          text-white font-semibold rounded-xl
          shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40
          transition-all duration-200
          ${isPulsing ? 'animate-pulse-soft' : ''}
          ${className}
        `}
      >
        <Gift className="h-5 w-5" />
        <span>Invite Friends, Get Elite Free</span>
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
      </button>
    );
  }
  
  if (variant === 'card') {
    return (
      <button
        onClick={handleClick}
        className={`
          flex items-center justify-center gap-2 w-full
          px-4 py-3 rounded-lg
          bg-gradient-to-r from-orange-500/10 to-amber-500/10
          border border-orange-500/20
          hover:bg-orange-500/20 hover:border-orange-500/40
          text-orange-400 font-medium
          transition-all duration-200
          ${className}
        `}
      >
        <Gift className="h-4 w-4" />
        <span>Invite 3 → Get 7 Days Elite</span>
      </button>
    );
  }
  
  // Default: nav variant
  return (
    <button
      onClick={handleClick}
      className={`
        relative flex items-center gap-1.5 px-3 py-1.5
        text-sm text-orange-400 hover:text-orange-300
        bg-orange-500/10 hover:bg-orange-500/20
        rounded-lg transition-all duration-200
        ${isPulsing ? 'ring-2 ring-orange-500/30 ring-offset-2 ring-offset-slate-900' : ''}
        ${className}
      `}
      title="Invite friends, get Elite free"
    >
      <Share2 className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Invite</span>
      {isPulsing && (
        <span className="absolute -top-1 -right-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-400"></span>
        </span>
      )}
    </button>
  );
}
