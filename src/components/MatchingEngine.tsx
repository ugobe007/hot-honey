import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ThumbsUp, Info, Share2, Sparkles, Search, TrendingUp, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
// REMOVED: Tier classification - now handled by queue-processor-v16.js during match generation

import { DotLottie } from '@lottiefiles/dotlottie-web';
import HowItWorksModal from './HowItWorksModal';
import HowItWorksModalDetailed from './HowItWorksModal 2';
import HotMatchPopup from './HotMatchPopup';
import InvestorCard from './InvestorCard';
import EnhancedInvestorCard from './EnhancedInvestorCard';
import StartupVotePopup from './StartupVotePopup';
import VCInfoPopup from './VCInfoPopup';
import MatchScoreBreakdown from './MatchScoreBreakdown';
import ShareMatchModal from './ShareMatchModal';
import ValuePropPanels from './ValuePropPanels';
import LogoDropdownMenu from './LogoDropdownMenu';
import TransparencyPanel from './TransparencyPanel';
import DataQualityBadge from './DataQualityBadge';
import MatchConfidenceBadge from './MatchConfidenceBadge';
import SmartSearchBar from './SmartSearchBar';
import { saveMatch, unsaveMatch, isMatchSaved } from '../lib/savedMatches';
import { StartupComponent, InvestorComponent } from '../types';

// SIMPLIFIED MATCHING: Uses pre-calculated GOD scores from database
// This aligns with Architecture Document Option A (Recommended)

interface MatchPair {
  startup: StartupComponent & {
    tags: string[];
    seeking?: string; // fivePoints[4] - Investment
    market?: string; // fivePoints[1] - Market
    product?: string; // fivePoints[2] - Product
  };
  investor: {
    id: string;
    name: string; // name @ firm
    description: string; // bio
    tagline?: string; // tagline or investment thesis
    type?: string; // 'VC', 'Angel', 'Family Office', 'PE'
    stage?: string[]; // investment stages
    sectors?: string[]; // investment sectors
    tags: string[];
    checkSize?: string;
    geography?: string; // location/geography
    notableInvestments?: string[]; // notable_investments company names (array)
    portfolioSize?: number; // portfolio_count
    status?: string;
    investmentThesis?: string; // investment_thesis
    portfolio?: string; // portfolio company info
    aum?: number; // Assets Under Management
    fundSize?: number; // Current fund size
    exits?: number; // Number of successful exits
    unicorns?: number; // Number of unicorn investments
    website?: string;
    linkedin?: string;
    twitter?: string;
    partners?: string[]; // Partner names - TO BE SCRAPED
  };
  matchScore: number;
  reasoning?: string[];
  breakdown?: {
    industryMatch: number;
    stageMatch: number;
    geographyMatch: number;
    checkSizeMatch: number;
    thesisAlignment: number;
  };
}

// Helper function to format check size from min/max
function formatCheckSize(min?: number, max?: number): string {
  if (!min && !max) return 'Undisclosed';
  const minStr = min ? `$${(min / 1000000).toFixed(1)}M` : '$0';
  const maxStr = max ? `$${(max / 1000000).toFixed(1)}M` : '$10M+';
  return `${minStr} - ${maxStr}`;
}

