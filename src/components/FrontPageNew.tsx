import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import StartupCardOfficial from './StartupCardOfficial';
import NewsUpdate from './NewsUpdate';
import LogoDropdownMenu from './LogoDropdownMenu';
import startupData from '../data/startupData';
import { loadApprovedStartups } from '../store';

const FrontPageNew: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn, user, logout } = useAuth();
  const [currentStartupIndices, setCurrentStartupIndices] = useState([0, 1, 2]);
  const [startups, setStartups] = useState(startupData);
  const [votedStartupIds, setVotedStartupIds] = useState<Set<number>>(new Set());
  const [nextAvailableIndex, setNextAvailableIndex] = useState(3);
  const [slidingCards, setSlidingCards] = useState<number[]>([]);

  // Load approved startups from database on mount and load voted IDs
  useEffect(() => {
    const loadStartups = async () => {
      const approvedStartups = await loadApprovedStartups();
      const allStartups = [...startupData, ...approvedStartups];
      
      // Check for duplicate IDs and log them
      const idCounts = new Map<number, number>();
      allStartups.forEach(startup => {
        idCounts.set(startup.id, (idCounts.get(startup.id) || 0) + 1);
      });
      
      const duplicates = Array.from(idCounts.entries()).filter(([_, count]) => count > 1);
      if (duplicates.length > 0) {
        console.warn('⚠️ Duplicate startup IDs found:', duplicates);
      }
      
      console.log('📊 Total startups loaded:', allStartups.length);
      console.log('📦 From static data:', startupData.length);
      console.log('📦 From database:', approvedStartups.length);
      
      setStartups(allStartups);
      
      // Load previously voted startup IDs from localStorage
      const votedIds = JSON.parse(localStorage.getItem('votedStartups') || '[]');
      setVotedStartupIds(new Set(votedIds.map((id: string) => parseInt(id))));
      
      // Find first 3 unvoted startup indices
      const unvotedIndices: number[] = [];
      for (let i = 0; i < allStartups.length && unvotedIndices.length < 3; i++) {
        if (!votedIds.includes(allStartups[i].id.toString())) {
          unvotedIndices.push(i);
        }
      }
      
      // Ensure we have 3 different indices
      while (unvotedIndices.length < 3 && unvotedIndices.length < allStartups.length) {
        unvotedIndices.push(unvotedIndices.length);
      }
      
      if (unvotedIndices.length >= 3) {
        setCurrentStartupIndices(unvotedIndices.slice(0, 3));
        setNextAvailableIndex(unvotedIndices.length < allStartups.length ? unvotedIndices[2] + 1 : 0);
      } else {
        // Fallback if not enough startups
        setCurrentStartupIndices([0, Math.min(1, allStartups.length - 1), Math.min(2, allStartups.length - 1)]);
        setNextAvailableIndex(3);
      }
    };
    loadStartups();
  }, []);

  const handleVote = (startupId: number, vote: 'yes' | 'no', cardPosition: number) => {
    setStartups(prevStartups =>
      prevStartups.map(startup =>
        startup.id === startupId
          ? {
              ...startup,
              yesVotes: vote === 'yes' ? (startup.yesVotes || 0) + 1 : (startup.yesVotes || 0),
              noVotes: vote === 'no' ? (startup.noVotes || 0) + 1 : (startup.noVotes || 0),
            }
          : startup
      )
    );

    // Mark this startup as voted
    setVotedStartupIds(prev => {
      const newSet = new Set(prev);
      newSet.add(startupId);
      
      // Save to localStorage
      const votedIds = Array.from(newSet).map(id => id.toString());
      localStorage.setItem('votedStartups', JSON.stringify(votedIds));
      
      return newSet;
    });

    // Save YES votes to localStorage for dashboard
    if (vote === 'yes') {
      const yesVotes = localStorage.getItem('myYesVotes');
      const yesVotesList = yesVotes ? JSON.parse(yesVotes) : [];
      const startup = startups.find(s => s.id === startupId);
      
      if (startup) {
        yesVotesList.push({
          id: startupId,
          name: startup.name,
          pitch: startup.pitch,
          tagline: startup.tagline,
          stage: startup.stage,
          fivePoints: startup.fivePoints,
          votedAt: new Date().toISOString()
        });
        localStorage.setItem('myYesVotes', JSON.stringify(yesVotesList));
      }
    }
  };

  const handleSwipeAway = (cardPosition: number) => {
    const cardsToSlide = [cardPosition + 1, cardPosition + 2].filter(pos => pos < 3);
    setSlidingCards(cardsToSlide);

    setTimeout(() => {
      setCurrentStartupIndices(prev => {
        const newIndices = [...prev];
        
        // Shift cards up
        for (let i = cardPosition; i < 2; i++) {
          newIndices[i] = prev[i + 1];
        }
        
        // Find next unvoted startup
        let nextIndex = nextAvailableIndex;
        while (nextIndex < startups.length && votedStartupIds.has(startups[nextIndex].id)) {
          nextIndex++;
        }
        
        // Add the next unvoted startup or cycle back to start if we've voted on all
        if (nextIndex >= startups.length) {
          // We've gone through all startups, find first unvoted from beginning
          nextIndex = 0;
          while (nextIndex < startups.length && votedStartupIds.has(startups[nextIndex].id)) {
            nextIndex++;
          }
          
          if (nextIndex >= startups.length) {
            // All startups have been voted on!
            console.log('All startups have been voted on!');
            nextIndex = 0; // Reset to beginning (or show a message)
          }
        }
        
        // Ensure we don't duplicate cards - check if nextIndex is already showing
        const currentlyShowing = [newIndices[0], newIndices[1]];
        while (currentlyShowing.includes(nextIndex) && nextIndex < startups.length) {
          nextIndex++;
          // If we've checked all startups, loop back
          if (nextIndex >= startups.length) {
            nextIndex = 0;
          }
          // Skip voted startups
          while (nextIndex < startups.length && votedStartupIds.has(startups[nextIndex].id)) {
            nextIndex++;
          }
        }
        
        newIndices[2] = nextIndex;
        setNextAvailableIndex(nextIndex + 1);
        
        return newIndices;
      });
      
      setSlidingCards([]);
    }, 250);
  };

  const displayedStartups = currentStartupIndices
    .map(index => startups[index])
    .filter((startup, idx, arr) => {
      // Remove duplicates - only show if it's the first occurrence of this ID
      if (!startup) return false;
      const firstIdx = arr.findIndex(s => s && s.id === startup.id);
      return firstIdx === idx;
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-slate-100">
      {/* Logo Dropdown Menu */}
      <LogoDropdownMenu />

      {/* Centered Buttons at Top */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40 flex items-center gap-2">
        {isLoggedIn && (
          <Link
            to="/portfolio"
            className="px-3 py-2 rounded-full bg-gradient-to-r from-[#FFE102] to-[#f99006] text-slate-800 hover:from-[#f99006] hover:to-[#f87004] hover:text-white transition-all shadow-lg font-bold text-sm flex items-center gap-2"
          >
            <span>⭐</span>
            <span>Portfolio</span>
          </Link>
        )}
        <Link
          to="/dashboard"
          className="px-3 py-2 rounded-full bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 text-slate-800 hover:from-slate-400 hover:via-slate-300 hover:to-slate-500 transition-all font-medium text-sm flex items-center gap-2"
          style={{
            boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.2)',
            textShadow: '0 1px 1px rgba(255,255,255,0.8)'
          }}
        >
          <span>👤</span>
          <span>Dashboard</span>
        </Link>
        {!isLoggedIn && (
          <Link
            to="/signup"
            className="px-3 py-2 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 text-white hover:from-purple-700 hover:to-purple-900 transition-all shadow-lg font-medium text-sm flex items-center gap-2"
          >
            <span>🔑</span>
            <span>Log In</span>
          </Link>
        )}
      </div>

      <div className="pt-28 px-8">
        <div className="text-center mb-4 flex flex-col items-center">
          <div className="relative inline-block">
            <h1 className="text-8xl font-bold text-[#f87004] mb-2" style={{
              textShadow: '2px 2px 0px #fb9f05, 4px 4px 0px #f99006, 6px 6px 0px #ae3e07',
              transform: 'translateZ(0)'
            }}>
              Hot Money
            </h1>
            {/* Mr. Bee leaning on title */}
            <img 
              src="/images/Mr_Bee.png" 
              alt="Mr. Bee" 
              className="absolute -right-32 w-40 h-40 object-contain"
              style={{ 
                top: '-20px'
              }}
            />
          </div>
          
          <div className="mt-2 mb-3">
            <h2 className="text-3xl font-bold text-slate-700 mb-2">
              🔥 Start Collecting Hot Deals 🔥
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-3 font-medium">
              Discover the hottest startup deals and grow your investment portfolio
            </p>
          </div>

          <div className="flex gap-4 justify-center mb-4">
            <Link to="/submit" className="px-6 py-2.5 bg-gradient-to-br from-[#f87004] via-[#fb9f05] to-[#f99006] text-[#4700d6] border-2 border-[#f87004] rounded-lg font-bold text-base hover:from-[#fb9f05] hover:via-[#f87004] hover:to-[#ae3e07] transition-all shadow-lg">
              📈 Submit Startup
            </Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-[#a81eff]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
              📰 Venture Capital News
            </h3>
            <p className="text-slate-600 mt-2">
              Latest deals and investments (click ticker to read more • updates every 20 seconds)
            </p>
          </div>
          
          {/* News Update Ticker */}
          <NewsUpdate />
          
          {/* Featured Startups Grid */}
          <div className="mt-8">
            <div className="grid md:grid-cols-3 gap-6 justify-items-center">
              {displayedStartups.map((startup, position) => (
                <div 
                  key={`${startup.id}-${position}`}
                  className={`transition-all duration-250 ease-out ${
                    slidingCards.includes(position) ? 'animate-slide-left' : ''
                  }`}
                >
                  <StartupCardOfficial
                    startup={startup}
                    onVote={(vote) => handleVote(startup.id, vote, position)}
                    onSwipeAway={() => handleSwipeAway(position)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-left {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(-420px);
            opacity: 0.3;
          }
        }
        .animate-slide-left {
          animation: slide-left 0.25s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default FrontPageNew;