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
          <div className="text-8xl mb-4">💼</div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 bg-clip-text text-transparent mb-4">
            Investment Portfolio
          </h1>
          <p className="text-xl text-white font-bold drop-shadow-lg">
            Track your committed investments, startup progress, and ROI
          </p>
        </div>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-purple-800/50 backdrop-blur-sm rounded-xl p-6 border border-green-400/30 text-center">
            <div className="text-3xl font-bold text-yellow-300">{myYesVotes.length}</div>
            <div className="text-sm text-green-200">Investments</div>
          </div>
          <div className="bg-purple-800/50 backdrop-blur-sm rounded-xl p-6 border border-green-400/30 text-center">
            <div className="text-3xl font-bold text-green-300">$125K</div>
            <div className="text-sm text-green-200">Total Committed</div>
          </div>
          <div className="bg-purple-800/50 backdrop-blur-sm rounded-xl p-6 border border-green-400/30 text-center">
            <div className="text-3xl font-bold text-orange-300">+34%</div>
            <div className="text-sm text-green-200">Avg ROI</div>
          </div>
        </div>

        {/* Portfolio Content */}
        {myYesVotes.length === 0 ? (
          <div className="bg-purple-800/30 backdrop-blur-sm rounded-3xl p-12 text-center border border-green-400/30">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-3xl font-bold text-yellow-300 mb-4">No investments yet!</h2>
            <p className="text-lg text-green-200 mb-8">
              Start voting YES on startups to build your investment portfolio
            </p>
            <button
              onClick={() => navigate('/vote')}
              className="bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 hover:scale-105 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transition-all text-lg"
            >
              🗳️ Go to Voting
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-purple-800/50 backdrop-blur-md rounded-3xl p-6 border-2 border-yellow-400">
              <h2 className="text-2xl font-bold text-yellow-300 mb-2">
                💼 {myYesVotes.length} Investment{myYesVotes.length !== 1 ? 's' : ''} in Portfolio
              </h2>
              <p className="text-green-200">
                Track performance, monitor milestones, and manage your startup investments
              </p>
            </div>

            {/* Investment Cards with Progress Tracking */}
            <div className="space-y-6">
              {myYesVotes.map((startup) => (
                <div key={startup.id} className="bg-purple-800/30 backdrop-blur-sm rounded-2xl p-6 border border-green-400/30 hover:border-yellow-400 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-yellow-300 mb-2">{startup.name}</h3>
                      {startup.tagline && (
                        <p className="text-green-200 mb-3">{startup.tagline}</p>
                      )}
                      <div className="flex gap-3 flex-wrap">
                        <span className="px-3 py-1 bg-green-500/20 border border-green-400/30 rounded-full text-green-300 text-sm font-semibold">
                          💰 $25K invested
                        </span>
                        <span className="px-3 py-1 bg-orange-500/20 border border-orange-400/30 rounded-full text-orange-300 text-sm font-semibold">
                          📈 +42% ROI
                        </span>
                        <span className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-sm font-semibold">
                          📅 6 months
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-green-300">$35.5K</div>
                      <div className="text-sm text-green-200">Current Value</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-green-200 mb-2">
                      <span>Investment Progress</span>
                      <span>Series A Target: $15M</span>
                    </div>
                    <div className="w-full bg-purple-900/50 rounded-full h-3">
                      <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full" style={{width: '68%'}}></div>
                    </div>
                  </div>

                  {/* Recent Milestones */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-yellow-300 mb-2">🎯 Recent Milestones</h4>
                    <ul className="space-y-1 text-sm text-white/90">
                      <li>• Reached 10,000 active users</li>
                      <li>• Signed partnership with major enterprise client</li>
                      <li>• Revenue increased 3x quarter-over-quarter</li>
                    </ul>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => navigate(`/startup/${startup.id}`)}
                      className="flex-1 px-4 py-2 rounded-xl font-semibold bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 text-white hover:scale-105 transition-transform"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleRemoveFavorite(startup.id)}
                      className="px-4 py-2 rounded-xl font-semibold bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/30 transition-all"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center mt-8">
              <button
                onClick={() => navigate('/vote')}
                className="bg-gradient-to-r from-green-400 to-emerald-500 hover:scale-105 text-purple-900 font-bold py-3 px-8 rounded-2xl shadow-lg transition-all"
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