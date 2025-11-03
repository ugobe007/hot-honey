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

const ActivityTicker: React.FC<ActivityTickerProps> = ({ activities }) => {
  const navigate = useNavigate();
  const [displayActivities, setDisplayActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    // Duplicate activities for seamless loop
    setDisplayActivities([...activities, ...activities]);
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
          <div className="ticker-content">
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

      {/* Click hint */}
      <div className="absolute bottom-2 right-4 text-purple-300 text-xs opacity-70 pointer-events-none">
        Click to see all updates →
      </div>

      <style>{`
        .ticker-wrapper {
          width: 100%;
          overflow: hidden;
        }

        .ticker-content {
          display: inline-flex;
          animation: scroll-left 120s linear infinite;
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
