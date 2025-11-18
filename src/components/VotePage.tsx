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

        <div className="flex items-center justify-center min-h-screen pt-20">
          <div className="text-center bg-white rounded-2xl p-12 shadow-xl max-w-2xl mx-4">
            <h2 className="text-6xl font-bold mb-4">🎉</h2>
            <h3 className="text-4xl font-bold text-slate-800 mb-4">All Done!</h3>
            <p className="text-xl text-slate-600 mb-8">You've voted on all {totalStartupCount} startups!</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/dashboard" className="px-8 py-3 bg-amber-500 text-white rounded-lg font-medium text-lg hover:bg-amber-600 transition-colors shadow-lg">
                View My Hot Picks 🔥
              </Link>
              <button
                onClick={handleResetVotes}
                className="px-8 py-3 bg-slate-500 text-white rounded-lg font-medium text-lg hover:bg-slate-600 transition-colors shadow-lg"
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-slate-100">
      {/* Hamburger Menu */}
      <HamburgerMenu />

      {/* Vote Button - Links to Home */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40">
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-full bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 text-slate-800 font-medium text-sm flex items-center gap-2 shadow-lg hover:from-slate-400 hover:via-slate-300 hover:to-slate-500 transition-all cursor-pointer"
          style={{
            boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.2)',
            textShadow: '0 1px 1px rgba(255,255,255,0.8)'
          }}>
          <span>🗳️</span>
          <span>Vote</span>
        </button>
      </div>

      <div className="pt-28 px-8 pb-16">
        <div className="mb-8 text-center">
          <div className="flex justify-between items-center max-w-7xl mx-auto mb-4">
            <div className="flex-1">
              <h1 className="text-5xl font-bold text-orange-600 mb-3">
                🔥 Vote on Startups
              </h1>
              <p className="text-xl text-slate-700">
                <span className="font-bold text-orange-500">{unvotedStartups.length}</span> of {totalStartupCount} {unvotedStartups.length === 1 ? 'startup' : 'startups'} remaining
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
    </div>
  );
};

export default VotePage;