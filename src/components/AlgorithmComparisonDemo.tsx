import { useState, useEffect } from 'react';
import { X, Play, Pause, RotateCcw, Sparkles, Brain, TrendingUp, Lightbulb, Code2, Flame, ChevronRight, Zap, CheckCircle2 } from 'lucide-react';

interface DemoStartup {
  name: string;
  tagline: string;
  godScore: number;
  teamScore: number;
  tractionScore: number;
  marketScore: number;
  productScore: number;
  visionScore: number;
  smellTestScore: number;
  hasTechFounder: boolean;
}

// Demo startups that showcase different algorithm strengths
const DEMO_STARTUPS: DemoStartup[] = [
  {
    name: "Stripe",
    tagline: "Payments infrastructure for the internet",
    godScore: 94,
    teamScore: 95,
    tractionScore: 98,
    marketScore: 95,
    productScore: 96,
    visionScore: 92,
    smellTestScore: 5,
    hasTechFounder: true
  },
  {
    name: "Airbnb",
    tagline: "Belong anywhere",
    godScore: 89,
    teamScore: 85,
    tractionScore: 92,
    marketScore: 98,
    productScore: 88,
    visionScore: 95,
    smellTestScore: 4,
    hasTechFounder: false
  },
  {
    name: "OpenAI",
    tagline: "Safe AGI for humanity",
    godScore: 96,
    teamScore: 98,
    tractionScore: 75,
    marketScore: 99,
    productScore: 99,
    visionScore: 100,
    smellTestScore: 4,
    hasTechFounder: true
  },
  {
    name: "Figma",
    tagline: "Design together in the browser",
    godScore: 88,
    teamScore: 82,
    tractionScore: 85,
    marketScore: 80,
    productScore: 98,
    visionScore: 88,
    smellTestScore: 5,
    hasTechFounder: true
  }
];

const ALGORITHMS = [
  {
    id: 'god',
    name: 'GOD Algorithm',
    icon: Flame,
    color: 'from-red-500 to-blue-500',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/40',
    textColor: 'text-red-400',
    description: 'Balanced 14-factor scoring'
  },
  {
    id: 'yc',
    name: 'YC Smell Test',
    icon: Lightbulb,
    color: 'from-cyan-500 to-blue-500',
    bgColor: 'bg-cyan-600/20',
    borderColor: 'border-cyan-500/40',
    textColor: 'text-cyan-400',
    description: "Paul Graham's 5 heuristics"
  },
  {
    id: 'sequoia',
    name: 'Sequoia Style',
    icon: TrendingUp,
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/40',
    textColor: 'text-emerald-400',
    description: 'Market & traction focus'
  },
  {
    id: 'a16z',
    name: 'A16Z Style',
    icon: Code2,
    color: 'from-purple-500 to-indigo-500',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/40',
    textColor: 'text-purple-400',
    description: 'Tech & vision focus'
  }
];

// Score calculation functions - ALL NORMALIZED TO 0-100 SCALE
function calculateGODScore(startup: DemoStartup): number {
  // Already 0-100
  return startup.godScore;
}

function calculateYCScore(startup: DemoStartup): number {
  // Original: (smellTest × 20) + godScore = max 200
  // Normalized: divide by 2 to get 0-100
  const raw = (startup.smellTestScore * 20) + startup.godScore;
  return Math.round(raw / 2);
}

function calculateSequoiaScore(startup: DemoStartup): number {
  // Original: traction×2 + market×1.5 + team×1 = max 450
  // Normalized: divide by 4.5 to get 0-100
  const raw = startup.tractionScore * 2.0 + 
    startup.marketScore * 1.5 + 
    startup.teamScore * 1.0;
  return Math.round(raw / 4.5);
}

