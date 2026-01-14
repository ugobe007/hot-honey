import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, Sparkles, ArrowRight, CheckCircle, Loader2, Globe, Zap, Lock, TrendingUp, Brain, Target, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SplitScreenHeroProps {
  onAnalysisComplete?: (startupData: any, matches: any[]) => void;
}

// Recent matches for the ticker (will be replaced with real data)
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

// Blurred investor names for teaser
const TEASER_INVESTORS = [
  { name: 'Top VC Firm', focus: 'AI/ML' },
  { name: 'Growth Fund', focus: 'B2B SaaS' },
  { name: 'Seed Investor', focus: 'FinTech' },
];

// Analysis steps shown during loading
const ANALYSIS_STEPS = [
  { icon: Globe, text: 'Scraping website data...' },
  { icon: Brain, text: 'Analyzing with AI...' },
  { icon: Target, text: 'Calculating GOD Score™...' },
  { icon: Users, text: 'Finding investor matches...' },
];

const SplitScreenHero: React.FC<SplitScreenHeroProps> = ({ onAnalysisComplete }) => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
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

  // Analysis step progression
  useEffect(() => {
    if (!isAnalyzing) return;
    
    const interval = setInterval(() => {
      setAnalysisStep((prev) => {
        if (prev >= ANALYSIS_STEPS.length - 1) return prev;
        return prev + 1;
      });
    }, 1500);
    
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Handle URL submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    setIsAnalyzing(true);
    setAnalysisStep(0);
    setError(null);
    
    try {
      // Clean URL
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
        // Startup exists - fetch their matches
        const { data: matches } = await supabase
          .from('startup_investor_matches')
          .select('*, investors(*)')
          .eq('startup_id', existingStartup.id)
          .eq('status', 'suggested')
          .order('match_score', { ascending: false })
          .limit(5);
        
        setAnalysisResult({
          startup: existingStartup,
          matches: matches || [],
          isExisting: true
        });
        setAnalysisComplete(true);
        onAnalysisComplete?.(existingStartup, matches || []);
      } else {
        // New startup - redirect to get-matched form with URL pre-filled
        setTimeout(() => {
          navigate(`/get-matched?url=${encodeURIComponent(cleanUrl)}`);
        }, 3000);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      // Still redirect on error
      setTimeout(() => {
        navigate(`/get-matched?url=${encodeURIComponent(url)}`);
      }, 2000);
    }
  };

  // Score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 80) return 'text-cyan-400';
    if (score >= 70) return 'text-blue-400';
    return 'text-violet-400';
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Single Unified Panel */}
      <div className="relative bg-gradient-to-br from-[#1a1a1a]/90 via-[#1f1f1f]/90 to-[#252525]/90 backdrop-blur-md border border-violet-500/30 rounded-2xl overflow-hidden">
        {/* Subtle animated glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5"></div>
        
        {/* Live Ticker Bar at Top */}
        <div className="relative bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-emerald-500/10 border-b border-emerald-500/20 px-4 py-2">
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider">Live</span>
            </div>
            <div className={`flex items-center gap-2 transition-opacity duration-300 ${tickerFade ? 'opacity-0' : 'opacity-100'}`}>
              <span className="text-sm text-gray-300">
                <span className="text-white font-semibold">{currentTickerMatch.startup}</span>
                {' '}just matched with{' '}
                <span className="text-cyan-400 font-semibold">{currentTickerMatch.investor}</span>
              </span>
              <span className={`text-sm font-bold ${getScoreColor(currentTickerMatch.score)}`}>
                ({currentTickerMatch.score}%)
              </span>
            </div>
          </div>
        </div>

        {/* Main Content - Split Layout */}
        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-0">
          
          {/* LEFT SIDE - URL Input */}
          <div className="p-6 sm:p-8 border-b md:border-b-0 md:border-r border-gray-800">
            {!isAnalyzing && !analysisComplete && (
              <>
                {/* CTA Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 bg-gradient-to-br from-violet-500/20 to-purple-600/20 rounded-xl border border-violet-500/30">
                    <Rocket className="w-6 h-6 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Get Your Matches</h3>
                    <p className="text-sm text-gray-400">Enter your startup URL to begin</p>
                  </div>
                </div>

                {/* URL Input Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="yourcompany.com"
                      className="w-full pl-12 pr-4 py-3.5 bg-[#0d0d0d] border border-gray-700 focus:border-violet-500 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-violet-600/30"
                  >
                    <Sparkles className="w-5 h-5" />
                    Analyze My Startup
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </form>

                {/* Trust Indicators */}
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-5 pt-5 border-t border-gray-800">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>50+ data points</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Instant GOD Score™</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>500+ investors</span>
                  </div>
                </div>
              </>
            )}

            {/* Analyzing State */}
            {isAnalyzing && !analysisComplete && (
              <div className="text-center py-4">
                <div className="mb-5">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-violet-500/20 to-purple-600/20 rounded-2xl border border-violet-500/50 animate-pulse">
                    <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Analyzing Your Startup</h3>
                <p className="text-sm text-gray-400 mb-5 truncate max-w-[250px] mx-auto">{url}</p>
                
                {/* Analysis Steps */}
                <div className="space-y-2 text-left">
                  {ANALYSIS_STEPS.map((step, index) => {
                    const StepIcon = step.icon;
                    const isActive = index === analysisStep;
                    const isComplete = index < analysisStep;
                    
                    return (
                      <div 
                        key={index}
                        className={`flex items-center gap-2.5 p-2 rounded-lg transition-all ${
                          isActive ? 'bg-violet-500/10 border border-violet-500/30' : ''
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : isActive ? (
                          <StepIcon className="w-4 h-4 text-violet-400 animate-pulse flex-shrink-0" />
                        ) : (
                          <StepIcon className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${isComplete ? 'text-emerald-400' : isActive ? 'text-white' : 'text-gray-500'}`}>
                          {step.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Analysis Complete */}
            {analysisComplete && analysisResult && (
              <div className="text-center py-4">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-green-600/20 rounded-xl border border-emerald-500/50">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{analysisResult.startup.name}</h3>
                <p className="text-sm text-gray-400 mb-4">
                  GOD Score™: <span className="text-emerald-400 font-bold">{analysisResult.startup.total_god_score}</span>
                </p>
                
                <button
                  onClick={() => navigate('/trending')}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold rounded-xl transition-all"
                >
                  See Your {analysisResult.matches.length}+ Matches
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* RIGHT SIDE - Pending Matches Teaser */}
          <div className="p-6 sm:p-8 bg-gradient-to-br from-transparent to-cyan-500/5">
            <div className="text-center mb-5">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Your Matches Await</h4>
              </div>
              <p className="text-xs text-gray-500">Unlock your personalized investor matches</p>
            </div>

            {/* Blurred/Locked Investor Cards */}
            <div className="space-y-3 mb-5">
              {TEASER_INVESTORS.map((investor, index) => (
                <div 
                  key={index}
                  className="relative flex items-center gap-3 p-3 bg-[#0d0d0d]/60 border border-gray-800 rounded-xl overflow-hidden"
                >
                  {/* Blur overlay */}
                  <div className="absolute inset-0 backdrop-blur-[2px] bg-[#0d0d0d]/40 z-10 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-gray-500" />
                  </div>
                  
                  {/* Content (visible but blurred) */}
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-amber-600/20 rounded-lg flex items-center justify-center">
                    <span className="text-lg">🔥</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-300 truncate">{investor.name}</p>
                    <p className="text-xs text-gray-500">{investor.focus}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-emerald-400/50">??%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-[#0d0d0d]/40 rounded-xl border border-gray-800">
                <p className="text-2xl font-bold text-cyan-400">500+</p>
                <p className="text-xs text-gray-500">Active Investors</p>
              </div>
              <div className="text-center p-3 bg-[#0d0d0d]/40 rounded-xl border border-gray-800">
                <p className="text-2xl font-bold text-violet-400">25+</p>
                <p className="text-xs text-gray-500">Avg. Matches</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="relative bg-[#0d0d0d]/50 border-t border-gray-800 px-4 py-3">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <TrendingUp className="w-3 h-3 text-cyan-400" />
            <span>Matching engine running 24/7 • Updated in real-time</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitScreenHero;
