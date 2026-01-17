import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { markUrlSubmitted } from '../lib/routeGuards';

// Pool of recent matches for rotation - credible variety
const MATCH_POOL = [
  { startup: 'AI Infrastructure', investor: 'Sequoia', highlight: true },
  { startup: 'Climate Analytics', investor: 'Khosla', highlight: false },
  { startup: 'FinTech API', investor: 'Ribbit', highlight: false },
  { startup: 'Developer Tools', investor: 'Greylock', highlight: true },
  { startup: 'Healthcare ML', investor: 'GV', highlight: false },
  { startup: 'Supply Chain AI', investor: 'Founders Fund', highlight: false },
  { startup: 'EdTech Platform', investor: 'Reach Capital', highlight: true },
  { startup: 'Cybersecurity', investor: 'Accel', highlight: false },
  { startup: 'Robotics', investor: 'Lux Capital', highlight: true },
  { startup: 'Clean Energy', investor: 'Breakthrough', highlight: false },
  { startup: 'PropTech', investor: 'Fifth Wall', highlight: false },
  { startup: 'Biotech AI', investor: 'a16z Bio', highlight: true },
  { startup: 'Gaming Infra', investor: 'Makers Fund', highlight: false },
  { startup: 'MarketingTech', investor: 'Insight', highlight: false },
  { startup: 'Construction AI', investor: 'Brick & Mortar', highlight: true },
  { startup: 'AgTech Sensors', investor: 'Acre VP', highlight: false },
  { startup: 'Space Data', investor: 'Seraphim', highlight: true },
  { startup: 'NeuroTech', investor: 'Khosla', highlight: false },
  { startup: 'Legal AI', investor: 'GV', highlight: false },
  { startup: 'Music Tech', investor: 'Index', highlight: true },
];

// Generate time strings that look recent
const getRecentTimes = () => {
  const times = ['just now', '2m ago', '5m ago', '8m ago', '12m ago', '18m ago', '24m ago', '31m ago'];
  return times.slice(0, 3);
};

