// src/pages/Home.tsx
import React from 'react';
import { useStore } from '../store';
import StartupCard from '../components/StartupCard';
import { Startup } from '../types';
import HotMoneyBanner from '../components/HotMoneyBanner';
import { FaShareAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom'; // Import the Link component

const Home: React.FC = () => {
  const startups = useStore((state) => state.startups);
  const currentIndex = useStore((state) => state.currentIndex);
  const voteYes = useStore((state) => state.voteYes);
  const voteNo = useStore((state) => state.voteNo);
  const resetVoting = useStore((state) => state.resetVoting);
  const unvote = useStore((state) => state.unvote);

  // Show all cards, not just visible ones
  const portfolio = useStore((state) => state.portfolio);
  const visibleCards = startups;

  return (
  <div className="relative min-h-screen flex flex-col items-center bg-orange-50 overflow-x-hidden">
      {/* Hero Section */}
  <div className="w-full flex flex-col items-center py-12 mb-6 bg-orange-50 rounded-b-3xl animate-fade-in relative">
        {/* Share with Friends button in upper left */}
        <div className="absolute left-8 top-8 z-10">
          <button
            className="flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold px-3 py-1 rounded-full shadow-lg text-xs border border-blue-200 active:translate-y-1 active:shadow-sm transition transform"
            title="Copy your portfolio link to share with friends!"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Share link copied! Send it to your friends.');
            }}
          >
            <FaShareAlt className="inline-block" /> Share with Friends
          </button>
        </div>
  <div className="flex items-center gap-4 mb-2">
          <span className="text-5xl">🍯</span>
          <h1 className="text-6xl font-extrabold text-orange-500 drop-shadow-lg tracking-tight">Hot Money, Honey</h1>
        </div>
        <div className="text-2xl text-orange-700 font-semibold mb-4 animate-pulse">Start Collecting Hot Deals!</div>
        {/* Navigation buttons above banner */}
        <div className="flex flex-wrap justify-center gap-4 mb-6 mt-2">
          <Link to="/" className="startup-nav-btn">Home</Link>
          <Link to="/vote" className="startup-nav-btn">Vote</Link>
          <Link to="/deals" className="startup-nav-btn">Hot Deals</Link>
          <Link to="/dashboard" className="startup-nav-btn">Honey Pot</Link>
        </div>
        {/* Animated CTA Buttons */}
        <div className="flex justify-center space-x-4 mt-4 mb-2">
          <Link
            to="/vote"
            className="bg-pink-200 hover:bg-pink-300 text-pink-900 font-semibold px-6 py-3 rounded-lg shadow-lg transition transform hover:scale-105 border border-pink-300"
          >
            Start Voting
          </Link>
          <Link
            to="/submit"
            className="bg-gray-500 hover:bg-gray-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition transform hover:scale-105 animate-pulse"
          >
            Submit Startup
          </Link>
        </div>
      </div>

  {/* Feature Highlights removed as requested */}
  {visibleCards.length > 0 ? (
        <div className="w-full flex flex-col items-center">
    <div className="w-full max-w-5xl bg-pink-100 rounded-3xl shadow-xl p-8 flex gap-8 flex-wrap justify-center mt-4">
            {visibleCards.map((startup: Startup) => {
              const hasVoted = portfolio.some((s) => s.id === startup.id);
              return (
                <StartupCard
                  key={startup.id}
                  startup={startup}
                  onYes={hasVoted ? undefined : () => voteYes(startup)}
                  onNo={hasVoted ? undefined : voteNo}
                  voted={hasVoted}
                  onUnvote={hasVoted ? () => unvote(startup) : undefined}
                />
              );
            })}
          </div>
          <div className="flex justify-center mt-8">
            <button
              className="flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold px-3 py-1 rounded-full shadow-lg text-xs border border-blue-200 active:translate-y-1 active:shadow-sm transition transform"
              title="Copy your portfolio link to share with friends!"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Share link copied! Send it to your friends.');
              }}
            >
              <FaShareAlt className="inline-block" /> Share with Friends
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center mt-10 p-6 rounded-lg bg-yellow-100 border border-yellow-300 shadow-md animate-fade-in">
          <p className="text-2xl font-semibold text-yellow-800">🎉 All caught up!</p>
          <p className="text-md text-yellow-700 mt-2">You've reviewed all startups. Want to vote again?</p>
          <button
            onClick={resetVoting}
            className="inline-block mt-4 px-6 py-2 bg-orange-500 text-white font-semibold rounded-full shadow hover:bg-orange-600 transition"
          >
            � Start Over & Vote Again
          </button>
          <div className="flex flex-col items-center gap-4 mt-4">
            <a
              href="/dashboard"
              className="inline-block px-6 py-2 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-full shadow hover:from-orange-500 hover:to-orange-700 transition"
            >
              Check your Honey Pot
            </a>
          </div>
        </div>
      )}

      {/* Fun Footer */}
      <footer className="w-full mt-16 py-6 bg-gradient-to-br from-orange-100 via-yellow-50 to-orange-200 text-center text-gray-500 text-sm rounded-t-3xl shadow-inner animate-fade-in">
        Made with <span className="text-pink-500">❤️</span> and <span className="text-orange-400">🍯</span> by Hot Money Honey
      </footer>
    </div>
  );
};

export default Home;