export default function MatchingEngine() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchPair[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [currentBatch, setCurrentBatch] = useState(0); // batch index
  const [batchSize] = useState(25); // batch size (fixed at 25)
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [showLightning, setShowLightning] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [matchPulse, setMatchPulse] = useState(false);
  const [brainSpin, setBrainSpin] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [godAlgoStep, setGodAlgoStep] = useState(0);
  const [showVotePopup, setShowVotePopup] = useState(false);
  const [votingStartup, setVotingStartup] = useState<any>(null);
  const [showVCPopup, setShowVCPopup] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState<any>(null);
  const [cardFadeOut, setCardFadeOut] = useState(false);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showHotMatchInfo, setShowHotMatchInfo] = useState(false);
  const [showHotMatchPopup, setShowHotMatchPopup] = useState(false);
  const lottieCanvasRef = useRef<HTMLCanvasElement>(null);
  const dotLottieRef = useRef<any>(null);

  // Calculate total number of batches
  const totalBatches = Math.ceil(matches.length / batchSize);
  // Get matches for current batch
  const batchMatches = matches.slice(currentBatch * batchSize, (currentBatch + 1) * batchSize);
  // Track which match in the batch is currently shown (for card animation, optional)
  const [currentIndex, setCurrentIndex] = useState(0);

  // Check if current match is saved whenever match changes (within batch)
  useEffect(() => {
    if (batchMatches.length > 0 && batchMatches[currentIndex]) {
      const match = batchMatches[currentIndex];
      setIsSaved(isMatchSaved(match.startup.id, match.investor.id));
    }
  }, [currentIndex, batchMatches]);

  const handleToggleSave = () => {
    if (matches.length === 0) return;
    const match = matches[currentIndex];
    
    if (isSaved) {
      unsaveMatch(match.startup.id, match.investor.id);
      setIsSaved(false);
    } else {
      saveMatch({
        startupId: match.startup.id,
        investorId: match.investor.id,
        startupName: match.startup.name,
        investorName: match.investor.name,
        matchScore: match.matchScore,
        tags: match.startup.tags,
      });
      setIsSaved(true);
    }
  };

  // GOD Algorithm steps animation
  const godAlgorithmSteps = [
    "🧠 Analyzing team strength...",
    "📈 Evaluating traction signals...",
    "🎯 Assessing market fit...",
    "💡 Scoring product innovation...",
    "🚀 Calculating vision potential...",
    "🌐 Measuring ecosystem advantages...",
    "💪 Gauging grit & perseverance...",
    "✅ GOD Score: Complete"
  ];

  // Rotating secrets/news for startup cards
  const startupSecrets = [
    "Recently featured in TechCrunch",
    "Just closed seed round oversubscribed by 2x",
    "Growing 40% MoM for last 6 months",
    "Former executives from Fortune 500 companies",
    "Strategic partnership with industry leader announced",
    "Product waitlist hit 10,000 users in first month",
    "Patent pending on core technology",
    "Backed by Y Combinator alumni"
  ];
  
  const currentSecret = startupSecrets[currentIndex % startupSecrets.length];

  // DIRECT SUPABASE CONNECTION TEST
  useEffect(() => {
    async function testFetch() {
      console.log('\n' + '='.repeat(80));
      console.log('🔍 DIRECT SUPABASE CONNECTION TEST');
      console.log('='.repeat(80));
      
      const { data, error } = await supabase
        .from('startup_uploads')
        .select('id, name, status')
        .eq('status', 'approved')
        .limit(5);
      
      console.log('📊 DIRECT SUPABASE TEST RESULT:', { 
        data, 
        error,
        dataLength: data?.length,
        firstStartup: data?.[0]
      });
      
      if (error) {
        console.error('❌ SUPABASE ERROR:', error);
        console.error('   Message:', error.message);
        console.error('   Code:', error.code);
        console.error('   Details:', error.details);
        console.error('   Hint:', error.hint);
      } else if (data && data.length > 0) {
        console.log('✅ SUCCESS: Found', data.length, 'approved startups');
        console.log('📦 Sample IDs:', data.map(s => s.id));
      } else {
        console.warn('⚠️ Query succeeded but returned 0 results');
      }
      console.log('='.repeat(80) + '\n');
    }
    testFetch();
  }, []);

  // Load matches from database
  useEffect(() => {
    loadMatches();
    
    // Refresh matches every 5 minutes to get new ones
    const refreshInterval = setInterval(() => {
      console.log('🔄 Refreshing matches...');
      loadMatches();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(refreshInterval);
  }, []);
  
  // DEBUG 4: Watch matches state changes
  useEffect(() => {
    if (matches.length > 0) {
      console.log('\n🔄 MATCHES STATE UPDATED:');
      console.log('   Total matches:', matches.length);
      console.log('   First 3 matches:', matches.slice(0, 3).map(m => ({
        startup: m.startup.name,
        score: m.matchScore
      })));
      console.log('   Current index:', currentIndex);
      console.log('   Current match being displayed:', matches[currentIndex]?.startup?.name, matches[currentIndex]?.matchScore);
    }
  }, [matches]);

  // Initialize Lottie animation
  useEffect(() => {
    if (lottieCanvasRef.current && !dotLottieRef.current) {
      console.log('🎬 Initializing Lottie animation...');
      dotLottieRef.current = new DotLottie({
        autoplay: false,
        loop: false,
        canvas: lottieCanvasRef.current,
        src: "https://lottie.host/4db68bbd-31f6-4cd8-84eb-189de081159a/IGmMCqhzpt.lottie",
      });
      console.log('✅ Lottie initialized:', dotLottieRef.current);
    }
  }, []);

  // Trigger Lottie animation when showLightning changes
  useEffect(() => {
    if (showLightning && dotLottieRef.current) {
      console.log('⚡ PLAYING LOTTIE ANIMATION');
      dotLottieRef.current.play();
    } else if (showLightning && lottieCanvasRef.current) {
      // Ref not initialized yet, but canvas exists - wait a bit and try again
      const timeout = setTimeout(() => {
        if (dotLottieRef.current) {
          dotLottieRef.current.play();
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [showLightning]);

  // Auto-advance to next batch every 5 minutes (300,000 ms)
  useEffect(() => {
    if (matches.length === 0) return;
    const batchAdvanceInterval = setInterval(() => {
      setCurrentBatch((prev) => {
        const nextBatch = (prev + 1) % totalBatches;
        setCurrentIndex(0); // Reset to first match in new batch
        return nextBatch;
      });
    }, 300000); // 5 minutes
    return () => clearInterval(batchAdvanceInterval);
  }, [matches.length, totalBatches]);

  // GOD Algorithm rolling animation (changes every 1.5 seconds)
  useEffect(() => {
    const godInterval = setInterval(() => {
      setGodAlgoStep((prev) => (prev + 1) % godAlgorithmSteps.length);
    }, 1500);
    
    return () => clearInterval(godInterval);
  });

  // Auto-cycle to next match every 3 seconds
  useEffect(() => {
    if (batchMatches.length === 0) return;
    const cycleInterval = setInterval(() => {
      handleNextMatch();
    }, 3000);
    return () => clearInterval(cycleInterval);
  }, [batchMatches.length]);

  // REMOVED: saveMatchesToDatabase - Queue processor handles match creation
  // Frontend should only READ matches, not write them

  const loadMatches = async () => {
    try {
      setLoadError(null);
      setDebugInfo(null);
      setMatches([]);
      setCurrentIndex(0);
      
      // Query PRE-CALCULATED matches from database
      // These were created by queue-processor-v16.js using the official algorithm
      // Step 1: Get match IDs only (fast)
      const { data: matchIds, error: matchError } = await supabase
        .from('startup_investor_matches')
        .select('id, match_score, confidence_level, startup_id, investor_id')
        .eq('status', 'suggested')
        .gte('match_score', 35)
        .order('match_score', { ascending: false })
        .limit(100);
      
      if (matchError || !matchIds?.length) {
        console.error('❌ Error fetching match IDs:', matchError);
        setLoadError('Failed to load matches');
        setIsAnalyzing(false);
        return;
      }
      
      // Step 2: Fetch startup and investor details separately
      const startupIds = [...new Set(matchIds.map(m => m.startup_id).filter((id): id is string => Boolean(id)))];
      const investorIds = [...new Set(matchIds.map(m => m.investor_id).filter((id): id is string => Boolean(id)))];
      
      if (startupIds.length === 0 || investorIds.length === 0) {
        console.error('❌ No valid startup or investor IDs');
        setLoadError('No matches available. Please ensure the queue processor is running.');
        setIsAnalyzing(false);
        return;
      }
      
      const [startupsRes, investorsRes] = await Promise.all([
        supabase.from('startup_uploads').select('id, name, tagline, description, sectors, stage, total_god_score, raise_amount, extracted_data, location, website, has_revenue, has_customers, is_launched, team_size, growth_rate_monthly, deployment_frequency, mrr, arr').in('id', startupIds),
        supabase.from('investors').select('id, name, firm, bio, type, sectors, stage, check_size_min, check_size_max, geography_focus, notable_investments, investment_thesis, investment_firm_description, firm_description_normalized, photo_url, linkedin_url, total_investments, active_fund_size').in('id', investorIds)
      ]);
      
      if (startupsRes.error) {
        console.error('❌ Error fetching startups:', startupsRes.error);
        setLoadError('Failed to load startup data: ' + startupsRes.error.message);
        setIsAnalyzing(false);
        return;
      }
      
      if (investorsRes.error) {
        console.error('❌ Error fetching investors:', investorsRes.error);
        setLoadError('Failed to load investor data: ' + investorsRes.error.message);
        setIsAnalyzing(false);
        return;
      }
      
      const startupMap = new Map((startupsRes.data || []).map((s: any) => [s.id, s]));
      const investorMap = new Map(((investorsRes.data || []) as any[]).map((i: any) => [i.id, i]));
      
      // Combine into matchData format
      let matchData = matchIds
        .filter(m => m.startup_id && m.investor_id)
        .map(m => ({
          ...m,
          startup_uploads: startupMap.get(m.startup_id!) || null,
          investors: investorMap.get(m.investor_id!) || null
        }))
        .filter(m => m.startup_uploads && m.investors);
      
      // Shuffle matches to show variety (if we have enough)
      if (matchData.length > 10) {
        // Fisher-Yates shuffle for better variety
        for (let i = matchData.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [matchData[i], matchData[j]] = [matchData[j], matchData[i]];
        }
      }

      if (!matchData || matchData.length === 0) {
        console.warn('⚠️ No matches found in startup_investor_matches table');
        setLoadError('No matches available. Please ensure the queue processor is running.');
        setIsAnalyzing(false);
        return;
      }

      console.log('✅ Loaded', matchData.length, 'pre-calculated matches');

      // Transform database results to display format
      // Preserves the existing MatchPair interface used by the UI
      const displayMatches: MatchPair[] = matchData.map((m: any) => {
        const startup = m.startup_uploads;
        const investor = m.investors;
        
        return {
          startup: {
            ...startup,
            id: startup.id,
            name: startup.name,
            description: startup.description || startup.tagline || startup.pitch || '',
            tagline: startup.tagline || '',
            tags: startup.sectors || [],
            sectors: startup.sectors || [],
            stage: startup.stage,
            total_god_score: startup.total_god_score,
            seeking: startup.raise_amount,
            market: (startup.extracted_data as any)?.market,
            product: (startup.extracted_data as any)?.product,
            extracted_data: startup.extracted_data,
            fivePoints: (startup.extracted_data as any)?.fivePoints || [],
          } as StartupComponent & {
            tags: string[];
            seeking?: string;
            market?: string;
            product?: string;
          },
          investor: {
            id: investor.id,
            name: investor.name,
            firm: investor.firm || '',
            description: investor.bio || '',
            tagline: '',
            type: (investor as any).type,
            stage: investor.stage || [],
            sectors: investor.sectors || [],
            tags: investor.sectors || [],
            checkSize: formatCheckSize(investor.check_size_min, investor.check_size_max),
            geography: Array.isArray(investor.geography_focus) ? investor.geography_focus.join(', ') : investor.geography_focus || undefined,
            notableInvestments: Array.isArray(investor.notable_investments) ? investor.notable_investments : (investor.notable_investments ? [investor.notable_investments] : []),
            investmentThesis: investor.investment_thesis,
            bio: investor.bio,
            blog_url: investor.blog_url,
            check_size_min: investor.check_size_min,
            check_size_max: investor.check_size_max,
            notable_investments: investor.notable_investments,
          },
          matchScore: m.match_score || 0,  // FROM DATABASE - calculated by queue-processor-v16
          reasoning: [],
        };
      });

      // Smart shuffle: ensure startup variety (no same startup back-to-back)
      // Group by startup, then interleave to ensure variety
      const byStartup = new Map<string, typeof displayMatches>();
      displayMatches.forEach(m => {
        const key = m.startup.id.toString();
        if (!byStartup.has(key)) byStartup.set(key, []);
        byStartup.get(key)!.push(m);
      });
      
      // Interleave: take one match from each startup in rotation
      const interleavedMatches: typeof displayMatches = [];
      const startupQueues = Array.from(byStartup.values());
      let maxLen = Math.max(...startupQueues.map(q => q.length));
      for (let i = 0; i < maxLen; i++) {
        for (const queue of startupQueues) {
          if (queue[i]) interleavedMatches.push(queue[i]);
        }
      }
      
      // Final shuffle within groups of different startups
      const shuffledMatches = interleavedMatches;
      
      setDebugInfo({
        source: 'startup_investor_matches table (pre-calculated)',
        matchCount: shuffledMatches.length,
        scoreRange: {
          min: Math.min(...shuffledMatches.map(m => m.matchScore)),
          max: Math.max(...shuffledMatches.map(m => m.matchScore)),
        }
      });
      
      console.log('📈 Score range:', 
        Math.min(...shuffledMatches.map(m => m.matchScore)), '-',
        Math.max(...shuffledMatches.map(m => m.matchScore))
      );
      
      setMatches(shuffledMatches);
      setCurrentBatch(0);
      setCurrentIndex(0);
      setIsAnalyzing(false);
      
    } catch (error) {
      console.error('❌ Error in loadMatches:', error);
      setLoadError('Error loading matches: ' + (error instanceof Error ? error.message : String(error)));
      setIsAnalyzing(false);
    }
  };

  // Next match within batch
  const handleNextMatch = () => {
    if (batchMatches.length === 0) return;
    setCardFadeOut(true);
    setTimeout(() => {
      setShowLightning(true);
      setIsAnalyzing(true);
      setBrainSpin(true);
      setTimeout(() => setBrainSpin(false), 800);
      setCurrentIndex((prev) => {
        const nextIndex = (prev + 1) % batchMatches.length;
        return nextIndex;
      });
      setTimeout(() => setCardFadeOut(false), 100);
      setTimeout(() => setShowLightning(false), 600);
      setTimeout(() => setIsAnalyzing(false), 1200);
    }, 400);
  };

  const match = batchMatches[currentIndex];

  // DEBUG: Log current batch and match
  useEffect(() => {
    if (match) {
      console.log(`\n📍 RENDERING - currentBatch: ${currentBatch + 1}/${totalBatches}, currentMatch:`, match.startup?.name, match.matchScore);
      console.log(`   currentIndex (in batch): ${currentIndex}`);
      console.log(`   batchMatches.length: ${batchMatches.length}`);
      console.log(`   matches.length: ${matches.length}`);
    }
  }, [currentBatch, currentIndex, match, batchMatches.length, matches.length, totalBatches]);

  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#1a1a1a] flex flex-col items-center justify-center">
        {/* Animated background glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        {/* Loading content */}
        <div className="relative z-10 text-center">
          {/* Animated logo/spinner */}
          <div className="mb-8">
            <div className="relative inline-block">
              <div className="w-24 h-24 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
              <span className="absolute inset-0 flex items-center justify-center text-4xl">🔥</span>
            </div>
          </div>
          
          {/* Loading text */}
          <h2 className="text-3xl font-bold text-white mb-3">
            {matches.length === 0 ? 'Finding Your Perfect Matches' : 'Loading Next Batch'}
          </h2>
          <p className="text-white/60 text-lg mb-6">
            {matches.length === 0 ? 'AI is analyzing startups & investors...' : 'Preparing more matches for you...'}
          </p>
          
          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce delay-100"></div>
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce delay-200"></div>
          </div>
          
          {/* Error display - only shown if there's an actual error */}
          {loadError && (
            <div className="mt-8 bg-red-500/10 border border-red-500/30 rounded-xl px-6 py-4 max-w-md">
              <p className="text-red-400 text-sm">{loadError}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#141414] to-[#1a1a1a] relative overflow-hidden">
      {/* FloatingSearch removed - only used on secondary pages */}
      
      {/* Data Quality Banner - Shows when data is stale */}
      {/* <DataQualityBadge variant="banner" /> */}
      
      {/* Animated background - subtle orange/amber glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-orange-600/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Get Matched Button - Top Right - Hidden on small mobile, visible sm+ */}
      <div className="hidden sm:block fixed top-20 right-4 sm:right-8 z-50">
        <button
          onClick={() => setShowHotMatchPopup(true)}
          className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-[#1a1a1a] hover:bg-[#222222] text-orange-400 hover:text-orange-300 font-bold rounded-xl transition-all border-2 border-orange-500/60 hover:border-orange-400 shadow-lg shadow-black/30 text-sm sm:text-base"
        >
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden md:inline">Get Matched</span>
          <span className="md:hidden">Match</span>
        </button>
      </div>

      {/* Main Headline - AT TOP */}
      <div className="relative z-10 container mx-auto px-4 sm:px-8 pt-2 pb-4">
        <div className="text-center">
          <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold mb-2 sm:mb-3">
            <span className="text-white text-2xl sm:text-4xl md:text-5xl">Find Your </span>
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              Perfect Match
            </span>
          </h2>
          <h3 className="text-2xl sm:text-4xl md:text-6xl font-bold text-white mb-2 sm:mb-4">
            In 60 Seconds
          </h3>

          <p className="text-base sm:text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto mb-4 sm:mb-6">
            AI finds your perfect startup-investor matches with explanations and next steps.
          </p>
          
          {/* Smart Search Bar - Search or submit URL */}
          <SmartSearchBar className="mb-3" />
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-8 py-2">

        {/* Match Display with Lightning Animation */}
        <div className="max-w-7xl mx-auto mb-16">
          {/* Match Badge & Explore Button */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-full px-8 py-3 shadow-xl flex items-center gap-3">
              <span className="text-xl font-bold text-gray-900 flex items-center gap-2">
                ⚡ {match.matchScore}% Match ✨
              </span>
              <MatchConfidenceBadge 
                matchScore={match.matchScore} 
                godScore={match.startup.total_god_score ?? undefined}
                hasInference={!!(match.startup.sectors?.length && match.startup.sectors.length > 0)}
                hasSectorMatch={match.startup.tags?.some((t: string) => match.investor.sectors?.includes(t))}
                variant="tooltip"
              />
            </div>
            <Link
              to="/trending"
              className="group relative flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-sm border border-cyan-400/50 hover:border-cyan-400 text-white font-semibold text-sm rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all hover:scale-105"
            >
              {/* Glowing effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-400/20 to-cyan-500/0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur-sm"></div>
              <Search className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 relative z-10" />
              <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent relative z-10">
                Explore Startups & Investors
              </span>
              <TrendingUp className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 group-hover:translate-x-1 transition-transform relative z-10" />
            </Link>
          </div>
          <div className="relative">
            {/* Cards Grid - CENTERED - Stacks vertically on mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto,1fr] gap-6 lg:gap-12 items-center justify-items-center max-w-7xl mx-auto px-2 sm:px-4">
              {/* Startup Card - DARK CHARCOAL with Kelly Green Stroke */}
              <div className={`relative w-full max-w-[340px] sm:max-w-[400px] transition-all duration-400 ${cardFadeOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                {/* Kelly green glow effect - reduced on mobile */}
                <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-500 rounded-[2rem] sm:rounded-[2.5rem] blur-xl sm:blur-2xl opacity-60 hover:opacity-80 transition-opacity"></div>
                
                <div 
                  className="relative group cursor-pointer bg-gradient-to-br from-[#1a1a1a] via-[#222222] to-[#2a2a2a] backdrop-blur-md border-2 sm:border-4 border-emerald-500/60 hover:border-emerald-400/80 rounded-2xl sm:rounded-3xl p-2 shadow-2xl shadow-emerald-600/40 transition-all duration-300 h-[360px] sm:h-[420px] flex flex-col hover:scale-[1.02] sm:hover:scale-[1.03]"
                >
                {/* Fire Icon in Upper Right - Click to reveal secret */}
                <div className="absolute top-4 right-4 z-20">
                  <div 
                    className="relative cursor-pointer"
                    onMouseEnter={() => setShowSecret(true)}
                    onMouseLeave={() => setShowSecret(false)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSecret(!showSecret);
                    }}
                  >
                    <span className="text-2xl hover:scale-125 transition-transform inline-block animate-pulse">🔥</span>
                    {showSecret && (
                      <div className="absolute top-full right-0 mt-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-bold w-64 z-50 animate-fadeIn">
                        <div className="absolute -top-2 right-4 w-4 h-4 bg-orange-700 rotate-45"></div>
                        💡 {currentSecret}
                      </div>
                    )}
                  </div>
                </div>

                {/* ENHANCED STARTUP CARD - MODERN GLASSMORPHISM */}
                <div 
                  onClick={() => {
                    const id = match.startup.id;
                    const isValidUUID = typeof id === 'string' && id.length > 8 && id.includes('-');
                    if (isValidUUID) {
                      navigate(`/startup/${id}`);
                    } else {
                      alert('Startup details unavailable - database connection issue');
                    }
                  }}
                  className="h-full flex flex-col p-3"
                >
                  {/* Header: Logo + Name */}
                  <div className="flex items-center gap-4 mb-4">
                    <img 
                      src="/images/hot_badge.png" 
                      alt="Hot Startup" 
                      className="w-20 h-20 object-contain"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-white mb-0.5 line-clamp-1">{match.startup.name}</h3>
                      <p className="text-orange-300/90 text-sm font-medium italic line-clamp-1">"{(() => {
                        const desc = match.startup.description || match.startup.tagline || '';
                        // Filter out garbage descriptions
                        if (!desc || 
                            desc.toLowerCase().includes('technology company that appears') ||
                            desc.toLowerCase().includes('appears to have') ||
                            desc.toLowerCase().includes('significant milestone') ||
                            desc.toLowerCase().includes('discovered from')) {
                          return match.startup.tagline || 'Innovative startup';
                        }
                        return desc.slice(0, 60);
                      })()}..."</p>
                    </div>
                  </div>

                  {/* Key Highlights */}
                  {match.startup.extracted_data && (match.startup.extracted_data as any)?.fivePoints && (match.startup.extracted_data as any).fivePoints.length > 0 && (
                    <div className="bg-purple-500/10 rounded-lg p-3 mb-4 border border-purple-500/20 flex-1">
                      <p className="text-purple-300 text-xs font-semibold mb-2">✨ Key Highlights</p>
                      <div className="space-y-1.5">
                        {(match.startup.extracted_data as any).fivePoints
                          .filter((point: string) => point && !point.toLowerCase().includes('discovered from'))
                          .slice(0, 3)
                          .map((point: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 text-xs">
                              <span className="text-orange-400 mt-0.5">✦</span>
                              <p className="text-white/90 line-clamp-1">{point}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Press Quotes - Sentiment */}
                  {match.startup.extracted_data && (match.startup.extracted_data as any)?.press_quotes?.length > 0 && (
                    <div className="bg-green-500/10 rounded-lg px-3 py-2 mb-4 border border-green-500/20">
                      <p className="text-green-400 text-xs font-medium flex items-center gap-1">
                        <span>📰</span> Press
                      </p>
                      <p className="text-white/90 text-xs italic truncate mt-1">
                        "{(match.startup.extracted_data as any).press_quotes[0].text}"
                      </p>
                      <p className="text-gray-500 text-xs truncate">
                        — {(match.startup.extracted_data as any).press_quotes[0].source}
                      </p>
                    </div>
                  )}

                  {/* Industry Tags - Gradient pills */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(match.startup.tags || []).slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-gradient-to-r from-orange-500/20 to-cyan-500/20 border border-orange-400/40 text-orange-200 px-3 py-1 rounded-full text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Vote Button - Full width, prominent */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setVotingStartup(match.startup);
                      setShowVotePopup(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white font-bold text-base hover:from-orange-600 hover:via-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <ThumbsUp className="w-5 h-5" />
                    Vote for {match.startup.name?.split(' ')[0]}
                  </button>
                </div>
                </div>
              </div>

              {/* Brain Icon with Energy Bolts - Smaller on mobile */}
              <div className="relative flex justify-center items-center h-[120px] lg:h-[320px] order-first lg:order-none">
                {/* Animated energy lines - Hidden on mobile */}
                <svg className="hidden lg:block absolute inset-0 w-full h-full pointer-events-none z-0" style={{ overflow: 'visible' }}>
                  {/* Energy line to left card */}
                  <line 
                    x1="50%" 
                    y1="50%" 
                    x2="5%" 
                    y2="50%" 
                    stroke="url(#gradient-left)" 
                    strokeWidth="4"
                    className="animate-pulse"
                    strokeDasharray="8,8"
                  />
                  {/* Energy line to right card */}
                  <line 
                    x1="50%" 
                    y1="50%" 
                    x2="95%" 
                    y2="50%" 
                    stroke="url(#gradient-right)" 
                    strokeWidth="4"
                    className="animate-pulse"
                    strokeDasharray="8,8"
                    style={{ animationDelay: '0.3s' }}
                  />
                  {/* Gradient definitions - Orange/Amber energy */}
                  <defs>
                    <linearGradient id="gradient-left" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity="0.1" />
                      <stop offset="50%" stopColor="#f97316" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity="1" />
                    </linearGradient>
                    <linearGradient id="gradient-right" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f97316" stopOpacity="1" />
                      <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#f97316" stopOpacity="0.1" />
                    </linearGradient>
                  </defs>
                </svg>

                <button onClick={() => setShowHowItWorks(true)} className="relative z-10 cursor-pointer hover:scale-110 transition-transform">
                  {/* Pulsing glow background - ORANGE for hot deals */}
                  <div className="absolute inset-0 bg-orange-600/40 rounded-full blur-3xl animate-pulse"></div>
                  
                  {/* Brain Icon Image with animation - orange glow */}
                  <div className={`relative transition-all duration-700 ${brainSpin ? 'scale-150 drop-shadow-[0_0_50px_rgba(255,90,9,1)]' : matchPulse ? 'scale-125 drop-shadow-[0_0_40px_rgba(255,90,9,1)]' : 'scale-100 drop-shadow-[0_0_25px_rgba(255,90,9,0.8)]'}`}>
                    <img 
                      src="/images/brain-icon.png" 
                      alt="AI Brain" 
                      className={`w-20 h-20 sm:w-28 sm:h-28 lg:w-40 lg:h-40 object-contain ${brainSpin ? '' : 'animate-pulse'}`}
                      style={{ 
                        animationDuration: '2s',
                        transform: brainSpin ? 'rotate(360deg)' : 'rotate(0deg)',
                        transition: 'transform 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                      }}
                    />
                  </div>
                  
                  {/* Lottie Electrical Charge Animation */}
                  {showLightning && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                      <canvas 
                        ref={lottieCanvasRef}
                        width="300"
                        height="300"
                        className="w-[300px] h-[300px]"
                        style={{ 
                          filter: 'brightness(1.3) saturate(1.8) hue-rotate(270deg)',
                          mixBlendMode: 'screen',
                          transform: 'scale(1.2)'
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Energy particles */}
                  <div className="absolute -top-2 left-1/2 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                  <div className="absolute -bottom-2 -right-2 w-2 h-2 bg-orange-400 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
                  <div className="absolute top-1/2 -left-2 w-2 h-2 bg-cyan-400 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
                </button>
              </div>

              {/* Investor Card - Enhanced Component with Glow and Stroke */}
              <div className={`relative w-full max-w-[340px] sm:max-w-[400px] transition-all duration-400 ${cardFadeOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                {/* Hot amber/orange glow effect - reduced on mobile */}
                <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-blue-500 via-blue-500 to-blue-500 rounded-[2rem] sm:rounded-[2.5rem] blur-xl sm:blur-2xl opacity-50 hover:opacity-70 transition-opacity"></div>
                
                {/* Remove clipped border wrapper - apply border directly */}
                <div className="relative">
                  <EnhancedInvestorCard
                    investor={{
                      ...match.investor,
                      notable_investments: match.investor.notableInvestments,
                    }}
                    compact={true}
                    onClick={() => navigate(`/investor/${match.investor.id}`)}
                  />
                  
                  {/* Info Link Overlay */}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedInvestor(match.investor);
                      setShowVCPopup(true);
                    }}
                    className="absolute bottom-4 left-4 flex items-center gap-1.5 text-teal-400 text-sm font-medium hover:text-teal-300 transition-colors cursor-pointer z-20 underline underline-offset-2"
                  >
                    <Info className="w-3.5 h-3.5" />
                    Details
                  </span>
                </div>
                </div>
              </div>
            </div>

            {/* Match Counter */}
            <div className="text-center mt-12">
              <p className="text-gray-400 text-sm">
                Match {currentIndex + 1} of {matches.length} • Powered by GOD Algorithm™
              </p>
              <p className="text-gray-500 text-xs mt-1">
                ⚡ Cycling every 3 seconds • 10 matches per minute
              </p>
            </div>
          </div>
        </div>

        {/* Live Algorithm Visualization - Interactive Demo */}
        <div className="max-w-7xl mx-auto mt-8 mb-16 px-4">
          {/* Section Header - Mobile Responsive */}
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 px-4">
              Watch the <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">Magic</span> Happen
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-400 max-w-3xl mx-auto px-4">
              Our <span className="text-yellow-400 font-semibold">GOD Algorithm™</span> processes 20+ compatibility factors in real-time
            </p>
          </div>

          {/* Live Processing Dashboard - Dark stage with orange glow - Mobile Responsive */}
          <div className="bg-gradient-to-br from-[#1a1a1a]/90 via-[#222222]/90 to-[#1a1a1a]/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-cyan-500/30 shadow-[0_0_60px_rgba(255,90,9,0.2)] mb-8 sm:mb-12">
            {/* Real-time Status - Mobile Responsive */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-white/10">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="relative">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded-full animate-ping"></div>
                </div>
                <span className="text-green-300 font-semibold text-sm sm:text-base md:text-lg">AI Processing Live</span>
              </div>
              <div className="flex items-center gap-3 sm:gap-4 md:gap-6 w-full sm:w-auto justify-between sm:justify-start">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-400">{matches.length}</div>
                  <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-400">{match.matchScore}%</div>
                  <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide">Score</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-cyan-400">&lt;2s</div>
                  <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide">Time</div>
                </div>
              </div>
            </div>

            {/* Compatibility Metrics - Animated Bars - Mobile Responsive */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="w-20 sm:w-32 md:w-40 text-white font-semibold text-xs sm:text-sm">Industry Fit</div>
                <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(95, match.matchScore + 5)}%` }}
                  />
                </div>
                <div className="w-10 sm:w-12 text-right text-orange-400 font-bold text-xs sm:text-sm">{Math.min(95, match.matchScore + 5)}%</div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <div className="w-20 sm:w-32 md:w-40 text-white font-semibold text-xs sm:text-sm">Stage Match</div>
                <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-1000 ease-out delay-150"
                    style={{ width: `${Math.min(92, match.matchScore + 2)}%` }}
                  />
                </div>
                <div className="w-10 sm:w-12 text-right text-cyan-400 font-bold text-xs sm:text-sm">{Math.min(92, match.matchScore + 2)}%</div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <div className="w-20 sm:w-32 md:w-40 text-white font-semibold text-xs sm:text-sm">Check Size</div>
                <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-1000 ease-out delay-300"
                    style={{ width: `${Math.min(88, match.matchScore - 3)}%` }}
                  />
                </div>
                <div className="w-10 sm:w-12 text-right text-cyan-400 font-bold text-xs sm:text-sm">{Math.min(88, match.matchScore - 3)}%</div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <div className="w-20 sm:w-32 md:w-40 text-white font-semibold text-xs sm:text-sm">Geography</div>
                <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-1000 ease-out delay-450"
                    style={{ width: `${Math.min(90, match.matchScore)}%` }}
                  />
                </div>
                <div className="w-10 sm:w-12 text-right text-cyan-400 font-bold text-xs sm:text-sm">{Math.min(90, match.matchScore)}%</div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <div className="w-20 sm:w-32 md:w-40 text-white font-semibold text-xs sm:text-sm">Thesis Alignment</div>
                <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-1000 ease-out delay-600"
                    style={{ width: `${Math.min(87, match.matchScore - 5)}%` }}
                  />
                </div>
                <div className="w-10 sm:w-12 text-right text-teal-400 font-bold text-xs sm:text-sm">{Math.min(87, match.matchScore - 5)}%</div>
              </div>
            </div>

            {/* Processing Steps - Mobile Responsive */}
            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl flex items-center justify-center mb-2 shadow-lg shadow-cyan-500/50">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-white font-semibold text-sm">Data Ingestion</div>
                  <div className="text-green-400 text-xs">✓ Complete</div>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-2 shadow-lg shadow-blue-500/50 animate-pulse">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="text-white font-semibold text-sm">AI Analysis</div>
                  <div className="text-yellow-400 text-xs">⚡ Processing</div>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 mx-auto bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center mb-2 shadow-lg shadow-cyan-500/50">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="text-white font-semibold text-sm">Score Calculation</div>
                  <div className="text-green-400 text-xs">✓ Complete</div>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 mx-auto bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl flex items-center justify-center mb-2 shadow-lg shadow-cyan-500/50">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-white font-semibold text-sm">Match Delivery</div>
                  <div className="text-green-400 text-xs">✓ Ready</div>
                </div>
              </div>
            </div>
          </div>

          {/* Algorithm Insights */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-[#1a1a1a]/80 to-[#222222]/80 backdrop-blur-sm rounded-2xl p-6 border border-cyan-500/30 hover:border-cyan-400/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg mb-2">Real-Time Processing</h4>
                  <p className="text-gray-400 text-sm leading-relaxed">Matches are calculated on-demand using live data from 500+ investors and thousands of startups. Every score reflects current market conditions.</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 backdrop-blur-sm rounded-2xl p-6 border border-cyan-500/30 hover:border-cyan-400/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg mb-2">Multi-Factor Analysis</h4>
                  <p className="text-gray-400 text-sm leading-relaxed">We evaluate 20+ compatibility dimensions including stage, sector, geography, check size, investment thesis, timing, and portfolio fit.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* VALUE PROP PANELS */}
        <ValuePropPanels />

        {/* How It Works Modal - Detailed version with technology, process, and product */}
        <HowItWorksModalDetailed 
          isOpen={showHowItWorks} 
          onClose={() => setShowHowItWorks(false)}
          showSignupButton={true}
        />

        {/* Hot Match Popup - Comprehensive platform description */}
        <HotMatchPopup
          isOpen={showHotMatchPopup}
          onClose={() => setShowHotMatchPopup(false)}
          // onGetMatched removed - popup handles navigation directly now
        />

        {/* Info modal */}
        {showInfoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowInfoModal(false)}>
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#222222] border border-orange-500/50 rounded-3xl p-8 max-w-md mx-4 shadow-[0_0_50px_rgba(255,90,9,0.3)]" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <span className="text-6xl">🧠</span>
              <h2 className="text-3xl font-bold text-white mt-4">How Hot Money Works</h2>
              <p className="text-orange-400 mt-2">AI-Powered Startup-Investor Matching</p>
            </div>
            
            <p className="text-gray-300 mb-6 text-center">
              Our AI analyzes startups and investors to discover <span className="text-orange-400 font-bold">perfect matches</span> based on industry, stage, funding needs, and investment thesis.
            </p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
                <span className="text-2xl flex-shrink-0">🎯</span>
                <div>
                  <h3 className="text-white font-bold mb-1">Smart Matching</h3>
                  <p className="text-gray-400 text-sm">Click any startup or investor card to view their full profile, portfolio, and details</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
                <span className="text-2xl flex-shrink-0">⚡</span>
                <div>
                  <h3 className="text-white font-bold mb-1">Auto-Rotation</h3>
                  <p className="text-gray-400 text-sm">New matches appear every 8 seconds with lightning animation showing AI analysis</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
                <span className="text-2xl flex-shrink-0">🔥</span>
                <div>
                  <h3 className="text-white font-bold mb-1">Match Scores</h3>
                  <p className="text-gray-400 text-sm">Each pair gets an AI-calculated match percentage based on compatibility factors</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
                <span className="text-2xl flex-shrink-0">💡</span>
                <div>
                  <h3 className="text-white font-bold mb-1">Connect & Grow</h3>
                  <p className="text-gray-400 text-sm">When you find your perfect match, explore profiles and build relationships</p>
                </div>
              </div>
            </div>
            
            <button onClick={() => setShowInfoModal(false)} className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-gray-900 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-all">
              Got It! 🚀
            </button>
          </div>
        </div>
      )}

      {/* Startup Vote Popup */}
      <StartupVotePopup
        isOpen={showVotePopup}
        onClose={() => setShowVotePopup(false)}
        startup={votingStartup || { id: '', name: '', description: '' }}
      />

      {/* VC Info Popup */}
      <VCInfoPopup
        isOpen={showVCPopup}
        onClose={() => setShowVCPopup(false)}
        investor={selectedInvestor || {
          id: '',
          name: '',
          description: '',
          tagline: '',
          type: 'VC',
          stage: [],
          sectors: [],
          checkSize: '',
          geography: '',
          notableInvestments: [],
          portfolioSize: 0,
          investmentThesis: ''
        }}
      />

      {/* Match Score Breakdown Modal */}
      {match.breakdown && (
        <MatchScoreBreakdown
          isOpen={showScoreBreakdown}
          onClose={() => setShowScoreBreakdown(false)}
          matchScore={match.matchScore}
          breakdown={match.breakdown}
          startupName={match.startup.name}
          investorName={match.investor.name}
        />
      )}

      {/* Share Match Modal */}
      {match && (
        <ShareMatchModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          match={{
            investor: {
              id: match.investor.id,
              name: match.investor.name,
              firm: match.investor.name.split('@')[1]?.trim() || undefined,
              investor_type: match.investor.type || 'VC',
            } as any,
            score: match.matchScore,
            reasons: match.reasoning || [],
            breakdown: {
              industryMatch: match.breakdown?.industryMatch || 0,
              stageMatch: match.breakdown?.stageMatch || 0,
              geographyMatch: match.breakdown?.geographyMatch || 0,
              checkSizeMatch: match.breakdown?.checkSizeMatch || 0,
              thesisAlignment: match.breakdown?.thesisAlignment || 0,
              godScoreWeighted: match.matchScore || 0,
            },
            investorType: match.investor.type || 'VC',
            decisionSpeed: 'medium',
          }}
          startupName={match.startup.name}
        />
      )}

      {/* HotMatch Info Modal */}
      {showHotMatchInfo && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowHotMatchInfo(false)}
        >
          <div 
            className="bg-gradient-to-br from-[#1a1a1a] to-[#222222] rounded-3xl p-8 max-w-2xl w-full border-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">
                <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-400 bg-clip-text text-transparent">
                  🔥 About HotMatch
                </span>
              </h2>
              <button
                onClick={() => setShowHotMatchInfo(false)}
                className="text-white hover:text-gray-300 text-3xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-white">
              <div className="bg-white/10 rounded-xl p-4">
                <h3 className="font-bold text-xl mb-2">⚡ Lightning-Fast Matching</h3>
                <p className="text-gray-300">HotMatch uses advanced AI algorithms to analyze thousands of startups and investors in real-time, creating perfect matches in under 2 seconds.</p>
              </div>

              <div className="bg-white/10 rounded-xl p-4">
                <h3 className="font-bold text-xl mb-2">🎯 Multi-Factor Analysis</h3>
                <p className="text-gray-300">Our GOD Algorithm™ (Grit · Opportunity · Determination) evaluates 20+ factors including industry alignment, stage compatibility, check size fit, geography, and investment thesis matching.</p>
              </div>

              <div className="bg-white/10 rounded-xl p-4">
                <h3 className="font-bold text-xl mb-2">🔄 Fresh Opportunities</h3>
                <p className="text-gray-300">New matches cycle every 3 seconds with automatic rotation every 60 minutes, ensuring you always see the latest and most relevant opportunities.</p>
              </div>

              <div className="bg-white/10 rounded-xl p-4">
                <h3 className="font-bold text-xl mb-2">📊 Detailed Insights</h3>
                <p className="text-gray-300">Every match includes a comprehensive breakdown showing why it's a great fit, with actionable next steps and timing intelligence.</p>
              </div>

              <div className="bg-white/10 rounded-xl p-4">
                <h3 className="font-bold text-xl mb-2">💾 Save & Share</h3>
                <p className="text-gray-300">Bookmark your favorite matches and share them with your team. Build your personalized deal flow library.</p>
              </div>
            </div>

            <button
              onClick={() => setShowHotMatchInfo(false)}
              className="mt-6 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 hover:from-cyan-600 hover:via-blue-600 hover:to-violet-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
              Start Matching! 🚀
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
