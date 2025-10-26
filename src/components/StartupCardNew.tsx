import React, { useState } from 'react';
import { Startup } from '../types';

interface StartupCardNewProps {
  startup: Startup;
  onVote: (startupId: number, vote: 'yes' | 'no') => void;
  onHoneypotClick: (startupId: number) => void;
  onCommentsClick: (startupId: number) => void;
}

interface FireBubble {
  id: number;
  x: number;
  y: number;
}

const StartupCardNew: React.FC<StartupCardNewProps> = ({
  startup,
  onVote,
  onHoneypotClick,
  onCommentsClick,
}) => {
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<'yes' | 'no' | null>(null);
  const [fireBubbles, setFireBubbles] = useState<FireBubble[]>([]);

  const handleVote = (vote: 'yes' | 'no') => {
    if (hasVoted) return;
    
    // Create fire bubbles animation if voting yes
    if (vote === 'yes') {
      const bubbles = Array.from({ length: 8 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 300 + 50,
        y: Math.random() * 200 + 100,
      }));
      setFireBubbles(bubbles);
      
      // Clear bubbles after animation
      setTimeout(() => setFireBubbles([]), 2000);
    }
    
    setHasVoted(true);
    setUserVote(vote);
    onVote(startup.id, vote);
  };

  // Calculate values
  const stage = startup.stage || 1;
  const yesVotes = startup.yesVotes || 0;
  const noVotes = startup.noVotes || 0;
  const totalVotes = yesVotes + noVotes;
  const answersCount = startup.answersCount || 5;
  const hotness = startup.hotness || 0;
  const commentsCount = startup.comments?.length || 0;
  const pitch = startup.pitch || startup.description;
  const tagline = startup.tagline || '';
  const fivePoints = startup.fivePoints || [];

  return (
    <div className="relative w-full max-w-[380px] mx-auto">
      {/* Fire Bubbles Animation */}
      {fireBubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="absolute pointer-events-none z-50 animate-float"
          style={{
            left: `${bubble.x}px`,
            top: `${bubble.y}px`,
            animation: 'float 1.5s ease-out forwards',
          }}
        >
          <span className="text-4xl">🔥</span>
        </div>
      ))}

      {/* Add keyframe animation */}
      <style>{`
        @keyframes float {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-150px) scale(0.5);
            opacity: 0;
          }
        }
      `}</style>

      <div className="bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 rounded-3xl p-6 shadow-2xl">
        {/* Header: Name, Stage, Honey Pot */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div className="inline-block bg-white rounded-full px-4 py-1 mb-1">
              <h2 
                className="text-xl font-bold text-orange-600" 
                style={{ letterSpacing: '-0.02em' }}
              >
                {startup.name}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-blue-900 text-base font-bold" style={{ letterSpacing: '-0.01em' }}>
                stage #{stage}
              </span>
            </div>
          </div>
          <button
            onClick={() => onHoneypotClick(startup.id)}
            className="text-5xl hover:scale-110 transition-transform cursor-pointer ml-2"
            title="Reveal secret about this startup"
          >
            🍯
          </button>
        </div>

        {/* Tag line */}
        {tagline && (
          <p className="text-black text-lg font-bold mb-2" style={{ letterSpacing: '-0.01em' }}>
            "{tagline}"
          </p>
        )}

        {/* 5 Points - Displayed directly on card with tight spacing */}
        <div className="mb-3 space-y-0.5">
          {fivePoints.map((point, index) => (
            <p 
              key={index} 
              className={`text-black leading-tight ${
                index < 2 
                  ? 'text-base font-bold' 
                  : 'text-base font-medium'
              }`}
              style={{ letterSpacing: '-0.02em' }}
            >
              {point}
            </p>
          ))}
        </div>

        {/* Voting Buttons */}
        <div className="flex gap-3 mb-4 items-center">
          {/* Fire Icon */}
          <div className="text-4xl">🔥</div>
          
          <button
            onClick={() => handleVote('yes')}
            disabled={hasVoted}
            className={`flex-1 py-3 rounded-2xl font-bold text-base transition-all ${
              hasVoted
                ? 'bg-gray-500 bg-opacity-50 text-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl hover:scale-105'
            }`}
          >
            yes
          </button>
          <button
            onClick={() => handleVote('no')}
            disabled={hasVoted}
            className={`flex-1 py-3 rounded-2xl font-bold text-base transition-all ${
              hasVoted
                ? 'bg-gray-600 bg-opacity-70 text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl hover:scale-105'
            }`}
          >
            no
          </button>
        </div>

        {/* Comments Button */}
        <button
          onClick={() => onCommentsClick(startup.id)}
          className="w-full bg-gray-300 bg-opacity-70 hover:bg-opacity-90 text-gray-700 font-semibold text-sm py-2 rounded-2xl transition-all"
        >
          comments ({commentsCount})
        </button>
      </div>
    </div>
  );
};

export default StartupCardNew;
