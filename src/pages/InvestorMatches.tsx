import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Rocket, 
  Briefcase, 
  Zap, 
  Target, 
  TrendingUp,
  ExternalLink,
  Linkedin,
  Globe,
  Loader2,
  Sparkles,
  ChevronRight,
  Filter,
  SortDesc,
  DollarSign,
  Users,
  BarChart3,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const REMATCH_COUNT_KEY = 'hotmatch_investor_rematch_count';
const MAX_FREE_REMATCHES = 1;
const FREE_MATCH_LIMIT = 3;

interface Investor {
  id: string;
  name: string;
  firm?: string;
  bio?: string;
  investment_thesis?: string;
  sectors?: string[];
  stage?: string[];
  check_size_min?: number;
  check_size_max?: number;
  linkedin_url?: string;
  blog_url?: string;
  geography_focus?: string[];
}

interface MatchedStartup {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  website?: string;
  sectors?: string[];
  stage?: string;
  total_god_score?: number;
  raise_amount?: string;
  location?: string;
  has_revenue?: boolean;
  has_customers?: boolean;
  team_size?: number;
  match_score: number;
}

export default function InvestorMatches() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [investor, setInvestor] = useState<Investor | null>(null);
  const [matches, setMatches] = useState<MatchedStartup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMatching, setIsMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'score' | 'god' | 'name'>('score');
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const [rematchCount, setRematchCount] = useState(0);
  const [matchingStatus, setMatchingStatus] = useState<string>('');

  // Load rematch count from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`${REMATCH_COUNT_KEY}_${id}`);
    if (saved) setRematchCount(parseInt(saved, 10));
  }, [id]);

  const canRematch = rematchCount < MAX_FREE_REMATCHES;

  // Generate matches for an investor
  const generateMatches = useCallback(async (investorId: string, investorData: Investor) => {
    setIsMatching(true);
    setMatchingStatus('Analyzing investor profile...');

    try {
      // Get all approved startups
      setMatchingStatus('Finding compatible startups...');
      const { data: startups } = await supabase
        .from('startup_uploads')
        .select('id, name, sectors, stage, total_god_score')
        .eq('status', 'approved')
        .limit(200);

      if (!startups || startups.length === 0) {
        setMatchingStatus('No startups found');
        setIsMatching(false);
        return;
      }

      setMatchingStatus(`Scoring ${startups.length} startups...`);

      // Simple matching algorithm
      const matchResults: { startup_id: string; score: number }[] = [];
      const investorSectors = investorData.sectors || [];
      const investorStages = investorData.stage || [];

      for (const startup of startups) {
        let score = 50; // Base score

        // Sector match (+20 points for each matching sector)
        const startupSectors = startup.sectors || [];
        const sectorMatches = startupSectors.filter((s: string) => 
          investorSectors.some((is: string) => 
            is.toLowerCase().includes(s.toLowerCase()) || 
            s.toLowerCase().includes(is.toLowerCase())
          )
        );
        score += sectorMatches.length * 20;

        // Stage match (+15 points)
        const startupStage = startup.stage?.toLowerCase() || '';
        if (investorStages.some((is: string) => is.toLowerCase().includes(startupStage))) {
          score += 15;
        }

        // GOD score bonus (+10 if high GOD score)
        if (startup.total_god_score && startup.total_god_score >= 70) {
          score += 10;
        }

        // Cap at 99
        score = Math.min(99, score);

        if (score >= 50) {
          matchResults.push({ startup_id: startup.id, score });
        }
      }

      // Sort by score and take top 25
      matchResults.sort((a, b) => b.score - a.score);
      const topMatches = matchResults.slice(0, 25);

      setMatchingStatus(`Saving ${topMatches.length} matches...`);

      // Delete existing matches for this investor
      await supabase
        .from('startup_investor_matches')
        .delete()
        .eq('investor_id', investorId);

      // Insert new matches
      if (topMatches.length > 0) {
        const matchInserts = topMatches.map(m => ({
          startup_id: m.startup_id,
          investor_id: investorId,
          match_score: m.score,
        }));

        await supabase
          .from('startup_investor_matches')
          .insert(matchInserts);
      }

      setMatchingStatus('Done!');
      
      // Reload matches
      await loadInvestorAndMatches(investorId);

    } catch (err) {
      console.error('Matching error:', err);
      setMatchingStatus('Error generating matches');
    } finally {
      setIsMatching(false);
    }
  }, []);

  const handleRematch = async () => {
    if (!canRematch || !investor || !id) return;

    // Increment rematch count
    const newCount = rematchCount + 1;
    setRematchCount(newCount);
    localStorage.setItem(`${REMATCH_COUNT_KEY}_${id}`, newCount.toString());

    await generateMatches(id, investor);
  };

  useEffect(() => {
    if (id) {
      loadInvestorAndMatches(id);
    }
  }, [id]);

  // Auto-trigger matching when investor has no matches
  useEffect(() => {
    if (investor && matches.length === 0 && !isLoading && !isMatching && id) {
      generateMatches(id, investor);
    }
  }, [investor, matches.length, isLoading, isMatching, id, generateMatches]);

  const loadInvestorAndMatches = async (investorId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Load investor details
      const { data: investorData, error: investorError } = await supabase
        .from('investors')
        .select('id, name, firm, bio, investment_thesis, sectors, stage, check_size_min, check_size_max, linkedin_url, blog_url, geography_focus')
        .eq('id', investorId)
        .single();

      if (investorError || !investorData) {
        setError('Investor not found');
        setIsLoading(false);
        return;
      }

      setInvestor(investorData);

      // Load matches
      const { data: matchData, error: matchError } = await supabase
        .from('startup_investor_matches')
        .select(`
          match_score,
          startup_id
        `)
        .eq('investor_id', investorId)
        .order('match_score', { ascending: false })
        .limit(50);

      if (matchError) {
        console.error('Error loading matches:', matchError);
      }

      if (matchData && matchData.length > 0) {
        const startupIds = matchData.map(m => m.startup_id).filter(Boolean);
        
        const { data: startups } = await supabase
          .from('startup_uploads')
          .select('id, name, tagline, description, website, sectors, stage, total_god_score, raise_amount, location, has_revenue, has_customers, team_size')
          .in('id', startupIds);

        if (startups) {
          const startupMap = new Map(startups.map(s => [s.id, s]));
          const matchedStartups: MatchedStartup[] = matchData
            .filter(m => startupMap.has(m.startup_id))
            .map(m => ({
              ...startupMap.get(m.startup_id)!,
              match_score: m.match_score,
            }));
          
          setMatches(matchedStartups);
        }
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load matches');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCheckSize = (min?: number, max?: number): string => {
    if (!min && !max) return 'Undisclosed';
    const formatNum = (n: number) => {
      if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
      if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
      return `$${n}`;
    };
    if (min && max) return `${formatNum(min)} - ${formatNum(max)}`;
    if (min) return `${formatNum(min)}+`;
    if (max) return `Up to ${formatNum(max)}`;
    return 'Undisclosed';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-amber-500 to-yellow-500';
    return 'from-orange-500 to-red-500';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { text: 'Hot Deal 🔥', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
    if (score >= 60) return { text: 'Strong Fit', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    return { text: 'Potential', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
  };

  const getGodScoreBadge = (score?: number) => {
    if (!score) return null;
    if (score >= 80) return { text: 'Elite', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
    if (score >= 60) return { text: 'Strong', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    if (score >= 40) return { text: 'Promising', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
    return null;
  };

  // Get unique sectors from all matches for filtering
  const allSectors = [...new Set(matches.flatMap(m => m.sectors || []))].sort();

  // Filter and sort matches
  const sortedMatches = matches
    .filter(m => !filterSector || m.sectors?.includes(filterSector))
    .sort((a, b) => {
      if (sortBy === 'score') return b.match_score - a.match_score;
      if (sortBy === 'god') return (b.total_god_score || 0) - (a.total_god_score || 0);
      return (a.name || '').localeCompare(b.name || '');
    });

  // Limit to 3 free matches
  const filteredMatches = sortedMatches.slice(0, FREE_MATCH_LIMIT);
  const hiddenMatchCount = Math.max(0, sortedMatches.length - FREE_MATCH_LIMIT);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Finding hot deals for you...</p>
        </div>
      </div>
    );
  }

  if (error || !investor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Investor Not Found</h2>
          <p className="text-gray-400 mb-6">{error || 'The investor profile you\'re looking for doesn\'t exist.'}</p>
          <Link 
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#1a1a1a]">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <Link to="/" className="text-2xl font-bold">
              <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                Hot Match
              </span>
            </Link>
            <div className="w-20" /> {/* Spacer */}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Investor Hero Card */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-white">{investor.name}</h1>
                  {investor.firm && (
                    <span className="text-amber-400 font-medium">@ {investor.firm}</span>
                  )}
                </div>
                {investor.bio && (
                  <p className="text-gray-300 mb-3 line-clamp-2">{investor.bio}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-green-500/20 text-green-300 text-sm rounded-full border border-green-500/30">
                    💰 {formatCheckSize(investor.check_size_min, investor.check_size_max)}
                  </span>
                  {investor.stage?.slice(0, 2).map((stage, idx) => (
                    <span key={idx} className="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full border border-purple-500/30">
                      {stage}
                    </span>
                  ))}
                  {investor.sectors?.slice(0, 3).map((sector, idx) => (
                    <span key={idx} className="px-3 py-1 bg-slate-700 text-gray-300 text-sm rounded-full">
                      {sector}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                {investor.linkedin_url && (
                  <a 
                    href={investor.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl transition-colors"
                  >
                    <Linkedin className="w-5 h-5 text-blue-400" />
                  </a>
                )}
                {investor.blog_url && (
                  <a 
                    href={investor.blog_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <Globe className="w-5 h-5 text-gray-400" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="max-w-4xl mx-auto mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-amber-400" />
              <h2 className="text-xl font-bold text-white">
                {matches.length} Startup Matches
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Re-match Button */}
              {canRematch ? (
                <button
                  onClick={handleRematch}
                  disabled={isMatching}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold rounded-lg text-sm hover:from-emerald-400 hover:to-green-400 transition-all disabled:opacity-50"
                >
                  {isMatching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Re-match
                </button>
              ) : (
                <Link
                  to="/investor/signup"
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-gray-300 rounded-lg text-sm hover:bg-slate-600 transition-colors border border-white/10"
                >
                  <Lock className="w-4 h-4" />
                  Sign up for more
                </Link>
              )}
              
              {/* Sector Filter */}
              {allSectors.length > 0 && (
                <div className="relative">
                  <select
                    value={filterSector || ''}
                    onChange={(e) => setFilterSector(e.target.value || null)}
                    className="appearance-none bg-slate-800 border border-white/10 rounded-lg px-4 py-2 pr-8 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">All Sectors</option>
                    {allSectors.map(sector => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>
                  <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              )}
              
              {/* Sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'score' | 'god' | 'name')}
                  className="appearance-none bg-slate-800 border border-white/10 rounded-lg px-4 py-2 pr-8 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="score">Match Score</option>
                  <option value="god">GOD Score</option>
                  <option value="name">Name A-Z</option>
                </select>
                <SortDesc className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Match Cards */}
        <div className="max-w-4xl mx-auto space-y-4">
          {filteredMatches.length === 0 ? (
            <div className="text-center py-16">
              {isMatching ? (
                <>
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-full flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Finding Hot Deals</h3>
                  <p className="text-emerald-400 mb-2 animate-pulse">{matchingStatus}</p>
                  <p className="text-gray-500 text-sm">This usually takes a few seconds...</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 mx-auto mb-6 bg-slate-800 rounded-full flex items-center justify-center">
                    <Rocket className="w-10 h-10 text-gray-600" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">No Matches Yet</h3>
                  <p className="text-gray-400 mb-6">We couldn't find any startup matches. Try updating your profile.</p>
                </>
              )}
            </div>
          ) : (
            filteredMatches.map((startup, idx) => {
              const badge = getScoreBadge(startup.match_score);
              const godBadge = getGodScoreBadge(startup.total_god_score);
              return (
                <div 
                  key={startup.id}
                  className="group bg-slate-800/50 border border-white/10 rounded-xl p-5 hover:border-emerald-500/30 hover:bg-slate-800/80 transition-all cursor-pointer"
                  onClick={() => navigate(`/startup/${startup.id}`)}
                >
                  <div className="flex items-start gap-4">
                    {/* Rank Badge */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-gray-900' :
                      idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-900' :
                      idx === 2 ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-white' :
                      'bg-slate-700 text-gray-400'
                    } font-bold`}>
                      {idx + 1}
                    </div>

                    {/* Startup Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                          {startup.name}
                        </h3>
                        {godBadge && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded border ${godBadge.color}`}>
                            GOD: {startup.total_god_score} • {godBadge.text}
                          </span>
                        )}
                      </div>
                      
                      {startup.tagline && (
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{startup.tagline}</p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {startup.stage && (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded border border-purple-500/30">
                            {startup.stage}
                          </span>
                        )}
                        {startup.sectors?.slice(0, 2).map((sector, sIdx) => (
                          <span key={sIdx} className="px-2 py-0.5 bg-slate-700 text-gray-300 text-xs rounded">
                            {sector}
                          </span>
                        ))}
                        {startup.raise_amount && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {startup.raise_amount}
                          </span>
                        )}
                        {startup.has_revenue && (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded border border-emerald-500/30 flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />
                            Revenue
                          </span>
                        )}
                        {startup.team_size && startup.team_size > 0 && (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {startup.team_size} team
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score & Actions */}
                    <div className="flex flex-col items-end gap-2">
                      <div className={`px-4 py-2 rounded-xl bg-gradient-to-r ${getScoreColor(startup.match_score)} text-white font-bold text-lg`}>
                        {startup.match_score}%
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${badge.color}`}>
                        {badge.text}
                      </span>
                      
                      {/* Quick Actions */}
                      {startup.website && (
                        <a 
                          href={startup.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Globe className="w-4 h-4 text-gray-400" />
                        </a>
                      )}
                    </div>

                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-emerald-400 transition-colors" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Unlock More Matches CTA */}
        {hiddenMatchCount > 0 && (
          <div className="max-w-4xl mx-auto mt-8">
            <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                +{hiddenMatchCount} More Startup Matches
              </h3>
              <p className="text-gray-400 mb-6">
                Sign up to unlock all your matches and get daily deal flow
              </p>
              <Link
                to="/investor/signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold rounded-xl hover:from-emerald-400 hover:to-green-400 transition-all"
              >
                <Sparkles className="w-5 h-5" />
                Unlock All Matches
              </Link>
              <p className="text-gray-500 text-sm mt-4">
                Free signup • No credit card required
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
