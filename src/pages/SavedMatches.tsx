import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Filter, X, TrendingUp, Star, Heart } from 'lucide-react';
import { getSavedMatches, unsaveMatch, clearAllSavedMatches, type SavedMatch } from '../lib/savedMatches';

export default function SavedMatches() {
  const navigate = useNavigate();
  const [savedMatches, setSavedMatches] = useState<SavedMatch[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<SavedMatch[]>([]);
  const [sortBy, setSortBy] = useState<'recent' | 'score' | 'name'>('recent');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSavedMatches();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [savedMatches, sortBy, searchTerm]);

  const loadSavedMatches = () => {
    const matches = getSavedMatches();
    setSavedMatches(matches);
  };

  const applyFiltersAndSort = () => {
    let filtered = [...savedMatches];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.startupName.toLowerCase().includes(term) ||
          m.investorName.toLowerCase().includes(term) ||
          m.tags.some((tag) => tag.toLowerCase().includes(term))
      );
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'score':
        filtered.sort((a, b) => b.matchScore - a.matchScore);
        break;
      case 'name':
        filtered.sort((a, b) => a.startupName.localeCompare(b.startupName));
        break;
    }

    setFilteredMatches(filtered);
  };

  const handleUnsave = (match: SavedMatch) => {
    unsaveMatch(match.startupId, match.investorId);
    loadSavedMatches();
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all saved matches?')) {
      clearAllSavedMatches();
      loadSavedMatches();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0033] via-[#2d1b4e] to-[#1a0033]">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <div className="flex items-center gap-3">
                <Flame className="w-8 h-8 text-orange-500 fill-orange-500" />
                <h1 className="text-3xl font-bold text-white">My Saved Matches</h1>
              </div>
              <span className="bg-purple-600/50 text-white px-4 py-1 rounded-full font-semibold">
                {savedMatches.length} saved
              </span>
            </div>
            {savedMatches.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-red-400 hover:text-red-300 transition-colors font-semibold flex items-center gap-2"
              >
                <X className="w-5 h-5" />
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-8 py-8">
        {/* Filters & Sort */}
        {savedMatches.length > 0 && (
          <div className="bg-white/5 rounded-xl p-6 mb-8 border border-white/10">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Search */}
              <div>
                <label className="text-white text-sm font-semibold mb-2 block flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Search
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search startups, investors, or tags..."
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Sort */}
              <div>
                <label className="text-white text-sm font-semibold mb-2 block flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'recent' | 'score' | 'name')}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="recent">Most Recent</option>
                  <option value="score">Highest Match Score</option>
                  <option value="name">Alphabetical</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Saved Matches Grid */}
        {filteredMatches.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMatches.map((match) => (
              <div
                key={match.id}
                className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 rounded-2xl p-6 border border-purple-500/30 hover:border-purple-400/50 transition-all hover:scale-[1.02] shadow-xl"
              >
                {/* Header with Score and Heart */}
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full px-4 py-2">
                    <span className="text-sm font-bold text-gray-900 flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      {match.matchScore}%
                    </span>
                  </div>
                  <button
                    onClick={() => handleUnsave(match)}
                    className="text-red-500 hover:text-red-400 transition-colors"
                    title="Remove from saved"
                  >
                    <Heart className="w-6 h-6 fill-red-500" />
                  </button>
                </div>

                {/* Startup */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🚀</span>
                    <h3 className="text-lg font-bold text-white">{match.startupName}</h3>
                  </div>
                  <button
                    onClick={() => navigate(`/startup/${match.startupId}`)}
                    className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    View Startup →
                  </button>
                </div>

                {/* Investor */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">💼</span>
                    <h3 className="text-lg font-bold text-white">{match.investorName}</h3>
                  </div>
                  <button
                    onClick={() => navigate(`/investors`)}
                    className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    View Investor →
                  </button>
                </div>

                {/* Tags */}
                {match.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {match.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs border border-purple-500/30"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Timestamp */}
                <div className="text-xs text-gray-400 border-t border-white/10 pt-3">
                  Saved {new Date(match.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : savedMatches.length > 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No matches found for "{searchTerm}"</p>
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 text-purple-400 hover:text-purple-300 transition-colors"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="text-center py-16">
            <Flame className="w-20 h-20 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Saved Matches Yet</h2>
            <p className="text-gray-400 mb-6">
              Start saving matches by clicking the fire icon on any match card
            </p>
            <button
              onClick={() => navigate('/match')}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold px-8 py-3 rounded-xl transition-all"
            >
              Discover Matches
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
