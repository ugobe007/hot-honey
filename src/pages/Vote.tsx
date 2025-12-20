// FILE: src/pages/Vote.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import StartupCardOfficial from '../components/StartupCardOfficial';
import ActivityTicker from '../components/ActivityTicker';
import LogoDropdownMenu from '../components/LogoDropdownMenu';
import VoteTransparency from '../components/VoteTransparency';
import { generateRecentActivities } from '../utils/activityGenerator';

import FlameIcon from '../components/FlameIcon';

const Vote: React.FC = () => {
  const navigate = useNavigate();
  const startups = useStore((state) => state.startups);
  const currentIndex = useStore((state) => state.currentIndex);
  const voteYes = useStore((state) => state.voteYes);
  const voteNo = useStore((state) => state.voteNo);
  const loadStartupsFromDatabase = useStore((state) => state.loadStartupsFromDatabase);
  const [activities, setActivities] = useState<any[]>([]);

  // Load approved startups from database on mount
  useEffect(() => {
    console.log('🎯 Vote page: useEffect triggered');
    loadStartupsFromDatabase();
    
    // Load activities immediately
    console.log('🎯 Vote page: About to load activities...');
    generateRecentActivities()
      .then((recentActivities) => {
        console.log(`🎯 Vote page: Received ${recentActivities.length} activities`);
        setActivities(recentActivities);
        console.log('🎯 Vote page: Activities state updated');
      })
      .catch((error) => {
        console.error('🎯 Vote page: Error loading activities:', error);
      });
  }, []);

  const currentStartup = startups[currentIndex];

  if (!currentStartup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a0033] via-[#2d1b4e] to-[#0f0f23] flex items-center justify-center px-4">
        <div className="text-center p-8 rounded-2xl bg-white/5 border border-purple-500/30 backdrop-blur-sm max-w-md">
          <FlameIcon variant={5} size="3xl" className="mx-auto mb-4" />
          <p className="text-2xl font-bold text-white mb-2">🎉 All caught up!</p>
          <p className="text-gray-400 mb-6">
            You've reviewed all startups. Come back soon for more deals.
          </p>
          <a
            href="/submit"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:from-orange-400 hover:to-red-400 transition-all"
          >
            <FlameIcon variant={1} size="sm" />
            Submit a Startup
          </a>
        </div>
      </div>
    );
  }

  console.log('🎯 Vote page: Rendering with', activities.length, 'activities');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0033] via-[#2d1b4e] to-[#0f0f23] px-2 sm:px-4">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-l from-orange-500/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-r from-purple-500/10 to-transparent rounded-full blur-3xl"></div>
      </div>
      
      {/* Logo Dropdown Menu */}
      <LogoDropdownMenu />

      {/* Vote Button - Links to Home */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40">
        <button
          onClick={() => {
            console.log('Vote button clicked, navigating to /');
            navigate('/');
          }}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg hover:from-orange-400 hover:to-red-400 transition-all cursor-pointer border border-orange-400/50"
        >
          <FlameIcon variant={8} size="sm" />
          <span>Vote</span>
        </button>
      </div>

      {/* Activity Ticker at the top */}
      <div className="max-w-6xl mx-auto pt-16 pb-6 relative z-10">
        <ActivityTicker activities={activities} />
      </div>
      
      {/* Main Content Container */}
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Startup card */}
        <div className="flex justify-center items-start mb-6">
          <StartupCardOfficial
            startup={currentStartup}
            onVote={(vote) => vote === 'yes' ? voteYes(currentStartup) : voteNo()}
          />
        </div>

        {/* Vote Transparency Panel */}
        <div className="px-4">
          <VoteTransparency startup={currentStartup} />
        </div>
      </div>
    </div>
  );
};

export default Vote;
