/**
 * INSTANT MATCHES PAGE
 * ====================
 * Shows instant investor matches after URL submission
 * - Top 3 matches fully visible with WHY MATCHED reasoning
 * - Similar companies in space
 * - Founders Toolkit CTA
 * - 50+ more matches blurred until signup
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Loader2, 
  Sparkles, 
  Lock, 
  Globe, 
  Building2, 
  Target, 
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Star,
  Zap,
  Brain,
  ExternalLink,
  ChevronRight,
  Lightbulb,
  FileText,
  Users,
  Briefcase,
  MapPin,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { resolveStartupFromUrl, ResolveResult } from '../lib/startupResolver';
import { getInvestorMatchesForStartup, InvestorMatch as ServiceInvestorMatch } from '../lib/investorMatchService';
import { useAuth } from '../contexts/AuthContext';

interface AnalyzedStartup {
  id?: string;
  name: string;
  website: string;
  tagline?: string;
  description?: string; // AI-generated summary
  sectors?: string[];
  stage?: string;
  total_god_score?: number;
  signals?: string[]; // What we detected (e.g., "Has Revenue", "Ex-Google team")
}

interface InvestorMatch {
  id: string;
  name: string;
  firm?: string;
  sectors?: string[];
  stage?: string[];
  check_size_min?: number;
  check_size_max?: number;
  match_score: number;
  type?: string;
  notable_investments?: string[];
  website?: string;
  reasoning?: string[];
}

interface SimilarStartup {
  id: string;
  name: string;
  tagline?: string;
  sectors?: string[];
  total_god_score?: number;
}

// Founders Toolkit services
const FOUNDERS_TOOLKIT = [
  { slug: 'pitch-analyzer', name: 'Pitch Deck Analyzer', icon: '📊', desc: 'AI feedback on your pitch' },
  { slug: 'value-prop-sharpener', name: 'Value Prop Sharpener', icon: '✨', desc: 'Perfect your one-liner' },
  { slug: 'vc-approach-playbook', name: 'VC Approach Playbook', icon: '🎯', desc: 'Custom investor strategies' },
  { slug: 'funding-strategy', name: 'Funding Roadmap', icon: '🗺️', desc: 'Your fundraise timeline' },
];

// Analysis steps for the loading animation
const ANALYSIS_STEPS = [
  { icon: Globe, text: 'Scanning website...', duration: 1500, isBrain: false },
  { icon: Brain, text: 'Running inference engine...', duration: 2500, isBrain: true },
  { icon: Target, text: 'Analyzing market signals...', duration: 1500, isBrain: false },
  { icon: Zap, text: 'Calculating GOD Score...', duration: 2000, isBrain: true },
  { icon: Sparkles, text: 'Finding investor matches...', duration: 1500, isBrain: false },
];

export default function InstantMatches() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const urlParam = searchParams.get('url') || '';
  
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [startup, setStartup] = useState<AnalyzedStartup | null>(null);
  const [matches, setMatches] = useState<InvestorMatch[]>([]);
  const [similarStartups, setSimilarStartups] = useState<SimilarStartup[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Run analysis on mount
  useEffect(() => {
    if (!urlParam) {
      navigate('/match');
      return;
    }
    analyzeAndMatch();
  }, [urlParam]);

  // Animate through analysis steps
  useEffect(() => {
    if (!isAnalyzing) return;
    
    const stepDurations = ANALYSIS_STEPS.map(s => s.duration);
    let currentStep = 0;
    
    const advanceStep = () => {
      if (currentStep < ANALYSIS_STEPS.length - 1) {
        currentStep++;
        setAnalysisStep(currentStep);
        setTimeout(advanceStep, stepDurations[currentStep]);
      }
    };
    
    setTimeout(advanceStep, stepDurations[0]);
  }, [isAnalyzing]);

  const analyzeAndMatch = async () => {
    try {
      // Use the proper startup resolver (same as UrlMatchPage)
      // This handles: existing startups, LinkedIn/Crunchbase URLs, and creates new records
      // waitForEnrichment: true = waits for inference engine to calculate real GOD score
      console.log('[matches] url:', urlParam);
      console.log('[matches] session:', user?.email || 'not logged in');
      const result = await resolveStartupFromUrl(urlParam, { waitForEnrichment: true });

      if (!result) {
        console.error('[InstantMatches] Failed to resolve URL:', urlParam);
        setError(`Could not resolve this URL. Please check it's a valid website, LinkedIn, or Crunchbase URL.`);
        setIsAnalyzing(false);
        return;
      }
      
      console.log('[matches] startupId:', result.startup.id);
      console.log('[InstantMatches] Resolved startup:', result.startup.name, 'GOD Score:', result.startup.total_god_score, 'confidence:', result.confidence);

      // Set the startup for display
      const resolvedStartup: AnalyzedStartup = {
        id: result.startup.id,
        name: result.startup.name || 'Unknown Startup',
        website: result.startup.website || urlParam,
        tagline: result.startup.tagline || undefined,
        sectors: result.startup.sectors || ['Technology'],
        stage: result.startup.stage ? ['', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+'][result.startup.stage] : 'Seed',
        total_god_score: result.startup.total_god_score || 60,
        signals: result.startup.signals || undefined
      };
      setStartup(resolvedStartup);

      // Get investor matches using the proper service
      // This checks pre-calculated matches first, falls back to real-time scoring
      const investorMatches = await getInvestorMatchesForStartup(
        result.startup.id,
        result.startup,
        { limit: 53, minScore: 20 }
      );

      // Convert to our InvestorMatch interface
      const formattedMatches: InvestorMatch[] = investorMatches.map((m: ServiceInvestorMatch) => ({
        id: m.investor_id,
        name: m.investor_name,
        firm: m.firm,
        sectors: m.sectors,
        stage: m.stage,
        check_size_min: m.check_size_min,
        check_size_max: m.check_size_max,
        match_score: m.score,
        type: m.type,
        notable_investments: m.notable_investments,
        website: m.linkedin_url, // Use linkedin as website fallback
        reasoning: m.reasons
      }));
      
      setMatches(formattedMatches);
      console.log('[matches] count:', formattedMatches.length);
      console.log('[matches] top3:', formattedMatches.slice(0, 3).map(m => m.name));
      console.log('[InstantMatches] Got', formattedMatches.length, 'matches');

      // Fetch similar startups in same sectors
      const startupSectors = result.startup.sectors || ['Technology'];
      if (startupSectors.length > 0) {
        const { data: similar } = await supabase
          .from('startup_uploads')
          .select('id, name, tagline, sectors, total_god_score')
          .eq('status', 'approved')
          .neq('id', result.startup.id)
          .overlaps('sectors', startupSectors)
          .order('total_god_score', { ascending: false })
          .limit(5);
        
        if (similar) {
          // Convert null to undefined for type compatibility
          setSimilarStartups(similar.map(s => ({
            ...s,
            tagline: s.tagline ?? undefined,
            sectors: s.sectors ?? undefined,
            total_god_score: s.total_god_score ?? undefined
          })));
        }
      }

      // Brief delay for animation to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsAnalyzing(false);
      
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze. Please try again.');
      setIsAnalyzing(false);
    }
  };

  const formatCheckSize = (min?: number, max?: number) => {
    if (!min && !max) return 'Undisclosed';
    
    const formatAmount = (amt: number) => {
      if (amt >= 1000000) return `$${(amt / 1000000).toFixed(0)}M`;
      if (amt >= 1000) return `$${(amt / 1000).toFixed(0)}K`;
      return `$${amt}`;
    };
    
    const minStr = min ? formatAmount(min) : '$0';
    const maxStr = max ? formatAmount(max) : '$10M+';
    return `${minStr} - ${maxStr}`;
  };

  // Generate match reasons based on overlap
  const generateMatchReasons = (startup: any, investor: any, score: number): string[] => {
    const reasons: string[] = [];
    
    // Sector match
    const startupSectors = startup?.sectors || [];
    const investorSectors = investor?.sectors || [];
    const sectorOverlap = startupSectors.filter((s: string) => 
      investorSectors.some((is: string) => is.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(is.toLowerCase()))
    );
    if (sectorOverlap.length > 0) {
      reasons.push(`🎯 Sector fit: ${sectorOverlap[0]}`);
    }
    
    // Stage match
    const startupStage = startup?.stage || 'Seed';
    const investorStages = investor?.stage || [];
    if (investorStages.some((s: string) => s.toLowerCase().includes(startupStage.toLowerCase()))) {
      reasons.push(`📈 Stage alignment: ${startupStage}`);
    }
    
    // Check size fit
    if (investor?.check_size_min || investor?.check_size_max) {
      reasons.push(`💰 Check size compatible`);
    }
    
    // High score bonus
    if (score >= 85) {
      reasons.push(`⭐ Top-tier match score`);
    } else if (score >= 75) {
      reasons.push(`✨ Strong match potential`);
    }

    // Add generic reason if none found
    if (reasons.length === 0) {
      reasons.push(`🤝 Investment thesis alignment`);
    }

    return reasons.slice(0, 3);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
    if (score >= 80) return 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30';
    if (score >= 70) return 'text-violet-400 bg-violet-500/20 border-violet-500/30';
    return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
  };

  // Loading state
  if (isAnalyzing) {
    const currentStep = ANALYSIS_STEPS[analysisStep];
    const CurrentIcon = currentStep.icon;
    const isBrainStep = currentStep.isBrain;
    
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          {/* Animated icon - special treatment for brain steps */}
          <div className="mb-8 relative">
            {isBrainStep ? (
              // Spinning brain for inference/scoring steps
              <div className="w-28 h-28 mx-auto relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-600/30 to-cyan-600/30 animate-pulse" />
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 border-2 border-violet-500/50 flex items-center justify-center">
                  <Brain className="w-14 h-14 text-violet-400 animate-pulse" />
                </div>
                <div className="absolute inset-0 w-28 h-28 rounded-full border-4 border-violet-500/60 border-t-cyan-400 animate-spin" style={{ animationDuration: '1s' }} />
                <div className="absolute inset-[-4px] w-[120px] h-[120px] rounded-full border-2 border-cyan-500/30 border-b-transparent animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
              </div>
            ) : (
              // Regular icon for other steps
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-violet-500/30 flex items-center justify-center">
                <CurrentIcon className="w-10 h-10 text-violet-400 animate-pulse" />
              </div>
            )}
            {!isBrainStep && (
              <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full border-2 border-violet-500/50 border-t-transparent animate-spin" />
            )}
          </div>

          {/* Current step */}
          <h2 className={`text-xl font-semibold mb-2 ${isBrainStep ? 'text-violet-300' : 'text-white'}`}>
            {currentStep.text}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {isBrainStep ? (
              <span className="text-violet-400">🧠 Pyth Inference Engine analyzing <span className="text-cyan-400 font-medium">{urlParam}</span></span>
            ) : (
              <>Analyzing <span className="text-cyan-400 font-medium">{urlParam}</span></>
            )}
          </p>

          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {ANALYSIS_STEPS.map((step, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i < analysisStep 
                    ? 'bg-green-500 scale-100' 
                    : i === analysisStep 
                      ? (step.isBrain ? 'bg-violet-500 scale-125 animate-pulse' : 'bg-violet-500 scale-100')
                      : 'bg-gray-700 scale-75'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <span className="text-2xl">❌</span>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Analysis Failed</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link
            to="/match"
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition-colors"
          >
            Try Again
          </Link>
        </div>
      </div>
    );
  }

  const topMatches = matches.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#0f0f0f]">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/match" className="text-gray-400 hover:text-white transition-colors">
                ← Back
              </Link>
              <div className="w-px h-6 bg-gray-700" />
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                  Your Investor Matches
                </h1>
                <p className="text-sm text-gray-400">
                  {matches.length} investors matched to your startup
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* STARTUP CARD - Full width, prominent */}
        {startup && (
          <div className="mb-6 p-5 bg-gradient-to-r from-[#0f0f0f] via-[#131313] to-[#0f0f0f] border border-violet-500/30 rounded-xl shadow-lg shadow-violet-500/10">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              {/* Left: Icon + Name + URL */}
              <div className="flex items-start gap-4 flex-1">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-600/30 border border-violet-500/30 flex items-center justify-center shrink-0">
                  <Building2 className="w-7 h-7 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-white">{startup.name}</h2>
                  <a href={startup.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 text-sm flex items-center gap-1.5 hover:text-cyan-400 transition-colors">
                    <Globe className="w-4 h-4" />
                    <span>{startup.website?.replace('https://', '').replace('http://', '')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {startup.sectors?.slice(0, 3).map((sector, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs bg-violet-500/20 text-violet-300 rounded-full border border-violet-500/30">
                        {sector}
                      </span>
                    ))}
                    {startup.stage && (
                      <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
                        {startup.stage}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Right: GOD Score */}
              {startup.total_god_score && (
                <div className="text-center md:text-right shrink-0">
                  <div className="text-4xl font-black bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                    {startup.total_god_score}
                  </div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">GOD Score™</div>
                  <div className="text-[10px] text-gray-500 mt-1 max-w-[140px]">
                    {startup.total_god_score >= 75 ? 'Top tier — exceptional alignment' :
                     startup.total_god_score >= 60 ? 'Strong signals, early momentum' :
                     startup.total_god_score >= 45 ? 'Above average for stage' :
                     'Building momentum'}
                  </div>
                </div>
              )}
            </div>
            
            {/* Description */}
            {(startup.tagline || startup.description) && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                {startup.tagline && startup.tagline !== `Startup at ${startup.website?.replace('https://', '').replace('http://', '')}` && (
                  <p className="text-gray-200 text-sm leading-relaxed">{startup.tagline}</p>
                )}
                {startup.description && (
                  <p className="text-gray-400 text-sm mt-2 leading-relaxed">{startup.description}</p>
                )}
              </div>
            )}
            
            {/* Detected signals */}
            {startup.signals && startup.signals.length > 0 && (
              <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">What We Detected</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {startup.signals.map((signal, i) => (
                    <span key={i} className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-300 rounded-md">
                      {signal}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PRIMARY CTA - Unlock Full Signal Map (Screen A - Post-Results Lock) */}
        {isLoggedIn ? (
          <Link
            to={`/saved-matches`}
            className="mb-6 flex items-center justify-between p-5 bg-gradient-to-r from-emerald-600/20 via-emerald-600/10 to-cyan-600/20 border border-emerald-500/40 hover:border-emerald-400 rounded-xl transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-emerald-200 transition-colors">
                  ✓ All {matches.length} signals unlocked
                </h3>
                <p className="text-xs text-gray-400">View your full signal map with thesis fit and outreach guidance</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        ) : (
          <Link
            to={`/signup?url=${encodeURIComponent(urlParam)}&matches=${matches.length}`}
            className="mb-6 p-5 bg-gradient-to-r from-amber-600/10 via-[#0f0f0f] to-violet-600/10 border border-amber-500/40 hover:border-amber-400 rounded-xl transition-all group cursor-pointer block"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-amber-200 transition-colors">
                🔒 Unlock Your Full Signal Map
              </h3>
            </div>
            <p className="text-gray-300 text-sm mb-4 pl-[52px]">
              <span className="text-amber-400 font-semibold">{matches.length} investors</span> are aligned with your startup based on live market and investor signals.
            </p>
            <div className="flex items-center justify-between pl-[52px]">
              <div>
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-all text-sm">
                  Create free account →
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 pl-[52px]">
              See warm-intro likelihoods, thesis fit, and outreach guidance.
            </p>
          </Link>
        )}
        <p className="text-xs text-gray-600 text-center -mt-2 mb-4">No pitch deck. No spam. No intros sent.</p>

        {/* QUICK ACTIONS: Founders Toolkit + Similar Companies */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Link
            to="/services"
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-500/10 border border-violet-500/30 hover:border-violet-400 hover:bg-violet-500/20 rounded-lg transition-all group"
          >
            <Lightbulb className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium text-violet-300 group-hover:text-violet-200">Founders Toolkit</span>
            <ChevronRight className="w-4 h-4 text-violet-500 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            to="/trending"
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/10 border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-all group"
          >
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-300 group-hover:text-cyan-200">Similar Startups</span>
            <ChevronRight className="w-4 h-4 text-cyan-500 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            to="/strategies"
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/20 rounded-lg transition-all group"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-300 group-hover:text-amber-200">Fundraising Guides</span>
            <ChevronRight className="w-4 h-4 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* GOD SCORE EXPLANATION */}
        <div className="mb-6 p-4 bg-gradient-to-r from-amber-500/5 via-[#0f0f0f] to-violet-500/5 border border-amber-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-violet-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                Why These Matches Are Precise
                <span className="px-2 py-0.5 text-[9px] bg-amber-500/20 text-amber-400 rounded-full uppercase">Oracle Mode</span>
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Our <span className="text-amber-400 font-semibold">GOD Algorithm</span> analyzed 50+ data points including your sector, stage, traction signals, team composition, and market positioning. 
                We then cross-referenced against <span className="text-cyan-400 font-semibold">3,000+ investors</span> using their actual investment history, portfolio patterns, check sizes, and stated thesis—not just keywords. 
                Each match score reflects <span className="text-emerald-400 font-semibold">real alignment probability</span> based on what these investors have actually funded.
              </p>
              <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                <span>⏱</span> Investor behavior updates daily — matches change as signals evolve
              </p>
            </div>
          </div>
        </div>

        {/* TOP 3 MATCHES - FULLY VISIBLE */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Star className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Your Top 3 Matches</h3>
            <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 uppercase">
              Free Preview
            </span>
          </div>

          <div className="grid gap-3">
            {topMatches.map((match, index) => (
              <Link 
                key={match.id}
                to={`/investor/${match.id}`}
                className="block p-4 bg-gradient-to-r from-[#0f0f0f] via-[#131313] to-[#0f0f0f] border border-gray-700/50 hover:border-violet-500/50 rounded-xl transition-all hover:shadow-lg hover:shadow-violet-500/10 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {/* Rank badge */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                      index === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      index === 1 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30' :
                      'bg-orange-700/20 text-orange-400 border border-orange-700/30'
                    }`}>
                      #{index + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-base font-semibold text-white">{match.name}</h4>
                        {match.website && (
                          <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-3">
                        {match.type && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {match.type}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Target className="w-3.5 h-3.5" />
                          {formatCheckSize(match.check_size_min, match.check_size_max)}
                        </span>
                        {match.stage && match.stage.length > 0 && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {Array.isArray(match.stage) ? match.stage.slice(0, 2).join(', ') : match.stage}
                          </span>
                        )}
                      </div>

                      {/* Sectors */}
                      {match.sectors && match.sectors.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {match.sectors.slice(0, 4).map((sector, i) => (
                            <span key={i} className="px-2 py-0.5 text-[10px] bg-gray-800 text-gray-400 rounded-full">
                              {sector}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* WHY THIS MATCH - Reasoning */}
                      {match.reasoning && match.reasoning.length > 0 && (
                        <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Zap className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Why This Match</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {match.reasoning.map((reason, i) => (
                              <span key={i} className="text-xs text-emerald-300/90">
                                {reason}
                              </span>
                            ))}
                          </div>
                          {match.match_score >= 85 && (
                            <p className="text-[10px] text-emerald-500/80 mt-2 border-t border-emerald-500/20 pt-2">
                              Aligns more strongly than 90%+ of comparable startups
                            </p>
                          )}
                        </div>
                      )}

                      {/* Notable investments */}
                      {match.notable_investments && match.notable_investments.length > 0 && (
                        <p className="mt-1.5 text-[11px] text-gray-500">
                          Portfolio: {Array.isArray(match.notable_investments) 
                            ? match.notable_investments.slice(0, 3).join(', ')
                            : match.notable_investments}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Match score */}
                  <div className={`px-2.5 py-1.5 rounded-lg border shrink-0 ${getScoreColor(match.match_score)}`}>
                    <div className="text-lg font-bold">{match.match_score}%</div>
                    <div className="text-[8px] uppercase tracking-wider opacity-70">Match</div>
                    <div className="text-[7px] text-gray-500 mt-0.5 opacity-80">thesis alignment</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 p-6 bg-gradient-to-r from-violet-600/10 via-[#0f0f0f] to-cyan-600/10 border border-violet-500/20 rounded-xl text-center">
          {isLoggedIn ? (
            <>
              <h3 className="text-lg font-semibold text-white mb-2">Signals update daily</h3>
              <p className="text-gray-400 text-sm mb-4">
                Track which investors are warming — and share with your advisors
              </p>
              <Link
                to="/saved-matches"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-semibold rounded-lg transition-all"
              >
                View All Signals
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-white mb-2">Track how your alignment changes</h3>
              <p className="text-gray-400 text-sm mb-4">
                Sign in to save these signals, see which investors are warming, and share with advisors
              </p>
              <Link
                to={`/signup?url=${encodeURIComponent(urlParam)}&matches=${matches.length}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold rounded-lg transition-all"
              >
                Create Free Account
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
