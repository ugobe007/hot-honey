// src/pages/Dashboard.tsx
import React from 'react';
import { useStore } from '../store';
import StartupCard from '../components/StartupCard';
import { Startup } from '../types';
import { Link } from 'react-router-dom';

const HoneyPot: React.FC = () => {
  const portfolio = useStore((state) => state.portfolio) as Startup[];
  // Remove duplicates by id
  const uniquePortfolio = Array.from(new Map(portfolio.map(s => [s.id, s])).values());
  const totalVotes = uniquePortfolio.reduce((sum, s) => sum + (s.yesVotes || 0), 0);

  return (
  <div className="max-w-6xl mx-auto p-6 bg-orange-50 min-h-screen">
      {/* Navigation Buttons */}
      <div className="flex flex-wrap justify-center gap-4 mb-8 mt-2">
        <Link to="/" className="startup-nav-btn">Home</Link>
  <Link to="/" className="startup-nav-btn">Continue Voting</Link>
        <button
          className="startup-nav-btn"
          onClick={() => {
            navigator.clipboard.writeText(window.location.origin + '/dashboard');
            alert('Portfolio link copied! Share it with your investor friends to create a syndicate.');
          }}
        >
          Create Syndicate
        </button>
      </div>
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center gap-3 mb-2 animate-bounce">
          <span className="text-5xl">🍯</span>
          <h1 className="text-5xl font-extrabold text-orange-500 drop-shadow-lg tracking-tight">Your Honey Pot</h1>
          <span className="text-5xl">🐝</span>
        </div>
        <div className="text-lg font-semibold text-gray-700 bg-yellow-100 px-6 py-2 rounded-full shadow mb-2">
          <span className="mr-2">Total Votes:</span>
          <span className="text-orange-600 font-bold text-2xl animate-pulse">{totalVotes}</span>
        </div>
        {uniquePortfolio.length > 5 && (
          <div className="text-pink-600 font-bold mt-2 animate-bounce">🎉 Wow! You have a sweet portfolio! 🎉</div>
        )}
      </div>
      <hr className="mb-8 border-yellow-300" />
      {uniquePortfolio.length === 0 ? (
        <div className="text-center text-gray-500 text-xl mt-16">You haven't voted <span className="font-bold text-orange-500">Yes</span> on any startups yet.<br/>Start voting to fill your Honey Pot!</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {uniquePortfolio.map((startup) => (
            <div key={startup.id} className="relative group transition-transform transform hover:scale-105">
              <StartupCard
                startup={startup}
                onYes={() => {}}
                onNo={() => {}}
              />
              <div className="absolute top-2 right-2 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 text-white text-xs px-4 py-1 rounded-full shadow-lg font-bold flex items-center gap-1 animate-pulse">
                <span>🍯</span> {startup.yesVotes || 0} Votes
              </div>
              <button
                className="mt-2 flex items-center justify-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold px-3 py-1 rounded-full shadow-sm text-xs transition border border-blue-200"
                title="Copy link to share with friends!"
                onClick={() => {
                  const url = window.location.origin + '/startup/' + startup.id;
                  navigator.clipboard.writeText(url);
                  alert('Startup link copied! Share it with your friends.');
                }}
              >
                <span role="img" aria-label="Share">🔗</span> Share
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HoneyPot;
