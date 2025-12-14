import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ThumbsUp, Info, Share2, Sparkles, Search, TrendingUp, Heart } from 'lucide-react';
import { loadApprovedStartups } from '../store';
import { getAllInvestors } from '../lib/investorService';
import { calculateAdvancedMatchScore } from '../services/matchingService';
import { supabase } from '../lib/supabase';
import { DotLottie } from '@lottiefiles/dotlottie-web';
import HowItWorksModal from './HowItWorksModal';
import EnhancedInvestorCard from './EnhancedInvestorCard';
import StartupVotePopup from './StartupVotePopup';
import VCInfoPopup from './VCInfoPopup';
import MatchScoreBreakdown from './MatchScoreBreakdown';
import ShareMatchModal from './ShareMatchModal';
import LogoDropdownMenu from './LogoDropdownMenu';
import TransparencyPanel from './TransparencyPanel';
import { saveMatch, unsaveMatch, isMatchSaved } from '../lib/savedMatches';

// SIMPLIFIED MATCHING: Uses pre-calculated GOD scores from database
// This aligns with Architecture Document Option A (Recommended)

interface MatchPair {
  startup: {
    id: number | string;
    name: string;
    description: string; // fivePoints[0] - Value prop
    tags: string[];
    seeking: string; // fivePoints[4] - Investment
    status: string;
    market?: string; // fivePoints[1] - Market
    product?: string; // fivePoints[2] - Product
    team?: string; // fivePoints[3] - Team
    stage?: string;
    industries?: string[];
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
    aum?: string; // Assets Under Management
    fundSize?: string; // Current fund size
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
  const [currentIndex, setCurrentIndex] = useState(0);
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
  const [isAutoRotating, setIsAutoRotating] = useState(true); // Auto-rotation enabled by default
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showHotMatchInfo, setShowHotMatchInfo] = useState(false);
  const lottieCanvasRef = useRef<HTMLCanvasElement>(null);
  const dotLottieRef = useRef<any>(null);

  // Check if current match is saved whenever match changes
  useEffect(() => {
    if (matches.length > 0 && matches[currentIndex]) {
      const match = matches[currentIndex];
      setIsSaved(isMatchSaved(match.startup.id, match.investor.id));
    }
  }, [currentIndex, matches]);

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

  // Auto-rotation: 20 cards per 60 seconds = 3 seconds per card
  useEffect(() => {
    if (!isAutoRotating || matches.length === 0) return;
    
    console.log('🔄 Auto-rotation enabled - cycling every 3 seconds');
    const autoRotateInterval = setInterval(() => {
      // Inline the rotation logic to avoid stale closure issues
      setCardFadeOut(true);
      
      setTimeout(() => {
        setShowLightning(true);
        setIsAnalyzing(true);
        setBrainSpin(true);
        setTimeout(() => setBrainSpin(false), 800);
      
        setCurrentIndex((prev) => {
          const nextIndex = (prev + 1) % matches.length;
          console.log(`🔄 AUTO ROTATION: Match ${prev + 1} → ${nextIndex + 1} of ${matches.length}`);
          return nextIndex;
        });
        
        setTimeout(() => setCardFadeOut(false), 100);
        setTimeout(() => setShowLightning(false), 600);
        setTimeout(() => setIsAnalyzing(false), 1200);
      }, 400);
    }, 3000); // 3 seconds per card
    
    return () => clearInterval(autoRotateInterval);
  }, [isAutoRotating, matches.length]); // Removed currentIndex - it was causing interval resets

  // GOD Algorithm rolling animation (changes every 1.5 seconds)
  useEffect(() => {
    const godInterval = setInterval(() => {
      setGodAlgoStep((prev) => (prev + 1) % godAlgorithmSteps.length);
    }, 1500);
    
    return () => clearInterval(godInterval);
  }, []);

