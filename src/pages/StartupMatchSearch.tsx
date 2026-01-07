/**
 * Startup Match Search Page
 * 
 * Allows startup founders to search, filter, and investigate their investor matches
 * with smart filtering (top 25% or 60+ by default)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Search, Filter, TrendingUp, Download, Info, 
  ChevronRight, Star, Building2, MapPin, DollarSign,
  Users, Sparkles, AlertCircle, CheckCircle2, ArrowLeft, Home, Settings
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
  investor: {
    id: string;
    name: string;
    firm: string;
    title?: string;
    photo_url?: string;
    linkedin_url?: string;
    investor_tier?: string;
    investor_score?: number;
    sectors?: string[];
    stage?: string;
    geography_focus?: string[];
    check_size_min?: number;
    check_size_max?: number;
    portfolio_companies?: string[];
    leads_rounds?: boolean;
  };
}

interface MatchStats {
  total: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  averageScore: number;
  topSectors: { sector: string; count: number }[];
  topInvestorTiers: { tier: string; count: number }[];
}

export default function StartupMatchSearch() {
  const { startupId } = useParams<{ startupId: string }>();
  const navigate = useNavigate();
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    minScore: undefined as number | undefined,
    confidenceLevel: '' as '' | 'high' | 'medium' | 'low',
    investorTier: '' as '' | 'elite' | 'strong' | 'emerging',
    leadsRounds: undefined as boolean | undefined,
    activeInvestor: undefined as boolean | undefined,
    sectors: [] as string[],
    showAll: false, // Smart filtering by default
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [totalMatches, setTotalMatches] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [limitApplied, setLimitApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (startupId) {
      loadMatches();
      loadStats();
    }
  }, [startupId, filters]);

  const loadMatches = async () => {
    if (!startupId) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (filters.minScore !== undefined) {
        params.append('minScore', filters.minScore.toString());
      }
      if (filters.confidenceLevel) {
        params.append('confidenceLevel', filters.confidenceLevel);
      }
      if (filters.investorTier) {
        params.append('investorTier', filters.investorTier);
      }
      if (filters.leadsRounds !== undefined) {
        params.append('leadsRounds', filters.leadsRounds.toString());
      }
      if (filters.activeInvestor !== undefined) {
        params.append('activeInvestor', filters.activeInvestor.toString());
      }
      if (filters.sectors.length > 0) {
        params.append('sectors', filters.sectors.join(','));
      }
      if (filters.showAll) {
        params.append('showAll', 'true');
      }
      
      params.append('sortBy', 'score');
      params.append('sortOrder', 'desc');
      params.append('limit', '50');

      const response = await fetch(`${API_BASE}/api/matches/startup/${startupId}?${params}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setMatches(data.data.matches || []);
        setTotalMatches(data.data.total || 0);
        setFilteredTotal(data.data.filtered_total || 0);
        setLimitApplied(data.data.limit_applied || false);
      } else {
        throw new Error(data.error || 'Failed to load matches');
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      setError(error instanceof Error ? error.message : 'Failed to load matches');
      // Set empty state on error
      setMatches([]);
      setTotalMatches(0);
      setFilteredTotal(0);
      setLimitApplied(false);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!startupId) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/matches/startup/${startupId}/stats`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      } else {
        console.warn('Stats API returned error:', data.error);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      // Stats are optional, so we don't set error state here
    }
  };

  const handleExport = async () => {
    if (!startupId) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/matches/startup/${startupId}/export`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `matches-${startupId}.csv`;
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
      match.investor.name.toLowerCase().includes(term) ||
      match.investor.firm.toLowerCase().includes(term) ||
      match.investor.sectors?.some(s => s.toLowerCase().includes(term))
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

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'elite': return 'text-purple-400 bg-purple-400/20';
      case 'strong': return 'text-blue-400 bg-blue-400/20';
      case 'emerging': return 'text-cyan-400 bg-cyan-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
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
            Find Your Perfect Investor Match
          </h1>
          <p className="text-gray-400">
            Search and filter your investor matches to find the best fit for your startup
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
              <div className="text-sm text-gray-400 mb-1">Total Matches</div>
              <div className="text-3xl font-bold text-cyan-400">{stats.total}</div>
              {limitApplied && (
                <div className="text-xs text-cyan-400/70 mt-1">
                  Showing top {filteredTotal} (smart filtered)
                </div>
              )}
            </div>
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
              <div className="text-sm text-gray-400 mb-1">High Confidence</div>
              <div className="text-3xl font-bold text-emerald-400">{stats.highConfidence}</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
              <div className="text-sm text-gray-400 mb-1">Average Score</div>
              <div className="text-3xl font-bold text-blue-400">{stats.averageScore.toFixed(1)}</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
              <div className="text-sm text-gray-400 mb-1">Top Sector</div>
              <div className="text-2xl font-bold text-purple-400">
                {stats.topSectors[0]?.sector || 'N/A'}
              </div>
            </div>
          </div>
        )}

        {/* Smart Filtering Notice */}
        {limitApplied && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-blue-300 mb-1">Smart Filtering Active</div>
              <div className="text-sm text-gray-300">
                Showing top 25% of matches or matches above 60 (whichever is higher).
                You're seeing {filteredTotal} of {totalMatches} total matches.
              </div>
              <button
                onClick={() => setFilters({ ...filters, showAll: true })}
                className="text-blue-400 hover:text-blue-300 text-sm mt-2 underline"
              >
                Show all matches
              </button>
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
                placeholder="Search investors by name, firm, or sector..."
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
            <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Min Score</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.minScore || ''}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    minScore: e.target.value ? parseInt(e.target.value) : undefined,
                    showAll: false 
                  })}
                  placeholder="Auto (smart)"
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Confidence</label>
                <select
                  value={filters.confidenceLevel}
                  onChange={(e) => setFilters({ ...filters, confidenceLevel: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Investor Tier</label>
                <select
                  value={filters.investorTier}
                  onChange={(e) => setFilters({ ...filters, investorTier: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">All</option>
                  <option value="elite">Elite</option>
                  <option value="strong">Strong</option>
                  <option value="emerging">Emerging</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="leadsRounds"
                  checked={filters.leadsRounds === true}
                  onChange={(e) => setFilters({ ...filters, leadsRounds: e.target.checked ? true : undefined })}
                  className="w-4 h-4"
                />
                <label htmlFor="leadsRounds" className="text-sm text-gray-300">
                  Leads Rounds
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activeInvestor"
                  checked={filters.activeInvestor === true}
                  onChange={(e) => setFilters({ ...filters, activeInvestor: e.target.checked ? true : undefined })}
                  className="w-4 h-4"
                />
                <label htmlFor="activeInvestor" className="text-sm text-gray-300">
                  Active Investor (6mo)
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
                {/* Match Score Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold border ${getConfidenceColor(match.confidence_level)}`}>
                    {match.match_score}% Match
                  </div>
                  {match.investor.investor_tier && (
                    <div className={`px-2 py-1 rounded text-xs ${getTierColor(match.investor.investor_tier)}`}>
                      {match.investor.investor_tier}
                    </div>
                  )}
                </div>

                {/* Investor Info */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-1 group-hover:text-blue-400 transition-colors">
                    {match.investor.name}
                  </h3>
                  <div className="text-gray-400 text-sm flex items-center gap-1 mb-2">
                    <Building2 className="w-4 h-4" />
                    {match.investor.firm}
                  </div>
                  {match.investor.title && (
                    <div className="text-gray-500 text-sm">{match.investor.title}</div>
                  )}
                </div>

                {/* Key Details */}
                <div className="space-y-2 mb-4">
                  {match.investor.sectors && match.investor.sectors.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      <span>{match.investor.sectors.slice(0, 2).join(', ')}</span>
                    </div>
                  )}
                  {match.investor.check_size_min && match.investor.check_size_max && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      <span>
                        ${(match.investor.check_size_min / 1000000).toFixed(1)}M - 
                        ${(match.investor.check_size_max / 1000000).toFixed(1)}M
                      </span>
                    </div>
                  )}
                  {match.investor.leads_rounds && (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Leads Rounds</span>
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

                  {/* Investor Details */}
                  <div>
                    <h3 className="text-xl font-bold mb-4">Investor Information</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-gray-400">Name</div>
                        <div className="text-lg font-semibold">{selectedMatch.investor.name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Firm</div>
                        <div className="text-lg">{selectedMatch.investor.firm}</div>
                      </div>
                      {selectedMatch.investor.title && (
                        <div>
                          <div className="text-sm text-gray-400">Title</div>
                          <div className="text-lg">{selectedMatch.investor.title}</div>
                        </div>
                      )}
                      {selectedMatch.investor.sectors && selectedMatch.investor.sectors.length > 0 && (
                        <div>
                          <div className="text-sm text-gray-400">Sectors</div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedMatch.investor.sectors.map((sector, i) => (
                              <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-sm">
                                {sector}
                              </span>
                            ))}
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
                    {selectedMatch.investor.linkedin_url && (
                      <a
                        href={selectedMatch.investor.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-center font-semibold transition-colors"
                      >
                        View LinkedIn
                      </a>
                    )}
                    <button
                      onClick={() => navigate(`/investors/${selectedMatch.investor.id}`)}
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

