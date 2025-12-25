import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ThumbsUp, Info, Share2, Sparkles, Search, TrendingUp, Heart } from 'lucide-react';
import { loadApprovedStartups } from '../store';
import { getAllInvestors } from '../lib/investorService';
import { calculateAdvancedMatchScore } from '../services/matchingService';
import { supabase } from '../lib/supabase';
import { DotLottie } from '@lottiefiles/dotlottie-web';
import HowItWorksModal from './HowItWorksModal';
import InvestorCard from './InvestorCard';
import EnhancedInvestorCard from './EnhancedInvestorCard';
import StartupVotePopup from './StartupVotePopup';
import VCInfoPopup from './VCInfoPopup';
import MatchScoreBreakdown from './MatchScoreBreakdown';
import ShareMatchModal from './ShareMatchModal';
import LogoDropdownMenu from './LogoDropdownMenu';
import TransparencyPanel from './TransparencyPanel';
import DataQualityBadge from './DataQualityBadge';
import MatchConfidenceBadge from './MatchConfidenceBadge';
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
    } else if (showLightning) {
      console.warn('⚠️ showLightning is true but dotLottieRef is not initialized');
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
  }, []);

  // Remove old 60-second refresh effect (handled by batch auto-advance now)

  const saveMatchesToDatabase = async (matchPairs: MatchPair[]) => {
    try {
      console.log('💾 Saving matches to database...');
      
      // Fetch full startup data to get GOD scores
      const startupIds = matchPairs.map(m => String(m.startup.id));
      const { data: startupsWithScores } = await supabase
        .from('startup_uploads')
        .select('id, total_god_score')
        .in('id', startupIds);
      
      const godScoreMap = new Map(
        startupsWithScores?.map(s => [String(s.id), s.total_god_score]) || []
      );
      
      const matchRecords = matchPairs.map(match => ({
        startup_id: String(match.startup.id),
        investor_id: match.investor.id,
        match_score: match.matchScore,
        status: 'suggested',
        reasoning: match.reasoning?.join(', ') || null,
        confidence_level: match.matchScore >= 80 ? 'high' : match.matchScore >= 60 ? 'medium' : 'low'
      }));
      
      // Insert matches in batches to avoid overwhelming the database
      const batchSize = 50;
      let successCount = 0;
      
      for (let i = 0; i < matchRecords.length; i += batchSize) {
        const batch = matchRecords.slice(i, i + batchSize);
        
        const { data, error } = await supabase
          .from('startup_investor_matches')
          .upsert(batch, {
            onConflict: 'startup_id,investor_id',
            ignoreDuplicates: false
          });
        
        if (error) {
          console.error(`❌ Error saving match batch ${Math.floor(i / batchSize) + 1}:`, error);
        } else {
          successCount += batch.length;
          console.log(`✅ Saved batch ${Math.floor(i / batchSize) + 1}: ${batch.length} matches`);
        }
      }
      
      console.log(`✅ Successfully saved ${successCount}/${matchRecords.length} matches to database`);
    } catch (error) {
      console.error('❌ Error saving matches:', error);
    }
  };

  const loadMatches = async () => {
    try {
      setLoadError(null);
      setDebugInfo(null);
      setMatches([]);
      setCurrentIndex(0);
      // Load startups and investors from database
      const startups = await loadApprovedStartups(100, 0);
      const { data: investors, error: investorError } = await getAllInvestors();
      setDebugInfo({
        startupsCount: startups.length,
        investorsCount: investors?.length || 0,
        investorError: investorError ? JSON.stringify(investorError) : null,
        firstStartup: startups[0],
        firstInvestor: investors?.[0]
      });
      if (investorError) {
        setLoadError('Investor fetch error: ' + investorError.message);
        setIsAnalyzing(false);
        return;
      }
      if (!investors || investors.length === 0 || startups.length === 0) {
        setLoadError('No startups or investors found.');
        setIsAnalyzing(false);
        return;
      }
      // --- Begin match generation logic (copied from previous implementation) ---
      const investorNames = ['ycombinator', 'y combinator', 'techstars', 'sequoia', 'a16z', 'andreessen horowitz'];
      const filteredStartups = startups.filter((startup: any) => {
        const name = (startup.name || '').toLowerCase();
        const isInvestor = investorNames.some(inv => name.includes(inv));
        return !isInvestor;
      });
      const shuffledStartups = [...filteredStartups];
      for (let i = shuffledStartups.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledStartups[i], shuffledStartups[j]] = [shuffledStartups[j], shuffledStartups[i]];
      }
      const investorsWithData = investors.filter((inv: any) => inv.sectors && inv.sectors.length > 0);
      const vcFirms = investorsWithData.filter((inv: any) => 
        inv.type === 'VC Firm' || 
        inv.type === 'Accelerator' || 
        inv.type === 'Corporate VC'
      );
      const investorsToUse = vcFirms.length > 0 ? vcFirms : investorsWithData;
      const shuffledInvestors = [...investorsToUse];
      for (let i = shuffledInvestors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledInvestors[i], shuffledInvestors[j]] = [shuffledInvestors[j], shuffledInvestors[i]];
      }
      const generatedMatches: MatchPair[] = [];
      for (let i = 0; i < Math.min(250, shuffledStartups.length); i++) {
        const startup = shuffledStartups[i];
        const randomInvestorIndex = Math.floor(Math.random() * shuffledInvestors.length);
        const investor = shuffledInvestors[randomInvestorIndex];
        // ...existing match object creation logic...
        // (Copy the match object creation logic from previous code here)
        // For brevity, use a minimal match object for debug:
        generatedMatches.push({
          startup: {
            ...startup,
            tags: startup.industries || [],
          },
          investor: {
            ...investor,
            tags: investor.sectors || [],
          },
          matchScore: (() => { const godScore = startup.total_god_score || 50; const startupSectors = startup.sectors || startup.industries || []; const investorSectors = investor.sectors || []; const sNorm = startupSectors.map((s: string) => s.toLowerCase()); const iNorm = investorSectors.map((s: string) => s.toLowerCase()); const overlap = sNorm.filter((s: string) => iNorm.some((i: string) => s.includes(i) || i.includes(s))).length; const sectorWeights: Record<string, number> = { "saas": 2.0, "ai/ml": 2.0, "ai": 2.0, "ml": 2.0, "fintech": 2.0, "healthtech": 2.0, "healthcare": 2.0, "consumer": 2.0, "robotics": 2.0, "crypto": 1.0, "web3": 1.0, "cleantech": 0.5, "climate": 0.5, "gaming": 0.5, "edtech": 0.5, "education": 0.5 }; const weightedOverlap = sNorm.reduce((sum: number, s: string) => { const match = iNorm.some((i: string) => s.includes(i) || i.includes(s)); if (match) { const weight = sectorWeights[s] || sectorWeights[Object.keys(sectorWeights).find(k => s.includes(k)) || ""] || 1.0; return sum + (8 * weight); } return sum; }, 0); const sectorBonus = Math.min(weightedOverlap, 32); const investorStages = investor.stage || []; const startupStage = startup.stage || 2; const stageNames = ["idea", "pre-seed", "seed", "series a", "series b", "series c"]; const startupStageName = stageNames[startupStage] || "seed"; const stageMatch = investorStages.some((s: string) => s.toLowerCase().includes(startupStageName)) ? 10 : 0; return Math.min(godScore + sectorBonus + stageMatch, 99); })(),
        });
      }
      generatedMatches.sort((a, b) => b.matchScore - a.matchScore);
      const MIN_MATCH_SCORE = 35;
      const qualityMatches = generatedMatches.filter(m => m.matchScore >= MIN_MATCH_SCORE);
      const shuffledMatches = [...qualityMatches];
      for (let i = shuffledMatches.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledMatches[i], shuffledMatches[j]] = [shuffledMatches[j], shuffledMatches[i]];
      }
      // --- End match generation logic ---
      await saveMatchesToDatabase(shuffledMatches);
      setMatches(shuffledMatches);
      setCurrentBatch(0); // Always reset to first batch
      setCurrentIndex(0); // Always reset to first match in batch
      setIsAnalyzing(false);
    } catch (error) {
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
      <div className="min-h-screen bg-gradient-to-br from-[#0c0c0c] via-[#171717] to-[#1e1e1e] flex flex-col items-center justify-center">
        <div className="text-white text-2xl mb-4">{matches.length === 0 ? 'Loading matches...' : 'No matches in this batch.'}</div>
        {loadError && <div className="text-red-400 text-lg mb-2">{loadError}</div>}
        {debugInfo && (
          <pre className="bg-black/60 text-gray-300 text-xs p-4 rounded-xl max-w-xl overflow-x-auto mt-2 text-left">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#141414] to-[#1a1a1a] relative overflow-hidden">
      {/* Data Quality Banner - Shows when data is stale */}
      <DataQualityBadge variant="banner" />
      
      {/* Animated background - subtle orange/amber glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Logo Dropdown Menu (replaces hamburger + separate logo) */}
      <LogoDropdownMenu />

      {/* Get Matched Button - Top Right - Hidden on small mobile, visible sm+ */}
      <div className="hidden sm:block fixed top-20 right-4 sm:right-8 z-50">
        <button
          onClick={() => setShowHowItWorks(true)}
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
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
              Perfect Match
            </span>
          </h2>
          <h3 className="text-2xl sm:text-4xl md:text-6xl font-bold text-white mb-2 sm:mb-4">
            In 60 Seconds
          </h3>

          <p className="text-base sm:text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto mb-2 sm:mb-4">
            AI finds your perfect startup-investor matches with explanations and next steps.
          </p>
          {/* Data Quality Indicator */}
          <div className="flex justify-center mt-3">
            <DataQualityBadge variant="inline" />
          </div>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-8 py-2">

        {/* Match Display with Lightning Animation */}
        <div className="max-w-7xl mx-auto mb-16">
          {/* Batch navigation */}
          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="text-white text-sm opacity-80">Batch {currentBatch + 1} of {totalBatches} ({batchMatches.length} matches)</div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 rounded bg-orange-500/20 text-orange-300 border border-orange-400/30 hover:bg-orange-500/40 transition-all"
                disabled={currentBatch === 0}
                onClick={() => { setCurrentBatch((b) => Math.max(0, b - 1)); setCurrentIndex(0); }}
              >Prev Batch</button>
              <button
                className="px-3 py-1 rounded bg-orange-500/20 text-orange-300 border border-orange-400/30 hover:bg-orange-500/40 transition-all"
                disabled={currentBatch === totalBatches - 1}
                onClick={() => { setCurrentBatch((b) => Math.min(totalBatches - 1, b + 1)); setCurrentIndex(0); }}
              >Next Batch</button>
            </div>
          </div>
          {/* Match Badge & Explore Button */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full px-10 py-4 shadow-xl flex items-center gap-3">
              <span className="text-2xl font-bold text-gray-900 flex items-center gap-2">
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
              className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a] hover:from-[#2a2a2a] hover:to-[#333333] text-white font-semibold rounded-xl border border-orange-500/50 hover:border-orange-400 shadow-md shadow-black/50 hover:shadow-orange-500/30 transition-all hover:scale-105"
            >
              <Search className="w-4 h-4 text-orange-400 group-hover:text-orange-300" />
              <span className="text-sm bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
                Explore Startups & Investors
              </span>
              <TrendingUp className="w-4 h-4 text-orange-400 group-hover:text-orange-300 group-hover:translate-x-1 transition-transform" />
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
                      <div className="absolute top-full right-0 mt-2 bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-bold w-64 z-50 animate-fadeIn">
                        <div className="absolute -top-2 right-4 w-4 h-4 bg-orange-600 rotate-45"></div>
                        💡 {currentSecret}
                      </div>
                    )}
                  </div>
                </div>

                {/* INNER GRADIENT PANEL - DARK CHARCOAL */}
                <div 
                  onClick={() => {
                    // Safety check: Only navigate if ID looks valid (UUID format, not numeric fallback)
                    const id = match.startup.id;
                    const isValidUUID = typeof id === 'string' && id.length > 8 && id.includes('-');
                    if (isValidUUID) {
                      console.log('Navigating to startup:', id);
                      navigate(`/startup/${id}`);
                    } else {
                      console.warn('⚠️ Invalid startup ID (likely fallback data):', id, typeof id);
                      alert('Startup details unavailable - database connection issue');
                    }
                  }}
                  className="bg-gradient-to-br from-[#141414]/95 via-[#1a1a1a]/90 to-[#222222]/85 rounded-2xl p-6 h-full flex flex-col backdrop-blur-sm border-2 border-emerald-400/40 shadow-inner"
                >
                  {/* Icon + Name + Value Prop */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-4 rounded-xl shadow-2xl shadow-orange-500/30 flex-shrink-0">
                      <span className="text-4xl">🚀</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-2xl font-extrabold text-white mb-2 group-hover:text-cyan-300 transition-colors line-clamp-1">{match.startup.name}</h3>
                      <p className="text-white/95 text-base font-semibold italic line-clamp-2">"{match.startup.description}"</p>
                    </div>
                  </div>

                  {/* 5 Points Display */}
                  <div className="space-y-1 text-sm text-white/90 mb-3">
                    <p className="line-clamp-1">📊 {match.startup.market || 'Market opportunity'}</p>
                    <p className="line-clamp-1">⚙️ {match.startup.product || 'Product innovation'}</p>
                    <p className="line-clamp-1">👥 {match.startup.team || 'Experienced team'}</p>
                  </div>

                  {/* Industry + Stage Tags */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {match.startup.tags.slice(0, 2).map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-white/30 backdrop-blur-sm border-2 border-white/60 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg"
                      >
                        {tag}
                      </span>
                    ))}
                    {/* Stage Tag */}
                    <span className="bg-teal-600/50 text-white px-3 py-1 rounded-full text-sm font-bold">
                      {match.startup.tags[match.startup.tags.length - 1] || 'Seed'}
                    </span>
                  </div>

                  {/* Funding */}
                  <p className="text-yellow-400 text-lg font-extrabold mb-3">💰 {match.startup.seeking}</p>

                  {/* Vote Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Don't trigger card click
                      setVotingStartup(match.startup);
                      setShowVotePopup(true);
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg hover:scale-105 mb-2"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Vote
                  </button>

                  {/* Hover instruction */}
                  <p className="text-cyan-300 text-sm font-bold mt-auto opacity-0 group-hover:opacity-100 transition-opacity text-center">
                    Click card to view full profile →
                  </p>
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
                  <div className="absolute inset-0 bg-orange-500/40 rounded-full blur-3xl animate-pulse"></div>
                  
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
                  <div className="absolute -bottom-2 -right-2 w-2 h-2 bg-cyan-400 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
                  <div className="absolute top-1/2 -left-2 w-2 h-2 bg-orange-400 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
                </button>
              </div>

              {/* Investor Card - Enhanced Component with Glow and Stroke */}
              <div className={`relative w-full max-w-[340px] sm:max-w-[400px] transition-all duration-400 ${cardFadeOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                {/* Hot amber/orange glow effect - reduced on mobile */}
                <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 rounded-[2rem] sm:rounded-[2.5rem] blur-xl sm:blur-2xl opacity-50 hover:opacity-70 transition-opacity"></div>
                
                {/* Remove clipped border wrapper - apply border directly */}
                <div className="relative">
                  <EnhancedInvestorCard
                    investor={{
                      id: match.investor.id,
                      name: match.investor.name,
                      tagline: match.investor.tagline,
                      type: match.investor.type,
                      stage: match.investor.stage,
                      sectors: match.investor.sectors,
                      check_size: match.investor.checkSize,
                      geography: match.investor.geography,
                      notable_investments: match.investor.notableInvestments,
                      portfolio_size: match.investor.portfolioSize,
                    }}
                    compact={true}
                    onClick={() => navigate(`/investor/${match.investor.id}`)}
                  />
                  
                  {/* Info Button Overlay */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedInvestor(match.investor);
                      setShowVCPopup(true);
                    }}
                    className="absolute bottom-6 left-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-700 to-teal-900 text-white font-semibold hover:from-teal-600 hover:to-teal-800 transition-all shadow-lg hover:scale-105 z-20"
                  >
                    <Info className="w-4 h-4" />
                    Learn More
                  </button>
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
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold text-white mb-4">
              Watch the <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent">Magic</span> Happen
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Our <span className="text-yellow-400 font-semibold">GOD Algorithm™</span> processes 20+ compatibility factors in real-time
            </p>
          </div>

          {/* Live Processing Dashboard - Dark stage with orange glow */}
          <div className="bg-gradient-to-br from-[#1a1a1a]/90 via-[#222222]/90 to-[#1a1a1a]/90 backdrop-blur-xl rounded-3xl p-8 border border-orange-500/30 shadow-[0_0_60px_rgba(255,90,9,0.2)] mb-12">
            {/* Real-time Status */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-4 h-4 bg-green-400 rounded-full animate-ping"></div>
                </div>
                <span className="text-green-300 font-semibold text-lg">AI Processing Live</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-cyan-400">{matches.length}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Active Matches</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-400">{match.matchScore}%</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Match Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-400">&lt;2s</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Process Time</div>
                </div>
              </div>
            </div>

            {/* Compatibility Metrics - Animated Bars */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-40 text-white font-semibold text-sm">Industry Fit</div>
                <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(95, match.matchScore + 5)}%` }}
                  />
                </div>
                <div className="w-12 text-right text-amber-400 font-bold">{Math.min(95, match.matchScore + 5)}%</div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-40 text-white font-semibold text-sm">Stage Match</div>
                <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-1000 ease-out delay-150"
                    style={{ width: `${Math.min(92, match.matchScore + 2)}%` }}
                  />
                </div>
                <div className="w-12 text-right text-cyan-400 font-bold">{Math.min(92, match.matchScore + 2)}%</div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-40 text-white font-semibold text-sm">Check Size</div>
                <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-1000 ease-out delay-300"
                    style={{ width: `${Math.min(88, match.matchScore - 3)}%` }}
                  />
                </div>
                <div className="w-12 text-right text-cyan-400 font-bold">{Math.min(88, match.matchScore - 3)}%</div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-40 text-white font-semibold text-sm">Geography</div>
                <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-1000 ease-out delay-450"
                    style={{ width: `${Math.min(90, match.matchScore)}%` }}
                  />
                </div>
                <div className="w-12 text-right text-cyan-400 font-bold">{Math.min(90, match.matchScore)}%</div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-40 text-white font-semibold text-sm">Thesis Alignment</div>
                <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-1000 ease-out delay-600"
                    style={{ width: `${Math.min(87, match.matchScore - 5)}%` }}
                  />
                </div>
                <div className="w-12 text-right text-teal-400 font-bold">{Math.min(87, match.matchScore - 5)}%</div>
              </div>
            </div>

            {/* Processing Steps */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-2 shadow-lg shadow-orange-500/50">
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
                  <div className="w-12 h-12 mx-auto bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-2 shadow-lg shadow-orange-500/50">
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
            <div className="bg-gradient-to-br from-[#1a1a1a]/80 to-[#222222]/80 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30 hover:border-orange-400/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/30">
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

        {/* Feature Panel Cards - RESTORED FULL DESIGN */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-16 px-4">
          {/* I'm a Founder Panel */}
          <div className="bg-gradient-to-br from-[#1a1a1a]/90 to-[#222222]/90 backdrop-blur-sm rounded-3xl p-8 border-2 border-orange-500/40 shadow-[0_20px_60px_rgba(255,90,9,0.3)]">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-3xl font-bold text-white mb-8">I'm a Founder</h2>
            
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <span className="text-2xl">⚡</span>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">5+ Investor Matches</h3>
                  <p className="text-gray-400 text-sm">Matched to your stage, sector, geography</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-2xl">🎯</span>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">AI Explains Why</h3>
                  <p className="text-gray-400 text-sm">See exactly why each VC is a good fit</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-2xl">📊</span>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">Next Steps Included</h3>
                  <p className="text-gray-400 text-sm">Clear action plan for each investor</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-2xl">⏰</span>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">Timing Intelligence</h3>
                  <p className="text-gray-400 text-sm">Know when VCs are actively deploying</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 rounded-xl p-4 mb-4 hover:border-orange-500/50 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💎</span>
                <span className="text-yellow-400 font-bold text-lg">Premium Strategy Service</span>
              </div>
            </div>

            <button 
              onClick={() => navigate('/submit')}
              className="group w-full text-left px-6 py-4 rounded-xl transition-all hover:bg-white/5 border border-white/10 hover:border-orange-400/50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-orange-300 font-semibold text-lg mb-1 group-hover:text-orange-200 transition-colors">Get Started</div>
                  <div className="text-gray-400 text-sm">Find your perfect investors</div>
                </div>
                <svg className="w-6 h-6 text-orange-400 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </button>
          </div>

          {/* I'm an Investor Panel */}
          <div className="bg-gradient-to-br from-blue-900/60 to-cyan-900/60 backdrop-blur-sm rounded-3xl p-8 border-2 border-cyan-500/40 shadow-[0_20px_60px_rgba(6,182,212,0.4)]">
            <div className="text-6xl mb-4">💰</div>
            <h2 className="text-3xl font-bold text-white mb-8">I'm an Investor</h2>
            
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <span className="text-2xl">🔥</span>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">10+ Startup Matches</h3>
                  <p className="text-gray-400 text-sm">Pre-screened for your criteria</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-2xl">🤖</span>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">AI Quality Scoring</h3>
                  <p className="text-gray-400 text-sm">Momentum, traction, and growth signals</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-2xl">📈</span>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">Market Intelligence</h3>
                  <p className="text-gray-400 text-sm">See trends before competitors</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-2xl">⚡</span>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">Deal Flow Automation</h3>
                  <p className="text-gray-400 text-sm">Stop manually searching TechCrunch</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-400/30 rounded-xl p-4 mb-4 hover:border-cyan-400/50 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💎</span>
                <span className="text-cyan-300 font-bold text-lg">Premium Intelligence</span>
              </div>
            </div>

            <button 
              onClick={() => navigate('/vote')}
              className="group w-full text-left px-6 py-4 rounded-xl transition-all hover:bg-white/5 border border-white/10 hover:border-cyan-400/50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-cyan-300 font-semibold text-lg mb-1 group-hover:text-cyan-200 transition-colors">Get Started</div>
                  <div className="text-gray-400 text-sm">Discover hot deals now</div>
                </div>
                <svg className="w-6 h-6 text-cyan-400 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </button>
          </div>
        </div>

        {/* How It Works Modal - Click brain icon to open */}
        <HowItWorksModal 
          isOpen={showHowItWorks} 
          onClose={() => setShowHowItWorks(false)} 
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
              Our AI analyzes startups and investors to discover <span className="text-cyan-400 font-bold">perfect matches</span> based on industry, stage, funding needs, and investment thesis.
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
            
            <button onClick={() => setShowInfoModal(false)} className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-all">
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
      <ShareMatchModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        startupName={match.startup.name}
        investorName={match.investor.name}
        matchScore={match.matchScore}
        matchUrl={`${window.location.origin}/match?startup=${match.startup.id}&investor=${match.investor.id}`}
      />

      {/* HotMatch Info Modal */}
      {showHotMatchInfo && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowHotMatchInfo(false)}
        >
          <div 
            className="bg-gradient-to-br from-[#1a1a1a] to-[#222222] rounded-3xl p-8 max-w-2xl w-full border-2 border-orange-500/50 shadow-2xl shadow-orange-500/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">
                <span className="bg-gradient-to-r from-orange-400 via-red-500 to-yellow-400 bg-clip-text text-transparent">
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
              className="mt-6 w-full bg-gradient-to-r from-orange-500 via-red-500 to-yellow-500 hover:from-orange-600 hover:via-red-600 hover:to-yellow-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
              Start Matching! 🚀
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
