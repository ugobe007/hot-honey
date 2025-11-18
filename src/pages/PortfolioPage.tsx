import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import StartupCardOfficial from '../components/StartupCardOfficial';
import HamburgerMenu from '../components/HamburgerMenu';
import { NotificationBell } from '../components/NotificationBell';
import startupData from '../data/startupData';
import { useAuth } from '../hooks/useAuth';
import { useVotes } from '../hooks/useVotes';

export default function PortfolioPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, isLoading: authLoading } = useAuth();
  const { votes, isLoading: votesLoading, getYesVotes, removeVote } = useVotes(userId);
  const [myYesVotes, setMyYesVotes] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (authLoading || votesLoading) return;

    const isAnonymous = !userId || userId.startsWith('anon_');
    
    if (isAnonymous) {
      // For anonymous users, load from localStorage
      const myYesVotesStr = localStorage.getItem('myYesVotes');
      if (myYesVotesStr) {
        try {
          const yesVotesArray = JSON.parse(myYesVotesStr);
          
          // Deduplicate by ID
          const uniqueVotesMap = new Map();
          yesVotesArray.forEach((vote: any) => {
            if (vote && vote.id !== undefined) {
              uniqueVotesMap.set(vote.id, vote);
            }
          });
          
          setMyYesVotes(Array.from(uniqueVotesMap.values()));
        } catch (e) {
          console.error('Error loading votes from localStorage:', e);
        }
      }
    } else {
      // For authenticated users, get YES vote startup IDs from Supabase
      const yesVoteIds = getYesVotes();
      
      // Enrich with full startup data
      const enrichedVotes = yesVoteIds.map(id => {
        const startup = startupData.find(s => s.id.toString() === id);
        if (startup) {
          return {
            ...startup,
            votedAt: votes.find(v => v.startup_id === id)?.created_at || new Date().toISOString(),
          };
        }
        return null;
      }).filter(Boolean);
      
      setMyYesVotes(enrichedVotes);
    }

    // Check admin status
    const userProfile = localStorage.getItem('userProfile');
    if (userProfile) {
      const profile = JSON.parse(userProfile);
      setIsAdmin(profile.email === 'admin@hotmoneyhoney.com' || profile.isAdmin);
    }
  }, [authLoading, votesLoading, votes, userId]); // Added userId to dependencies

  const handleVote = (vote: 'yes' | 'no', startup?: any) => {
    if (vote === 'no' && startup) {
      // Remove from state immediately for instant UI update
      setMyYesVotes(prev => prev.filter(v => v.id !== startup.id));
      
      // For anonymous users, remove from localStorage
      const isAnonymous = !userId || userId.startsWith('anon_');
      if (isAnonymous) {
        const myYesVotesStr = localStorage.getItem('myYesVotes');
        if (myYesVotesStr) {
          try {
            const yesVotesArray = JSON.parse(myYesVotesStr);
            const updatedVotes = yesVotesArray.filter((v: any) => v.id !== startup.id);
            localStorage.setItem('myYesVotes', JSON.stringify(updatedVotes));
          } catch (e) {
            console.error('Error updating myYesVotes:', e);
          }
        }
        
        const votedStartupsStr = localStorage.getItem('votedStartups');
        if (votedStartupsStr) {
          try {
            const votedStartups = JSON.parse(votedStartupsStr);
            const updatedVoted = votedStartups.filter((id: number) => id !== startup.id);
            localStorage.setItem('votedStartups', JSON.stringify(updatedVoted));
          } catch (e) {
            console.error('Error updating votedStartups:', e);
          }
        }
      } else {
        // For authenticated users, remove from Supabase
        removeVote(startup.id.toString());
      }
    }
  };

  const handleRemoveFavorite = async (startupId: number) => {
    const success = await removeVote(startupId.toString());
    if (success) {
      setMyYesVotes(prev => prev.filter(v => v.id !== startupId));
    } else {
      alert('❌ Failed to remove favorite. Please try again.');
    }
  };

  if (authLoading || votesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading portfolio...</div>
      </div>
    );
  }

  const isActive = (path: string) => location.pathname === path;
  const getButtonSize = (path: string) => {
    if (isActive(path)) return 'text-lg py-3 px-6';
    return 'text-sm py-2 px-4';
  };

  return (
    <>
      {/* Main content container */}
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-slate-100 p-4 sm:p-8">
        {/* Hamburger Menu */}
        <HamburgerMenu />

        {/* Current Page Button */}
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

        <div className="max-w-7xl mx-auto pt-20 sm:pt-24 px-2">{/* Reduced padding */}
        
          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🍯</div>
            <h1 className="text-3xl sm:text-4xl font-bold text-orange-600 mb-2">
              Your Portfolio
            </h1>
            <p className="text-base sm:text-lg text-slate-700 font-semibold">
              Startups you've voted YES on
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 px-4 py-2 rounded-full bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 text-slate-800 hover:from-slate-400 hover:via-slate-300 hover:to-slate-500 transition-all font-medium text-sm shadow-lg"
              style={{
                boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.2)',
                textShadow: '0 1px 1px rgba(255,255,255,0.8)'
              }}
            >
              ← Back to Dashboard
            </button>
          </div>

          {/* Portfolio Content */}
          {myYesVotes.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-2xl">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">No picks yet!</h2>
            <p className="text-lg text-gray-600 mb-8">
              Start voting YES on startups to build your portfolio
            </p>
            <button
              onClick={() => navigate('/vote')}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transition-all text-lg"
            >
              🗳️ Go to Voting
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border-2 border-orange-400">
              <h2 className="text-lg font-bold text-slate-800 mb-1">
                ✨ {myYesVotes.length} Startup{myYesVotes.length !== 1 ? 's' : ''} in Your Portfolio
              </h2>
              <p className="text-sm text-slate-700">
                These are the startups you've voted YES on!
              </p>
            </div>

            {/* Startup Cards in Horizontal Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
              {myYesVotes.map((startup) => (
                <div key={startup.id} className="relative flex flex-col items-center">
                  <StartupCardOfficial
                    startup={startup}
                    onVote={handleVote}
                  />
                  
                  {/* Remove from Portfolio Button */}
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => handleRemoveFavorite(startup.id)}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-lg"
                    >
                      ❌ Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center mt-8">
              <button
                onClick={() => navigate('/vote')}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-8 rounded-2xl shadow-lg transition-all"
              >
                🗳️ Continue Voting
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-2xl shadow-lg transition-all"
              >
                📊 Back to Dashboard
              </button>
            </div>
          </div>
        )}
        </div>{/* Close max-w-7xl container */}
      </div>{/* Close page */}
    </>
  );
}