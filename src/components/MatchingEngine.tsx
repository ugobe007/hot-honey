import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadApprovedStartups } from '../store';
import { getAllInvestors } from '../lib/investorService';
import { generateAdvancedMatches } from '../services/matchingService';
import { generateAdvancedMatches } from '../services/matchingService';
import { generateAdvancedMatches } from '../services/matchingService';

interface MatchPair {
  startup: {
    id: number | string;
    name: string;
    description: string;
    tags: string[];
    seeking: string;
    status: string;
  };
  investor: {
    id: string;
    name: string;
    description: string;
    tags: string[];
    checkSize: string;
    status: string;
  };
  matchScore: number;
}

export default function MatchingEngine() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchPair[]>([]);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [lastRotation, setLastRotation] = useState(Date.now());
  const [showLightning, setShowLightning] = useState(false);

  // Load matches from database
  useEffect(() => {
    loadMatches();
  }, []);

  // Rotate batches every 60 minutes
  useEffect(() => {
    const checkRotation = setInterval(() => {
      const now = Date.now();
      if (now - lastRotation >= 60 * 60 * 1000) { // 60 minutes
        rotateToBatch();
        setLastRotation(now);
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkRotation);
  }, [lastRotation]);

  const loadMatches = async () => {
    try {
      console.log('🚀 Loading startups and investors from database...');
      
      // Load startups and investors from database
      const startups = await loadApprovedStartups(100, 0);
      const { data: investors } = await getAllInvestors();

      console.log(`✅ Loaded ${startups.length} startups and ${investors?.length || 0} investors`);

      if (!investors || investors.length === 0 || startups.length === 0) {
        console.warn('⚠️ No startups or investors found');
        return;
      }

      // ✨ USE REAL GOD ALGORITHM (with verbose logging for first 5 matches)
      console.log('\n' + '═'.repeat(60));
      console.log('🧮 STARTING GOD ALGORITHM MATCH GENERATION');
      console.log('═'.repeat(60));
      
      const generatedMatches = generateAdvancedMatches(startups, investors, 100);
      
      console.log('\n' + '═'.repeat(60));
      console.log(`✅ Generated ${generatedMatches.length} matches using GOD Algorithm`);
      console.log('═'.repeat(60) + '\n');
      
      setMatches(generatedMatches);
      setIsAnalyzing(false);
    } catch (error) {
      console.error('❌ Error loading matches:', error);
      setIsAnalyzing(false);
    }
  };

  const rotateToBatch = () => {
    setCurrentBatch((prev) => (prev + 1) % 5); // Rotate through 5 batches
    setCurrentIndex(0);
    setShowLightning(true);
    setTimeout(() => setShowLightning(false), 1000);
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 2000);
  };

  const handleNextMatch = () => {
    const batchStart = currentBatch * 20;
    const batchEnd = batchStart + 20;
    const batchMatches = matches.slice(batchStart, batchEnd);

    if (currentIndex < batchMatches.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
    
    // Trigger lightning animation
    setShowLightning(true);
    setTimeout(() => setShowLightning(false), 600);
    
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 1500);
  };

  const batchStart = currentBatch * 20;
  const batchMatches = matches.slice(batchStart, batchStart + 20);
  const match = batchMatches[currentIndex] || matches[0];

  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1140] via-[#2d1b69] to-[#4a2a8f] flex items-center justify-center">
        <div className="text-white text-2xl">Loading matches...</div>
      </div>
    );
  }

  const minutesUntilRotation = Math.ceil((60 * 60 * 1000 - (Date.now() - lastRotation)) / 60000);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1140] via-[#2d1b69] to-[#4a2a8f] relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-8 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <h1 className="text-4xl font-bold">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Hot Money
              </span>
            </h1>
          </div>

          <h2 className="text-5xl md:text-6xl font-bold text-white mb-4">
            AI Matching Engine
          </h2>
          <h3 className="text-3xl md:text-4xl text-gray-300 mb-6">
            20 New Matches Every Hour
          </h3>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
            Watch as our AI discovers perfect startup-investor pairs in real-time.
            <br />
            Each match is scored and ready to connect.
          </p>
        </div>

        {/* Match Display */}
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-[1fr,auto,1fr] gap-8 items-start">
            {/* Startup Card - Fully Clickable */}
            <button
              onClick={() => navigate(`/startup/${match.startup.id}`)}
              className="bg-gradient-to-br from-orange-500/20 via-amber-500/20 to-yellow-500/20 backdrop-blur-sm border-2 border-orange-500/50 rounded-2xl p-6 hover:scale-105 hover:border-orange-400 transition-all duration-300 shadow-xl hover:shadow-orange-500/50 text-left w-full group"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-3 rounded-xl shadow-lg">
                  <span className="text-3xl">🚀</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1 group-hover:text-orange-300 transition-colors">{match.startup.name}</h3>
                  <p className="text-gray-300 text-sm">{match.startup.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {match.startup.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="bg-orange-500/30 border border-orange-400/50 text-orange-200 px-3 py-1 rounded-full text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="bg-orange-500/20 border border-orange-400/30 rounded-lg p-3 mb-3">
                <p className="text-orange-200 font-semibold text-sm">{match.startup.seeking}</p>
              </div>

              <div className="flex items-center gap-2 text-orange-300 text-sm font-medium group-hover:gap-3 transition-all">
                <span>View Full Profile</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>

            {/* Brain Icon with Lightning */}
            <div className="flex justify-center py-4 relative">
              <button
                onClick={() => setShowModal(true)}
                className="relative cursor-pointer hover:scale-110 transition-transform z-10"
              >
                <img 
                  src="/images/brain-icon.png" 
                  alt="AI Brain" 
                  className={`w-32 h-32 object-contain drop-shadow-2xl transition-all ${isAnalyzing ? 'animate-pulse' : ''}`}
                />
                {isAnalyzing && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-40 h-40 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </button>
              
              {/* Lightning Bolts */}
              {showLightning && (
                <>
                  <div className="absolute top-1/2 left-0 right-0 flex items-center justify-center pointer-events-none">
                    <div className="absolute left-16 text-4xl animate-ping" style={{ animationDuration: '0.6s' }}>⚡</div>
                    <div className="absolute right-16 text-4xl animate-ping" style={{ animationDuration: '0.6s', animationDelay: '0.1s' }}>⚡</div>
                    <div className="absolute top-8 text-4xl animate-ping" style={{ animationDuration: '0.6s', animationDelay: '0.2s' }}>⚡</div>
                    <div className="absolute bottom-8 text-4xl animate-ping" style={{ animationDuration: '0.6s', animationDelay: '0.3s' }}>⚡</div>
                  </div>
                </>
              )}
            </div>

            {/* Investor Card - Fully Clickable */}
            <button
              onClick={() => navigate(`/investors`)}
              className="bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-indigo-500/20 backdrop-blur-sm border-2 border-cyan-500/50 rounded-2xl p-6 hover:scale-105 hover:border-cyan-400 transition-all duration-300 shadow-xl hover:shadow-cyan-500/50 text-left w-full group"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-3 rounded-xl shadow-lg">
                  <span className="text-3xl">💼</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">{match.investor.name}</h3>
                  <p className="text-gray-300 text-sm">{match.investor.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {match.investor.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 px-3 py-1 rounded-full text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="bg-cyan-500/20 border border-cyan-400/30 rounded-lg p-3 mb-3">
                <p className="text-cyan-200 font-semibold text-sm">{match.investor.checkSize}</p>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="bg-green-500 w-2 h-2 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-xs font-medium">{match.investor.status}</span>
              </div>

              <div className="flex items-center gap-2 text-cyan-300 text-sm font-medium group-hover:gap-3 transition-all">
                <span>View Full Profile</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>
          </div>

          {/* Match Score and Navigation - Positioned Lower */}
          <div className="flex flex-col items-center gap-4 mt-12">
            <div className="bg-purple-600/50 border-2 border-purple-400 text-white font-bold px-8 py-3 rounded-full shadow-lg">
              <span className="flex items-center gap-2 text-lg">
                <span>✨</span>
                {match.matchScore}% Match
                <span>✨</span>
              </span>
            </div>

            <button
              onClick={handleNextMatch}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 px-12 rounded-xl transition-all shadow-lg text-lg hover:scale-105"
            >
              Show Next Match →
            </button>

            <p className="text-gray-400 text-sm">
              Match {currentIndex + 1} of 20 • Batch {currentBatch + 1}
            </p>
            <p className="text-gray-500 text-xs">
              New batch rotates in {minutesUntilRotation} minutes
            </p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-gradient-to-r from-purple-600/30 to-blue-600/30 backdrop-blur-lg border border-white/10 rounded-2xl py-8 mt-16 max-w-5xl mx-auto">
          <div className="grid grid-cols-3 gap-8 text-center px-8">
            <div>
              <div className="text-5xl font-bold text-yellow-400">500+</div>
              <div className="text-gray-300 mt-2 text-sm">Investors</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-yellow-400">&lt;2s</div>
              <div className="text-gray-300 mt-2 text-sm">Match Speed</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-yellow-400">24/7</div>
              <div className="text-gray-300 mt-2 text-sm">Auto-Discovery</div>
            </div>
          </div>
        </div>

        {/* Feature Cards Section */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mt-16 mb-16">
          {/* I'm a Founder Card */}
          <div className="bg-gray-900/60 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
            <div className="text-5xl mb-4">🚀</div>
            <h2 className="text-3xl font-bold text-white mb-6">I'm a Founder</h2>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚡</span>
                <div>
                  <h3 className="text-white font-semibold">5+ Investor Matches</h3>
                  <p className="text-gray-400 text-sm">Matched to your stage, sector, geography</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-xl">🎯</span>
                <div>
                  <h3 className="text-white font-semibold">AI Explains Why</h3>
                  <p className="text-gray-400 text-sm">See exactly why each VC is a good fit</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-xl">📊</span>
                <div>
                  <h3 className="text-white font-semibold">Next Steps Included</h3>
                  <p className="text-gray-400 text-sm">Clear action plan for each investor</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-xl">⏰</span>
                <div>
                  <h3 className="text-white font-semibold">Timing Intelligence</h3>
                  <p className="text-gray-400 text-sm">Know when VCs are actively deploying</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => navigate('/submit')}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg"
            >
              Find My Investors →
            </button>
          </div>

          {/* I'm an Investor Card */}
          <div className="bg-gray-900/60 backdrop-blur-sm rounded-2xl p-8 border border-cyan-500/30">
            <div className="text-5xl mb-4">💰</div>
            <h2 className="text-3xl font-bold text-white mb-6">I'm an Investor</h2>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <span className="text-xl">🔥</span>
                <div>
                  <h3 className="text-white font-semibold">10+ Startup Matches</h3>
                  <p className="text-gray-400 text-sm">Pre-screened for your criteria</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-xl">🤖</span>
                <div>
                  <h3 className="text-white font-semibold">AI Quality Scoring</h3>
                  <p className="text-gray-400 text-sm">Momentum, traction, and growth signals</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-xl">📈</span>
                <div>
                  <h3 className="text-white font-semibold">Market Intelligence</h3>
                  <p className="text-gray-400 text-sm">See trends before competitors</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-xl">⚡</span>
                <div>
                  <h3 className="text-white font-semibold">Deal Flow Automation</h3>
                  <p className="text-gray-400 text-sm">Stop manually searching TechCrunch</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => navigate('/vote')}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg"
            >
              Find Hot Deals →
            </button>
          </div>
        </div>
      </div>

      {/* How It Works Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-3xl p-8 max-w-2xl w-full border-2 border-purple-500 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-white">🧠 How Hot Money Works</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:text-gray-300 text-3xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-white">
              <div className="bg-white/10 rounded-xl p-4">
                <h3 className="font-bold text-xl mb-2">1. AI Analyzes Matches</h3>
                <p className="text-gray-300">Our algorithm analyzes thousands of startups and investors, matching based on industry, stage, funding needs, and investment thesis.</p>
              </div>

              <div className="bg-white/10 rounded-xl p-4">
                <h3 className="font-bold text-xl mb-2">2. 20 Matches Every Hour</h3>
                <p className="text-gray-300">Watch as 20 curated matches rotate automatically every 60 minutes. Fresh opportunities delivered continuously.</p>
              </div>

              <div className="bg-white/10 rounded-xl p-4">
                <h3 className="font-bold text-xl mb-2">3. Click to Connect</h3>
                <p className="text-gray-300">Simply click any card to view the full profile. See detailed information about startups and investors instantly.</p>
              </div>

              <div className="bg-white/10 rounded-xl p-4">
                <h3 className="font-bold text-xl mb-2">4. Lightning Fast Matching</h3>
                <p className="text-gray-300">Our brain processes matches in under 2 seconds, with lightning bolts showing real-time AI analysis.</p>
              </div>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="mt-6 w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
              Got It!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
