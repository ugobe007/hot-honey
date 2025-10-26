import React, { useState, useEffect } from 'react';

interface StartupCardProps {
  id: string;
  name: string;
  description: string;
  votes: number;
  totalVotes: number;
  stage: string;
  answers: string[];
  onVoted: (id: string) => void;
}

interface Bubble {
  id: number;
  x: number;
  y: number;
}

const StartupCard: React.FC<StartupCardProps> = ({ 
  id, 
  name, 
  description, 
  votes,
  totalVotes,
  stage, 
  answers,
  onVoted 
}) => {
  const [hasVoted, setHasVoted] = useState(false);
  const [vote, setVote] = useState<'yes' | 'no' | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  const team = answers[3] || 'Team information not available';

  const createBubbles = () => {
    const newBubbles = Array.from({ length: 5 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 200,
      y: Math.random() * 150
    }));
    setBubbles(newBubbles);
  };

  useEffect(() => {
    createBubbles();
  }, []);

  const getStageNumber = (stageText: string) => {
    if (stageText.includes('1')) return 1;
    if (stageText.includes('2')) return 2;
    if (stageText.includes('3')) return 3;
    if (stageText.includes('4')) return 4;
    if (stageText.includes('5')) return 5;
    return 1;
  };

  const stageNumber = getStageNumber(stage);

  const handleVote = (voteType: 'yes' | 'no') => {
    if (hasVoted) return;
    
    setVote(voteType);
    setHasVoted(true);
    createBubbles();
    
    setTimeout(() => {
      onVoted(id);
    }, 1000);
  };

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none z-10">
        {bubbles.map((bubble, index) => (
          <div
            key={bubble.id}
            className={`absolute w-6 h-6 rounded-full animate-bounce ${
              index < 2 
                ? 'bg-blue-400 bg-opacity-70' 
                : 'bg-green-400 bg-opacity-70'
            }`}
            style={{
              left: `${bubble.x}px`,
              top: `${bubble.y}px`,
              animationDelay: `${index * 0.2}s`,
              animationDuration: '2s'
            }}
          />
        ))}
      </div>

      <div className="bg-gradient-to-br from-amber-200 via-orange-300 to-amber-400 rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-all duration-300 border-2 border-amber-300 h-72">
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-gray-800 leading-tight">{name}</h3>
            <div className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
              Stage {stageNumber}
            </div>
          </div>

          <p className="text-gray-700 mb-4 flex-grow text-sm leading-relaxed">
            {description}
          </p>

          <div className="mb-4">
            <p className="text-gray-600 text-sm">
              <strong>Team:</strong> {team}
            </p>
          </div>

          <div className="flex gap-3 mt-auto">
            <button
              onClick={() => handleVote('yes')}
              disabled={hasVoted}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all duration-200 ${
                hasVoted && vote === 'yes'
                  ? 'bg-green-600 text-white'
                  : hasVoted
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 text-white hover:scale-105'
              }`}
            >
              👍 Yes
            </button>
            <button
              onClick={() => handleVote('no')}
              disabled={hasVoted}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all duration-200 ${
                hasVoted && vote === 'no'
                  ? 'bg-red-600 text-white'
                  : hasVoted
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-600 text-white hover:scale-105'
              }`}
            >
              👎 No
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartupCard;