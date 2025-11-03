import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import StartupCardOfficial from './StartupCardOfficial';
import AdminNav from './AdminNav';
import ActivityTicker from './ActivityTicker';
import startupData from '../data/startupData';
import { loadApprovedStartups } from '../store';
import { generateRecentActivities } from '../utils/activityGenerator';

const FrontPageNew: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn, user, logout } = useAuth();
  const [currentStartupIndices, setCurrentStartupIndices] = useState([0, 1, 2]);
  const [startups, setStartups] = useState(startupData);
  const [votedStartupIds, setVotedStartupIds] = useState<Set<number>>(new Set());
  const [nextAvailableIndex, setNextAvailableIndex] = useState(3);
  const [slidingCards, setSlidingCards] = useState<number[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

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

      // Load activities
      const recentActivities = await generateRecentActivities();
      setActivities(recentActivities);
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950" style={{ backgroundImage: 'radial-gradient(ellipse 800px 600px at 20% 40%, rgba(134, 239, 172, 0.4), transparent), linear-gradient(to bottom right, rgb(88, 28, 135), rgb(59, 7, 100))' }}>
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex gap-2 items-center">
          <Link to="/signup" className="text-6xl hover:scale-110 transition-transform cursor-pointer" title="Sign Up">
            🍯
          </Link>
          <Link 
            to="/" 
            className="flex items-center justify-center bg-orange-500 text-white font-medium text-sm shadow-lg hover:bg-orange-600 transition-colors"
            style={{ width: '120px', height: '45px', borderRadius: '22.5px' }}
          >
            🏠 Home
          </Link>
          <Link 
            to="/vote" 
            className="flex items-center justify-center bg-purple-700 text-white font-medium text-sm shadow-lg hover:bg-purple-600 transition-colors"
            style={{ width: '110px', height: '45px', borderRadius: '22.5px' }}
          >
            <span className="blink-text">🗳️ Vote</span>
          </Link>
          <Link 
            to="/investors" 
            className="flex items-center justify-center bg-purple-700 text-white font-medium text-sm shadow-lg hover:bg-purple-600 transition-colors"
            style={{ width: '140px', height: '45px', borderRadius: '22.5px' }}
          >
            💼 Investors
          </Link>
          <Link 
            to="/portfolio" 
            className="flex items-center justify-center bg-purple-700 text-white font-medium text-sm shadow-lg hover:bg-purple-600 transition-colors"
            style={{ width: '130px', height: '45px', borderRadius: '22.5px' }}
          >
            ⭐ Portfolio
          </Link>
          <Link 
            to="/analytics" 
            className="flex items-center justify-center bg-gradient-to-r from-purple-700 to-purple-900 text-yellow-400 font-bold text-sm shadow-lg hover:from-purple-800 hover:to-purple-950 transition-all"
            style={{ width: '140px', height: '45px', borderRadius: '22.5px' }}
          >
            📈 Analytics
          </Link>
          <Link 
            to="/dashboard" 
            className="flex items-center justify-center bg-orange-500 text-white font-medium text-sm shadow-lg hover:bg-orange-600 transition-colors"
            style={{ width: '145px', height: '45px', borderRadius: '22.5px' }}
          >
            👤 Dashboard
          </Link>
        </div>
      </div>

      {/* Dynamic Login/Logout button in upper right corner */}
      <div className="fixed top-4 right-8 z-50 flex flex-col items-end gap-2">
        {isLoggedIn ? (
          <>
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="px-6 py-2 bg-white text-purple-700 rounded-full font-bold text-sm shadow-lg hover:bg-gray-100 transition-all border-2 border-purple-300"
            >
              � Log Out
            </button>
            <Link
              to="/profile"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-full font-semibold text-sm shadow-lg hover:bg-purple-700 transition-all"
            >
              {user?.isAdmin ? (
                <img src="/images/Mr_Bee_Head.jpg" alt="Profile" className="w-8 h-8 object-contain" />
              ) : (
                <span>👨‍💼</span>
              )}
              <span>Profile</span>
            </Link>
          </>
        ) : (
          <Link 
            to="/login" 
            className="px-6 py-2 bg-white text-purple-700 rounded-full font-bold text-sm shadow-lg hover:bg-gray-100 transition-all border-2 border-purple-300"
          >
            🔑 Log In
          </Link>
        )}
      </div>

      <div className="pt-28 px-8">
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <h1 className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 mb-2">
              Hot Honey
            </h1>
            {/* Mr. Bee leaning on Honey */}
            <img 
              src="/images/Mr_Bee.png" 
              alt="Mr. Bee" 
              className="absolute -right-32 w-40 h-40 object-contain"
              style={{ 
                top: '-20px'
              }}
            />
          </div>
          
          <div className="mt-6 mb-4">
            <h2 className="text-3xl font-bold text-white mb-3">
              🔥 Start Collecting Hot Deals 🔥
            </h2>
            <p className="text-lg text-purple-200 max-w-2xl mx-auto mb-6 font-medium">
              Discover the hottest startup deals and grow your investment portfolio
            </p>
          </div>

          <div className="flex gap-4 justify-center mb-8">
            <Link to="/vote" className="px-6 py-2.5 bg-orange-500 text-white rounded-lg font-medium text-base hover:bg-orange-600 transition-colors shadow-lg">
              📊 Start Voting
            </Link>
            <Link to="/submit" className="px-6 py-2.5 bg-white text-orange-500 border-2 border-orange-500 rounded-lg font-medium text-base hover:bg-orange-50 transition-colors shadow-lg">
              📈 Submit Startup
            </Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-white" style={{ 
              textShadow: '2px 2px 4px rgba(147, 51, 234, 0.6), -2px -2px 4px rgba(134, 239, 172, 0.4)' 
            }}>
              📡 Live Activity Feed
            </h3>
            <p className="text-purple-200 mt-2">
              See what's happening right now
            </p>
          </div>
          
          {/* Activity Ticker */}
          <ActivityTicker activities={activities} />
          
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
      
      {/* Admin Navigation */}
      <AdminNav />
    </div>
  );
};

export default FrontPageNew;