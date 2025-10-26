import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface Startup {
  id: string;
  name: string;
  currentRound: number;
  questions: {
    valueProposition: string;
    problem: string;
    solution: string;
    team: string;
    ask: string;
  };
  nextSteps: string[];
  votes: number;
  friendVotes: number; // Worth +2 each
  totalScore: number;
}

interface HotMoneyVotingFlowProps {
  startup: Startup;
  onVote: (vote: 'hot' | 'not', isFriend?: boolean) => void;
  onAdvanceRound: () => void;
}

const HotMoneyVotingFlow: React.FC<HotMoneyVotingFlowProps> = ({
  startup,
  onVote,
  onAdvanceRound
}) => {
  const [hasVoted, setHasVoted] = useState(false);
  const [showNextSteps, setShowNextSteps] = useState(false);

  const handleVote = (vote: 'hot' | 'not', isFriend = false) => {
    setHasVoted(true);
    setShowNextSteps(true);
    onVote(vote, isFriend);
    
    if (vote === 'hot') {
      setTimeout(() => {
        onAdvanceRound();
      }, 2000);
    }
  };

  const getRoundTitle = (round: number) => {
    switch (round) {
      case 1: return "Round #1";
      case 2: return "Round #2"; 
      case 3: return "Round #3";
      case 4: return "Round #4";
      default: return "HOT MONEY!!!";
    }
  };

  const getRoundColor = (round: number) => {
    return round <= 4 ? "bg-orange-500" : "bg-red-600";
  };

  const getNextStepText = (round: number) => {
    switch (round) {
      case 1: return "IF hot, then #2";
      case 2: return "IF hot, then #3";
      case 3: return "IF hot, then #4"; 
      case 4: return "IF hot, then HOT MONEY!!!";
      default: return "🎉 SUCCESS!";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-orange-600 mb-4">
            Hot Money creates demand...
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            {startup.currentRound <= 1 && "The ability to communicate your value to investors is timely, literally. You need to capture their interest in the first 3 minutes, otherwise they will \"pass\" on you."}
            {startup.currentRound === 2 && "Next step: Company deck & Product demo/video"}
            {startup.currentRound === 3 && "Keep answers short, don't elaborate. You need to save time, otherwise you're out."}
            {startup.currentRound >= 4 && "Know what you need ($$$), why you need it and how it will help you win."}
          </p>
        </div>

        <div className="flex items-center justify-center gap-8">
          {/* Questions/Next Steps Box */}
          <div className="bg-gray-200 rounded-2xl p-8 max-w-md">
            <h3 className="text-2xl font-bold mb-6">
              {startup.currentRound <= 1 ? "5 Questions:" : "Next step:"}
            </h3>
            
            {startup.currentRound <= 1 ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="font-bold">1.</span>
                  <span>{startup.questions.valueProposition}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-bold">2.</span>
                  <span>{startup.questions.problem}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-bold">3.</span>
                  <span>{startup.questions.solution}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-bold">4.</span>
                  <span>{startup.questions.team}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-bold">5.</span>
                  <span>{startup.questions.ask}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {startup.nextSteps.map((step, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="font-bold">{index + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hot or Not Decision */}
          <div className="flex flex-col items-center gap-4">
            <div className="border-2 border-orange-500 rounded-lg px-6 py-3">
              <span className="text-orange-500 font-bold text-lg">hot... or not?</span>
            </div>
            
            <div className="text-6xl">→</div>
            
            {!hasVoted ? (
              <button
                onClick={() => handleVote('hot')}
                className={`${getRoundColor(startup.currentRound)} text-white font-bold text-4xl px-12 py-8 rounded-lg hover:opacity-90 transition-opacity`}
              >
                {getRoundTitle(startup.currentRound)}
              </button>
            ) : showNextSteps ? (
              <div className={`${getRoundColor(startup.currentRound)} text-white font-bold text-4xl px-12 py-8 rounded-lg`}>
                {startup.currentRound >= 4 ? "HOT MONEY!!!" : getRoundTitle(startup.currentRound + 1)}
              </div>
            ) : null}
            
            <div className="border border-gray-400 rounded-lg px-6 py-2 bg-white">
              <span className="text-gray-600 text-sm">{getNextStepText(startup.currentRound)}</span>
            </div>
          </div>
        </div>

        {/* Voting Buttons */}
        {!hasVoted && (
          <div className="flex justify-center gap-6 mt-12">
            <button
              onClick={() => handleVote('hot')}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors"
            >
              🔥 HOT
            </button>
            <button
              onClick={() => handleVote('not')}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors"
            >
              ❄️ NOT
            </button>
          </div>
        )}

        {/* Social Graph Voting */}
        <div className="text-center mt-8">
          <h3 className="text-xl font-bold text-orange-600 mb-4">
            Social Graph Investing: Friend votes = (+2)
          </h3>
          <p className="text-gray-600 mb-4">
            To promote awareness... votes by friends in your social network equal 2 votes. Friends are inspired by other friend's investment votes, promoting social graph investing.
          </p>
          
          <div className="bg-gray-100 rounded-lg p-4 inline-block">
            <div className="flex items-center gap-4">
              <div className="bg-gray-200 rounded-lg px-4 py-2">
                <span className="font-bold">Voting: Trusted Friend +2</span>
              </div>
              <div className="border-2 border-orange-500 rounded-lg px-4 py-2">
                <span className="text-orange-500 font-bold">hot... or not?</span>
              </div>
              <div className="text-2xl">→</div>
              <div className="bg-orange-500 text-white font-bold text-2xl px-6 py-4 rounded-lg">
                +2
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="text-center mt-12">
          <Link 
            to="/" 
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg font-medium transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HotMoneyVotingFlow;
