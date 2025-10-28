import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StartupCardOfficial from '../components/StartupCardOfficial';
import startupData from '../data/startupData';

export default function VoteDemo() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startups, setStartups] = useState(startupData);

  const currentStartup = startups[currentIndex];

  const handleVote = (vote: 'yes' | 'no') => {
    const updatedStartups = [...startups];
    if (vote === 'yes') {
      updatedStartups[currentIndex].yesVotes = (updatedStartups[currentIndex].yesVotes || 0) + 1;
    } else {
      updatedStartups[currentIndex].noVotes = (updatedStartups[currentIndex].noVotes || 0) + 1;
    }
    setStartups(updatedStartups);
  };

  const handleSwipeAway = () => {
    if (currentIndex < startups.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-800 via-purple-700 to-indigo-800 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="bg-white text-purple-700 font-bold py-3 px-6 rounded-2xl shadow-lg hover:bg-gray-100 transition-all"
          >
            ← Home
          </button>
          <div className="text-right">
            <div className="text-sm text-yellow-200">Progress</div>
            <div className="text-2xl font-bold text-white">
              {currentIndex + 1} / {startups.length}
            </div>
          </div>
        </div>

        <StartupCardOfficial
          startup={currentStartup}
          onVote={handleVote}
          onSwipeAway={handleSwipeAway}
        />

        <div className="text-center mt-6">
          <button
            onClick={handleSwipeAway}
            className="text-yellow-200 hover:text-white font-semibold underline text-lg"
          >
            Skip this startup →
          </button>
        </div>
      </div>
    </div>
  );
}