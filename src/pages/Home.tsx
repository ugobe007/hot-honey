import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Startup {
  id: number;
  name: string;
  tagline: string;
  problem: string;
  solution: string;
  market: string;
  team: string;
  momentum: string;
  yesVotes: number;
  noVotes: number;
}

const featuredStartups: Startup[] = [
  {
    id: 1,
    name: "NeuraMind AI",
    tagline: "AI-powered mental health companion",
    problem: "65% of people struggle with mental health but can't access affordable therapy",
    solution: "24/7 AI therapist trained on cognitive behavioral therapy, available via text",
    market: "$280B global mental health market, targeting 50M underserved Americans",
    team: "Ex-Headspace engineers + licensed therapists from Stanford Medicine",
    momentum: "$2M ARR, 100K active users, 4.8★ app rating, partnerships with 3 Fortune 500s",
    yesVotes: 127,
    noVotes: 23
  },
  {
    id: 2,
    name: "GreenCharge",
    tagline: "Solar-powered EV charging network",
    problem: "EV charging infrastructure is slow, expensive, and grid-dependent",
    solution: "Modular solar charging stations that install in 48 hours, no grid connection needed",
    market: "$50B EV charging market growing 35% annually, 2M stations needed by 2030",
    team: "Tesla Supercharger founding team + SunPower solar engineers",
    momentum: "12 stations live, $400K MRR, LOIs from Walmart & Target for 500 locations",
    yesVotes: 203,
    noVotes: 45
  },
  {
    id: 3,
    name: "CodeMentor Pro",
    tagline: "AI pair programmer for developers",
    problem: "Developers spend 40% of time debugging and searching Stack Overflow",
    solution: "AI coding assistant that understands your entire codebase and writes production-ready code",
    market: "$30B developer tools market, 27M developers worldwide",
    team: "GitHub Copilot early team + Google AI researchers",
    momentum: "50K developers, $1.5M ARR, 92% retention, used at Stripe & Airbnb",
    yesVotes: 189,
    noVotes: 31
  }
];

