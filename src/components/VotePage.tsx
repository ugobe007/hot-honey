import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import StartupCardOfficial from './StartupCardOfficial';
import VCFirmCard from './VCFirmCard';
import HamburgerMenu from './HamburgerMenu';
import { loadApprovedStartups } from '../store';
import { saveVote, hasVoted, getYesVotes } from '../lib/voteService';
import { awardPoints } from '../utils/firePointsManager';

const VotePage: React.FC = () => {
  const navigate = useNavigate();
  const [unvotedStartups, setUnvotedStartups] = useState<any[]>([]);
  const [totalStartupCount, setTotalStartupCount] = useState(0);
  const [showFiltered, setShowFiltered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const BATCH_SIZE = 20; // Load 20 startups at a time
  
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Load startups with pagination
  const loadStartups = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      const currentOffset = isLoadMore ? offset : 0;
      const preferences = localStorage.getItem('investorPreferences');
      
      // Load startups from Supabase with pagination
      const approvedStartups = await loadApprovedStartups(BATCH_SIZE, currentOffset);
      
      console.log(`🗳️ VotePage loaded ${approvedStartups.length} startups (offset: ${currentOffset})`);
      
      // Check if there are more startups to load
      if (approvedStartups.length < BATCH_SIZE) {
        setHasMore(false);
      }
      
      let filteredStartups = approvedStartups;

      // Apply industry filter if enabled
      if (preferences) {
        const prefs = JSON.parse(preferences);
        if (prefs.filterEnabled && prefs.industries && prefs.industries.length > 0) {
          setShowFiltered(true);
          filteredStartups = approvedStartups.filter(startup => {
            if (!startup.industries || startup.industries.length === 0) return true;
            return startup.industries.some((ind: string) => prefs.industries.includes(ind));
          });
        }
      }

      // Filter out already voted startups
      const yesVotedIds = getYesVotes();
      const unvoted = filteredStartups.filter(s => !yesVotedIds.includes(String(s.id)));
      
      if (isLoadMore) {
        setUnvotedStartups(prev => [...prev, ...unvoted]);
        setOffset(currentOffset + BATCH_SIZE);
      } else {
        setUnvotedStartups(unvoted);
        setTotalStartupCount(unvoted.length);
        setOffset(BATCH_SIZE);
      }
    } catch (error) {
      console.error('Error loading startups:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [offset]);

  // Initial load
  useEffect(() => {
    loadStartups(false);
  }, []);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadStartups(true);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadStartups]);

  const handleVote = async (startupId: string | number, vote: 'yes' | 'no') => {
    const idString = String(startupId); // Ensure it's a string
    
    // Award fire points
    const pointAction = vote === 'yes' ? 'VOTE_YES' : 'VOTE_NO';
    const result = awardPoints(pointAction);
    
    // Show toast notification
    setToastMessage(`🔥 +${result.pointsEarned} Fire Points!`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
    
    // Check for perk unlocks
    if (result.perksUnlocked.length > 0) {
      setTimeout(() => {
        setToastMessage(`🎊 Unlocked: ${result.perksUnlocked.join(', ')}!`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
      }, 3500);
    }
    
    // Save vote to both localStorage and Supabase
    const voteResult = await saveVote(idString, vote);
    
    if (!voteResult.success) {
      console.error('Failed to save vote:', voteResult.error);
      // Still proceed - vote is cached locally
    }

    // Save YES votes to localStorage for dashboard and portfolio
    if (vote === 'yes') {
      const yesVotes = localStorage.getItem('myYesVotes');
      const yesVotesList = yesVotes ? JSON.parse(yesVotes) : [];
      
      // Find the full startup object
      const startup = unvotedStartups.find(s => String(s.id) === idString);
      
      if (startup) {
        yesVotesList.push({
          ...startup,
          votedAt: new Date().toISOString()
        });
        localStorage.setItem('myYesVotes', JSON.stringify(yesVotesList));
      }
    }

    // Remove from unvoted list immediately
    setUnvotedStartups(prev => prev.filter(s => String(s.id) !== idString));
  };

  const handleResetVotes = () => {
    if (confirm('⚠️ Reset ALL votes? This will clear your voting history.')) {
      localStorage.removeItem('user_votes');
      localStorage.removeItem('myYesVotes');
      // Reload the page
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">🍯</div>
          <div className="text-2xl text-white font-bold">Loading startups...</div>
        </div>
      </div>
    );
  }

  if (unvotedStartups.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-slate-100">
        {/* Hamburger Menu */}
        <HamburgerMenu />

        {/* Current Page Button Only */}
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-full bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 text-slate-800 font-medium text-sm flex items-center gap-2 shadow-lg hover:from-slate-400 hover:via-slate-300 hover:to-slate-500 transition-all cursor-pointer"
            style={{
              boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.2)',
              textShadow: '0 1px 1px rgba(255,255,255,0.8)'
            }}>
            <span>🏠</span>
            <span>Home</span>
          </button>
        </div>

        <div className="flex items-center justify-center min-h-screen pt-20 relative z-10">
          <div className="text-center bg-gradient-to-br from-purple-900/60 to-indigo-900/60 backdrop-blur-lg border-2 border-purple-500/30 rounded-3xl p-12 shadow-2xl max-w-2xl mx-4">
            <h2 className="text-8xl mb-6">🎉</h2>
            <h3 className="text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                All Done!
              </span>
            </h3>
            <p className="text-2xl text-white mb-8">You've voted on all {totalStartupCount} startups!</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/dashboard" className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:scale-105 border-2 border-orange-400/30">
                View My Hot Picks 🔥
              </Link>
              <button
                onClick={handleResetVotes}
                className="px-8 py-4 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:scale-105 border-2 border-gray-600/30"
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
    <div className="min-h-screen bg-gradient-to-b from-[#160020] via-[#240032] to-[#330044] relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#9400cd]/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#9400cd]/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Hamburger Menu */}
      <HamburgerMenu />

      {/* Vote Button - Links to Home */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white font-bold text-sm flex items-center gap-2 shadow-xl hover:from-green-600 hover:via-emerald-600 hover:to-green-700 transition-all cursor-pointer hover:scale-105 border-2 border-green-400/30">
          <span>🗳️</span>
          <span>Vote</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center min-h-screen pt-28">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-400 mb-4"></div>
            <div className="text-white text-2xl font-bold">Loading Startups...</div>
          </div>
        </div>
      )}

      {/* Main Content - Only show if not loading */}
      {!loading && (
        <>
      <div className="relative z-10 pt-28 px-8 pb-16">
        <div className="mb-12 text-center">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-6xl font-bold mb-4">
                <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  🔥 Vote on Startups
                </span>
              </h1>
              <div className="flex items-center justify-center gap-4">
                <div className="px-6 py-3 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 backdrop-blur-sm border border-purple-400/30 rounded-xl">
                  <p className="text-2xl text-white">
                    <span className="font-bold text-orange-400">{unvotedStartups.length}</span>
                    <span className="text-gray-300"> of </span>
                    <span className="font-bold text-cyan-400">{totalStartupCount}</span>
                    <span className="text-gray-300"> {unvotedStartups.length === 1 ? 'startup' : 'startups'} remaining</span>
                  </p>
                </div>
                {showFiltered && (
                  <div className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-400/30 text-purple-300 rounded-full text-sm font-semibold backdrop-blur-sm">
                    🎯 Filtered by your preferences
                  </div>
                )}
              </div>
            </div>
            
            {/* Reset Button */}
            <button
              onClick={handleResetVotes}
              className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl font-medium text-sm transition-all shadow-lg border-2 border-gray-600/30 hover:scale-105"
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
          
          {/* Loading More Indicator & Infinite Scroll Trigger */}
          {hasMore && (
            <div ref={loadMoreRef} className="text-center py-8">
              {loadingMore ? (
                <div className="text-white text-xl">
                  <div className="animate-spin inline-block w-8 h-8 border-4 border-white border-t-transparent rounded-full mb-2"></div>
                  <p>Loading more startups...</p>
                </div>
              ) : (
                <div className="text-purple-200 text-sm">
                  Scroll for more...
                </div>
              )}
            </div>
          )}
          
          {/* No More Startups Message */}
          {!hasMore && unvotedStartups.length > 0 && (
            <div className="text-center py-8 text-white text-xl">
              🎉 You've seen all available startups!
            </div>
          )}
          
          {/* No Startups Left */}
          {unvotedStartups.length === 0 && !loading && (
            <div className="text-center py-16 text-white">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold mb-2">All Done!</h2>
              <p className="text-xl text-purple-200 mb-6">You've voted on all available startups.</p>
              <Link
                to="/dashboard"
                className="inline-block px-8 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold rounded-xl hover:from-green-600 hover:to-blue-600 transition-all"
              >
                View Your Dashboard
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Fire Points Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 right-8 z-[1000] animate-bounce">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl font-bold text-lg">
            {toastMessage}
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default VotePage;