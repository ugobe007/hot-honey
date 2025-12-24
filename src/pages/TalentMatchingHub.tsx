/**
 * Talent Matching Hub
 * 
 * Simple page that lists all startups with a "Find Talent" button for each.
 * This makes it easy to access talent matching without hunting through other pages.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Search, ArrowLeft, Home, Settings, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Startup {
  id: string;
  name: string;
  tagline: string | null;
  total_god_score: number | null;
  status: string | null;
}

export default function TalentMatchingHub() {
  const navigate = useNavigate();
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadStartups();
  }, []);

  const loadStartups = async () => {
    try {
      const { data, error } = await supabase
        .from('startup_uploads')
        .select('id, name, tagline, total_god_score, status')
        .order('total_god_score', { ascending: false, nullsLast: true })
        .limit(500);

      if (error) throw error;
      setStartups(data || []);
    } catch (err) {
      console.error('Error loading startups:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStartups = startups.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.tagline && s.tagline.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
              Talent Matching Hub
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Find Talent for Your Startup
          </h2>
          <p className="text-gray-400">
            Match founders with key hires based on courage & intelligence alignment
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search startups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Startups List */}
        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading startups...</div>
        ) : filteredStartups.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            {searchQuery ? 'No startups found matching your search.' : 'No startups found.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStartups.map((startup) => (
              <div
                key={startup.id}
                className="bg-gray-800/50 rounded-lg border border-gray-700 p-5 hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {startup.name}
                    </h3>
                    {startup.tagline && (
                      <p className="text-sm text-gray-400 line-clamp-2">
                        {startup.tagline}
                      </p>
                    )}
                  </div>
                  {startup.total_god_score && (
                    <div className="flex items-center gap-1 text-yellow-400 ml-2">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-medium">
                        {startup.total_god_score.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
                <Link
                  to={`/startup/${startup.id}/talent`}
                  className="w-full px-4 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg font-medium flex items-center justify-center gap-2 transition-all border border-cyan-500/30 hover:border-cyan-500/50"
                >
                  <Users className="w-4 h-4" />
                  Find Talent
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 text-center text-sm text-gray-400">
          Showing {filteredStartups.length} of {startups.length} startups
        </div>
      </div>
    </div>
  );
}



