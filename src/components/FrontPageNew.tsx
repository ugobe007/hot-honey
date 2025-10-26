import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import StartupCard from './StartupCard';
import { getRandomStartupCards, getReplacementCard, StartupCardData } from '../data/startupCards';

const FrontPageNew: React.FC = () => {
  const [startups, setStartups] = useState<StartupCardData[]>(() => getRandomStartupCards(3));

  // Handle card replacement after voting
  const handleCardVoted = useCallback((votedCardId: string) => {
    setStartups(currentStartups => {
      const currentIds = currentStartups.map(s => s.id);
      const replacementCard = getReplacementCard(currentIds);
      
      return currentStartups.map(startup => 
        startup.id === votedCardId ? replacementCard : startup
      );
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Navigation Bar - Proper Pill-Shaped Buttons */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex gap-1">
          <button className="px-4 py-1.5 bg-yellow-400 text-black rounded-full font-medium text-sm shadow-lg hover:bg-yellow-500 transition-colors">
            👤 Sign Up
          </button>
          <Link to="/" className="px-4 py-1.5 bg-orange-500 text-white rounded-full font-medium text-sm shadow-lg hover:bg-orange-600 transition-colors">
            🏠 Home
          </Link>
          <Link to="/vote" className="px-4 py-1.5 bg-orange-500 text-white rounded-full font-medium text-sm shadow-lg hover:bg-orange-600 transition-colors">
            📊 Vote
          </Link>
          <Link to="/deals" className="px-4 py-1.5 bg-orange-500 text-white rounded-full font-medium text-sm shadow-lg hover:bg-orange-600 transition-colors">
            📈 Hot Deals
          </Link>
          <Link to="/dashboard" className="px-4 py-1.5 bg-orange-500 text-white rounded-full font-medium text-sm shadow-lg hover:bg-orange-600 transition-colors">
            👤 Dashboard
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-28 px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-orange-600 mb-2">
            Hot Money Honey
          </h1>
          <p className="text-xl text-orange-700 mb-8">
            Sweet Investment Opportunities
          </p>
          
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              🔥 Start Collecting Hot Deals 🔥
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover the hottest startup deals and grow your investment portfolio
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center mb-16">
            <Link to="/vote" className="px-8 py-3 bg-orange-500 text-white rounded-lg font-medium text-lg hover:bg-orange-600 transition-colors">
              📊 Start Voting
            </Link>
            <Link to="/submit" className="px-8 py-3 bg-white text-orange-500 border-2 border-orange-500 rounded-lg font-medium text-lg hover:bg-orange-50 transition-colors">
              📈 Submit Startup
            </Link>
          </div>
        </div>

        {/* Featured Startups */}
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-800">
              ⭐ Featured Startups
            </h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 justify-items-center">
            {startups.map((startup) => (
              <StartupCard
                key={startup.id}
                id={startup.id}
                name={startup.name}
                description={startup.description}
                votes={startup.votes}
                totalVotes={startup.totalVotes}
                stage={startup.stage}
                answers={startup.answers}
                onVoted={handleCardVoted}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FrontPageNew;
