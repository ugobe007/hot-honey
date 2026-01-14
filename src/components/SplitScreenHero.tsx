import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, Briefcase, Sparkles, ArrowRight, CheckCircle, Loader2, Globe, TrendingUp, Zap, Users, Target, Brain } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SplitScreenHeroProps {
  onAnalysisComplete?: (startupData: any, matches: any[]) => void;
}

// Sample match data for the live demo
const SAMPLE_MATCHES = [
  {
    startup: { name: 'NeuralFlow AI', sector: 'AI/ML', stage: 'Series A' },
    investor: { name: 'Sequoia Capital', focus: 'Enterprise AI' },
    score: 94
  },
  {
    startup: { name: 'GreenTech Solar', sector: 'CleanTech', stage: 'Seed' },
    investor: { name: 'Khosla Ventures', focus: 'Climate Tech' },
    score: 87
  },
  {
    startup: { name: 'HealthPulse', sector: 'HealthTech', stage: 'Series B' },
    investor: { name: 'a16z Bio', focus: 'Digital Health' },
    score: 91
  },
  {
    startup: { name: 'FinanceBot', sector: 'FinTech', stage: 'Series A' },
    investor: { name: 'Ribbit Capital', focus: 'Financial Services' },
    score: 89
  },
  {
    startup: { name: 'DataMesh Pro', sector: 'Data Infra', stage: 'Seed' },
    investor: { name: 'Y Combinator', focus: 'Dev Tools' },
    score: 96
  }
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
  
  // Mini demo state
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [animationPhase, setAnimationPhase] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);

  const currentMatch = SAMPLE_MATCHES[currentMatchIndex];

  // Mini demo animation
  const runMatchAnimation = useCallback(() => {
    setAnimationPhase(0);
    setDisplayScore(0);
    
    setTimeout(() => setAnimationPhase(1), 100);
    setTimeout(() => setAnimationPhase(2), 600);
    setTimeout(() => {
      setAnimationPhase(3);
      const targetScore = SAMPLE_MATCHES[currentMatchIndex].score;
      let current = 0;
      const interval = setInterval(() => {
        current += 8;
        if (current >= targetScore) {
          current = targetScore;
          clearInterval(interval);
        }
        setDisplayScore(current);
      }, 25);
    }, 1000);
    setTimeout(() => setAnimationPhase(4), 1600);
    setTimeout(() => {
      setCurrentMatchIndex((prev) => (prev + 1) % SAMPLE_MATCHES.length);
    }, 3000);
  }, [currentMatchIndex]);

  // Start demo animation loop
  useEffect(() => {
    const timer = setTimeout(() => runMatchAnimation(), 500);
    return () => clearTimeout(timer);
  }, [currentMatchIndex, runMatchAnimation]);

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
        // New startup - queue for analysis
        // For now, redirect to get-matched form with URL pre-filled
        setTimeout(() => {
          navigate(`/get-matched?url=${encodeURIComponent(cleanUrl)}`);
        }, 3000);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Something went wrong. Please try again.');
      setIsAnalyzing(false);
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
    <div className="w-full">
      {/* Split Screen Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-center max-w-6xl mx-auto">
        
        {/* LEFT SIDE - CTA Zone */}
        <div className="order-1 lg:order-1">
          <div className="bg-gradient-to-br from-[#1a1a1a]/80 via-[#1f1f1f]/80 to-[#252525]/80 backdrop-blur-md border border-violet-500/30 rounded-2xl p-6 sm:p-8">
            
            {!isAnalyzing && !analysisComplete && (
              <>
                {/* CTA Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-violet-500/20 to-purple-600/20 rounded-xl border border-violet-500/30">
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
                <div className="flex flex-wrap items-center justify-center gap-4 mt-6 pt-6 border-t border-gray-800">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>1000+ startups</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>50+ data points</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Instant results</span>
                  </div>
                </div>
              </>
            )}

            {/* Analyzing State */}
            {isAnalyzing && !analysisComplete && (
              <div className="text-center py-8">
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-500/20 to-purple-600/20 rounded-2xl border border-violet-500/50 animate-pulse">
                    <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Analyzing Your Startup</h3>
                <p className="text-gray-400 mb-6">{url}</p>
                
                {/* Analysis Steps */}
                <div className="space-y-3 text-left max-w-xs mx-auto">
                  {ANALYSIS_STEPS.map((step, index) => {
                    const StepIcon = step.icon;
                    const isActive = index === analysisStep;
                    const isComplete = index < analysisStep;
                    
                    return (
                      <div 
                        key={index}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                          isActive ? 'bg-violet-500/10 border border-violet-500/30' : ''
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        ) : isActive ? (
                          <StepIcon className="w-5 h-5 text-violet-400 animate-pulse" />
                        ) : (
                          <StepIcon className="w-5 h-5 text-gray-600" />
                        )}
                        <span className={isComplete ? 'text-emerald-400' : isActive ? 'text-white' : 'text-gray-500'}>
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
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-green-600/20 rounded-2xl border border-emerald-500/50">
                    <CheckCircle className="w-7 h-7 text-emerald-400" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{analysisResult.startup.name}</h3>
                <p className="text-sm text-gray-400 mb-4">GOD Score™: <span className="text-emerald-400 font-bold">{analysisResult.startup.total_god_score}</span></p>
                
                {/* Top Matches Preview */}
                {analysisResult.matches.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-400">Top Investor Matches:</p>
                    {analysisResult.matches.slice(0, 3).map((match: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-[#0d0d0d] rounded-lg border border-gray-800">
                        <span className="text-white text-sm">{match.investors?.name}</span>
                        <span className={`text-sm font-bold ${getScoreColor(match.match_score)}`}>
                          {match.match_score}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                <button
                  onClick={() => navigate('/trending')}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold rounded-xl transition-all"
                >
                  See All {analysisResult.matches.length}+ Matches
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE - Mini Live Match Demo */}
        <div className="order-2 lg:order-2">
          <div className="relative bg-gradient-to-br from-[#1a1a1a]/60 via-[#1f1f1f]/60 to-[#252525]/60 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-4 sm:p-6 overflow-hidden">
            {/* Subtle animated glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/5 animate-pulse"></div>
            
            {/* Demo Header */}
            <div className="relative flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-400 uppercase tracking-wider">Live Matching</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>GOD Score™ Active</span>
              </div>
            </div>

            {/* Mini Cards Container */}
            <div className="relative flex items-center justify-center gap-3 sm:gap-4 py-4">
              {/* Mini Startup Card */}
              <div 
                className={`relative bg-gradient-to-br from-[#1a1a1a] to-[#222222] border-2 border-emerald-500/40 rounded-xl p-3 sm:p-4 w-[120px] sm:w-[140px] transition-all duration-500 ${
                  animationPhase >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Rocket className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] text-emerald-400 uppercase">Startup</span>
                </div>
                <p className="text-white text-sm font-semibold truncate">{currentMatch.startup.name}</p>
                <p className="text-gray-400 text-xs truncate">{currentMatch.startup.sector}</p>
                <div className="mt-2 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[10px] text-emerald-400 inline-block">
                  {currentMatch.startup.stage}
                </div>
              </div>

              {/* Center Brain/Match Indicator */}
              <div className={`relative transition-all duration-300 ${animationPhase >= 2 ? 'scale-110' : 'scale-100'}`}>
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                  animationPhase >= 2 
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/50' 
                    : 'bg-gradient-to-br from-gray-700 to-gray-800'
                }`}>
                  {animationPhase >= 3 ? (
                    <span className={`text-lg sm:text-xl font-bold ${getScoreColor(displayScore)}`}>
                      {displayScore}
                    </span>
                  ) : (
                    <Brain className={`w-5 h-5 sm:w-6 sm:h-6 ${animationPhase >= 2 ? 'text-white' : 'text-gray-500'}`} />
                  )}
                </div>
                {animationPhase >= 4 && (
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="text-[10px] sm:text-xs text-amber-400 font-bold animate-bounce">IT'S A MATCH!</span>
                  </div>
                )}
              </div>

              {/* Mini Investor Card */}
              <div 
                className={`relative bg-gradient-to-br from-[#1a1a1a] to-[#222222] border-2 border-orange-500/40 rounded-xl p-3 sm:p-4 w-[120px] sm:w-[140px] transition-all duration-500 ${
                  animationPhase >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                }`}
              >
                <div className="absolute top-2 right-2">
                  <span className="text-xs">🔥</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="w-4 h-4 text-orange-400" />
                  <span className="text-[10px] text-orange-400 uppercase">Investor</span>
                </div>
                <p className="text-white text-sm font-semibold truncate">{currentMatch.investor.name}</p>
                <p className="text-gray-400 text-xs truncate">{currentMatch.investor.focus}</p>
                <div className="mt-2 px-2 py-0.5 bg-orange-500/10 border border-orange-500/30 rounded-full text-[10px] text-orange-400 inline-block">
                  VC Firm
                </div>
              </div>
            </div>

            {/* Demo Footer */}
            <div className="relative mt-6 pt-4 border-t border-gray-800 flex items-center justify-center gap-2 text-xs text-gray-500">
              <TrendingUp className="w-3 h-3 text-cyan-400" />
              <span>Matching engine running 24/7</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitScreenHero;