function calculateA16ZScore(startup: DemoStartup): number {
  // Original: product×1.8 + vision×1.5 + team×1.2 + techBonus(20) = max 470
  // Normalized: divide by 4.7 to get 0-100
  const techBonus = startup.hasTechFounder ? 20 : 0;
  const raw = startup.productScore * 1.8 + 
    startup.visionScore * 1.5 + 
    startup.teamScore * 1.2 + 
    techBonus;
  return Math.round(raw / 4.7);
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AlgorithmComparisonDemo({ isOpen, onClose }: Props) {
  const [currentStartupIndex, setCurrentStartupIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatedScores, setAnimatedScores] = useState<Record<string, number>>({});
  const [animationStep, setAnimationStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInsight, setShowInsight] = useState(false);

  const currentStartup = DEMO_STARTUPS[currentStartupIndex];

  // Calculate actual scores
  const actualScores = {
    god: calculateGODScore(currentStartup),
    yc: calculateYCScore(currentStartup),
    sequoia: calculateSequoiaScore(currentStartup),
    a16z: calculateA16ZScore(currentStartup)
  };

  // Animate scores counting up
  useEffect(() => {
    if (!isAnimating) return;

    const algorithms = ['god', 'yc', 'sequoia', 'a16z'];
    const delays = [0, 300, 600, 900];

    algorithms.forEach((algo, index) => {
      setTimeout(() => {
        const targetScore = actualScores[algo as keyof typeof actualScores];
        let currentScore = 0;
        const increment = Math.ceil(targetScore / 30);
        
        const interval = setInterval(() => {
          currentScore += increment;
          if (currentScore >= targetScore) {
            currentScore = targetScore;
            clearInterval(interval);
            
            // After last algorithm animates, show insight
            if (algo === 'a16z') {
              setTimeout(() => {
                setShowInsight(true);
                setIsAnimating(false);
              }, 500);
            }
          }
          setAnimatedScores(prev => ({ ...prev, [algo]: currentScore }));
        }, 30);
      }, delays[index]);
    });
  }, [isAnimating, currentStartupIndex]);

  // Start animation
  const runAnimation = () => {
    setAnimatedScores({});
    setShowInsight(false);
    setIsAnimating(true);
  };

  // Auto-play through startups
  useEffect(() => {
    if (!isPlaying || !isOpen) return;

    const timeout = setTimeout(() => {
      if (!isAnimating) {
        if (showInsight) {
          // Move to next startup
          setCurrentStartupIndex(prev => (prev + 1) % DEMO_STARTUPS.length);
          setShowInsight(false);
          setTimeout(runAnimation, 500);
        } else if (Object.keys(animatedScores).length === 0) {
          runAnimation();
        }
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [isPlaying, isAnimating, showInsight, isOpen, animatedScores]);

  // Get winner algorithm
  const getWinner = () => {
    const scores = Object.entries(actualScores);
    scores.sort((a, b) => b[1] - a[1]);
    return scores[0][0];
  };

  // Get insight text
  const getInsight = () => {
    const winner = getWinner();
    const startup = currentStartup;

    switch (winner) {
      case 'god':
        return `${startup.name} excels across all dimensions - a well-rounded investment opportunity.`;
      case 'yc':
        return `${startup.name} passes YC's smell tests with flying colors - strong founder-market fit and execution potential.`;
      case 'sequoia':
        return `${startup.name} shows exceptional traction and market metrics - exactly what Sequoia looks for.`;
      case 'a16z':
        return `${startup.name} combines technical innovation with bold vision - perfect for A16Z's thesis.`;
      default:
        return `${startup.name} shows strong potential across multiple investment styles.`;
    }
  };

  // Reset animation when changing startups
  useEffect(() => {
    setAnimatedScores({});
    setShowInsight(false);
  }, [currentStartupIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-5xl bg-gradient-to-br from-[#1a0030] via-[#2d1b50] to-[#1a0030] rounded-3xl border border-purple-500/30 shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  Algorithm Showdown
                </h2>
                <p className="text-gray-400">See how different VCs would score the same startup</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setAnimatedScores({});
                  setShowInsight(false);
                }}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                title="Reset"
              >
                <RotateCcw className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => {
                  setIsPlaying(!isPlaying);
                  if (!isPlaying && Object.keys(animatedScores).length === 0) {
                    runAnimation();
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                  isPlaying
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                }`}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Pause' : 'Auto Play'}
              </button>
            </div>
          </div>
        </div>

        {/* Startup Selector */}
        <div className="p-4 border-b border-purple-500/20 bg-black/20">
          <div className="flex items-center justify-center gap-4">
            <span className="text-gray-400 text-sm">Compare startup:</span>
            {DEMO_STARTUPS.map((startup, index) => (
              <button
                key={startup.name}
                onClick={() => {
                  setCurrentStartupIndex(index);
                  setTimeout(runAnimation, 300);
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  currentStartupIndex === index
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {startup.name}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {/* Startup Info Card */}
          <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center text-2xl font-bold text-white">
                {currentStartup.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-1">{currentStartup.name}</h3>
                <p className="text-gray-400 mb-2">{currentStartup.tagline}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm">
                    GOD: {currentStartup.godScore}/100
                  </span>
                  <span className="px-3 py-1 rounded-full bg-cyan-600/20 text-cyan-300 text-sm">
                    Smell Tests: {currentStartup.smellTestScore}/5
                  </span>
                  {currentStartup.hasTechFounder && (
                    <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm flex items-center gap-1">
                      <Code2 className="w-3 h-3" /> Tech Founder
                    </span>
                  )}
                </div>
              </div>
              {!isAnimating && Object.keys(animatedScores).length === 0 && (
                <button
                  onClick={runAnimation}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg"
                >
                  <Zap className="w-5 h-5" />
                  Run Analysis
                </button>
              )}
            </div>
          </div>

          {/* Algorithm Score Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {ALGORITHMS.map((algo) => {
              const Icon = algo.icon;
              const score = animatedScores[algo.id] || 0;
              const isWinner = showInsight && getWinner() === algo.id;
              
              return (
                <div
                  key={algo.id}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-500 ${
                    isWinner 
                      ? `${algo.bgColor} ${algo.borderColor} ring-2 ring-yellow-400/50 scale-105` 
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  {isWinner && (
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                      <span className="text-lg">👑</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${algo.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm">{algo.name}</div>
                      <div className="text-gray-500 text-xs">{algo.description}</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${algo.textColor} mb-1 font-mono transition-all ${
                      isAnimating && animatedScores[algo.id] ? 'animate-pulse' : ''
                    }`}>
                      {score > 0 ? score : '---'}
                    </div>
                    <div className="text-gray-500 text-xs">/ 100</div>
                  </div>
                  {/* Score bar - all normalized to 100 max */}
                  <div className="mt-3 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${algo.color} transition-all duration-500`}
                      style={{ width: `${Math.min(score, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Insight Box */}
          {showInsight && (
            <div className="p-4 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-white font-semibold mb-1">🎯 Investment Insight</div>
                  <p className="text-gray-300">{getInsight()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Component Scores Breakdown */}
          {showInsight && (
            <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
              <h4 className="text-white font-semibold mb-3">📊 Score Components for {currentStartup.name}</h4>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { label: 'Team', score: currentStartup.teamScore, color: 'from-blue-500 to-blue-600' },
                  { label: 'Traction', score: currentStartup.tractionScore, color: 'from-green-500 to-green-600' },
                  { label: 'Market', score: currentStartup.marketScore, color: 'from-purple-500 to-purple-600' },
                  { label: 'Product', score: currentStartup.productScore, color: 'from-cyan-500 to-blue-600' },
                  { label: 'Vision', score: currentStartup.visionScore, color: 'from-cyan-600 to-blue-600' },
                  { label: 'Smell', score: currentStartup.smellTestScore * 20, color: 'from-yellow-500 to-yellow-600' },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div className={`w-12 h-12 mx-auto rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center text-white font-bold text-sm mb-1`}>
                      {item.score}
                    </div>
                    <div className="text-xs text-gray-400">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-purple-500/20 bg-black/20">
          <p className="text-center text-gray-500 text-sm">
            💡 Different algorithms reveal different investment opportunities. [pyth] ai helps you see them all.
          </p>
        </div>
      </div>
    </div>
  );
}