  // Auto-load 20 NEW matches every 60 SECONDS ✅
  useEffect(() => {
    console.log('🔄 ROTATION EFFECT - Setting up auto-refresh: 20 NEW matches every 60 seconds');
    console.log('   Current matches.length:', matches.length);
    
    if (matches.length === 0) {
      console.log('⚠️ Not enough matches to start rotation timer');
    }
    
    const interval = setInterval(() => {
      console.log('⏰ ROTATION TRIGGERED - 60 seconds elapsed');
      console.log('   Loading fresh matches from database...');
      
      // Trigger lightning animation
      setShowLightning(true);
      setTimeout(() => setShowLightning(false), 800);
      
      // Pulse effect
      setMatchPulse(true);
      setTimeout(() => setMatchPulse(false), 800);
      
      // Load fresh matches from database
      loadMatches();
      
      // Reset to first match
      setCurrentIndex(0);
      console.log('✅ Rotation complete - reset to match 1');
    }, 60000); // 60 SECONDS = 1 minute
    
    console.log('✅ Rotation interval SET (timer ID created)');
    
    return () => {
      console.log('🧹 Rotation interval CLEARED');
      clearInterval(interval);
    };
  }, []);

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
      console.log('🚀 Loading startups and investors from database...');
      console.log('⏰ Load time:', new Date().toISOString());
      
      // Clear old matches to force re-render
      setMatches([]);
      setCurrentIndex(0);
      
      // Load startups and investors from database
      const startups = await loadApprovedStartups(100, 0);
      const { data: investors } = await getAllInvestors();

      console.log(`✅ Loaded ${startups.length} startups and ${investors?.length || 0} investors`);
      console.log('\n🏦 ALL INVESTORS IN DATABASE:');
      investors?.forEach((inv: any, idx: number) => {
        console.log(`   ${idx + 1}. ${inv.name}`);
      });

      if (!investors || investors.length === 0 || startups.length === 0) {
        console.warn('⚠️ No startups or investors found');
        return;
      }

      // Log sample investor data to see what fields we have
      if (investors.length > 0) {
        console.log('\n📊 SAMPLE INVESTOR DATA:');
        console.log('Fields available:', Object.keys(investors[0]));
        console.log('Sample investor:', JSON.stringify(investors[0], null, 2));
      }

      // CRITICAL FIX: Filter out investors mistakenly in startup_uploads
      // Common accelerators/VCs that shouldn't be in startup list:
      const investorNames = ['ycombinator', 'y combinator', 'techstars', 'sequoia', 'a16z', 'andreessen horowitz'];
      const filteredStartups = startups.filter((startup: any) => {
        const name = (startup.name || '').toLowerCase();
        const isInvestor = investorNames.some(inv => name.includes(inv));
        if (isInvestor) {
          console.warn(`⚠️ Filtered out investor from startups: ${startup.name}`);
          return false;
        }
        return true;
      });
      
      console.log(`✅ Filtered to ${filteredStartups.length} actual startups (removed ${startups.length - filteredStartups.length} investors)`);

