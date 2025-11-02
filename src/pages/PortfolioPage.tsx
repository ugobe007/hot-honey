import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import StartupCardOfficial from '../components/StartupCardOfficial';
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
      {/* Navigation Bar - OUTSIDE main container */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] pointer-events-auto">
        <div className="flex gap-3 items-center pointer-events-auto">
          <Link to="/signup" className="text-5xl hover:scale-110 transition-transform cursor-pointer flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-400 hover:to-purple-500 shadow-lg" title="Hot Money Honey">
            🍯
          </Link>
          
          <Link 
            to="/" 
            className={`font-bold rounded-full transition-all text-sm py-2 px-4 ${
              isActive('/')
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg scale-110'
                : 'bg-purple-700 hover:bg-purple-600 text-white'
            }`}
          >
            🏠 Home
          </Link>

          <Link 
            to="/dashboard" 
            className={`font-bold rounded-full transition-all text-sm ${
              isActive('/dashboard') ? 'py-3 px-6 scale-110 text-base' : 'py-2 px-4'
            } ${
              isActive('/dashboard')
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-xl'
                : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white shadow-lg'
            }`}
          >
            📊 Dashboard
          </Link>

          <Link 
            to="/vote" 
            className={`font-bold rounded-full transition-all text-sm py-2 px-4 ${
              isActive('/vote')
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg scale-110'
                : 'bg-purple-700 hover:bg-purple-600 text-white'
            }`}
          >
            🗳️ Vote
          </Link>

          <Link 
            to="/portfolio" 
            className={`font-bold rounded-full transition-all ${
              isActive('/portfolio') ? 'py-3 px-6 scale-110 text-base' : 'py-2 px-4 text-sm'
            } ${
              isActive('/portfolio')
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
                : 'bg-purple-700 hover:bg-purple-600 text-white'
            }`}
          >
            ⭐ Portfolio
          </Link>

          <Link 
            to="/settings" 
            className={`font-bold rounded-2xl transition-all ${getButtonSize('/settings')} ${
              isActive('/settings')
                ? 'bg-gradient-to-r from-gray-500 to-gray-700 text-white shadow-lg scale-110'
                : 'bg-purple-700 hover:bg-purple-600 text-white'
            }`}
          >
            ⚙️ Settings
          </Link>

          {isAdmin && (
            <Link 
              to="/admin/bulk-upload" 
              className={`font-bold rounded-2xl transition-all ${getButtonSize('/admin/bulk-upload')} ${
                isActive('/admin/bulk-upload')
                  ? 'bg-gradient-to-r from-gray-500 to-gray-700 text-white shadow-lg scale-110'
                  : 'bg-gradient-to-r from-gray-400 to-gray-600 hover:from-gray-500 hover:to-gray-700 text-white'
              }`}
            >
              📊 Bulk Upload
            </Link>
          )}

          <NotificationBell />
        </div>
      </div>

      {/* Main content container */}
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950 p-8" style={{ backgroundImage: 'radial-gradient(ellipse 800px 600px at 20% 40%, rgba(134, 239, 172, 0.4), transparent), linear-gradient(to bottom right, rgb(88, 28, 135), rgb(59, 7, 100))' }}>
        <div className="max-w-4xl mx-auto pt-28">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-8xl mb-4">⭐</div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 bg-clip-text text-transparent mb-4">
            Your Portfolio
          </h1>
          <p className="text-xl text-white font-bold drop-shadow-lg">
            Startups you've voted YES on
          </p>
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
          <div className="space-y-8">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border-2 border-orange-400">
              <h2 className="text-2xl font-bold text-white mb-2">
                ✨ {myYesVotes.length} Startup{myYesVotes.length !== 1 ? 's' : ''} in Your Portfolio
              </h2>
              <p className="text-purple-200">
                These are the startups you've voted YES on!
              </p>
            </div>

            {/* Full Startup Cards */}
            <div className="space-y-8">
              {myYesVotes.map((startup) => (
                <div key={startup.id} className="relative">
                  <StartupCardOfficial
                    startup={startup}
                    onVote={handleVote}
                  />
                  
                  {/* Remove from Portfolio Button */}
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => handleRemoveFavorite(startup.id)}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-xl transition-all"
                    >
                      ❌ Remove from Portfolio
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
        </div>
      </div>
    </>
  );
}