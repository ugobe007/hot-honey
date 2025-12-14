import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, TrendingUp, TrendingDown, RefreshCw, ArrowRight, Home, Settings, BarChart3, Upload, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminNavBar from '../components/AdminNavBar';

interface Startup {
  id: string;
  name: string;
  total_god_score: number;
  status: string;
  created_at: string;
}

interface ScoreChange {
  id: string;
  startup_id: string;
  startup_name: string;
  old_score: number;
  new_score: number;
  change_reason: string;
  created_at: string;
}

export default function GODScoresPage() {
  const navigate = useNavigate();
  const [startups, setStartups] = useState<Startup[]>([]);
  const [recentChanges, setRecentChanges] = useState<ScoreChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    avgScore: 0,
    topScore: 0,
    totalScored: 0,
    recentUpdates: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load startups with scores
      const { data: startupsData } = await supabase
        .from('startup_uploads')
        .select('id, name, total_god_score, status, created_at')
        .not('total_god_score', 'is', null)
        .order('total_god_score', { ascending: false });

      // Load recent score changes
      const { data: changesData } = await supabase
        .from('score_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (startupsData) {
        setStartups(startupsData);

        const scores = startupsData.map(s => s.total_god_score || 0);
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        const topScore = scores.length > 0 ? Math.max(...scores) : 0;

        setStats({
          avgScore: Math.round(avgScore),
          topScore: Math.round(topScore),
          totalScored: startupsData.length,
          recentUpdates: changesData?.length || 0
        });
      }

      if (changesData) {
        // Enrich changes with startup names
        const enrichedChanges = await Promise.all(
          changesData.map(async (change) => {
            const { data: startup } = await supabase
              .from('startup_uploads')
              .select('name')
              .eq('id', change.startup_id)
              .single();

            return {
              ...change,
              startup_name: startup?.name || 'Unknown Startup'
            };
          })
        );
        setRecentChanges(enrichedChanges);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'from-green-500/20 to-emerald-500/20 border-green-500/50';
    if (score >= 60) return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/50';
    if (score >= 40) return 'from-orange-500/20 to-red-500/20 border-orange-500/50';
    return 'from-red-500/20 to-pink-500/20 border-red-500/50';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-blue-950 relative overflow-hidden">
      {/* Admin Navigation */}
      <AdminNavBar />
      
      {/* Enhanced Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-yellow-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-8 py-12">
        {/* Enhanced Header with Transparency Badge */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <h1 className="text-5xl font-bold text-white">
                GOD <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">Score</span>
              </h1>
              <div className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500/50 rounded-full">
                <span className="text-cyan-300 font-bold text-sm">🔍 100% Transparent</span>
              </div>
            </div>
            <p className="text-gray-300 text-lg">AI-powered quality scoring with full mathematical transparency</p>
            <p className="text-gray-500 text-sm mt-1">Formula: Team (30%) + Traction (25%) + Market (20%) + Product (15%) + Pitch (10%)</p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-cyan-500/50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl transition-all shadow-lg"
            >
              Back to Workflow
            </button>
          </div>
        </div>

        {/* NEW: Formula Explanation Panel */}
        <div className="bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-cyan-900/40 backdrop-blur-xl border-2 border-purple-500/30 rounded-2xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Zap className="w-6 h-6 text-yellow-400" />
            How GOD Scores Work
          </h2>
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-black/40 rounded-xl p-4 border border-purple-500/30">
              <div className="text-3xl mb-2">👥</div>
              <h3 className="text-purple-300 font-bold mb-1">Team (30%)</h3>
              <p className="text-xs text-gray-400">Founder experience, technical cofounders, team size</p>
            </div>
            <div className="bg-black/40 rounded-xl p-4 border border-cyan-500/30">
              <div className="text-3xl mb-2">📈</div>
              <h3 className="text-cyan-300 font-bold mb-1">Traction (25%)</h3>
              <p className="text-xs text-gray-400">Revenue, MRR, users, growth rate, customers</p>
            </div>
            <div className="bg-black/40 rounded-xl p-4 border border-blue-500/30">
              <div className="text-3xl mb-2">🌍</div>
              <h3 className="text-blue-300 font-bold mb-1">Market (20%)</h3>
              <p className="text-xs text-gray-400">Market size, competition, timing, trends</p>
            </div>
            <div className="bg-black/40 rounded-xl p-4 border border-green-500/30">
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="text-green-300 font-bold mb-1">Product (15%)</h3>
              <p className="text-xs text-gray-400">Innovation, IP, technology, defensibility</p>
            </div>
            <div className="bg-black/40 rounded-xl p-4 border border-orange-500/30">
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="text-orange-300 font-bold mb-1">Pitch (10%)</h3>
              <p className="text-xs text-gray-400">Clarity, vision, storytelling, documentation</p>
            </div>
          </div>
          <div className="mt-6 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-4">
            <p className="text-sm text-gray-300">
              <strong className="text-cyan-300">🧮 Final Score Formula:</strong> (Team × 0.30) + (Traction × 0.25) + (Market × 0.20) + (Product × 0.15) + (Pitch × 0.10) = Total GOD Score (0-100)
            </p>
          </div>
        </div>

        {/* Enhanced Stats cards with gradients */}
        <div className="grid grid-cols-4 gap-6 mb-12">
          <div className="group bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-amber-500/20 backdrop-blur-xl border-2 border-yellow-500/50 rounded-2xl p-6 hover:scale-105 transition-all hover:shadow-2xl hover:shadow-yellow-500/30">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-2 rounded-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-yellow-300 text-sm uppercase tracking-wide font-bold">Average Score</h3>
            </div>
            <div className="text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              {stats.avgScore}
            </div>
            <div className="text-sm text-gray-400 mt-1">Out of 100 points</div>
          </div>

          <div className="group bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-teal-500/20 backdrop-blur-xl border-2 border-green-500/50 rounded-2xl p-6 hover:scale-105 transition-all hover:shadow-2xl hover:shadow-green-500/30">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-green-300 text-sm uppercase tracking-wide font-bold">Top Score</h3>
            </div>
            <div className="text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              {stats.topScore}
            </div>
            <div className="text-sm text-gray-400 mt-1">Highest rated startup</div>
          </div>

          <div className="group bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-rose-500/20 backdrop-blur-xl border-2 border-purple-500/50 rounded-2xl p-6 hover:scale-105 transition-all hover:shadow-2xl hover:shadow-purple-500/30">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-purple-300 text-sm uppercase tracking-wide font-bold">Scored Startups</h3>
            </div>
            <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {stats.totalScored}
            </div>
            <div className="text-sm text-gray-400 mt-1">Total rated companies</div>
          </div>

          <div className="group bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-indigo-500/20 backdrop-blur-xl border-2 border-cyan-500/50 rounded-2xl p-6 hover:scale-105 transition-all hover:shadow-2xl hover:shadow-cyan-500/30">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 p-2 rounded-lg">
                <RefreshCw className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-cyan-300 text-sm uppercase tracking-wide font-bold">Recent Updates</h3>
            </div>
            <div className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {stats.recentUpdates}
            </div>
            <div className="text-sm text-gray-400 mt-1">Score changes tracked</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Top startups */}
          <div className="bg-gradient-to-br from-gray-900/80 to-yellow-900/50 backdrop-blur-lg border-2 border-yellow-500/30 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Top Rated Startups</h2>

            {loading ? (
              <div className="text-center text-white py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                Loading...
              </div>
            ) : startups.length === 0 ? (
              <div className="text-center py-12">
                <Zap className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">No Scored Startups Yet</h3>
                <p className="text-gray-400">Run the GOD score algorithm to rate startups</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-4">
                {startups.slice(0, 10).map((startup, index) => (
                  <button
                    key={startup.id}
                    onClick={() => navigate(`/startup/${startup.id}`)}
                    className={`w-full bg-gradient-to-br ${getScoreBg(startup.total_god_score)} backdrop-blur-lg border-2 rounded-xl p-4 hover:scale-[1.02] transition-all text-left group`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white font-bold">
                          #{index + 1}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white group-hover:text-yellow-300 transition-colors">
                            {startup.name}
                          </h3>
                          <div className="text-sm text-gray-400">
                            Added {new Date(startup.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`text-3xl font-bold ${getScoreColor(startup.total_god_score)}`}>
                          {startup.total_god_score}
                        </div>
                        <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recent changes */}
          <div className="bg-gradient-to-br from-gray-900/80 to-orange-900/50 backdrop-blur-lg border-2 border-orange-500/30 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Recent Score Changes</h2>

            {loading ? (
              <div className="text-center text-white py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                Loading...
              </div>
            ) : recentChanges.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 text-orange-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">No Changes Yet</h3>
                <p className="text-gray-400">Score updates will appear here</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-4">
                {recentChanges.map((change) => {
                  const delta = change.new_score - change.old_score;
                  const isIncrease = delta > 0;

                  return (
                    <div
                      key={change.id}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-semibold">{change.startup_name}</h3>
                        <div className="flex items-center gap-2">
                          {isIncrease ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                          <span className={`font-bold ${isIncrease ? 'text-green-400' : 'text-red-400'}`}>
                            {isIncrease ? '+' : ''}{delta}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm mb-2">
                        <div className="text-gray-400">
                          {change.old_score} → {change.new_score}
                        </div>
                        <div className="text-gray-500">
                          {new Date(change.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div className="text-sm text-gray-400 italic">
                        {change.change_reason}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom scrollbar */}
      <style>{`
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(251, 191, 36, 0.5);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(251, 191, 36, 0.7);
        }
      `}</style>
    </div>
  );
}
