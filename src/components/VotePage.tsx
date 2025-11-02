import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StartupCardOfficial from './StartupCardOfficial';
import VCFirmCard from './VCFirmCard';
import startupData from '../data/startupData';

const VotePage: React.FC = () => {
  const [votedStartupIds, setVotedStartupIds] = useState<number[]>([]);
  const [unvotedStartups, setUnvotedStartups] = useState(startupData);
  const [totalStartupCount, setTotalStartupCount] = useState(startupData.length);
  const [showFiltered, setShowFiltered] = useState(false);

  // Load voted startup IDs from localStorage on mount
  useEffect(() => {
    const voted = localStorage.getItem('votedStartups');
    const preferences = localStorage.getItem('investorPreferences');
    
    // Merge uploaded startups with default startupData
    const uploadedStartups = localStorage.getItem('uploadedStartups');
    let allStartups = [...startupData];
    
    if (uploadedStartups) {
      const uploaded = JSON.parse(uploadedStartups);
      allStartups = [...allStartups, ...uploaded];
    }
    
    // Set total count for tracking
    setTotalStartupCount(allStartups.length);
    
    let filteredStartups = allStartups;

    // Apply industry filter if enabled
    if (preferences) {
      const prefs = JSON.parse(preferences);
      if (prefs.filterEnabled && prefs.industries && prefs.industries.length > 0) {
        setShowFiltered(true);
        filteredStartups = allStartups.filter(startup => {
          // If startup has no industries tagged, show it anyway
          if (!startup.industries || startup.industries.length === 0) return true;
          // Check if any of startup's industries match investor's preferences
          return startup.industries.some(ind => prefs.industries.includes(ind));
        });
      }
    }

    if (voted) {
      const votedIds = JSON.parse(voted);
      setVotedStartupIds(votedIds);
      
      // Filter out already voted startups
      const unvoted = filteredStartups.filter(s => !votedIds.includes(s.id));
      setUnvotedStartups(unvoted);
    } else {
      setUnvotedStartups(filteredStartups);
    }
  }, []);

  const handleVote = (startupId: number, vote: 'yes' | 'no') => {
    // Save vote to localStorage
    const newVotedIds = [...votedStartupIds, startupId];
    setVotedStartupIds(newVotedIds);
    localStorage.setItem('votedStartups', JSON.stringify(newVotedIds));

    // Save YES votes to localStorage for dashboard and portfolio
    if (vote === 'yes') {
      const yesVotes = localStorage.getItem('myYesVotes');
      const yesVotesList = yesVotes ? JSON.parse(yesVotes) : [];
      
      // Find the full startup object (check both startupData and uploaded startups)
      let startup = startupData.find(s => s.id === startupId);
      
      if (!startup) {
        const uploadedStartups = localStorage.getItem('uploadedStartups');
        if (uploadedStartups) {
          const uploaded = JSON.parse(uploadedStartups);
          startup = uploaded.find((s: any) => s.id === startupId);
        }
      }
      
      if (startup) {
        // Save the FULL startup object with all 5 points
        yesVotesList.push({
          ...startup, // Include ALL startup data (fivePoints, industries, website, etc.)
          votedAt: new Date().toISOString()
        });
        localStorage.setItem('myYesVotes', JSON.stringify(yesVotesList));
      }
    }

    // Remove from unvoted list immediately
    setUnvotedStartups(prev => prev.filter(s => s.id !== startupId));
  };

  const handleResetVotes = () => {
    if (confirm('⚠️ Reset ALL votes? This will clear your voting history.')) {
      localStorage.removeItem('votedStartups');
      localStorage.removeItem('myYesVotes');
      setVotedStartupIds([]);
      setUnvotedStartups(startupData);
      alert('✅ Votes reset! You can now vote on all startups again.');
    }
  };

  if (unvotedStartups.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950" style={{ backgroundImage: 'radial-gradient(ellipse 800px 600px at 20% 40%, rgba(134, 239, 172, 0.4), transparent), linear-gradient(to bottom right, rgb(88, 28, 135), rgb(59, 7, 100))' }}>
        {/* NAVIGATION */}
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="flex gap-1 items-center">
            <Link to="/signup" className="text-6xl hover:scale-110 transition-transform cursor-pointer" title="Hot Money Honey">
              🍯
            </Link>
            <Link to="/signup" className="px-4 py-1.5 bg-yellow-400 text-black rounded-full font-medium text-sm shadow-lg hover:bg-yellow-500 transition-colors">
              👤 Sign Up
            </Link>
            <Link to="/" className="px-4 py-1.5 bg-orange-500 text-white rounded-full font-medium text-sm shadow-lg hover:bg-orange-600 transition-colors">
              🏠 Home
            </Link>
            <Link to="/vote" className="px-4 py-1.5 bg-purple-700 text-white rounded-full font-medium text-sm shadow-lg">
              🗳️ Vote
            </Link>
            <Link to="/portfolio" className="px-4 py-1.5 bg-purple-700 text-white rounded-full font-medium text-sm shadow-lg hover:bg-purple-600 transition-colors">
              ⭐ Portfolio
            </Link>
            <Link to="/dashboard" className="px-4 py-1.5 bg-orange-500 text-white rounded-full font-medium text-sm shadow-lg hover:bg-orange-600 transition-colors">
              👤 Dashboard
            </Link>
            <Link to="/settings" className="px-4 py-1.5 bg-purple-500 text-white rounded-full font-medium text-sm shadow-lg hover:bg-purple-600 transition-colors">
              ⚙️ Settings
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-6xl font-bold text-white mb-4">🎉</h2>
            <h3 className="text-4xl font-bold text-white mb-4">All Done!</h3>
            <p className="text-xl text-purple-200 mb-8">You've voted on all {totalStartupCount} startups!</p>
            <div className="flex gap-4 justify-center">
              <Link to="/dashboard" className="px-8 py-3 bg-orange-500 text-white rounded-lg font-medium text-lg hover:bg-orange-600 transition-colors shadow-lg">
                View My Hot Picks 🔥
              </Link>
              <button
                onClick={handleResetVotes}
                className="px-8 py-3 bg-gray-500 text-white rounded-lg font-medium text-lg hover:bg-gray-600 transition-colors shadow-lg"
              >
                🔄 Reset & Vote Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950" style={{ backgroundImage: 'radial-gradient(ellipse 800px 600px at 20% 40%, rgba(134, 239, 172, 0.4), transparent), linear-gradient(to bottom right, rgb(88, 28, 135), rgb(59, 7, 100))' }}>
            {/* NAVIGATION - FIXED AT TOP */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex gap-1 items-center">
          <Link to="/signup" className="text-6xl hover:scale-110 transition-transform cursor-pointer" title="Hot Money Honey">
            🍯
          </Link>
          <Link to="/signup" className="px-4 py-1.5 bg-yellow-400 text-black rounded-full font-medium text-sm shadow-lg hover:bg-yellow-500 transition-colors">
            👤 Sign Up
          </Link>
          <Link to="/" className="px-4 py-1.5 bg-orange-500 text-white rounded-full font-medium text-sm shadow-lg hover:bg-orange-600 transition-colors">
            🏠 Home
          </Link>
          <Link to="/vote" className="px-4 py-1.5 bg-purple-700 text-white rounded-full font-medium text-sm shadow-lg">
            🗳️ Vote
          </Link>
          <Link to="/portfolio" className="px-4 py-1.5 bg-purple-700 text-white rounded-full font-medium text-sm shadow-lg hover:bg-purple-600 transition-colors">
            ⭐ Portfolio
          </Link>
          <Link to="/dashboard" className="px-4 py-1.5 bg-orange-500 text-white rounded-full font-medium text-sm shadow-lg hover:bg-orange-600 transition-colors">
            👤 Dashboard
          </Link>
          <Link to="/settings" className="px-4 py-1.5 bg-purple-500 text-white rounded-full font-medium text-sm shadow-lg hover:bg-purple-600 transition-colors">
            ⚙️ Settings
          </Link>
        </div>
      </div>

      <div className="pt-28 px-8 pb-16">
        <div className="mb-8 text-center">
          <div className="flex justify-between items-center max-w-7xl mx-auto mb-4">
            <div className="flex-1">
              <h1 className="text-5xl font-bold text-white mb-3">
                🔥 Vote on Startups
              </h1>
              <p className="text-xl text-purple-200">
                <span className="font-bold text-yellow-300">{unvotedStartups.length}</span> of {totalStartupCount} {unvotedStartups.length === 1 ? 'startup' : 'startups'} remaining
              </p>
              {showFiltered && (
                <div className="mt-2 inline-block bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                  🎯 Showing only your preferred industries
                </div>
              )}
            </div>
            <button
              onClick={handleResetVotes}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg font-medium text-sm hover:bg-gray-600 transition-colors shadow-lg"
            >
              🔄 Reset All Votes
            </button>
          </div>
        </div>

        {/* SHOW ALL UNVOTED CARDS IN A GRID */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
            {unvotedStartups.map((startup) => {
              const entityType = (startup as any).entityType;
              
              // Render VCFirmCard for VC firms and accelerators
              if (entityType === 'vc_firm' || entityType === 'accelerator') {
                return (
                  <VCFirmCard
                    key={startup.id}
                    company={{
                      id: startup.id,
                      name: startup.name,
                      pitch: startup.pitch || startup.tagline || '',
                      fivePoints: (startup as any).fivePoints || [],
                      entityType: entityType,
                      website: (startup as any).website
                    }}
                  />
                );
              }
              
              // Render StartupCardOfficial for startups
              return (
                <StartupCardOfficial
                  key={startup.id}
                  startup={startup}
                  onVote={(vote) => handleVote(startup.id, vote)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VotePage;