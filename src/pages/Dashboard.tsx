import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import startupData from '../data/startupData';

interface Activity {
  id: string;
  type: 'vote' | 'comment' | 'funding' | 'milestone' | 'trending';
  startup: string;
  startupId?: number;
  user?: string;
  details: string;
  timestamp: Date;
  icon: string;
}

interface YesVote {
  id: number;
  name: string;
  votedAt: string;
}

/**
 * Dashboard - Activity Feed
 * Shows recent votes, trending startups, club updates, and member activity
 */
const Dashboard: React.FC = () => {
  const [myYesVotes, setMyYesVotes] = useState<YesVote[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<'all' | 'my-activity' | 'trending' | 'club'>('all');

  useEffect(() => {
    // Load user's YES votes
    const votes = localStorage.getItem('myYesVotes');
    if (votes) {
      setMyYesVotes(JSON.parse(votes));
    }

    // Generate sample activities (in production, this would come from API)
    const sampleActivities: Activity[] = [
      {
        id: '1',
        type: 'trending',
        startup: 'Graphite',
        startupId: 1,
        details: 'Trending #1 - Most YES votes this week',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
        icon: '🔥'
      },
      {
        id: '2',
        type: 'funding',
        startup: 'Base',
        startupId: 2,
        details: 'Raised $15M Series A from Paradigm',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        icon: '💰'
      },
      {
        id: '3',
        type: 'vote',
        startup: 'Stripe',
        startupId: 3,
        user: 'You',
        details: 'You voted YES on this startup',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
        icon: '✅'
      },
      {
        id: '4',
        type: 'milestone',
        startup: 'Graphite',
        startupId: 1,
        details: 'Reached 10,000 active users',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        icon: '🎯'
      },
      {
        id: '5',
        type: 'trending',
        startup: 'Base',
        startupId: 2,
        details: 'Moving up - 156% increase in YES votes',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
        icon: '📈'
      }
    ];

    setActivities(sampleActivities);
  }, []);

    setActivities(sampleActivities);
  }, []);

  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    if (filter === 'my-activity') return activity.user === 'You';
    if (filter === 'trending') return activity.type === 'trending';
    if (filter === 'club') return activity.type === 'funding' || activity.type === 'milestone';
    return true;
  });

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'trending': return 'bg-orange-500/20 border-orange-400/30';
      case 'funding': return 'bg-green-500/20 border-green-400/30';
      case 'vote': return 'bg-blue-500/20 border-blue-400/30';
      case 'milestone': return 'bg-purple-500/20 border-purple-400/30';
      default: return 'bg-yellow-500/20 border-yellow-400/30';
    }
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950 text-white p-8"
      style={{ 
        backgroundImage: 'radial-gradient(ellipse 800px 600px at 20% 40%, rgba(134, 239, 172, 0.4), transparent), linear-gradient(to bottom right, rgb(88, 28, 135), rgb(59, 7, 100))' 
      }}
    >
      {/* Navigation */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex gap-3 items-center">
          <Link to="/" className="text-4xl hover:scale-110 transition-transform cursor-pointer" title="Hot Money Honey">
            🍯
          </Link>
          <Link to="/" className="px-5 py-2.5 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-2xl transition-all">
            🏠 Home
          </Link>
          <Link to="/vote" className="px-5 py-2.5 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-2xl transition-all">
            🗳️ Vote
          </Link>
          <Link to="/dashboard" className="px-7 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold rounded-2xl transition-all shadow-xl scale-110">
            📊 Dashboard
          </Link>
          <Link to="/portfolio" className="px-5 py-2.5 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-2xl transition-all">
            💼 Portfolio
          </Link>
        </div>
      </div>

      <div className="pt-28 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500">
            📊 Activity Dashboard
          </h1>
          <p className="text-xl text-green-200">
            Stay updated with trending startups, member votes, and club activity
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-purple-800/30 backdrop-blur-sm rounded-xl p-6 border border-green-400/30">
            <div className="text-3xl font-bold text-yellow-300">{myYesVotes.length}</div>
            <div className="text-sm text-green-200">Your YES Votes</div>
          </div>
          <div className="bg-purple-800/30 backdrop-blur-sm rounded-xl p-6 border border-green-400/30">
            <div className="text-3xl font-bold text-orange-300">{startupData.length}</div>
            <div className="text-sm text-green-200">Total Startups</div>
          </div>
          <div className="bg-purple-800/30 backdrop-blur-sm rounded-xl p-6 border border-green-400/30">
            <div className="text-3xl font-bold text-green-300">$42M</div>
            <div className="text-sm text-green-200">Total Raised</div>
          </div>
          <div className="bg-purple-800/30 backdrop-blur-sm rounded-xl p-6 border border-green-400/30">
            <div className="text-3xl font-bold text-blue-300">156</div>
            <div className="text-sm text-green-200">Active Members</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-purple-800/30 backdrop-blur-sm rounded-2xl p-6 border border-green-400/30 mb-8">
          <h3 className="text-xl font-bold text-yellow-300 mb-4">⚡ Quick Actions</h3>
          <div className="flex flex-wrap gap-4">
            <Link 
              to="/vote" 
              className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 text-white hover:scale-105 transition-transform shadow-lg"
            >
              🗳️ Vote on Startups
            </Link>
            <Link 
              to="/portfolio" 
              className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-green-400 to-emerald-500 text-purple-900 hover:scale-105 transition-transform shadow-lg"
            >
              💼 View My Portfolio
            </Link>
            <Link 
              to="/submit" 
              className="px-6 py-3 rounded-xl font-semibold bg-purple-700/50 hover:bg-purple-600/60 border border-green-400/30 transition-all"
            >
              ➕ Submit Startup
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              filter === 'all'
                ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 text-white shadow-lg'
                : 'bg-purple-800/30 hover:bg-purple-700/40 border border-green-400/30'
            }`}
          >
            All Activity
          </button>
          <button
            onClick={() => setFilter('my-activity')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              filter === 'my-activity'
                ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 text-white shadow-lg'
                : 'bg-purple-800/30 hover:bg-purple-700/40 border border-green-400/30'
            }`}
          >
            My Activity
          </button>
          <button
            onClick={() => setFilter('trending')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              filter === 'trending'
                ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 text-white shadow-lg'
                : 'bg-purple-800/30 hover:bg-purple-700/40 border border-green-400/30'
            }`}
          >
            🔥 Trending
          </button>
          <button
            onClick={() => setFilter('club')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              filter === 'club'
                ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 text-white shadow-lg'
                : 'bg-purple-800/30 hover:bg-purple-700/40 border border-green-400/30'
            }`}
          >
            Club Updates
          </button>
        </div>

        {/* Activity Feed */}
        <div className="space-y-4">
          {filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className={`bg-purple-800/30 backdrop-blur-sm rounded-xl p-6 border ${getTypeColor(activity.type)} hover:scale-[1.02] transition-all`}
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">{activity.icon}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-xl font-bold text-yellow-300">{activity.startup}</h4>
                      {activity.user && (
                        <span className="text-sm text-green-300 font-semibold">{activity.user}</span>
                      )}
                    </div>
                    <span className="text-sm text-green-200">{formatTimeAgo(activity.timestamp)}</span>
                  </div>
                  <p className="text-white/90">{activity.details}</p>
                  {activity.startupId && (
                    <Link
                      to={`/startup/${activity.startupId}`}
                      className="inline-block mt-3 text-yellow-300 hover:text-yellow-100 font-semibold"
                    >
                      View Startup →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredActivities.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-xl text-green-200">No activity found with this filter</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;