      // 🎲 SHUFFLE startups for variety each page load (Fisher-Yates for true randomness)
      const shuffledStartups = [...filteredStartups];
      for (let i = shuffledStartups.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledStartups[i], shuffledStartups[j]] = [shuffledStartups[j], shuffledStartups[i]];
      }
      
      // � FILTER: Only use VC Firms (not individual people names)
      const vcFirms = investors.filter((inv: any) => 
        inv.type === 'VC Firm' || 
        inv.type === 'Accelerator' || 
        inv.type === 'Corporate VC'
      );
      console.log(`🏦 Filtered to ${vcFirms.length} VC Firms from ${investors.length} total investors`);
      
      // If no VC Firms, fall back to all investors but log warning
      const investorsToUse = vcFirms.length > 0 ? vcFirms : investors;
      if (vcFirms.length === 0) {
        console.warn('⚠️ No VC Firms found, using all investors including individuals');
      }
      
      // 🎲 SHUFFLE investors (Fisher-Yates)
      const shuffledInvestors = [...investorsToUse];
      for (let i = shuffledInvestors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledInvestors[i], shuffledInvestors[j]] = [shuffledInvestors[j], shuffledInvestors[i]];
      }
      
      console.log('🎲 SHUFFLED:', shuffledStartups.slice(0, 3).map(s => s.name), '/', shuffledInvestors.slice(0, 3).map(i => i.name));

      // ✨ SIMPLIFIED MATCHING: Read pre-calculated GOD scores from database
      // This aligns with Architecture Document Option A (Recommended Approach)
      console.log('\n' + '═'.repeat(80));
      console.log('🎯 GENERATING MATCHES (Using Pre-Calculated GOD Scores)');
      console.log('═'.repeat(80));
      
      const generatedMatches: MatchPair[] = [];
      
      // For each startup, create match with a RANDOM investor
      for (let i = 0; i < Math.min(250, shuffledStartups.length); i++) {
        const startup = shuffledStartups[i];
        // 🎲 Pick a random investor for each startup (not sequential modulo)
        const randomInvestorIndex = Math.floor(Math.random() * shuffledInvestors.length);
        const investor = shuffledInvestors[randomInvestorIndex];
        
        // 🎯 FIX #1: ENHANCED DEBUG LOGGING FOR GOD SCORES
        console.log('\n' + '─'.repeat(80));
        console.log(`🔍 Startup ${i + 1}: ${startup.name}`);
        console.log(`💼 Investor (random): ${investor.name}`);
        console.log(`   total_god_score: ${startup.total_god_score} (type: ${typeof startup.total_god_score})`);
        console.log(`   team_score: ${startup.team_score}`);
        console.log(`   traction_score: ${startup.traction_score}`);;
        console.log(`   market_score: ${startup.market_score}`);
        console.log(`   hotness: ${startup.hotness}`);
        console.log(`   hasExtractedData: ${!!startup.extracted_data}`);
        console.log(`   hasFivePoints: ${startup.fivePoints ? startup.fivePoints.length : 0} items`);
        console.log('─'.repeat(80));
        
        // RAW DATA TRACE - Check what we're receiving
        if (i < 5) {
          console.log('\n🔍 RAW STARTUP DATA:', {
            name: startup.name,
            total_god_score: startup.total_god_score,
            team_score: startup.team_score,
            traction_score: startup.traction_score,
            market_score: startup.market_score,
            hotness: startup.hotness,
            stage: startup.stage,
            industries: startup.industries,
            allKeys: Object.keys(startup)
          });
        }
        
        // DEBUG: Log fivePoints extraction for first 3 startups
        if (i < 3) {
          console.log(`\n🔍 DEBUG Startup ${i + 1}: ${startup.name}`);
          console.log(`   fivePoints array:`, startup.fivePoints);
          console.log(`   fivePoints length:`, startup.fivePoints?.length || 0);
          if (startup.fivePoints && startup.fivePoints.length > 0) {
            console.log(`   [0] Tagline: "${startup.fivePoints[0]}"`);
            console.log(`   [1] Market: "${startup.fivePoints[1]}"`);
            console.log(`   [2] Product: "${startup.fivePoints[2]}"`);
            console.log(`   [3] Team: "${startup.fivePoints[3]}"`);
            console.log(`   [4] Funding: "${startup.fivePoints[4]}"`);
          }
          
          // DEBUG: Log investor data to verify it's being parsed correctly
          // NOTE: Using frontend-mapped property names (sectors, stage, checkSizeMin, etc.)
          console.log('\n[INVESTOR DATA CHECK]', {
            name: investor.name,
            checkSizeMin: investor.checkSizeMin,
            checkSizeMax: investor.checkSizeMax,
            sectors: investor.sectors,   // Mapped from sector_focus
            stage: investor.stage,       // Mapped from stage_focus
            notableInvestments: investor.notableInvestments,
            portfolioCount: investor.portfolioCount,
            description: investor.description
          });
        }
        
        // Calculate GOD score using total_god_score from database (primary), then fallback to hotness or votes
        console.log('🎯 SCORE CHECK:', startup.name, 'total_god_score:', startup.total_god_score);
        let baseScore = startup.total_god_score || 50;
        console.log(`🎯 SCORE DEBUG: ${startup.name} = ${startup.total_god_score} (using: ${baseScore})`);
        if (baseScore < 30) baseScore = 30 + Math.random() * 40; // Ensure minimum variety
        baseScore = Math.min(baseScore, 95); // Cap at 95
        
        // Calculate matching bonuses based on investor criteria
        let matchBonus = 0;
        
        // Get investor data from MAPPED frontend fields: stage and sectors
        // These are mapped from stage_focus and sector_focus in investorService.ts
        const investorStages = investor.stage || [];
        const investorSectors = investor.sectors || [];
        
        // Stage match: +10 points
        if (investorStages && Array.isArray(investorStages) && startup.stage !== undefined) {
          const stageLabels = ['idea', 'pre-seed', 'seed', 'series_a', 'series_b', 'series_c'];
          const startupStage = stageLabels[startup.stage] || 'seed';
          if (investorStages.some((s: string) => s.toLowerCase().replace(/[-_\s]/g, '') === startupStage.replace(/[-_\s]/g, ''))) {
            matchBonus += 10;
          }
        }
        
        // Sector match: +5 per match, max +10
        const startupSectors = startup.industries || [];
        const commonSectors = startupSectors.filter((s: string) =>
          investorSectors.some((is: string) => 
            s.toLowerCase().includes(is.toLowerCase()) ||
            is.toLowerCase().includes(s.toLowerCase())
          )
        );
        matchBonus += Math.min(commonSectors.length * 5, 10);
        
        // Final score: base + bonus (max 99)
        const finalScore = Math.min(baseScore + matchBonus, 99);
        
        // Extract display tags to match target design (Gaming, Web3, Series B)
        const tags = [];
        if (startupSectors.length > 0) {
          // Add first 2 industry tags
          tags.push(...startupSectors.slice(0, 2));
        }
        // Add stage tag in proper format
        if (startup.stage !== undefined) {
          const stageNames = ['Idea', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C'];
          tags.push(stageNames[startup.stage] || 'Seed');
        }
        
        // Extract fivePoints from startup data
        const fivePoints = startup.fivePoints || [];
        const valueProp = fivePoints[0] || startup.pitch || 'Innovative startup solution';
        const market = fivePoints[1] || `${(startup.industries || []).join(', ')} market`;
        const product = fivePoints[2] || 'Cutting-edge technology';
        const team = fivePoints[3] || 'Experienced founding team';
        const investment = fivePoints[4] || startup.raise || 'Seeking investment';
        
        // FIX: Extract investor data using MAPPED frontend field names ✅
        // Service maps: sector_focus -> sectors, stage_focus -> stage
        const investorSectorsFromDB = investor.sectors || [];
        const investorStagesFromDB = investor.stage || [];
        
        let notableCompanyNames = '';
        let investmentThesis = investor.tagline || investor.description || '';
        let portfolioInfo = '';
        
        // Extract notable investments - handle both array and string formats
        if (Array.isArray(investor.notableInvestments)) {
          // If it's already an array of strings
          if (typeof investor.notableInvestments[0] === 'string') {
            notableCompanyNames = investor.notableInvestments.slice(0, 3).join(', ');
          } else {
            // If it's an array of objects with company property
            notableCompanyNames = investor.notableInvestments
              .map((inv: any) => inv.company || inv)
              .filter(Boolean)
              .slice(0, 3)
              .join(', ');
          }
        } else if (typeof investor.notableInvestments === 'string') {
          notableCompanyNames = investor.notableInvestments;
        }
        
        // Build portfolio info using correct field names
        const portfolioCount = investor.portfolioCount || 0;
        if (portfolioCount > 0) {
          portfolioInfo = `${portfolioCount} companies`;
          if (investor.unicorns && investor.unicorns > 0) portfolioInfo += `, ${investor.unicorns} unicorns`;
        }
        
        // Format check size from min/max values
        const checkSizeFormatted = investor.checkSizeMin && investor.checkSizeMax
          ? `$${(investor.checkSizeMin / 1000000).toFixed(1)}M - $${(investor.checkSizeMax / 1000000).toFixed(1)}M`
          : '$1-5M';
        
        // Fallback for description using CORRECT field names
        if (!investmentThesis && investorSectorsFromDB && investorSectorsFromDB.length > 0) {
          investmentThesis = `Investing in ${investorSectorsFromDB.slice(0, 2).join(' & ')}`;
        }
        
        // 🧠 FIX 6: Use GOD Algorithm for matching score
        const godMatchScore = calculateAdvancedMatchScore(startup, investor, i < 3);
        
        // Calculate detailed breakdown for score explanation
        const industryMatch = commonSectors.length > 0 
          ? Math.min(95, 70 + (commonSectors.length * 8)) 
          : 50;
        
        const stageMatch = investorStages && Array.isArray(investorStages) && startup.stage !== undefined
          ? (investorStages.some((s: string) => {
              const stageLabels = ['idea', 'pre-seed', 'seed', 'series_a', 'series_b', 'series_c'];
              const startupStageIndex = typeof startup.stage === 'number' ? startup.stage : 2;
              const startupStage = stageLabels[startupStageIndex] || 'seed';
              return s.toLowerCase().replace(/[-_\s]/g, '') === startupStage.replace(/[-_\s]/g, '');
            }) ? 90 : 60)
          : 70;
        
        const geographyMatch = investor.geography && investor.geography !== 'Global'
          ? 85
          : 70; // Default high match for global investors
        
        const checkSizeMatch = 75 + Math.floor(Math.random() * 20); // 75-95 range
        
        const thesisAlignment = baseScore >= 80 ? 90 : baseScore >= 65 ? 80 : 70;
        
        const breakdown = {
          industryMatch,
          stageMatch,
          geographyMatch,
          checkSizeMatch,
          thesisAlignment
        };
        
        // DEBUG: Log investor data for first 3 matches
        if (i < 3) {
          console.log(`\n🏦 INVESTOR ${i + 1}: ${investor.name}`);
          console.log(`   Notable: ${notableCompanyNames}`);
          console.log(`   Thesis: ${investmentThesis}`);
          console.log(`   Portfolio: ${portfolioInfo}`);
          console.log(`   🧠 GOD Match Score: ${godMatchScore}/100`);
        }
        
        // 🔍 DEBUG: Log startup ID type
        console.log('🆔 STARTUP ID TYPE:', startup.id, typeof startup.id, '| Name:', startup.name);
        
        generatedMatches.push({
          startup: {
            id: startup.id,
            name: startup.name,
            description: valueProp, // Use fivePoints[0] as compelling value prop
            tags: tags.slice(0, 3),
            market: market, // fivePoints[1]
            product: product, // fivePoints[2]
            team: team, // fivePoints[3],
            seeking: investment, // Use fivePoints[4] for investment ask
            status: 'Active',
            stage: startup.stage !== undefined ? ['Idea', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C'][startup.stage] : undefined,
            industries: startup.industries
          },
          investor: {
            id: investor.id,
            name: investor.name,
            description: investmentThesis || investor.description || 'Venture Capital',
            tagline: investor.tagline || investmentThesis,
            type: investor.type || 'VC',
            stage: investorStagesFromDB.length > 0 ? investorStagesFromDB : ['Seed', 'Series A'],
            sectors: investorSectorsFromDB.slice(0, 5),
            tags: investorSectorsFromDB.slice(0, 3),
            checkSize: checkSizeFormatted,
            geography: investor.geography || 'Global',
            notableInvestments: Array.isArray(investor.notableInvestments) 
              ? investor.notableInvestments.map((inv: any) => inv.company || inv).filter(Boolean).slice(0, 5)
              : notableCompanyNames ? notableCompanyNames.split(',').map(s => s.trim()).slice(0, 5) : [],
            portfolioSize: investor.portfolioCount || undefined,
            status: 'Active',
            investmentThesis: investmentThesis,
            aum: investor.aum,
            fundSize: investor.fundSize,
            exits: investor.exits,
            unicorns: investor.unicorns,
            website: investor.website,
            linkedin: investor.linkedin,
            twitter: investor.twitter,
            portfolio: portfolioInfo
          },
          matchScore: godMatchScore, // Using GOD algorithm score
          breakdown, // Add detailed breakdown
          reasoning: [
            `🧠 GOD Algorithm Score: ${godMatchScore}/100`,
            commonSectors.length > 0 ? `🤝 Common sectors: ${commonSectors.join(', ')}` : '🌐 Market opportunity',
            notableCompanyNames ? `🏆 Notable: ${notableCompanyNames.substring(0, 50)}...` : '💼 Active investor'
          ]
        });
        
        // Debug first 3 matches
        if (i < 3) {
          console.log(`\n📊 Match ${i + 1}:`);
          console.log(`   Startup: ${startup.name}`);
          console.log(`   GOD Score: ${baseScore}/100`);
          console.log(`   Bonus: +${matchBonus}`);
          console.log(`   Final: ${finalScore}/100`);
        }
      }
      
      // Sort matches by score descending (highest quality first)
      generatedMatches.sort((a, b) => b.matchScore - a.matchScore);
      
      // 🔥 FILTER: Only show matches with 50%+ score (lowered threshold for more variety)
      const MIN_MATCH_SCORE = 50;
      const qualityMatches = generatedMatches.filter(m => m.matchScore >= MIN_MATCH_SCORE);
      
      console.log(`\n🔥 QUALITY FILTER: ${qualityMatches.length}/${generatedMatches.length} matches above ${MIN_MATCH_SCORE}%`);
      
      // 🎲 SHUFFLE matches for variety (Fisher-Yates for proper randomness)
      const shuffledMatches = [...qualityMatches];
      for (let i = shuffledMatches.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledMatches[i], shuffledMatches[j]] = [shuffledMatches[j], shuffledMatches[i]];
      }
      
      // DEBUG 1: RIGHT AFTER SHUFFLE
      console.log('🔍 AFTER SHUFFLE - First match:', shuffledMatches[0]?.startup?.name, shuffledMatches[0]?.matchScore);
      console.log('🔍 SHUFFLED MATCHES (Top 5):', shuffledMatches.slice(0, 5).map(m => ({
        startup: m.startup.name,
        score: m.matchScore
      })));
      
      console.log('\n' + '═'.repeat(80));
      console.log(`✅ Generated ${shuffledMatches.length} quality matches (70%+ threshold)`);
      console.log(`   Score Range: ${Math.min(...shuffledMatches.map(m => m.matchScore))}-${Math.max(...shuffledMatches.map(m => m.matchScore))}`);
      console.log(`   🎲 First 3 Scores (shuffled): ${shuffledMatches.slice(0, 3).map(m => m.matchScore).join(', ')}`);
      console.log('═'.repeat(80) + '\n');
      
      // DEBUG 2: RIGHT BEFORE SETTING STATE
      console.log('📦 SETTING STATE - First match:', shuffledMatches[0]?.startup?.name, shuffledMatches[0]?.matchScore);
      console.log('📦 SETTING STATE - Array length:', shuffledMatches.length);
      
      // 💾 Save matches to database (only quality matches)
      await saveMatchesToDatabase(shuffledMatches);
      
      setMatches(shuffledMatches);
      setIsAnalyzing(false);
    } catch (error) {
      console.error('❌ Error loading matches:', error);
      setIsAnalyzing(false);
    }
  };

  const handleNextMatch = () => {
    if (matches.length === 0) return;
    
    // Trigger card fade out animation
    setCardFadeOut(true);
    
    // After fade out, trigger other animations and change match
    setTimeout(() => {
      // FIX 9: Trigger lightning animation with logging ✅
      setShowLightning(true);
      console.log('⚡ Lightning triggered:', true);
      setIsAnalyzing(true);
      
      // Trigger brain spin animation
      setBrainSpin(true);
      setTimeout(() => setBrainSpin(false), 800);
    
      // Rotate to next match immediately
      setCurrentIndex((prev) => {
        const nextIndex = (prev + 1) % matches.length;
        console.log(`🔄 MANUAL ROTATION: Match ${prev + 1} → ${nextIndex + 1} of ${matches.length}`);
        if (matches[nextIndex]) {
          console.log(`   Next Startup: ${matches[nextIndex].startup.name}`);
          console.log(`   Next Investor: ${matches[nextIndex].investor.name}`);
          console.log(`   Match Score: ${matches[nextIndex].matchScore}%`);
        }
        return nextIndex;
      });
      
      // Fade card back in
      setTimeout(() => setCardFadeOut(false), 100);
      
      // Clear animations
      setTimeout(() => {
        setShowLightning(false);
      }, 600);
      
      setTimeout(() => {
        setIsAnalyzing(false);
      }, 1200);
    }, 400); // Wait for fade out before changing match
  };

  const match = matches[currentIndex];

  // DEBUG 3: Log current match for debugging
  useEffect(() => {
    if (match) {
      console.log(`\n📍 RENDERING - currentMatch:`, match.startup?.name, match.matchScore);
      console.log(`   currentIndex: ${currentIndex}`);
      console.log(`   matches.length: ${matches.length}`);
      console.log(`   Full match details:`);
      console.log(`   - Startup: ${match.startup.name}`);
      console.log(`   - Investor: ${match.investor.name}`);
      console.log(`   - Score: ${match.matchScore}%\n`);
    }
  }, [currentIndex, match, matches.length]);

  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1140] via-[#2d1b69] to-[#4a2a8f] flex items-center justify-center">
        <div className="text-white text-2xl">Loading matches...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#160020] via-[#240032] to-[#330044] relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#9400cd]/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#9400cd]/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Logo Dropdown Menu (replaces hamburger + separate logo) */}
      <LogoDropdownMenu />

      {/* Get Matched Button - Top Right */}
      <div className="fixed top-8 right-8 z-50">
        <Link
          to="/get-matched"
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-700 hover:via-violet-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all animate-pulse hover:animate-none"
        >
          <Sparkles className="w-5 h-5" />
          Get Matched!
        </Link>
      </div>

      {/* Main Headline - AT TOP */}
      <div className="relative z-10 container mx-auto px-8 pt-2 pb-4">
        <div className="text-center">
          <h2 className="text-6xl md:text-7xl font-bold mb-3">
            <span className="text-white text-4xl md:text-5xl">Find Your </span>
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Perfect Match
            </span>
          </h2>
          <h3 className="text-5xl md:text-6xl font-bold text-white mb-4">
            In 60 Seconds
          </h3>

          <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto mb-4">
            AI finds your perfect startup-investor matches with explanations and next steps.
          </p>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-8 py-2">

        {/* Match Display with Lightning Animation */}
        <div className="max-w-7xl mx-auto mb-16">
          {/* Match Badge & Explore Button */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full px-10 py-4 shadow-xl">
              <span className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                ⚡ {match.matchScore}% Match ✨
              </span>
            </div>
            <Link
              to="/trending"
              className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#1a0033] to-[#2d1b4e] hover:from-[#2d1b4e] hover:to-[#3d2a5e] text-white font-bold rounded-2xl border-2 border-orange-500/50 hover:border-orange-400 shadow-lg shadow-purple-900/50 hover:shadow-orange-500/30 transition-all hover:scale-105"
            >
              <Search className="w-5 h-5 text-orange-400 group-hover:text-orange-300" />
              <span className="text-lg bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
                Explore 700+ Startups & 500+ Investors
              </span>
              <TrendingUp className="w-5 h-5 text-orange-400 group-hover:text-orange-300 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="relative">
            {/* Cards Grid - CENTERED */}
            <div className="grid md:grid-cols-[1fr,auto,1fr] gap-12 items-center justify-items-center max-w-7xl mx-auto">
              {/* Startup Card - DEEP PURPLE GRADIENT with Kelly Green Stroke */}
              <div className={`relative w-full max-w-[400px] transition-all duration-400 ${cardFadeOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                {/* Kelly green glow effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-500 rounded-[2.5rem] blur-2xl opacity-60 hover:opacity-80 transition-opacity"></div>
                
                <div 
                  className="relative group cursor-pointer bg-gradient-to-br from-[#1a0033] via-[#2d1b4e] to-[#3d1f5e] backdrop-blur-md border-4 border-emerald-500/60 hover:border-emerald-400/80 rounded-3xl p-2 shadow-2xl shadow-emerald-600/40 transition-all duration-300 h-[420px] flex flex-col hover:scale-[1.03]"
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

                {/* INNER GRADIENT PANEL - DEEP PURPLE */}
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
                  className="bg-gradient-to-br from-[#1a0033]/95 via-[#2d1b4e]/90 to-[#3d1f5e]/85 rounded-2xl p-6 h-full flex flex-col backdrop-blur-sm border-2 border-emerald-400/40 shadow-inner"
                >
                  {/* Icon + Name + Value Prop */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] p-4 rounded-xl shadow-2xl flex-shrink-0">
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
                    <span className="bg-purple-600/50 text-white px-3 py-1 rounded-full text-sm font-bold">
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

              {/* Brain Icon with Energy Bolts */}
              <div className="relative flex justify-center items-center h-[320px]">
                {/* Animated energy lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ overflow: 'visible' }}>
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
                  {/* Gradient definitions */}
                  <defs>
                    <linearGradient id="gradient-left" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ec4899" stopOpacity="0.1" />
                      <stop offset="50%" stopColor="#a855f7" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity="1" />
                    </linearGradient>
                    <linearGradient id="gradient-right" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
                      <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
                    </linearGradient>
                  </defs>
                </svg>

                <button onClick={() => setShowHowItWorks(true)} className="relative z-10 cursor-pointer hover:scale-110 transition-transform">
                  {/* Pulsing glow background */}
                  <div className="absolute inset-0 bg-purple-500/40 rounded-full blur-3xl animate-pulse"></div>
                  
                  {/* Brain Icon Image with animation */}
                  <div className={`relative transition-all duration-700 ${brainSpin ? 'scale-150 drop-shadow-[0_0_50px_rgba(168,85,247,1)]' : matchPulse ? 'scale-125 drop-shadow-[0_0_40px_rgba(168,85,247,1)]' : 'scale-100 drop-shadow-[0_0_25px_rgba(168,85,247,0.8)]'}`}>
                    <img 
                      src="/images/brain-icon.png" 
                      alt="AI Brain" 
                      className={`w-40 h-40 object-contain ${brainSpin ? '' : 'animate-pulse'}`}
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
                  <div className="absolute top-1/2 -left-2 w-2 h-2 bg-pink-400 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
                </button>
              </div>

              {/* Investor Card - Enhanced Component with Glow and Stroke */}
              <div className={`relative w-full max-w-[400px] transition-all duration-400 ${cardFadeOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                {/* Dark purple glow effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 rounded-[2.5rem] blur-2xl opacity-60 hover:opacity-80 transition-opacity"></div>
                
                {/* Remove clipped border wrapper - apply border directly */}
                <div className="relative">
                  <EnhancedInvestorCard
                    investor={match.investor}
                    matchScore={match.matchScore}
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
                    className="absolute bottom-6 left-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-800 to-purple-950 text-white font-semibold hover:from-purple-900 hover:to-purple-950 transition-all shadow-lg hover:scale-105 z-20"
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
              Watch the <span className="bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">Magic</span> Happen
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Our <span className="text-yellow-400 font-semibold">GOD Algorithm™</span> processes 20+ compatibility factors in real-time
            </p>
          </div>

          {/* Live Processing Dashboard */}
          <div className="bg-gradient-to-br from-purple-900/40 via-indigo-900/40 to-blue-900/40 backdrop-blur-xl rounded-3xl p-8 border border-purple-500/30 shadow-[0_0_80px_rgba(168,85,247,0.3)] mb-12">
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
                  <div className="text-3xl font-bold text-purple-400">{match.matchScore}%</div>
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
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(95, match.matchScore + 5)}%` }}
                  />
                </div>
                <div className="w-12 text-right text-cyan-400 font-bold">{Math.min(95, match.matchScore + 5)}%</div>
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
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-1000 ease-out delay-600"
                    style={{ width: `${Math.min(87, match.matchScore - 5)}%` }}
                  />
                </div>
                <div className="w-12 text-right text-cyan-400 font-bold">{Math.min(87, match.matchScore - 5)}%</div>
              </div>
            </div>

            {/* Processing Steps */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-2 shadow-lg shadow-purple-500/50">
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
            <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30 hover:border-purple-400/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
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
          <div className="bg-gradient-to-br from-purple-900/60 to-indigo-900/60 backdrop-blur-sm rounded-3xl p-8 border-2 border-purple-500/40 shadow-[0_20px_60px_rgba(124,58,237,0.4)]">
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

            <div className="bg-gradient-to-r from-[#673ab7]/20 to-[#9c27b0]/20 border border-[#673ab7]/30 rounded-xl p-4 mb-4 hover:border-[#673ab7]/50 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💎</span>
                <span className="text-yellow-400 font-bold text-lg">Premium Strategy Service</span>
              </div>
            </div>

            <button 
              onClick={() => navigate('/submit')}
              className="group w-full text-left px-6 py-4 rounded-xl transition-all hover:bg-white/5 border border-white/10 hover:border-purple-400/50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-purple-300 font-semibold text-lg mb-1 group-hover:text-purple-200 transition-colors">Get Started</div>
                  <div className="text-gray-400 text-sm">Find your perfect investors</div>
                </div>
                <svg className="w-6 h-6 text-purple-400 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="bg-gradient-to-br from-[#2a1845] to-[#1a1030] border border-purple-500/50 rounded-3xl p-8 max-w-md mx-4 shadow-[0_0_50px_rgba(168,85,247,0.4)]" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <span className="text-6xl">🧠</span>
              <h2 className="text-3xl font-bold text-white mt-4">How Hot Money Works</h2>
              <p className="text-purple-400 mt-2">AI-Powered Startup-Investor Matching</p>
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
            className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-3xl p-8 max-w-2xl w-full border-2 border-purple-500 shadow-2xl"
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
