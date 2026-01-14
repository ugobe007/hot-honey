import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div className="w-full max-w-6xl mx-auto">
      {/* COMPACT UNIFIED PANEL */}
      <div className="relative bg-gradient-to-r from-[#0f0f0f] via-[#131313] to-[#0f0f0f] border border-violet-500/30 rounded-xl overflow-hidden">
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

        {/* MAIN CONTENT - HORIZONTAL */}
        <div className="flex flex-col md:flex-row items-center px-4 py-3 gap-4">
          
          {/* LEFT - URL Input Form */}
          <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 w-full">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xl">🔥</span>
              <span className="text-sm font-bold text-white whitespace-nowrap">Get Your Matches</span>
            </div>

            {!isAnalyzing ? (
              <form onSubmit={handleSubmit} className="flex-1 flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 min-w-[180px]">
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
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-lg transition-all text-sm whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4" />
                  Find My Investors
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2 text-violet-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Analyzing...</span>
              </div>
            )}
          </div>

          {/* DIVIDER */}
          <div className="hidden md:block w-px h-10 bg-gray-800"></div>

          {/* RIGHT - Investor Teasers (INLINE, NO BOXES) */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-gray-600" />
              <span className="text-[10px] text-gray-500 uppercase">Matches await:</span>
            </div>
            
            {/* Blurred investor names - INLINE */}
            <div className="flex items-center gap-3">
              {TEASER_INVESTORS.map((investor, index) => (
                <div key={index} className="relative">
                  <span className="text-xs text-gray-500 blur-[2px]">{investor.name}</span>
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] text-emerald-500/50 font-bold">??%</span>
                  </span>
                </div>
              ))}
            </div>

            {/* Stats INLINE */}
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              <span><span className="text-cyan-400 font-bold">500+</span> investors</span>
              <span><span className="text-violet-400 font-bold">25+</span> avg matches</span>
            </div>
          </div>
        </div>

        {/* Bottom bar - MINIMAL */}
        <div className="bg-[#080808] border-t border-gray-800/30 px-4 py-1 flex items-center justify-center gap-1.5 text-[9px] text-gray-600">
          <TrendingUp className="w-2.5 h-2.5 text-cyan-500" />
          <span>Matching 24/7 • Real-time updates</span>
        </div>
      </div>
    </div>
  );
};

export default SplitScreenHero;
