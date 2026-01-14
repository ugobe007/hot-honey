/**
 * Investor Match Search Page
 * 
 * Allows investors to search, filter, and investigate their startup matches
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Search, Filter, TrendingUp, Download, Info, 
  ChevronRight, Star, Building2, MapPin, DollarSign,
  Users, Sparkles, AlertCircle, CheckCircle2, Rocket, Zap, ArrowLeft, Home, Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE } from '@/lib/apiConfig';

interface Match {
  match_id: string;
  startup_id: string;
  investor_id: string;
  match_score: number;
  confidence_level: 'high' | 'medium' | 'low';
  reasoning: string;
  created_at: string;
  startup: {
    id: string;
    name: string;
    description?: string;
    tagline?: string;
    website?: string;
    sectors?: string[];
    stage?: number;
    location?: string;
    total_god_score?: number;
    traction_score?: number;
    team_score?: number;
    mrr?: number;
    arr?: number;
    growth_rate_monthly?: number;
    customer_count?: number;
    team_size?: number;
    funding_stage?: string;
    raise_amount?: number;
    extracted_data?: any;
  };
}

interface MatchStats {
  total: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  averageScore: number;
  averageGODScore: number;
  topSectors: { sector: string; count: number }[];
  topStages: { stage: string; count: number }[];
}

// Format funding amount and stage
function formatFundingAmount(raiseAmount?: number, fundingStage?: string): string {
  // If we have extracted_data, try to get funding info from there
  let amount = '';
  let stage = fundingStage || '';
  
  // Format amount
  if (raiseAmount && raiseAmount > 0) {
    if (raiseAmount >= 1000000) {
      amount = `$${(raiseAmount / 1000000).toFixed(1)}M`;
    } else if (raiseAmount >= 1000) {
      amount = `$${(raiseAmount / 1000).toFixed(0)}K`;
    } else {
      amount = `$${raiseAmount}`;
    }
  }
  
  // If no stage but we have amount, try to infer from amount
  if (!stage && amount) {
    const numAmount = raiseAmount || 0;
    if (numAmount >= 10000000) {
      stage = 'Series A+';
    } else if (numAmount >= 2000000) {
      stage = 'Seed';
    } else if (numAmount >= 500000) {
      stage = 'Pre-seed';
    }
  }
  
  // Return formatted string
  if (amount && stage) {
    return `${amount} ${stage}`;
  } else if (amount) {
    return `${amount} round`;
  } else if (stage) {
    return `Seeking ${stage}`;
  }
  return 'Seeking investment';
}

export default function InvestorMatchSearch() {
  const { investorId } = useParams<{ investorId: string }>();
  const navigate = useNavigate();
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    minScore: undefined as number | undefined,
    minGODScore: undefined as number | undefined,
    godScoreRange: '' as '' | 'elite' | 'high' | 'quality' | 'good' | 'any',
    confidenceLevel: '' as '' | 'high' | 'medium' | 'low',
    hasRevenue: undefined as boolean | undefined,
    minMRR: undefined as number | undefined,
    minARR: undefined as number | undefined,
    minGrowthRate: undefined as number | undefined,
    sectors: [] as string[],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (investorId) {
      loadMatches();
      loadStats();
    }
  }, [investorId, filters]);

  const loadMatches = async () => {
    if (!investorId) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (filters.minScore !== undefined) {
        params.append('minScore', filters.minScore.toString());
      }
      if (filters.minGODScore !== undefined) {
        params.append('minGODScore', filters.minGODScore.toString());
      }
      if (filters.godScoreRange) {
        params.append('godScoreRange', filters.godScoreRange);
      }
      if (filters.confidenceLevel) {
        params.append('confidenceLevel', filters.confidenceLevel);
      }
      if (filters.hasRevenue !== undefined) {
        params.append('hasRevenue', filters.hasRevenue.toString());
      }
      if (filters.minMRR !== undefined) {
        params.append('minMRR', filters.minMRR.toString());
      }
      if (filters.minARR !== undefined) {
        params.append('minARR', filters.minARR.toString());
      }
      if (filters.minGrowthRate !== undefined) {
        params.append('minGrowthRate', filters.minGrowthRate.toString());
      }
      if (filters.sectors.length > 0) {
        params.append('sectors', filters.sectors.join(','));
      }
      
      params.append('sortBy', 'score');
      params.append('sortOrder', 'desc');
      params.append('limit', '50');

      const response = await fetch(`${API_BASE}/api/matches/investor/${investorId}?${params}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setMatches(data.data.matches || []);
      } else {
        throw new Error(data.error || 'Failed to load matches');
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      setError(error instanceof Error ? error.message : 'Failed to load matches');
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!investorId) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/matches/investor/${investorId}/stats`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleExport = async () => {
    if (!investorId) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/matches/investor/${investorId}/export`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `matches-investor-${investorId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting matches:', error);
      alert('Failed to export matches');
    }
  };

  const filteredMatches = matches.filter(match => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      match.startup.name.toLowerCase().includes(term) ||
      match.startup.sectors?.some(s => s.toLowerCase().includes(term)) ||
      match.startup.description?.toLowerCase().includes(term)
    );
  });

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-400 bg-green-400/20 border-green-400/30';
      case 'medium': return 'text-yellow-400 bg-yellow-400/20 border-cyan-400/30';
      case 'low': return 'text-red-400 bg-red-400/20 border-red-400/30';
      default: return 'text-gray-400 bg-gray-400/20 border-gray-400/30';
    }
  };

  const getGODScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-purple-400';
    if (score >= 70) return 'text-blue-400';
    if (score >= 60) return 'text-green-400';
    return 'text-yellow-400';
  };

  const getStageName = (stage?: number) => {
    if (stage === 1) return 'Pre-seed';
    if (stage === 2) return 'Seed';
    if (stage === 3) return 'Series A';
    if (stage === 4) return 'Series B';
    return `Stage ${stage || 'N/A'}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Navigation Bar */}
      <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 text-gray-300 hover:text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <Link
              to="/"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 text-gray-300 hover:text-white transition-all flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
            <Link
              to="/admin/control"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 text-gray-300 hover:text-white transition-all flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Control Center
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-white">
            <span className="block">Perfect Matches</span>
            <span className="block">... in Seconds</span>
          </h1>
          <p className="text-gray-400">
            Search and filter startup matches to find high-quality investment opportunities
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
              <div className="text-sm text-gray-400 mb-1">Total Matches</div>
              <div className="text-3xl font-bold text-cyan-400">{stats.total}</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
              <div className="text-sm text-gray-400 mb-1">High Confidence</div>
              <div className="text-3xl font-bold text-emerald-400">{stats.highConfidence}</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
              <div className="text-sm text-gray-400 mb-1">Avg GOD Score</div>
              <div className="text-3xl font-bold text-purple-400">{stats.averageGODScore.toFixed(1)}</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
              <div className="text-sm text-gray-400 mb-1">Avg Match Score</div>
              <div className="text-3xl font-bold text-blue-400">{stats.averageScore.toFixed(1)}</div>
            </div>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search startups by name, sector, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-all ${
                showFilters
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                  : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-lg border border-gray-600 bg-gray-700/50 text-gray-300 hover:bg-gray-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Min Match Score</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.minScore || ''}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    minScore: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  placeholder="Any"
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">GOD Score Range</label>
                <select
                  value={filters.godScoreRange}
                  onChange={(e) => setFilters({ ...filters, godScoreRange: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white"
                >
                  <option value="">Any</option>
                  <option value="elite">Elite (80+)</option>
                  <option value="high">High (75-79)</option>
                  <option value="quality">Quality (70-74)</option>
                  <option value="good">Good (60-69)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Confidence</label>
                <select
                  value={filters.confidenceLevel}
                  onChange={(e) => setFilters({ ...filters, confidenceLevel: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white"
                >
                  <option value="">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Min MRR ($)</label>
                <input
                  type="number"
                  value={filters.minMRR || ''}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    minMRR: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  placeholder="Any"
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Min Growth Rate (%)</label>
                <input
                  type="number"
                  value={filters.minGrowthRate || ''}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    minGrowthRate: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  placeholder="Any"
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasRevenue"
                  checked={filters.hasRevenue === true}
                  onChange={(e) => setFilters({ ...filters, hasRevenue: e.target.checked ? true : undefined })}
                  className="w-4 h-4"
                />
                <label htmlFor="hasRevenue" className="text-sm text-gray-300">
                  Has Revenue
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-red-300 mb-1">Error Loading Matches</div>
              <div className="text-sm text-gray-300">{error}</div>
              <button
                onClick={() => {
                  setError(null);
                  loadMatches();
                }}
                className="text-red-400 hover:text-red-300 text-sm mt-2 underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Matches Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <div className="mt-4 text-gray-400">Loading matches...</div>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700">
            <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <div className="text-xl font-semibold mb-2">No matches found</div>
            <div className="text-gray-400">
              Try adjusting your filters or search terms
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMatches.map((match) => (
              <div
                key={match.match_id}
                onClick={() => setSelectedMatch(match)}
                className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 hover:border-blue-500/50 cursor-pointer transition-all group"
              >
                {/* Match Score & GOD Score */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold border ${getConfidenceColor(match.confidence_level)}`}>
                    {match.match_score}% Match
                  </div>
                  {match.startup.total_god_score && (
                    <div className={`px-2 py-1 rounded text-xs font-semibold ${getGODScoreColor(match.startup.total_god_score)} bg-gray-800/50`}>
                      GOD: {match.startup.total_god_score}
                    </div>
                  )}
                </div>

                {/* Startup Info */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-1 group-hover:text-blue-400 transition-colors">
                    {match.startup.name}
                  </h3>
                  {match.startup.tagline && (
                    <div className="text-gray-400 text-sm mb-2">{match.startup.tagline}</div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Rocket className="w-4 h-4" />
                    {getStageName(match.startup.stage)}
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="space-y-2 mb-4">
                  {match.startup.sectors && match.startup.sectors.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      <span>{match.startup.sectors.slice(0, 2).join(', ')}</span>
                    </div>
                  )}
                  {match.startup.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <MapPin className="w-4 h-4 text-green-400" />
                      <span>{match.startup.location}</span>
                    </div>
                  )}
                  {match.startup.mrr && (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <DollarSign className="w-4 h-4" />
                      <span>MRR: ${(match.startup.mrr / 1000).toFixed(0)}K</span>
                    </div>
                  )}
                  {match.startup.growth_rate_monthly && (
                    <div className="flex items-center gap-2 text-sm text-blue-400">
                      <TrendingUp className="w-4 h-4" />
                      <span>{match.startup.growth_rate_monthly}% MoM Growth</span>
                    </div>
                  )}
                  {match.startup.customer_count && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Users className="w-4 h-4 text-purple-400" />
                      <span>{match.startup.customer_count} Customers</span>
                    </div>
                  )}
                  {(match.startup.raise_amount || match.startup.funding_stage) && (
                    <div className="flex items-center gap-2 text-sm text-yellow-400 font-semibold">
                      <DollarSign className="w-4 h-4" />
                      <span>
                        {formatFundingAmount(match.startup.raise_amount, match.startup.funding_stage)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Reasoning Preview */}
                <div className="text-sm text-gray-400 line-clamp-2 mb-4">
                  {match.reasoning?.substring(0, 100)}...
                </div>

                {/* View Details */}
                <div className="flex items-center text-blue-400 text-sm group-hover:text-blue-300">
                  View Details
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Match Details Modal */}
        {selectedMatch && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Match Details</h2>
                  <button
                    onClick={() => setSelectedMatch(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Match Score */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-2">Match Score</div>
                    <div className="text-4xl font-bold text-blue-400">{selectedMatch.match_score}%</div>
                    <div className={`inline-block mt-2 px-3 py-1 rounded-full text-sm border ${getConfidenceColor(selectedMatch.confidence_level)}`}>
                      {selectedMatch.confidence_level.toUpperCase()} CONFIDENCE
                    </div>
                  </div>

                  {/* Startup Details */}
                  <div>
                    <h3 className="text-xl font-bold mb-4">Startup Information</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-gray-400">Name</div>
                        <div className="text-lg font-semibold">{selectedMatch.startup.name}</div>
                      </div>
                      {selectedMatch.startup.tagline && (
                        <div>
                          <div className="text-sm text-gray-400">Tagline</div>
                          <div className="text-lg">{selectedMatch.startup.tagline}</div>
                        </div>
                      )}
                      {selectedMatch.startup.sectors && selectedMatch.startup.sectors.length > 0 && (
                        <div>
                          <div className="text-sm text-gray-400">Sectors</div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedMatch.startup.sectors.map((sector, i) => (
                              <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-sm">
                                {sector}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedMatch.startup.total_god_score && (
                        <div>
                          <div className="text-sm text-gray-400">GOD Score</div>
                          <div className={`text-lg font-semibold ${getGODScoreColor(selectedMatch.startup.total_god_score)}`}>
                            {selectedMatch.startup.total_god_score}/100
                          </div>
                        </div>
                      )}
                      {selectedMatch.startup.mrr && (
                        <div>
                          <div className="text-sm text-gray-400">MRR</div>
                          <div className="text-lg text-green-400">${(selectedMatch.startup.mrr / 1000).toFixed(0)}K</div>
                        </div>
                      )}
                      {(selectedMatch.startup.raise_amount || selectedMatch.startup.funding_stage) && (
                        <div>
                          <div className="text-sm text-gray-400">Seeking Investment</div>
                          <div className="text-lg font-semibold text-yellow-400">
                            {formatFundingAmount(selectedMatch.startup.raise_amount, selectedMatch.startup.funding_stage)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reasoning */}
                  <div>
                    <h3 className="text-xl font-bold mb-4">Why This Match?</h3>
                    <div className="bg-gray-800/50 rounded-lg p-4 text-gray-300">
                      {selectedMatch.reasoning}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    {selectedMatch.startup.website && (
                      <a
                        href={selectedMatch.startup.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-center font-semibold transition-colors"
                      >
                        Visit Website
                      </a>
                    )}
                    <button
                      onClick={() => navigate(`/startup/${selectedMatch.startup.id}`)}
                      className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
                    >
                      View Full Profile
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

