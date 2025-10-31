import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import StartupCardOfficial from '../components/StartupCardOfficial';
import startupData from '../data/startupData';

export default function PortfolioPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [myYesVotes, setMyYesVotes] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Load YES votes from localStorage (same as Dashboard)
    const votes = localStorage.getItem('myYesVotes');
    if (votes) {
      const parsedVotes = JSON.parse(votes);
      
      // Migrate old votes that don't have fivePoints
      const enrichedVotes = parsedVotes.map((vote: any) => {
        if (!vote.fivePoints) {
          // Find the startup in startupData and add missing fields
          const fullStartup = startupData.find(s => s.id === vote.id);
          if (fullStartup) {
            return { ...vote, fivePoints: fullStartup.fivePoints };
          }
        }
        return vote;
      });
      
      // Save enriched data back to localStorage
      localStorage.setItem('myYesVotes', JSON.stringify(enrichedVotes));
      setMyYesVotes(enrichedVotes);
    }

    // Check admin status
    const userProfile = localStorage.getItem('userProfile');
    if (userProfile) {
      const profile = JSON.parse(userProfile);
      setIsAdmin(profile.email === 'admin@hotmoneyhoney.com' || profile.isAdmin);
    }
  }, []);

  const handleVote = (vote: 'yes' | 'no') => {
    console.log(`Voted ${vote}`);
    // You can add vote handling logic here if needed
  };

  const handleRemoveFavorite = (startupId: number) => {
    // Remove from myYesVotes
    const votes = localStorage.getItem('myYesVotes');
    if (votes) {
      const parsedVotes = JSON.parse(votes);
      const updated = parsedVotes.filter((v: any) => v.id !== startupId);
      localStorage.setItem('myYesVotes', JSON.stringify(updated));
      setMyYesVotes(updated);
      
      // Also remove from votedStartups
      const votedStartups = localStorage.getItem('votedStartups');
      if (votedStartups) {
        const voted = JSON.parse(votedStartups);
        delete voted[startupId];
        localStorage.setItem('votedStartups', JSON.stringify(voted));
      }
    }
  };

  const isActive = (path: string) => location.pathname === path;
  const getButtonSize = (path: string) => {
    if (isActive(path)) return 'text-lg py-3 px-6';
    return 'text-sm py-2 px-4';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950 p-8" style={{ backgroundImage: 'radial-gradient(ellipse 800px 600px at 20% 40%, rgba(134, 239, 172, 0.4), transparent), linear-gradient(to bottom right, rgb(88, 28, 135), rgb(59, 7, 100))' }}>
      {/* Navigation Bar */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex gap-3 items-center">
          <Link to="/signup" className="text-4xl hover:scale-110 transition-transform cursor-pointer" title="Hot Money Honey">
            🍯
          </Link>
          
          <Link 
            to="/" 
            className={`font-bold rounded-2xl transition-all ${getButtonSize('/')} ${
              isActive('/')
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg scale-110'
                : 'bg-purple-700 hover:bg-purple-600 text-white'
            }`}
          >
            🏠 Home
          </Link>

          <Link 
            to="/dashboard" 
            className={`font-bold rounded-2xl transition-all ${
              isActive('/dashboard') ? 'text-lg py-3 px-7' : 'text-base py-2.5 px-5'
            } ${
              isActive('/dashboard')
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-xl scale-110'
                : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white shadow-lg'
            }`}
          >
            📊 Dashboard
          </Link>

          <Link 
            to="/vote" 
            className={`font-bold rounded-2xl transition-all ${getButtonSize('/vote')} ${
              isActive('/vote')
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg scale-110'
                : 'bg-purple-700 hover:bg-purple-600 text-white'
            }`}
          >
            🗳️ Vote
          </Link>

          <Link 
            to="/portfolio" 
            className={`font-bold rounded-2xl transition-all ${getButtonSize('/portfolio')} ${
              isActive('/portfolio')
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg scale-110'
                : 'bg-purple-700 hover:bg-purple-600 text-white'
            }`}
          >
            ⭐ Portfolio
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

          {isAdmin && (
            <Link 
              to="/admin/document-upload" 
              className={`font-bold rounded-2xl transition-all ${getButtonSize('/admin/document-upload')} ${
                isActive('/admin/document-upload')
                  ? 'bg-gradient-to-r from-green-500 to-purple-700 text-white shadow-lg scale-110'
                  : 'bg-gradient-to-r from-green-400 to-purple-600 hover:from-green-500 hover:to-purple-700 text-white'
              }`}
            >
              📄 Scan Docs
            </Link>
          )}
        </div>
      </div>

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
  );
}