import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Loader2, Globe, Lock, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SplitScreenHeroProps {
  onAnalysisComplete?: (startupData: any, matches: any[]) => void;
}

// Recent matches for the ticker
const SAMPLE_RECENT_MATCHES = [
  { startup: 'NeuralFlow AI', investor: 'Sequoia Capital', score: 94 },
  { startup: 'GreenTech Solar', investor: 'Khosla Ventures', score: 87 },
  { startup: 'HealthPulse', investor: 'a16z Bio', score: 91 },
  { startup: 'FinanceBot', investor: 'Ribbit Capital', score: 89 },
  { startup: 'DataMesh Pro', investor: 'Y Combinator', score: 96 },
  { startup: 'CloudSecure', investor: 'Accel', score: 88 },
  { startup: 'AIWriter', investor: 'Greylock', score: 92 },
  { startup: 'EduTech Plus', investor: 'Reach Capital', score: 85 },
];

// Blurred investor teasers
const TEASER_INVESTORS = [
  { name: 'Top VC Firm', focus: 'AI/ML' },
  { name: 'Growth Fund', focus: 'B2B SaaS' },
  { name: 'Seed Investor', focus: 'FinTech' },
];

const SplitScreenHero: React.FC<SplitScreenHeroProps> = ({ onAnalysisComplete }) => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Ticker state
  const [tickerIndex, setTickerIndex] = useState(0);
  const [tickerFade, setTickerFade] = useState(false);

  // Animate ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerFade(true);
      setTimeout(() => {
        setTickerIndex((prev) => (prev + 1) % SAMPLE_RECENT_MATCHES.length);
        setTickerFade(false);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const currentTickerMatch = SAMPLE_RECENT_MATCHES[tickerIndex];

  // Handle URL submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    setIsAnalyzing(true);
    
    try {
      let cleanUrl = url.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }
      
      // Check if startup already exists
      const { data: existingStartup } = await supabase
        .from('startup_uploads')
        .select('*')
        .eq('website', cleanUrl)
        .eq('status', 'approved')
        .single();
      
      if (existingStartup) {
        const { data: matches } = await supabase
          .from('startup_investor_matches')
          .select('*, investors(*)')
          .eq('startup_id', existingStartup.id)
          .eq('status', 'suggested')
          .order('match_score', { ascending: false })
          .limit(5);
        
        onAnalysisComplete?.(existingStartup, matches || []);
        navigate('/trending');
      } else {
        setTimeout(() => {
          navigate(`/get-matched?url=${encodeURIComponent(cleanUrl)}`);
        }, 1500);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setTimeout(() => {
        navigate(`/get-matched?url=${encodeURIComponent(url)}`);
      }, 1000);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 80) return 'text-cyan-400';
    return 'text-violet-400';
  };

  return (
    <div className="w-full px-2 sm:px-4">
      {/* Match the card grid width - aligned with startup card left edge to investor card right edge */}
      <div className="max-w-[340px] sm:max-w-[1030px] lg:max-w-[1058px] mx-auto">
        {/* COMPACT UNIFIED PANEL with purple glow */}
        <div className="relative bg-gradient-to-r from-[#0f0f0f] via-[#131313] to-[#0f0f0f] border border-violet-500/40 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_rgba(139,92,246,0.4)] transition-shadow duration-300">
          {/* Gradient accent line */}
          <div className="h-0.5 bg-gradient-to-r from-violet-600 via-cyan-500 to-emerald-500"></div>
          
          {/* Live Ticker - SINGLE LINE */}
          <div className="bg-[#080808] px-4 py-1 flex items-center justify-center gap-2 border-b border-gray-800/30">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-[10px] text-emerald-400 font-medium uppercase">Live</span>
            <div className={`transition-opacity duration-300 ${tickerFade ? 'opacity-0' : 'opacity-100'}`}>
              <span className="text-[11px] text-gray-400">
                <span className="text-white font-medium">{currentTickerMatch.startup}</span>
                {' '}→{' '}
                <span className="text-cyan-400 font-medium">{currentTickerMatch.investor}</span>
                {' '}
                <span className={`font-bold ${getScoreColor(currentTickerMatch.score)}`}>
                  {currentTickerMatch.score}%
                </span>
              </span>
            </div>
          </div>

          {/* MAIN CONTENT - FLAME | FORM | BLURRED INVESTOR */}
          <div className="flex items-center px-3 sm:px-4 py-2.5 gap-3 sm:gap-4">
            
            {/* LEFT - Flame icon */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xl sm:text-2xl">🔥</span>
            </div>

            {/* CENTER - URL Form */}
            <div className="flex-1">
              {!isAnalyzing ? (
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="yourcompany.com"
                      className="w-full pl-9 pr-3 py-2 bg-[#080808] border border-gray-700 focus:border-violet-500 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[#0a0a0a] border border-cyan-400 hover:bg-cyan-400/10 text-cyan-400 font-semibold rounded-lg transition-all text-xs sm:text-sm whitespace-nowrap"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="hidden sm:inline">Find My Investors</span>
                    <span className="sm:hidden">Find</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-center gap-2 text-violet-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Analyzing...</span>
                </div>
              )}
            </div>

            {/* RIGHT - Blurred potential investor match - CLICKABLE */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <div className="w-px h-8 bg-gray-800"></div>
              <Link 
                to="/get-matched" 
                className="relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0a0a0a] to-[#0f0f0f] rounded-lg border border-amber-500/40 shadow-lg shadow-amber-500/10 hover:border-amber-400/60 hover:shadow-amber-500/20 transition-all cursor-pointer"
              >
                {/* Blur overlay with enticing message */}
                <div className="absolute inset-0 backdrop-blur-[3px] bg-[#0a0a0a]/60 rounded-lg z-10 flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="text-xs font-semibold text-amber-400">Your top match</span>
                  <span className="text-[10px] text-amber-300/70">→</span>
                </div>
                {/* Blurred content */}
                <span className="text-base">🏦</span>
                <div>
                  <p className="text-sm text-gray-400">Sequoia Capital</p>
                  <p className="text-[10px] text-gray-600">Series A • AI/ML</p>
                </div>
                <span className="text-sm font-bold text-emerald-500/40">94%</span>
              </Link>
            </div>
          </div>

          {/* Bottom bar - MINIMAL */}
          <div className="bg-[#080808] border-t border-gray-800/30 px-4 py-1 flex items-center justify-center gap-1.5 text-[9px] text-gray-600">
            <TrendingUp className="w-2.5 h-2.5 text-cyan-500" />
            <span>Matching 24/7 • Real-time updates</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitScreenHero;
