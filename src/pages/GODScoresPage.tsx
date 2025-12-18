import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Startup {
  id: string;
  name: string;
  tagline?: string | null;
  total_god_score: number | null;
  status: string | null;
  created_at: string | null;
}

export default function GODScoresPage() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ avgScore: 0, topScore: 0, totalScored: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from('startup_uploads')
      .select('id, name, tagline, total_god_score, status, created_at')
      .not('total_god_score', 'is', null)
      .order('total_god_score', { ascending: false });

    if (data) {
      setStartups(data);
      const scores = data.map(s => s.total_god_score || 0);
      setStats({
        avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        topScore: scores.length ? Math.max(...scores) : 0,
        totalScored: data.length
      });
    }
    setLoading(false);
  };

  const refresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-amber-400 font-bold';
    if (score >= 80) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 60) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-4 py-2 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">🏆 GOD Scores</h1>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/" className="text-gray-400 hover:text-white">Home</Link>
            <Link to="/admin" className="text-gray-400 hover:text-white">Control Center</Link>
            <Link to="/admin/dashboard" className="text-gray-400 hover:text-white">Dashboard</Link>
            <Link to="/admin/ml-dashboard" className="text-purple-400 hover:text-purple-300">ML</Link>
            <Link to="/matching" className="text-orange-400 hover:text-orange-300 font-bold">⚡ Match</Link>
            <button onClick={refresh} className="text-gray-400 hover:text-white">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-3 text-xs">
          <div className="bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700">
            <div className="text-xl font-bold font-mono text-amber-400">{stats.topScore}</div>
            <div className="text-gray-500 text-[10px]">Top Score</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700">
            <div className="text-xl font-bold font-mono text-cyan-400">{stats.avgScore}</div>
            <div className="text-gray-500 text-[10px]">Avg Score</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700">
            <div className="text-xl font-bold font-mono text-green-400">{stats.totalScored}</div>
            <div className="text-gray-500 text-[10px]">Scored</div>
          </div>
          <div className="col-span-2 bg-gray-800/30 rounded-lg px-3 py-2 border border-gray-700/50">
            <div className="text-[10px] text-gray-400">
              <strong className="text-amber-400">Formula:</strong> Team (30%) + Traction (25%) + Market (20%) + Product (15%) + Pitch (10%)
            </div>
          </div>
        </div>

        {/* Score Legend */}
        <div className="flex gap-3 text-xs">
          <span className="px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-amber-400">90+ Elite</span>
          <span className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-green-400">80-89 Excellent</span>
          <span className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-400">70-79 Good</span>
          <span className="px-2 py-1 bg-orange-500/20 border border-orange-500/30 rounded text-orange-400">60-69 Average</span>
          <span className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-red-400">&lt;60 Needs Work</span>
        </div>

        {/* Table */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="px-4 py-12 text-center text-gray-500">Loading...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="text-center px-4 py-2 text-gray-400 font-medium w-16">#</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Startup</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Tagline</th>
                  <th className="text-center px-4 py-2 text-gray-400 font-medium">Status</th>
                  <th className="text-right px-4 py-2 text-gray-400 font-medium">GOD Score</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium w-48">Bar</th>
                </tr>
              </thead>
              <tbody>
                {startups.map((s, idx) => (
                  <tr key={s.id} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                    <td className="px-4 py-2 text-center text-gray-500 font-mono">{idx + 1}</td>
                    <td className="px-4 py-2">
                      <Link to={`/startup/${s.id}`} className="text-white font-medium hover:text-orange-400">{s.name}</Link>
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs truncate max-w-64">{s.tagline || '-'}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        s.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        s.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>{s.status}</span>
                    </td>
                    <td className={`px-4 py-2 text-right font-mono text-lg ${getScoreColor(s.total_god_score ?? 0)}`}>
                      {s.total_god_score ?? 0}
                    </td>
                    <td className="px-4 py-2">
                      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${
                          (s.total_god_score ?? 0) >= 90 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                          (s.total_god_score ?? 0) >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                          (s.total_god_score ?? 0) >= 70 ? 'bg-gradient-to-r from-yellow-500 to-orange-400' :
                          (s.total_god_score ?? 0) >= 60 ? 'bg-gradient-to-r from-orange-500 to-red-400' :
                          'bg-gradient-to-r from-red-500 to-red-600'
                        }`} style={{ width: `${s.total_god_score ?? 0}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
                {startups.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No scored startups found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">⚡ Related Tools</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link to="/admin/ml-dashboard" className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded text-purple-400 hover:bg-purple-500/30">🧠 ML Dashboard</Link>
            <Link to="/admin/analytics" className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-500/30">📊 Analytics</Link>
            <Link to="/admin/edit-startups" className="px-3 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded text-orange-400 hover:bg-orange-500/30">✏️ Edit Startups</Link>
            <Link to="/matching" className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded text-green-400 hover:bg-green-500/30">🔥 View Matches</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