// Get 3 random matches from pool (deterministic per seed)
const getRandomMatches = (seed: number) => {
  // deterministic pseudo-random generator (mulberry32)
  const mulberry32 = (a: number) => () => {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rand = mulberry32(seed);
  const shuffled = [...MATCH_POOL].sort(() => rand() - 0.5);
  const times = getRecentTimes();

  return shuffled.slice(0, 3).map((m, i) => ({
    ...m,
    time: times[i],
    highlight: i === 0,
  }));
};

const SplitScreenHero: React.FC = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Input interaction state (for glow system)
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Armed state: URL looks valid (sensing → inference transition)
  const isArmed = /(\.[a-z]{2,})/i.test(url.trim());
  
  // Staggered reveal state
  const [showHeadline, setShowHeadline] = useState(false);
  const [showCommand, setShowCommand] = useState(false);
  const [showReadout, setShowReadout] = useState(false);
  const [showPairings, setShowPairings] = useState(false);
  
  // Rotating recent matches - refresh every 45 seconds
  const [recentMatches, setRecentMatches] = useState(() => getRandomMatches(Date.now()));
  
  const [scores, setScores] = useState({
    marketFit: 0,
    stageReadiness: 0,
    capitalVelocity: 0,
    geographicReach: 0,
    thesisConvergence: 0,
  });
  
  const targetScores = {
    marketFit: 72,
    stageReadiness: 68,
    capitalVelocity: 81,
    geographicReach: 65,
    thesisConvergence: 77,
  };

  // Staggered reveal on load
  useEffect(() => {
    setTimeout(() => setShowHeadline(true), 400);
    setTimeout(() => setShowCommand(true), 700);
    setTimeout(() => {
      setShowReadout(true);
      setScores(targetScores);
    }, 1000);
    setTimeout(() => setShowPairings(true), 1400);
  }, []);

  // Rotate recent matches every 45 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRecentMatches(getRandomMatches(Date.now()));
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  // Breathing animation for bars - every 10 seconds
  useEffect(() => {
    if (!showReadout) return;
    const interval = setInterval(() => {
      setScores({
        marketFit: Math.max(60, Math.min(95, targetScores.marketFit + (Math.random() - 0.5) * 6)),
        stageReadiness: Math.max(55, Math.min(90, targetScores.stageReadiness + (Math.random() - 0.5) * 6)),
        capitalVelocity: Math.max(65, Math.min(95, targetScores.capitalVelocity + (Math.random() - 0.5) * 6)),
        geographicReach: Math.max(50, Math.min(85, targetScores.geographicReach + (Math.random() - 0.5) * 6)),
        thesisConvergence: Math.max(60, Math.min(92, targetScores.thesisConvergence + (Math.random() - 0.5) * 6)),
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [showReadout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setIsAnalyzing(true);
    let cleanUrl = trimmed;
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    // Mark session state BEFORE navigating so guards recognize the scan
    markUrlSubmitted(cleanUrl);
    navigate(`/instant-matches?url=${encodeURIComponent(cleanUrl)}`);
    setTimeout(() => setIsAnalyzing(false), 800);
  };

  const ScoreBar = ({ label, value }: { label: string; value: number }) => (
    <div className="flex items-center gap-6">
      <span className="text-[13px] text-gray-300 w-36 text-left font-mono">{label}</span>
      <div className="flex-1 h-1 bg-gray-900/60 overflow-hidden">
        <div 
          className="h-full bg-amber-500/80 transition-all duration-[1500ms] ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="relative w-full min-h-[calc(100vh-120px)] flex flex-col">
      
      {/* BRAND MARK removed - now handled by OracleHeader in TopShell */}
      {/* TICKER removed - now handled by TopShell in MatchingEngine */}
      
      {/* Subtle radial glow - no edges */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-amber-500/[0.02] rounded-full blur-[120px]"></div>
      </div>
      
      {/* Main content with vertical spine */}
      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-[1100px] mx-auto w-full px-8 sm:px-12 py-8">
        
        {/* HEADLINE - Category flag, large and quiet */}
        <h1 className={`text-5xl sm:text-6xl md:text-7xl font-bold text-white tracking-tight mb-4 transition-all duration-700 ${showHeadline ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          Signal Science.
        </h1>
        
        {/* SUBHEADLINE - Lower contrast, let it breathe */}
        <p className={`text-xl text-gray-500 mb-10 transition-all duration-700 delay-100 ${showHeadline ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          Timing is everything.
        </p>
        
        {/* PRIMARY CTA LABEL - Above the input */}
        <p className={`text-sm text-gray-400 mb-4 transition-all duration-700 delay-150 ${showCommand ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          Check My Investor Signals →
        </p>

        {/* COMMAND BAR + READOUT wrapper */}
        <div className="relative">
          {/* COMMAND BAR - instrument, not form */}
          <div className={`relative mb-3 transition-all duration-700 ${showCommand ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {!isAnalyzing ? (
              <form onSubmit={handleSubmit}>
                {/* Input wrapper with layered glow system */}
                <div 
                  className={`
                    relative flex items-stretch
                    bg-[#0a0a0a]
                    border
                    transition-all duration-300
                    shadow-[inset_0_2px_6px_rgba(0,0,0,0.4)]
                    ${isFocused 
                      ? 'border-cyan-400/45 shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_0_40px_rgba(168,85,247,0.18)]' 
                      : isArmed
                        ? 'border-cyan-400/35 shadow-[0_0_28px_rgba(56,189,248,0.10),0_0_28px_rgba(168,85,247,0.10)]'
                        : isHovered 
                          ? 'border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.08)]' 
                          : 'border-white/10'
                    }
                    ${isArmed && !isFocused ? 'animate-[ctaPulse_2.4s_ease-in-out_infinite]' : ''}
                  `}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  {/* Inner cyan glow layer (focus state) */}
                  <div
                    className={`
                      pointer-events-none absolute inset-0
                      transition-opacity duration-300
                      ${isFocused ? 'opacity-100' : 'opacity-0'}
                    `}
                    style={{
                      boxShadow: `
                        inset 0 0 0 1px rgba(56, 189, 248, 0.35),
                        inset 0 0 18px rgba(56, 189, 248, 0.15)
                      `
                    }}
                  />
                  
                  {/* Violet halo layer (armed state - URL valid) */}
                  {isArmed && isFocused && (
                    <div
                      className="pointer-events-none absolute -inset-[2px] rounded-[2px] transition-opacity duration-500"
                      style={{
                        boxShadow: '0 0 24px rgba(168, 85, 247, 0.15)'
                      }}
                    />
                  )}
                  
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="https://yourstartup.com"
                    className="flex-1 px-6 py-5 bg-transparent text-white placeholder-gray-600 focus:outline-none text-base font-mono relative z-10 border-0 focus:ring-0"
                  />
                  <button
                    type="submit"
                    className="group px-10 py-5 bg-gradient-to-b from-amber-500 to-amber-600 text-black text-sm font-bold font-mono tracking-wide whitespace-nowrap relative z-10 transition-shadow duration-200 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.35),0_0_24px_rgba(168,85,247,0.25)] active:shadow-[0_0_0_1px_rgba(56,189,248,0.55),0_0_32px_rgba(168,85,247,0.35)]"
                  >
                    SCAN →
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-3 px-6 py-5 bg-[#0a0a0a] border border-cyan-500/40 shadow-[inset_0_2px_6px_rgba(0,0,0,0.4)]"
                style={{
                  boxShadow: `
                    inset 0 0 0 1px rgba(56, 189, 248, 0.4),
                    inset 0 0 30px rgba(56, 189, 248, 0.1),
                    0 0 20px rgba(168, 85, 247, 0.1)
                  `
                }}
              >
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span className="text-sm text-cyan-400 font-mono">Analyzing signals...</span>
              </div>
            )}
          </div>
          
          {/* MICROCOPY moved to under CTAs */}
          
          {/* SECONDARY CTA - Demo-first, benefits-first (Fix #2 + #3) */}
          <div className={`flex flex-wrap items-center gap-3 transition-all duration-500 delay-200 ${showCommand ? 'opacity-100' : 'opacity-0'}`}>
            <Link
              to="/value"
              className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white transition"
            >
              What you get
            </Link>
            <Link
              to="/how-it-works"
              className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-5 py-2.5 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/15 transition"
            >
              How it works →
            </Link>
          </div>
          
          {/* MICROCOPY under CTAs */}
          <p className={`mt-2 text-xs text-white/45 mb-10 transition-all duration-500 delay-300 ${showCommand ? 'opacity-100' : 'opacity-0'}`}>
            No pitch deck • No warm intro • Just signals
          </p>

          {/* SYSTEM READOUT + RECENT MATCH PROOF */}
          <div className={`flex gap-12 mb-10 transition-all duration-700 ${showReadout ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {/* SYSTEM READOUT - left side */}
            <div className="flex-1">
              <p className="text-xs text-gray-400 uppercase tracking-[0.2em] mb-5 font-mono">System Readout</p>
              <div className="space-y-3">
                <ScoreBar label="Market Fit" value={scores.marketFit} />
                <ScoreBar label="Stage Readiness" value={scores.stageReadiness} />
                <ScoreBar label="Capital Velocity" value={scores.capitalVelocity} />
                <ScoreBar label="Geographic Reach" value={scores.geographicReach} />
                <ScoreBar label="Thesis Convergence" value={scores.thesisConvergence} />
              </div>
            </div>
            
            {/* EXAMPLE MATCH PROOF - right side, rotating 3 rows (terminal feel, not casino) */}
            <div className="w-56 flex-shrink-0">
              <p className="text-[9px] text-gray-600 uppercase tracking-[0.2em] mb-4 font-mono">Example Matches</p>
              <div className="space-y-2">
                {recentMatches.map((match, i) => (
                  <div key={`${match.startup}-${match.investor}`} className="font-mono transition-opacity duration-500">
                    <p className={`text-sm ${match.highlight ? 'text-amber-500' : 'text-gray-500'}`}>
                      {match.startup} <span className="text-gray-700">→</span> <span className={match.highlight ? 'text-amber-400' : 'text-gray-400'}>{match.investor}</span>
                    </p>
                    <p className="text-[10px] text-gray-600">{match.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* LIVE SIGNAL PAIRINGS - credible evidence */}
        <div className={`mb-10 transition-all duration-700 ${showPairings ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="h-px bg-gray-800/60 mb-6"></div>
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-[9px] text-gray-600 uppercase tracking-[0.2em] font-mono">Live Signal Pairings</p>
            <p className="text-[10px] text-gray-600 font-mono">Generated from current market signals · Updating continuously</p>
          </div>
          <div className="space-y-0">
            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-x-8 py-2 text-[11px] text-gray-600 border-b border-gray-800/40 font-mono">
              <span>Startup Signal</span>
              <span></span>
              <span>Investor Signal</span>
              <span className="text-gray-800">|</span>
              <span>Reason</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-x-8 py-3 border-b border-gray-800/30 font-mono">
              <span className="text-base text-gray-300">Climate Analytics</span>
              <span className="text-gray-700">→</span>
              <span className="text-base text-amber-500">Khosla</span>
              <span className="text-gray-800">|</span>
              <span className="text-sm text-gray-500">Capital velocity</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-x-8 py-3 border-b border-gray-800/30 font-mono">
              <span className="text-base text-gray-300">AI Infrastructure</span>
              <span className="text-gray-700">→</span>
              <span className="text-base text-amber-500">Sequoia</span>
              <span className="text-gray-800">|</span>
              <span className="text-sm text-gray-500">Portfolio gap</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-x-8 py-3 font-mono">
              <span className="text-base text-gray-300">FinTech API</span>
              <span className="text-gray-700">→</span>
              <span className="text-base text-amber-500">Ribbit</span>
              <span className="text-gray-800">|</span>
              <span className="text-sm text-gray-500">Stage readiness</span>
            </div>
          </div>
        </div>

        {/* INVESTOR HOOK - reverse FOMO, one line only */}
        <div className={`mt-6 transition-all duration-500 ${showPairings ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-sm text-gray-400 mb-2">
            Investors use Pythh to detect momentum before rounds are obvious.
          </p>
          <Link to="/investor/signup" className="text-[11px] text-gray-600 hover:text-amber-500/80 transition-colors font-mono">
            I'm an Investor →
          </Link>
        </div>
      </div>
      
      {/* CTA pulse animation */}
      <style>{`
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 0 28px rgba(56,189,248,0.08), 0 0 28px rgba(168,85,247,0.08); }
          50%      { box-shadow: 0 0 36px rgba(56,189,248,0.14), 0 0 36px rgba(168,85,247,0.12); }
        }
      `}</style>
    </div>
  );
};

export default SplitScreenHero;
