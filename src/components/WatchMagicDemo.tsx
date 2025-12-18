import { useState, useEffect } from 'react';
import { X, Play, Sparkles, Brain, Zap, Heart, Users, Target, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react';
import FlameIcon from './FlameIcon';

interface DemoMatch {
  startup: {
    name: string;
    tagline: string;
    sector: string;
  };
  investor: {
    name: string;
    firm: string;
    thesis: string;
  };
  score: number;
  reasoning: string[];
}

// Demo matches showcasing different scenarios
const DEMO_MATCHES: DemoMatch[] = [
  {
    startup: { name: "FinTech AI", tagline: "AI-powered personal finance assistant", sector: "FinTech" },
    investor: { name: "Sarah Chen", firm: "Sequoia Capital", thesis: "AI infrastructure & applications" },
    score: 94,
    reasoning: [
      "🎯 Perfect sector alignment: AI + FinTech",
      "📈 Strong traction signals detected",
      "💼 Investor thesis match: 98%",
      "🌍 Geographic compatibility",
      "💰 Check size within range"
    ]
  },
  {
    startup: { name: "HealthStack", tagline: "API-first healthcare infrastructure", sector: "HealthTech" },
    investor: { name: "Marc Jensen", firm: "a16z", thesis: "Technical founders building platforms" },
    score: 91,
    reasoning: [
      "🔧 Technical founder detected",
      "🏗️ Platform play aligns with thesis",
      "📊 Product score: 95/100",
      "🔮 Vision alignment: Strong",
      "⚡ Rapid growth trajectory"
    ]
  },
  {
    startup: { name: "GreenLogistics", tagline: "Carbon-neutral last-mile delivery", sector: "CleanTech" },
    investor: { name: "Emily Rodriguez", firm: "Breakthrough Energy", thesis: "Climate solutions at scale" },
    score: 97,
    reasoning: [
      "🌱 Perfect mission alignment",
      "🚀 Market timing: Optimal",
      "📈 $10B+ TAM identified",
      "🏆 Team score: 92/100",
      "💰 Series A sweet spot"
    ]
  },
  {
    startup: { name: "DevToolsX", tagline: "10x developer productivity platform", sector: "Developer Tools" },
    investor: { name: "Kevin Park", firm: "Y Combinator", thesis: "Tools that developers love" },
    score: 89,
    reasoning: [
      "❤️ User passion score: 5/5",
      "🏃 Lean team, fast execution",
      "📢 Learning in public",
      "🎯 Feels inevitable",
      "🚀 Massive if it works"
    ]
  }
];

const ANIMATION_STEPS = [
  { icon: Brain, text: "Analyzing startup DNA...", color: "text-purple-400" },
  { icon: Users, text: "Scanning investor database...", color: "text-blue-400" },
  { icon: Target, text: "Running GOD Algorithm...", color: "text-orange-400" },
  { icon: TrendingUp, text: "Calculating compatibility...", color: "text-green-400" },
  { icon: Sparkles, text: "Match found!", color: "text-yellow-400" }
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function WatchMagicDemo({ isOpen, onClose }: Props) {
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [animationStep, setAnimationStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const [displayedScore, setDisplayedScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [totalMatchesShown, setTotalMatchesShown] = useState(0);

  const currentMatch = DEMO_MATCHES[currentMatchIndex];

  // Run animation sequence
  const runAnimation = () => {
    setIsAnimating(true);
    setShowMatch(false);
    setAnimationStep(0);
    setDisplayedScore(0);

    // Step through animation phases
    let step = 0;
    const stepInterval = setInterval(() => {
      step++;
      setAnimationStep(step);
      
      if (step >= ANIMATION_STEPS.length) {
        clearInterval(stepInterval);
        setShowMatch(true);
        setIsAnimating(false);
        setTotalMatchesShown(prev => prev + 1);
        
        // Animate score counting up
        let score = 0;
        const scoreInterval = setInterval(() => {
          score += 3;
          if (score >= currentMatch.score) {
            score = currentMatch.score;
            clearInterval(scoreInterval);
          }
          setDisplayedScore(score);
        }, 20);
      }
    }, 600);
  };

  // Auto-play mode
  useEffect(() => {
    if (!isPlaying || !isOpen) return;

    const timeout = setTimeout(() => {
      if (showMatch) {
        // Move to next match
        setCurrentMatchIndex(prev => (prev + 1) % DEMO_MATCHES.length);
        setTimeout(runAnimation, 300);
      } else if (!isAnimating) {
        runAnimation();
      }
    }, showMatch ? 3000 : 100);

    return () => clearTimeout(timeout);
  }, [isPlaying, showMatch, isAnimating, isOpen]);

  // Start animation when modal opens
  useEffect(() => {
    if (isOpen && !isAnimating && !showMatch) {
      setTimeout(runAnimation, 500);
    }
  }, [isOpen]);

  // Reset when changing matches
  useEffect(() => {
    setShowMatch(false);
    setAnimationStep(0);
    setDisplayedScore(0);
  }, [currentMatchIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl bg-gradient-to-br from-[#1a0030] via-[#2d1b50] to-[#1a0030] rounded-3xl border border-purple-500/30 shadow-2xl overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  Watch the Magic
                  <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
                </h2>
                <p className="text-gray-400">AI-powered matching in real-time</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-400">{totalMatchesShown}</div>
                <div className="text-xs text-gray-500">Matches Found</div>
              </div>
              <button
                onClick={() => {
                  setIsPlaying(!isPlaying);
                  if (!isPlaying && !isAnimating && !showMatch) {
                    runAnimation();
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                  isPlaying
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                }`}
              >
                <Play className="w-4 h-4" />
                {isPlaying ? 'Pause' : 'Auto Play'}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative p-6">
          {/* Processing Animation */}
          {!showMatch && (
            <div className="mb-6">
              <div className="flex items-center justify-center gap-4 mb-8">
                {ANIMATION_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index <= animationStep;
                  const isCurrent = index === animationStep;
                  
                  return (
                    <div key={index} className="flex flex-col items-center">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        isActive 
                          ? 'bg-gradient-to-br from-purple-500 to-violet-500 shadow-lg shadow-purple-500/30' 
                          : 'bg-white/10'
                      } ${isCurrent ? 'scale-110 animate-pulse' : ''}`}>
                        <Icon className={`w-7 h-7 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                      </div>
                      {isCurrent && (
                        <div className={`mt-2 text-xs font-medium ${step.color} animate-pulse whitespace-nowrap`}>
                          {step.text}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Processing bar */}
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 via-amber-500 to-orange-500 transition-all duration-500"
                  style={{ width: `${(animationStep / (ANIMATION_STEPS.length - 1)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Match Result */}
          {showMatch && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Startup Card */}
                <div className="p-5 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl border border-blue-500/30">
                  <div className="flex items-center gap-2 text-blue-400 text-sm mb-3">
                    <FlameIcon variant={8} size="sm" />
                    STARTUP
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{currentMatch.startup.name}</h3>
                  <p className="text-gray-400 mb-3">{currentMatch.startup.tagline}</p>
                  <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                    {currentMatch.startup.sector}
                  </span>
                </div>

                {/* Investor Card */}
                <div className="p-5 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-2xl border border-purple-500/30">
                  <div className="flex items-center gap-2 text-purple-400 text-sm mb-3">
                    <Users className="w-4 h-4" />
                    INVESTOR
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{currentMatch.investor.name}</h3>
                  <p className="text-gray-400 mb-1">{currentMatch.investor.firm}</p>
                  <p className="text-sm text-gray-500">{currentMatch.investor.thesis}</p>
                </div>
              </div>

              {/* Score Display */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-4 px-8 py-4 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-2xl border border-orange-500/30">
                  <Heart className="w-8 h-8 text-red-400 animate-pulse" />
                  <div>
                    <div className="text-5xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                      {displayedScore}%
                    </div>
                    <div className="text-gray-400 text-sm">Match Score</div>
                  </div>
                  <Heart className="w-8 h-8 text-red-400 animate-pulse" />
                </div>
              </div>

              {/* Reasoning */}
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  Why This Match Works
                </h4>
                <div className="grid md:grid-cols-2 gap-2">
                  {currentMatch.reasoning.map((reason, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-2 text-gray-300 text-sm"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {reason}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-purple-500/20 bg-black/20">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">
              ⚡ Hot Match processes 1,000+ data points per match
            </p>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-lg transition-all"
            >
              Try It Yourself
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
