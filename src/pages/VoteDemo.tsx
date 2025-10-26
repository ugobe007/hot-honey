import { useState } from 'react';
import startupData from '../data/startupData';
const startups = startupData;
import StartupCardNew from '../components/StartupCardNew';
import FloatingNav from '../components/FloatingNav';

export default function VoteDemo() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [votedStartups, setVotedStartups] = useState<Set<number>>(new Set());
  const [votingCardId, setVotingCardId] = useState<number | null>(null);

  const visibleStartups = [];
  let index = currentIndex;
  
  for (let i = 0; i < 3; i++) {
    const startup = startups[index % startups.length];
    visibleStartups.push({ ...startup, displayIndex: index });
    index++;
  }

  const handleVote = (vote: 'yes' | 'no', displayIndex: number) => {
    // Mark as voted
    setVotedStartups(prev => new Set([...prev, displayIndex]));
    
    // Show animation for "yes" votes
    if (vote === 'yes') {
      setVotingCardId(displayIndex);
    }
    
    // After animation, move to next set of cards
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % startups.length);
      setVotingCardId(null);
    }, vote === 'yes' ? 1000 : 300);
  };

  const handleNext = () => setCurrentIndex((prev) => (prev + 3) % startups.length);
  const handlePrev = () => setCurrentIndex((prev) => (prev - 3 + startups.length) % startups.length);
  const handleReset = () => {
    setCurrentIndex(0);
    setVotedStartups(new Set());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-8">
      <style>{`
        @keyframes slide-out-left {
          0% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateX(-100%) scale(0.8);
            opacity: 0;
          }
        }
        .animate-slide-out {
          animation: slide-out-left 0.5s ease-out forwards;
        }
      `}</style>

      <FloatingNav />
      
      <div className="container mx-auto px-4 pt-24">
        <div className="text-center mb-8">
          <h1 className="text-7xl font-bold text-white mb-8 flex items-center justify-center gap-4">
            <span className="text-6xl">🔥</span>
            Hot Money Honey
          </h1>

          <div className="flex justify-center gap-4 mb-6">
            <button onClick={handlePrev} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full font-semibold text-sm">
              ← Prev
            </button>
            <button onClick={handleNext} className="px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full font-semibold text-sm">
              Next →
            </button>
            <button onClick={handleReset} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-semibold text-sm">
              Reset
            </button>
          </div>

          <p className="text-purple-300 text-lg">
            Showing {currentIndex + 1}-{Math.min(currentIndex + 3, startups.length)} of {startups.length} • Voted: {votedStartups.size}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {visibleStartups.map((startup) => (
            <div
              key={startup.displayIndex}
              className={`transform transition-all duration-500 ${
                votingCardId === startup.displayIndex ? 'animate-slide-out' : ''
              }`}
            >
              <StartupCardNew
                startup={startup}
                onVote={(vote) => handleVote(vote, startup.displayIndex)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}