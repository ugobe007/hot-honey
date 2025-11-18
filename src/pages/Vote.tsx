// FILE: src/pages/Vote.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import StartupCardOfficial from '../components/StartupCardOfficial';
import ActivityTicker from '../components/ActivityTicker';
import HamburgerMenu from '../components/HamburgerMenu';
import { generateRecentActivities } from '../utils/activityGenerator';

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
      <div className="text-center mt-10 p-4 sm:p-6 rounded-lg bg-yellow-100 border border-yellow-300 shadow-md bg-orange-50 min-h-screen mx-2">
        <p className="text-xl sm:text-2xl font-semibold text-yellow-800">🎉 All caught up!</p>
        <p className="text-sm sm:text-md text-yellow-700 mt-2">
          You've reviewed all startups. Come back soon for more deals.
        </p>
        <a
          href="/submit"
          className="inline-block mt-4 px-4 sm:px-6 py-2 bg-orange-500 text-white font-semibold rounded-full shadow hover:bg-orange-600 transition text-sm sm:text-base"
        >
          🚀 Submit a Startup
        </a>
      </div>
    );
  }

  console.log('🎯 Vote page: Rendering with', activities.length, 'activities');

  return (
    <div className="bg-orange-50 min-h-screen px-2 sm:px-4">
      {/* Hamburger Menu */}
      <HamburgerMenu />

      {/* Vote Button - Links to Home */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40">
        <button
          onClick={() => {
            console.log('Vote button clicked, navigating to /');
            navigate('/');
          }}
          className="px-4 py-2 rounded-full bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 text-slate-800 font-medium text-sm flex items-center gap-2 shadow-lg hover:from-slate-400 hover:via-slate-300 hover:to-slate-500 transition-all cursor-pointer"
          style={{
            boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.2)',
            textShadow: '0 1px 1px rgba(255,255,255,0.8)'
          }}>
          <span>🗳️</span>
          <span>Vote</span>
        </button>
      </div>

      {/* Activity Ticker at the top */}
      <div className="max-w-6xl mx-auto pt-4 pb-6">
        <ActivityTicker activities={activities} />
      </div>
      
      {/* Startup card */}
      <div className="flex justify-center items-start">
        <StartupCardOfficial
          startup={currentStartup}
          onVote={(vote) => vote === 'yes' ? voteYes(currentStartup) : voteNo()}
        />
      </div>
    </div>
  );
};

export default Vote;