function StartupCard({ startup, onVote }: { startup: Startup; onVote: (id: number, vote: 'yes' | 'no') => void }) {
  const [voted, setVoted] = useState(false);
  const [voteType, setVoteType] = useState<'yes' | 'no' | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');

  const heatPercentage = Math.round(
    (startup.yesVotes / (startup.yesVotes + startup.noVotes)) * 100
  );

  const handleVote = (vote: 'yes' | 'no') => {
    console.log('Vote clicked:', vote); // Debug log
    if (voted) {
      console.log('Already voted, ignoring');
      return;
    }
    
    console.log('Setting voted state');
    setVoted(true);
    setVoteType(vote);
    
    // Update votes immediately
    onVote(startup.id, vote);
    
    // Reset after animation
    setTimeout(() => {
      console.log('Resetting vote state');
      setVoted(false);
      setVoteType(null);
    }, 700);
  };

  const handleCommentSubmit = () => {
    if (comment.trim()) {
      console.log('Comment submitted:', comment);
      setShowComment(false);
      setComment('');
      alert('💬 Comment saved!');
    }
  };

  const handleHoneypot = () => {
    console.log('Added to Honeypot:', startup.name);
    alert(`🔮 ${startup.name} added to your Honeypot!`);
  };

  return (
    <div 
      className={`bg-white rounded-3xl shadow-2xl p-8 transition-all duration-700 ${
        voted 
          ? voteType === 'yes' 
            ? 'transform scale-105 shadow-green-500/50' 
            : 'transform scale-95 opacity-70'
          : 'transform scale-100 opacity-100'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-3xl font-bold text-gray-900 mb-2">
            {startup.name}
          </h3>
          <p className="text-lg text-cyan-600 font-semibold">
            {startup.tagline}
          </p>
        </div>
        <button
          onClick={handleHoneypot}
          className="text-4xl hover:scale-110 transition-transform"
          title="Add to Honeypot"
        >
          🔮
        </button>
      </div>

      {/* Heat Meter */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-600">Heat Meter 🔥</span>
          <span className="text-sm font-bold text-cyan-600">{heatPercentage}% Hot</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-cyan-400 to-blue-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${heatPercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>👍 {startup.yesVotes}</span>
          <span>👎 {startup.noVotes}</span>
        </div>
      </div>

      {/* Five Points */}
      <div className="space-y-3 mb-6">
        <div className="bg-slate-900 rounded-xl p-3">
          <h4 className="font-bold text-cyan-600 text-sm mb-1">💡 Problem</h4>
          <p className="text-gray-700 text-sm">{startup.problem}</p>
        </div>

        <div className="bg-blue-50 rounded-xl p-3">
          <h4 className="font-bold text-blue-600 text-sm mb-1">⚡ Solution</h4>
          <p className="text-gray-700 text-sm">{startup.solution}</p>
        </div>

        <div className="bg-green-50 rounded-xl p-3">
          <h4 className="font-bold text-green-600 text-sm mb-1">📊 Market</h4>
          <p className="text-gray-700 text-sm">{startup.market}</p>
        </div>

        <div className="bg-purple-50 rounded-xl p-3">
          <h4 className="font-bold text-purple-600 text-sm mb-1">👥 Team</h4>
          <p className="text-gray-700 text-sm">{startup.team}</p>
        </div>

        <div className="bg-yellow-50 rounded-xl p-3">
          <h4 className="font-bold text-yellow-600 text-sm mb-1">🚀 Momentum</h4>
          <p className="text-gray-700 text-sm">{startup.momentum}</p>
        </div>
      </div>

      {/* Voting Buttons */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => handleVote('no')}
          disabled={voted}
          className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
        >
          👎 Pass
        </button>
        <button
          onClick={() => handleVote('yes')}
          disabled={voted}
          className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
        >
          👍 Hot!
        </button>
      </div>

      {/* Comment Toggle */}
      <button
        onClick={() => setShowComment(!showComment)}
        className="w-full text-cyan-600 font-semibold py-2 hover:text-cyan-400 transition-colors"
      >
        💬 {showComment ? 'Hide Comment' : 'Add Comment'}
      </button>

      {/* Comment Box */}
      {showComment && (
        <div className="mt-4 bg-gray-50 rounded-2xl p-4">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts..."
            className="w-full px-4 py-3 border-2 border-slate-600 rounded-xl focus:border-cyan-500 focus:outline-none transition-colors resize-none"
            rows={3}
          />
          <button
            onClick={handleCommentSubmit}
            className="mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-2 px-6 rounded-xl shadow transition-all"
          >
            Submit Comment
          </button>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [startups, setStartups] = useState(featuredStartups);

  const handleVote = (id: number, vote: 'yes' | 'no') => {
    console.log('Parent handleVote called:', id, vote); // Debug log
    const updatedStartups = startups.map(startup => {
      if (startup.id === id) {
        const updated = {
          ...startup,
          yesVotes: vote === 'yes' ? startup.yesVotes + 1 : startup.yesVotes,
          noVotes: vote === 'no' ? startup.noVotes + 1 : startup.noVotes,
        };
        console.log('Updated startup:', updated); // Debug log
        return updated;
      }
      return startup;
    });
    setStartups(updatedStartups);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-cyan-600 via-blue-600 to-violet-600 text-white py-20 px-8">
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 drop-shadow-lg">
            🔮 pyth ai
          </h1>
          <p className="text-3xl md:text-4xl font-semibold mb-4">
            "Get Them While They're Hot."
          </p>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
            Discover startups that match your vibe. Vote, vibe-check, and invest in what's heating up. 🔥
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={() => navigate('/investor/signup')}
              className="bg-white text-cyan-600 font-bold py-4 px-8 rounded-2xl shadow-lg hover:bg-gray-100 transition-all text-lg"
            >
              🚀 Join as Investor
            </button>
            <button
              onClick={() => navigate('/get-matched')}
              className="bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transition-all text-lg"
            >
              💡 Submit Your Startup
            </button>
          </div>
        </div>
      </div>

      {/* Hot 5 Section */}
      <div className="max-w-6xl mx-auto px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-4">
            🔥 Today's Hot 5
          </h2>
          <p className="text-xl text-gray-700">
            The most exciting startups heating up right now
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {startups.map((startup) => (
            <StartupCard key={startup.id} startup={startup} onVote={handleVote} />
          ))}
        </div>

        <div className="text-center mt-12">
          <button
            onClick={() => navigate('/vote-demo')}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transition-all text-lg"
          >
            🔍 Discover More Startups →
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16 px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Discover</h3>
              <p className="text-gray-700">
                Swipe through curated startup cards. Each card shows 5 key points: Problem, Solution, Market, Team, and Momentum.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="text-6xl mb-4">🔥</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Vote</h3>
              <p className="text-gray-700">
                Vote "Hot" or "Pass" based on your gut. Your votes help startups build momentum and appear in the Hot 5 feed.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="text-6xl mb-4">🤝</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Connect</h3>
              <p className="text-gray-700">
                When you find a startup you love, add it to your Honeypot 🔮 and connect directly with founders.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 py-16 px-8 text-white text-center">
        <h2 className="text-4xl font-bold mb-4">Ready to Find Your Next Investment?</h2>
        <p className="text-xl mb-8 max-w-2xl mx-auto">
          Join thousands of investors discovering startups before they blow up.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <button
            onClick={() => navigate('/signup')}
            className="bg-white text-cyan-600 font-bold py-4 px-8 rounded-2xl shadow-lg hover:bg-gray-100 transition-all text-lg"
          >
            Get Started Free
          </button>
          <button
            onClick={() => navigate('/about')}
            className="bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transition-all text-lg"
          >
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
}