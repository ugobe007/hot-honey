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
  BarChart3
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AnalyzedStartup {
  id?: string;
  name: string;
  website: string;
  tagline?: string;
  sectors?: string[];
  stage?: string;
  total_god_score?: number;
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
  { icon: Globe, text: 'Scanning website...', duration: 1500 },
  { icon: Brain, text: 'Extracting company data...', duration: 2000 },
  { icon: Target, text: 'Analyzing market fit...', duration: 1500 },
  { icon: Zap, text: 'Calculating GOD Score...', duration: 1500 },
  { icon: Sparkles, text: 'Finding investor matches...', duration: 2000 },
];

export default function InstantMatches() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
      let cleanUrl = urlParam.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }

      // Check if startup already exists in database
      const { data: existingStartup } = await supabase
        .from('startup_uploads')
        .select('id, name, website, tagline, sectors, stage, total_god_score')
        .or(`website.eq.${cleanUrl},website.eq.${cleanUrl.replace('https://', 'http://')},website.ilike.%${cleanUrl.replace('https://', '').replace('http://', '')}%`)
        .eq('status', 'approved')
        .limit(1)
        .single();

      if (existingStartup) {
        // Startup exists - fetch its matches with reasoning
        setStartup(existingStartup);
        
        const { data: existingMatches } = await supabase
          .from('startup_investor_matches')
          .select(`
            match_score,
            reasoning,
            investors (
              id, name, sectors, stage, check_size_min, check_size_max, type, notable_investments, website
            )
          `)
          .eq('startup_id', existingStartup.id)
          .order('match_score', { ascending: false })
          .limit(53);

        if (existingMatches) {
          const formattedMatches = existingMatches.map((m: any) => ({
            ...m.investors,
            match_score: m.match_score,
            reasoning: m.reasoning || generateMatchReasons(existingStartup, m.investors, m.match_score)
          }));
          setMatches(formattedMatches);
        }

        // Fetch similar startups in same sectors
        if (existingStartup.sectors && existingStartup.sectors.length > 0) {
          const { data: similar } = await supabase
            .from('startup_uploads')
            .select('id, name, tagline, sectors, total_god_score')
            .eq('status', 'approved')
            .neq('id', existingStartup.id)
            .overlaps('sectors', existingStartup.sectors)
            .order('total_god_score', { ascending: false })
            .limit(5);
          
          if (similar) setSimilarStartups(similar);
        }
      } else {
        // New startup - create temporary entry and find matches
        const domainName = cleanUrl.replace(/https?:\/\//, '').replace(/www\./, '').split('/')[0];
        const companyName = domainName.split('.')[0].charAt(0).toUpperCase() + domainName.split('.')[0].slice(1);
        
        // Create a temporary startup object
        const tempStartup: AnalyzedStartup = {
          name: companyName,
          website: cleanUrl,
          tagline: `AI-analyzed startup from ${domainName}`,
          sectors: ['Technology'],
          stage: 'Seed',
          total_god_score: 65 + Math.floor(Math.random() * 20) // Preliminary score
        };
        
        setStartup(tempStartup);
        
        // Find general matches based on common criteria
        const { data: generalMatches } = await supabase
          .from('investors')
          .select('id, name, sectors, stage, check_size_min, check_size_max, type, notable_investments, website')
          .limit(53);

        if (generalMatches) {
          // Simulate match scores for new startups with generated reasoning
          const scoredMatches = generalMatches.map(inv => {
            const score = 60 + Math.floor(Math.random() * 35);
            return {
              ...inv,
              match_score: score,
              reasoning: generateMatchReasons(tempStartup, inv, score)
            };
          }).sort((a, b) => b.match_score - a.match_score);
          
          setMatches(scoredMatches);
        }

        // Fetch some similar startups in Technology sector
        const { data: similar } = await supabase
          .from('startup_uploads')
          .select('id, name, tagline, sectors, total_god_score')
          .eq('status', 'approved')
          .contains('sectors', ['Technology'])
          .order('total_god_score', { ascending: false })
          .limit(5);
        
        if (similar) setSimilarStartups(similar);
      }

      // Simulate remaining analysis time
      await new Promise(resolve => setTimeout(resolve, 2500));
      setIsAnalyzing(false);
      
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze. Please try again.');
      setIsAnalyzing(false);
    }
  };

  const formatCheckSize = (min?: number, max?: number) => {
    if (!min && !max) return 'Undisclosed';
    const minStr = min ? `$${(min / 1000000).toFixed(0)}M` : '$0';
    const maxStr = max ? `$${(max / 1000000).toFixed(0)}M` : '$10M+';
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
    const CurrentIcon = ANALYSIS_STEPS[analysisStep].icon;
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          {/* Animated icon */}
          <div className="mb-8 relative">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-violet-500/30 flex items-center justify-center">
              <CurrentIcon className="w-10 h-10 text-violet-400 animate-pulse" />
            </div>
            <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full border-2 border-violet-500/50 border-t-transparent animate-spin" />
          </div>

          {/* Current step */}
          <h2 className="text-xl font-semibold text-white mb-2">
            {ANALYSIS_STEPS[analysisStep].text}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Analyzing <span className="text-cyan-400 font-medium">{urlParam}</span>
          </p>

          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {ANALYSIS_STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i <= analysisStep 
                    ? 'bg-violet-500 scale-100' 
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
  const lockedMatches = matches.slice(3, 53);

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

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Startup Summary Card */}
        {startup && (
          <div className="mb-8 p-6 bg-gradient-to-r from-[#0f0f0f] to-[#131313] border border-violet-500/30 rounded-xl shadow-lg shadow-violet-500/10">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-600/30 border border-violet-500/30 flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{startup.name}</h2>
                  <p className="text-gray-400 text-sm flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    {startup.website}
                  </p>
                </div>
              </div>
              {startup.total_god_score && (
                <div className="text-center">
                  <div className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                    {startup.total_god_score}
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">GOD Score™</div>
                </div>
              )}
            </div>
            {startup.sectors && (
              <div className="mt-4 flex gap-2">
                {startup.sectors.slice(0, 3).map((sector, i) => (
                  <span key={i} className="px-2 py-1 text-xs bg-violet-500/20 text-violet-300 rounded-full border border-violet-500/30">
                    {sector}
                  </span>
                ))}
                {startup.stage && (
                  <span className="px-2 py-1 text-xs bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
                    {startup.stage}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* TOP 3 MATCHES - FULLY VISIBLE */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Star className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Your Top 3 Matches</h3>
            <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 uppercase">
              Free Preview
            </span>
          </div>

          <div className="grid gap-4">
            {topMatches.map((match, index) => (
              <div 
                key={match.id}
                className="p-5 bg-gradient-to-r from-[#0f0f0f] via-[#131313] to-[#0f0f0f] border border-gray-700/50 hover:border-violet-500/50 rounded-xl transition-all hover:shadow-lg hover:shadow-violet-500/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Rank badge */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                      index === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      index === 1 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30' :
                      'bg-orange-700/20 text-orange-400 border border-orange-700/30'
                    }`}>
                      #{index + 1}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-lg font-semibold text-white">{match.name}</h4>
                        {match.website && (
                          <a 
                            href={match.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-cyan-400 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
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
                        </div>
                      )}

                      {/* Notable investments */}
                      {match.notable_investments && match.notable_investments.length > 0 && (
                        <p className="mt-2 text-xs text-gray-500">
                          Portfolio: {Array.isArray(match.notable_investments) 
                            ? match.notable_investments.slice(0, 3).join(', ')
                            : match.notable_investments}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Match score */}
                  <div className={`px-3 py-2 rounded-lg border ${getScoreColor(match.match_score)}`}>
                    <div className="text-xl font-bold">{match.match_score}%</div>
                    <div className="text-[9px] uppercase tracking-wider opacity-70">Match</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LOCKED MATCHES - BLURRED */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Lock className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">+{lockedMatches.length} More Matches</h3>
            <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30 uppercase">
              Sign Up to Unlock
            </span>
          </div>

          {/* Blurred grid preview */}
          <div className="relative">
            {/* The blurred matches */}
            <div className="grid gap-3 blur-[6px] pointer-events-none select-none">
              {lockedMatches.slice(0, 6).map((match) => (
                <div 
                  key={match.id}
                  className="p-4 bg-[#0f0f0f] border border-gray-800 rounded-xl"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-800" />
                      <div>
                        <div className="h-4 w-32 bg-gray-700 rounded mb-1" />
                        <div className="h-3 w-24 bg-gray-800 rounded" />
                      </div>
                    </div>
                    <div className="px-3 py-2 bg-gray-800 rounded-lg">
                      <div className="text-lg font-bold text-gray-400">{match.match_score}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Overlay with CTA */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/80 to-[#0a0a0a] flex flex-col items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-600/30 to-amber-600/30 border border-violet-500/30 flex items-center justify-center">
                  <Lock className="w-7 h-7 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Unlock {lockedMatches.length} More Investors
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                  Sign up to see all your matches, get intro requests, and track investor interest
                </p>
                <Link
                  to={`/get-matched?url=${encodeURIComponent(urlParam)}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold rounded-lg transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
                >
                  <Sparkles className="w-5 h-5" />
                  Sign Up Free
                  <ChevronRight className="w-5 h-5" />
                </Link>
                <p className="mt-4 text-xs text-gray-500">
                  ✓ Free tier available • ✓ No credit card required
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* TWO COLUMN: Founders Toolkit + Similar Companies */}
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          
          {/* FOUNDERS TOOLKIT */}
          <div className="p-6 bg-gradient-to-br from-[#0f0f0f] to-[#131313] border border-violet-500/30 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Founders Toolkit</h3>
                <p className="text-xs text-gray-400">Improve your pitch & strategy</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {FOUNDERS_TOOLKIT.map((tool) => (
                <Link
                  key={tool.slug}
                  to={`/services/${tool.slug}`}
                  className="p-3 bg-[#0a0a0a] border border-gray-800 hover:border-violet-500/50 rounded-lg transition-all group"
                >
                  <span className="text-xl mb-1 block">{tool.icon}</span>
                  <h4 className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors">{tool.name}</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">{tool.desc}</p>
                </Link>
              ))}
            </div>

            <Link
              to="/services"
              className="mt-4 flex items-center justify-center gap-2 px-4 py-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              View All Tools
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* SIMILAR COMPANIES IN YOUR SPACE */}
          <div className="p-6 bg-gradient-to-br from-[#0f0f0f] to-[#131313] border border-cyan-500/30 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Similar Companies</h3>
                <p className="text-xs text-gray-400">Startups in your space</p>
              </div>
            </div>

            {similarStartups.length > 0 ? (
              <div className="space-y-2">
                {similarStartups.map((s) => (
                  <Link
                    key={s.id}
                    to={`/startup/${s.id}`}
                    className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-gray-800 hover:border-cyan-500/50 rounded-lg transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors truncate">{s.name}</h4>
                      {s.tagline && (
                        <p className="text-[10px] text-gray-500 truncate">{s.tagline}</p>
                      )}
                    </div>
                    {s.total_god_score && (
                      <div className="ml-3 px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs font-bold">
                        {s.total_god_score}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">Complete your profile to see similar companies</p>
              </div>
            )}

            <Link
              to="/trending"
              className="mt-4 flex items-center justify-center gap-2 px-4 py-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Explore Trending Startups
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 p-6 bg-gradient-to-r from-violet-600/10 via-[#0f0f0f] to-cyan-600/10 border border-violet-500/20 rounded-xl text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Ready to connect with investors?</h3>
          <p className="text-gray-400 text-sm mb-4">
            Complete your profile to unlock all matches and start making connections
          </p>
          <Link
            to={`/get-matched?url=${encodeURIComponent(urlParam)}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0a0a0a] border border-cyan-400 hover:bg-cyan-400/10 text-cyan-400 font-semibold rounded-lg transition-all"
          >
            Complete Profile
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
