import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import StartupCardOfficial from './StartupCardOfficial';
import startupData from '../data/startupData';

const FrontPageNew: React.FC = () => {
  const [currentStartupIndices, setCurrentStartupIndices] = useState([0, 1, 2]);
  const [startups, setStartups] = useState(startupData);
  const [nextAvailableIndex, setNextAvailableIndex] = useState(3);
  const [slidingCards, setSlidingCards] = useState<number[]>([]);

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

    // Save YES votes to localStorage for dashboard
    if (vote === 'yes') {
      const yesVotes = localStorage.getItem('myYesVotes');
      const yesVotesList = yesVotes ? JSON.parse(yesVotes) : [];
      const startup = startupData.find(s => s.id === startupId);
      
      if (startup) {
        yesVotesList.push({
          id: startupId,
          name: startup.name,
          pitch: startup.pitch,
          tagline: startup.tagline,
          stage: startup.stage,
          fivePoints: startup.fivePoints, // Include full fivePoints array
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
        for (let i = cardPosition; i < 2; i++) {
          newIndices[i] = prev[i + 1];
        }
        newIndices[2] = nextAvailableIndex % startupData.length;
        return newIndices;
      });
      
      setNextAvailableIndex(prev => prev + 1);
      setSlidingCards([]);
    }, 250);
  };

  const displayedStartups = currentStartupIndices.map(index => startups[index]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950" style={{ backgroundImage: 'radial-gradient(ellipse 800px 600px at 20% 40%, rgba(134, 239, 172, 0.4), transparent), linear-gradient(to bottom right, rgb(88, 28, 135), rgb(59, 7, 100))' }}>
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex gap-1 items-center">
          <Link to="/signup" className="text-4xl hover:scale-110 transition-transform cursor-pointer" title="Sign Up/In">
            🍯
          </Link>
          <Link to="/signup" className="px-4 py-1.5 bg-yellow-400 text-black rounded-full font-medium text-sm shadow-lg hover:bg-yellow-500 transition-colors">
            👤 Sign Up/In
          </Link>
          <Link to="/" className="px-4 py-1.5 bg-orange-500 text-white rounded-full font-medium text-sm shadow-lg hover:bg-orange-600 transition-colors">
            🏠 Home
          </Link>
          <Link to="/vote" className="px-4 py-1.5 bg-purple-700 text-white rounded-full font-medium text-sm shadow-lg hover:bg-purple-600 transition-colors">
            <span className="blink-text">�️ Vote</span>
          </Link>
          <Link to="/portfolio" className="px-4 py-1.5 bg-purple-700 text-white rounded-full font-medium text-sm shadow-lg hover:bg-purple-600 transition-colors">
            ⭐ Portfolio
          </Link>
          <Link to="/analytics" className="px-4 py-1.5 bg-gradient-to-r from-purple-700 to-purple-900 text-yellow-400 rounded-full font-bold text-sm shadow-lg hover:from-purple-800 hover:to-purple-950 transition-all">
            📈 Analytics
          </Link>
          <Link to="/dashboard" className="px-4 py-1.5 bg-orange-500 text-white rounded-full font-medium text-sm shadow-lg hover:bg-orange-600 transition-colors">
            👤 Dashboard
          </Link>
        </div>
      </div>

      {/* Log In button in upper right corner */}
      <div className="fixed top-4 right-8 z-50">
        <Link 
          to="/login" 
          className="px-6 py-2 bg-white text-purple-700 rounded-full font-bold text-sm shadow-lg hover:bg-gray-100 transition-all border-2 border-purple-300"
        >
          🔑 Log In
        </Link>
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
              ⭐ Featured Startups
            </h3>
          </div>
          
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