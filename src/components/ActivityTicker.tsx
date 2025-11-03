import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ActivityItem {
  id: string;
  type: 'new' | 'trending' | 'approved' | 'funding' | 'ip-filing' | 'team-hire' | 'advisor-join' | 'board-member' | 'customer-milestone';
  icon: string;
  text: string;
  timestamp: Date;
}

interface ActivityTickerProps {
  activities: ActivityItem[];
}

/**
 * TICKER SPEED MEASUREMENT SYSTEM
 * ================================
 * Speed is controlled by animation duration in seconds.
 * The ticker scrolls through ALL activities once per duration.
 * 
 * Speed History:
 * - 60s  (1 min)  = TOO FAST - hard to read
 * - 90s  (1.5 min) = TOO FAST - still rushing
 * - 120s (2 min)   = TOO FAST - better but still quick
 * - 180s (3 min)   = TOO FAST - getting better
 * - 240s (4 min)   = TOO FAST - user feedback
 * - 300s (5 min)   = TESTING - current speed
 * 
 * Current Setting: 300s (5 minutes per full loop)
 * Rationale: Allows comfortable reading time for ~50+ activities
 */
const TICKER_SPEED_SECONDS = 300;

const ActivityTicker: React.FC<ActivityTickerProps> = ({ activities }) => {
  console.log('🎪 ActivityTicker component rendering');
  const navigate = useNavigate();
  const [displayActivities, setDisplayActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    console.log(`🎪 ActivityTicker received ${activities.length} activities`);
    
    // If no activities yet, show loading state
    if (activities.length === 0) {
      console.log('🎪 ActivityTicker: Showing loading state');
      setIsLoading(true);
      const loadingActivities: ActivityItem[] = [
        { id: 'loading-1', type: 'trending', icon: '⏳', text: 'Ticker is loading...', timestamp: new Date() },
        { id: 'loading-2', type: 'new', icon: '🔄', text: 'Fetching startup updates...', timestamp: new Date() },
        { id: 'loading-3', type: 'trending', icon: '📡', text: 'Connecting to database...', timestamp: new Date() },
      ];
      setDisplayActivities([...loadingActivities, ...loadingActivities]);
      // Trigger animation even for loading state
      setAnimationKey(prev => prev + 1);
    } else {
      console.log('🎪 ActivityTicker: Displaying real activities');
      setIsLoading(false);
      // Duplicate activities for seamless loop
      setDisplayActivities([...activities, ...activities]);
      // Force animation restart
      setAnimationKey(prev => prev + 1);
    }
  }, [activities]);

  const handleClick = () => {
    navigate('/feed');
  };

  return (
    <div 
      className="relative overflow-hidden bg-gradient-to-r from-purple-900/50 via-purple-800/50 to-indigo-900/50 backdrop-blur-md border-2 border-purple-400/30 rounded-xl cursor-pointer hover:border-purple-400/60 transition-all shadow-xl"
      onClick={handleClick}
      style={{ height: '80px' }}
    >
      {/* Ticker container */}
      <div className="absolute inset-0 flex items-center">
        <div className="ticker-wrapper">
          <div className="ticker-content" key={animationKey}>
            {displayActivities.map((activity, index) => (
              <div 
                key={`${activity.id}-${index}`}
                className="ticker-item inline-flex items-center px-8 py-2 text-white"
              >
                <span className="text-2xl mr-3">{activity.icon}</span>
                <span className="text-lg font-medium whitespace-nowrap">
                  {activity.text}
                </span>
                <span className="text-purple-300 text-sm ml-4 whitespace-nowrap">
                  {getRelativeTime(activity.timestamp)}
                </span>
                <span className="text-purple-400 mx-6">|</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gradient fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-purple-900/80 to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-indigo-900/80 to-transparent pointer-events-none z-10" />

      {/* Loading indicator when activities are loading */}
      {isLoading && (
        <div className="absolute top-2 left-4 bg-yellow-500/90 px-3 py-1.5 rounded-full text-white text-sm font-semibold pointer-events-none z-20 flex items-center gap-2">
          <span className="animate-spin">⏳</span>
          <span>Ticker is loading...</span>
        </div>
      )}

      {/* Click hint - More prominent (only show when not loading) */}
      {!isLoading && (
        <div className="absolute top-2 right-4 bg-purple-600/90 px-3 py-1.5 rounded-full text-white text-sm font-semibold pointer-events-none z-20 animate-pulse shadow-lg">
          👆 Click to see all updates
        </div>
      )}

      <style>{`
        .ticker-wrapper {
          width: 100%;
          overflow: hidden;
        }

        .ticker-content {
          display: inline-flex;
          animation: scroll-left ${TICKER_SPEED_SECONDS}s linear infinite;
          will-change: transform;
        }

        .ticker-item {
          flex-shrink: 0;
        }

        @keyframes scroll-left {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        /* Pause on hover */
        .ticker-wrapper:hover .ticker-content {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

// Helper function to get relative time
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default ActivityTicker;
export type { ActivityItem };
