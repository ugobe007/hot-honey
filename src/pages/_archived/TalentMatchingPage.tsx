/**
 * Talent Matching Page
 * 
 * Allows founders to find key hires that match their hustle/discipline
 * Based on Ben Horowitz (a16z) courage & intelligence framework
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Users, Search, Filter, ArrowLeft, Home, Settings,
  Brain, Shield, Zap, Briefcase, MapPin, Mail, ExternalLink,
  CheckCircle2, Clock, XCircle, Star
} from 'lucide-react';
import { API_BASE } from '@/lib/apiConfig';

interface TalentMatch {
  talent_id: string;
  talent_name: string;
  match_score: number;
  match_reasons: string[];
  alignment_types: string[];
  match_quality: 'excellent' | 'good' | 'fair' | 'poor';
  talent: {
    id: string;
    name: string;
    email?: string;
    linkedin_url?: string;
    skill_type: string;
    experience_level: string;
    work_style?: string;
    location?: string;
    previous_startup_experience?: boolean;
  };
  details: {
    courage_match: number;
    intelligence_match: number;
    work_style_match: number;
    skill_complement: number;
    experience_bonus: number;
    sector_match: number;
  };
}

interface StartupInfo {
  id: string;
  name: string;
  founder_courage?: string;
  founder_intelligence?: string;
}

export default function TalentMatchingPage() {
  const { startupId } = useParams<{ startupId: string }>();
  const navigate = useNavigate();
  
  const [matches, setMatches] = useState<TalentMatch[]>([]);
  const [startup, setStartup] = useState<StartupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    minScore: 50,
    skillType: '' as string,
    experienceLevel: '' as string,
    matchQuality: '' as '' | 'excellent' | 'good' | 'fair'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<TalentMatch | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (startupId) {
      loadMatches();
    } else {
      setError('No startup ID provided. Please navigate from a startup page.');
      setLoading(false);
    }
  }, [startupId, filters]);

  const loadMatches = async () => {
    if (!startupId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.append('minScore', filters.minScore.toString());
      if (filters.skillType) {
        params.append('skillType', filters.skillType);
      }

      const response = await fetch(`${API_BASE}/api/talent/matches/${startupId}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load matches: ${response.statusText}`);
      }

      const data = await response.json();
      setMatches(data.matches || []);
      setStartup(data.startup || null);
      
      if (!data.startup) {
        setError(`Startup with ID "${startupId}" not found. Please check the URL.`);
      }
    } catch (err) {
      console.error('Error loading matches:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load talent matches';
      setError(`${errorMessage}. Make sure you're using a valid startup ID.`);
      
      // If 404, provide helpful message
      if (err instanceof Error && err.message.includes('404')) {
        setError(`Startup not found. The URL should be: /startup/[actual-startup-id]/talent`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async (match: TalentMatch) => {
    try {
      const response = await fetch(`${API_BASE}/api/talent/matches/${startupId}/${match.talent_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'contacted' })
      });

      if (response.ok) {
        alert(`✅ Marked ${match.talent_name} as contacted`);
        loadMatches();
      }
    } catch (err) {
      console.error('Error updating match status:', err);
      alert('Failed to update status');
    }
  };

  const filteredMatches = matches.filter(match => {
    if (searchTerm && !match.talent_name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filters.skillType && match.talent.skill_type !== filters.skillType) {
      return false;
    }
    if (filters.experienceLevel && match.talent.experience_level !== filters.experienceLevel) {
      return false;
    }
    if (filters.matchQuality && match.match_quality !== filters.matchQuality) {
      return false;
    }
    return true;
  });

  const getMatchQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-400 border-green-500/30 bg-green-500/10';
      case 'good': return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
      case 'fair': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
      default: return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
    }
  };

  const getCourageLabel = (courage?: string) => {
    if (!courage) return 'Unknown';
    return courage.charAt(0).toUpperCase() + courage.slice(1);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation Bar */}
      <div className="sticky top-0 z-50 bg-gray-800/95 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Link
                to="/"
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Home"
              >
                <Home className="w-5 h-5" />
              </Link>
              <Link
                to="/admin/control"
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Control Center"
              >
                <Settings className="w-5 h-5" />
              </Link>
            </div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Talent Matching
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!startupId && (
          <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400">
            <p className="font-semibold mb-2">⚠️ Invalid URL</p>
            <p className="text-sm">
              The talent matching page requires a startup ID. The URL should be:
              <code className="block mt-2 p-2 bg-gray-800 rounded">/startup/[startup-id]/talent</code>
            </p>
            <p className="text-sm mt-2">
              Navigate to a startup page (like <Link to="/admin/edit-startups" className="underline">Edit Startups</Link>) and click the "Find Talent" button.
            </p>
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            <p className="font-semibold mb-1">❌ Error</p>
            <p className="text-sm">{error}</p>
            {startupId && (
              <p className="text-xs mt-2 text-red-300">
                Startup ID: <code>{startupId}</code>
              </p>
            )}
          </div>
        )}

        {/* Startup Info */}
        {startup && (
          <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <h2 className="text-lg font-semibold mb-2">{startup.name}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Shield className="w-4 h-4" />
                <span>Courage: {getCourageLabel(startup.founder_courage)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Brain className="w-4 h-4" />
                <span>Intelligence: {getCourageLabel(startup.founder_intelligence)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search talent by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Min Match Score</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.minScore}
                  onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Skill Type</label>
                <select
                  value={filters.skillType}
                  onChange={(e) => setFilters({ ...filters, skillType: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="">All Skills</option>
                  <option value="technical">Technical</option>
                  <option value="business">Business</option>
                  <option value="design">Design</option>
                  <option value="operations">Operations</option>
                  <option value="sales">Sales</option>
                  <option value="marketing">Marketing</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Match Quality</label>
                <select
                  value={filters.matchQuality}
                  onChange={(e) => setFilters({ ...filters, matchQuality: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="">All Qualities</option>
                  <option value="excellent">Excellent (80+)</option>
                  <option value="good">Good (60-79)</option>
                  <option value="fair">Fair (40-59)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Total Matches</div>
            <div className="text-2xl font-bold">{filteredMatches.length}</div>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Excellent</div>
            <div className="text-2xl font-bold text-green-400">
              {filteredMatches.filter(m => m.match_quality === 'excellent').length}
            </div>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Good</div>
            <div className="text-2xl font-bold text-blue-400">
              {filteredMatches.filter(m => m.match_quality === 'good').length}
            </div>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Avg Score</div>
            <div className="text-2xl font-bold">
              {filteredMatches.length > 0
                ? Math.round(filteredMatches.reduce((sum, m) => sum + m.match_score, 0) / filteredMatches.length)
                : 0}
            </div>
          </div>
        </div>

        {/* Matches List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading matches...</div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No matches found. Try adjusting your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredMatches.map((match) => (
              <div
                key={match.talent_id}
                className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-blue-500/50 transition-colors cursor-pointer"
                onClick={() => setSelectedMatch(match)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{match.talent_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Briefcase className="w-4 h-4" />
                      <span className="capitalize">{match.talent.skill_type}</span>
                      <span>•</span>
                      <span className="capitalize">{match.talent.experience_level}</span>
                      {match.talent.location && (
                        <>
                          <span>•</span>
                          <MapPin className="w-4 h-4" />
                          <span>{match.talent.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full border text-xs font-medium ${getMatchQualityColor(match.match_quality)}`}>
                    {match.match_score}/100
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium">Match Reasons:</span>
                  </div>
                  <ul className="text-sm text-gray-400 space-y-1">
                    {match.match_reasons.slice(0, 3).map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-400 flex-shrink-0" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center gap-2">
                  {match.talent.linkedin_url && (
                    <a
                      href={match.talent.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-4 h-4" />
                      LinkedIn
                    </a>
                  )}
                  {match.talent.email && (
                    <a
                      href={`mailto:${match.talent.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-sm flex items-center gap-1"
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </a>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContact(match);
                    }}
                    className="ml-auto px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded text-sm flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Contact
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Match Detail Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedMatch(null)}>
          <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedMatch.talent_name}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="capitalize">{selectedMatch.talent.skill_type}</span>
                    <span>•</span>
                    <span className="capitalize">{selectedMatch.talent.experience_level}</span>
                    {selectedMatch.talent.location && (
                      <>
                        <span>•</span>
                        <MapPin className="w-4 h-4 inline" />
                        <span>{selectedMatch.talent.location}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="p-2 hover:bg-gray-700 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <div className={`inline-block px-4 py-2 rounded-lg border ${getMatchQualityColor(selectedMatch.match_quality)}`}>
                  <div className="text-sm font-medium">Match Score: {selectedMatch.match_score}/100</div>
                  <div className="text-xs mt-1">{selectedMatch.match_quality.toUpperCase()} MATCH</div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Match Breakdown</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-700/50 rounded">
                    <div className="text-sm text-gray-400 mb-1">Courage Match</div>
                    <div className="text-lg font-semibold">{selectedMatch.details.courage_match}/25</div>
                  </div>
                  <div className="p-3 bg-gray-700/50 rounded">
                    <div className="text-sm text-gray-400 mb-1">Intelligence Match</div>
                    <div className="text-lg font-semibold">{selectedMatch.details.intelligence_match}/25</div>
                  </div>
                  <div className="p-3 bg-gray-700/50 rounded">
                    <div className="text-sm text-gray-400 mb-1">Work Style</div>
                    <div className="text-lg font-semibold">{selectedMatch.details.work_style_match}/20</div>
                  </div>
                  <div className="p-3 bg-gray-700/50 rounded">
                    <div className="text-sm text-gray-400 mb-1">Skill Complement</div>
                    <div className="text-lg font-semibold">{selectedMatch.details.skill_complement}/20</div>
                  </div>
                  <div className="p-3 bg-gray-700/50 rounded">
                    <div className="text-sm text-gray-400 mb-1">Experience Bonus</div>
                    <div className="text-lg font-semibold">{selectedMatch.details.experience_bonus}/10</div>
                  </div>
                  <div className="p-3 bg-gray-700/50 rounded">
                    <div className="text-sm text-gray-400 mb-1">Sector Match</div>
                    <div className="text-lg font-semibold">{selectedMatch.details.sector_match}/10</div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Why This Match Works</h3>
                <ul className="space-y-2">
                  {selectedMatch.match_reasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-2">
                {selectedMatch.talent.linkedin_url && (
                  <a
                    href={selectedMatch.talent.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View LinkedIn
                  </a>
                )}
                {selectedMatch.talent.email && (
                  <a
                    href={`mailto:${selectedMatch.talent.email}`}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Send Email
                  </a>
                )}
                <button
                  onClick={() => {
                    handleContact(selectedMatch);
                    setSelectedMatch(null);
                  }}
                  className="ml-auto px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark as Contacted
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

