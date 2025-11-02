// FILE: src/pages/Vote.tsx

import React from 'react';
import { useStore } from '../store';
import StartupCardOfficial from '../components/StartupCardOfficial';

const Vote: React.FC = () => {
  const startups = useStore((state) => state.startups);
  const currentIndex = useStore((state) => state.currentIndex);
  const voteYes = useStore((state) => state.voteYes);
  const voteNo = useStore((state) => state.voteNo);

  const currentStartup = startups[currentIndex];

  if (!currentStartup) {
    return (
          <div className="text-center mt-10 p-6 rounded-lg bg-yellow-100 border border-yellow-300 shadow-md bg-orange-50 min-h-screen">
        <p className="text-2xl font-semibold text-yellow-800">🎉 All caught up!</p>
        <p className="text-md text-yellow-700 mt-2">
          You've reviewed all startups. Come back soon for more deals.
        </p>
        <a
          href="/submit"
          className="inline-block mt-4 px-6 py-2 bg-orange-500 text-white font-semibold rounded-full shadow hover:bg-orange-600 transition"
        >
          🚀 Submit a Startup
        </a>
      </div>
    );
  }

  return (
        <div className="flex justify-center mt-10 bg-orange-50 min-h-screen">
      <StartupCardOfficial
        startup={currentStartup}
        onVote={(vote) => vote === 'yes' ? voteYes(currentStartup) : voteNo()}
      />
    </div>
  );
};

export default Vote;
