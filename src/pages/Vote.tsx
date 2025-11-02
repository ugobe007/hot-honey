// FILE: src/pages/Vote.tsx

import React, { useEffect } from 'react';
import { useStore } from '../store';
import StartupCardOfficial from '../components/StartupCardOfficial';

const Vote: React.FC = () => {
  const startups = useStore((state) => state.startups);
  const currentIndex = useStore((state) => state.currentIndex);
  const voteYes = useStore((state) => state.voteYes);
  const voteNo = useStore((state) => state.voteNo);
  const loadStartupsFromDatabase = useStore((state) => state.loadStartupsFromDatabase);

  // Load approved startups from database on mount
  useEffect(() => {
    loadStartupsFromDatabase();
  }, [loadStartupsFromDatabase]);

  const currentStartup = startups[currentIndex];

  if (!currentStartup) {
    return (
      <div className="text-center mt-10 p-4 sm:p-6 rounded-lg bg-yellow-100 border border-yellow-300 shadow-md bg-orange-50 min-h-screen mx-2">
        <p className="text-xl sm:text-2xl font-semibold text-yellow-800">🎉 All caught up!</p>
        <p className="text-sm sm:text-md text-yellow-700 mt-2">
          You've reviewed all startups. Come back soon for more deals.
        </p>
        <a
          href="/submit"
          className="inline-block mt-4 px-4 sm:px-6 py-2 bg-orange-500 text-white font-semibold rounded-full shadow hover:bg-orange-600 transition text-sm sm:text-base"
        >
          🚀 Submit a Startup
        </a>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-start mt-10 bg-orange-50 min-h-screen px-2 sm:px-4">
      <StartupCardOfficial
        startup={currentStartup}
        onVote={(vote) => vote === 'yes' ? voteYes(currentStartup) : voteNo()}
      />
    </div>
  );
};

export default Vote;
