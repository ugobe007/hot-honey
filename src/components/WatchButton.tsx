/**
 * WATCH BUTTON COMPONENT
 * ======================
 * Reusable button to add/remove startups from watchlist
 * Shows watch state and handles auth requirement
 */

import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useWatchlist } from '../hooks/useWatchlist';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { analytics } from '../analytics';

interface WatchButtonProps {
  startupId: string;
  variant?: 'icon' | 'button' | 'compact';
  className?: string;
  onToggle?: (isWatching: boolean) => void;
}

export function WatchButton({ 
  startupId, 
  variant = 'button',
  className = '',
  onToggle 
}: WatchButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isWatching, toggleWatchlist, error } = useWatchlist();
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  const watching = isWatching(startupId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Require auth
    if (!user) {
      navigate('/login');
      return;
    }
    
    setIsLoading(true);
    const success = await toggleWatchlist(startupId);
    setIsLoading(false);
    
    if (success) {
      // Track watchlist toggle
      analytics.watchlistToggled(startupId, !watching);
      
      if (onToggle) {
        onToggle(!watching);
      }
    }
  };

  // Icon-only variant
  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        data-tour-id="watch-button"
        data-watch-button
        className={`
          relative p-2 rounded-lg transition-all
          ${watching 
            ? 'text-orange-400 bg-orange-500/10 hover:bg-orange-500/20' 
            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}
          disabled:opacity-50
          ${className}
        `}
        aria-label={watching ? 'Remove from watchlist' : 'Add to watchlist'}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : watching ? (
          <Eye className="w-5 h-5" />
        ) : (
          <EyeOff className="w-5 h-5" />
        )}
        
        {/* Tooltip */}
        {showTooltip && !isLoading && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-white text-xs rounded whitespace-nowrap z-10">
            {watching ? 'Watching' : 'Watch'}
          </div>
        )}
      </button>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        data-tour-id="watch-button"
        data-watch-button
        className={`
          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
          ${watching 
            ? 'text-orange-400 bg-orange-500/10 hover:bg-orange-500/20' 
            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}
          disabled:opacity-50
          ${className}
        `}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : watching ? (
          <Eye className="w-4 h-4" />
        ) : (
          <EyeOff className="w-4 h-4" />
        )}
        {watching ? 'Watching' : 'Watch'}
      </button>
    );
  }

  // Full button variant (default)
  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      data-tour-id="watch-button"
      data-watch-button
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
        ${watching 
          ? 'text-orange-400 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20' 
          : 'text-zinc-300 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:text-white'}
        disabled:opacity-50
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{watching ? 'Removing...' : 'Adding...'}</span>
        </>
      ) : watching ? (
        <>
          <Eye className="w-5 h-5" />
          <span>Watching</span>
        </>
      ) : (
        <>
          <EyeOff className="w-5 h-5" />
          <span>Watch</span>
        </>
      )}
    </button>
  );
}

export default WatchButton;
