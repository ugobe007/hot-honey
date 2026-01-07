import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, Cpu, Webhook, Brain, Target, Activity, Users, 
  Edit2, Save, X, RefreshCw, Play, Pause, TrendingUp,
  ChevronRight, AlertCircle, CheckCircle, Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Process {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
  lastRun: string | null;
  nextRun: string | null;
  type: 'scraper' | 'ml' | 'ai' | 'matching';
}

interface Match {
  id: string;
  startup_name: string;
  investor_name: string;
  match_score: number;
  god_score: number;
  created_at: string;
}

interface GODScore {
  startup_id: string;
  startup_name: string;
  total_god_score: number;
  traction_score: number;
  team_score: number;
  market_score: number;
  product_score: number;
  social_score: number;
  vision_score: number;
}

export default function UnifiedAdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'god' | 'ml' | 'scrapers' | 'ai' | 'matching' | 'processes' | 'users'>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data state
  const [processes, setProcesses] = useState<Process[]>([]);
  const [latestMatches, setLatestMatches] = useState<Match[]>([]);
  const [godScores, setGodScores] = useState<GODScore[]>([]);
  const [editingScore, setEditingScore] = useState<string | null>(null);
  const [scoreEdits, setScoreEdits] = useState<Record<string, Partial<GODScore>>>({});
  const [users, setUsers] = useState<any[]>([]);
  
  // Stats
  const [stats, setStats] = useState({
    totalStartups: 0,
    totalInvestors: 0,
    totalMatches: 0,
    avgGodScore: 0,
    activeProcesses: 0,
    errorProcesses: 0
  });

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadStats(),
        loadProcesses(),
        loadLatestMatches(),
        loadGODScores(),
        loadUsers()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    const [startups, investors, matches, scores] = await Promise.all([
      supabase.from('startup_uploads').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('investors').select('*', { count: 'exact', head: true }),
      supabase.rpc('get_match_count_estimate'),
      supabase.from('startup_uploads').select('total_god_score').eq('status', 'approved').not('total_god_score', 'is', null)
    ]);

    const avgScore = scores.data && scores.data.length > 0
      ? scores.data.reduce((sum: number, s: any) => sum + (s.total_god_score || 0), 0) / scores.data.length
      : 0;

    setStats({
      totalStartups: startups.count || 0,
      totalInvestors: investors.count || 0,
      totalMatches: matches.data || 0,
      avgGodScore: Math.round(avgScore),
      activeProcesses: processes.filter(p => p.status === 'running').length,
      errorProcesses: processes.filter(p => p.status === 'error').length
    });
  };

  const loadProcesses = async () => {
    // Mock process list - replace with actual process monitoring
    setProcesses([
      { id: '1', name: 'Startup Scraper', status: 'running', lastRun: new Date().toISOString(), nextRun: new Date(Date.now() + 3600000).toISOString(), type: 'scraper' },
      { id: '2', name: 'Investor Scraper', status: 'running', lastRun: new Date().toISOString(), nextRun: new Date(Date.now() + 7200000).toISOString(), type: 'scraper' },
      { id: '3', name: 'GOD Score Calculator', status: 'running', lastRun: new Date().toISOString(), nextRun: null, type: 'ml' },
      { id: '4', name: 'Matching Engine', status: 'running', lastRun: new Date().toISOString(), nextRun: null, type: 'matching' },
      { id: '5', name: 'AI Enrichment', status: 'running', lastRun: new Date().toISOString(), nextRun: null, type: 'ai' },
    ]);
  };

  const loadLatestMatches = async () => {
    const { data, error } = await supabase
      .from('startup_investor_matches')
      .select(`
        id,
        match_score,
        created_at,
        startup:startup_uploads!startup_id (name, total_god_score),
        investor:investors!investor_id (name)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setLatestMatches(data.map((m: any) => ({
        id: m.id,
        startup_name: m.startup?.name || 'Unknown',
        investor_name: m.investor?.name || 'Unknown',
        match_score: m.match_score || 0,
        god_score: m.startup?.total_god_score || 0,
        created_at: m.created_at
      })));
    }
  };

  const loadGODScores = async () => {
    const { data, error } = await supabase
      .from('startup_uploads')
      .select('id, name, total_god_score, traction_score, team_score, market_score, product_score, social_score, vision_score')
      .eq('status', 'approved')
      .order('total_god_score', { ascending: false })
      .limit(50);

    if (data) {
      setGodScores(data.map((s: any) => ({
        startup_id: s.id,
        startup_name: s.name,
        total_god_score: s.total_god_score || 0,
        traction_score: s.traction_score || 0,
        team_score: s.team_score || 0,
        market_score: s.market_score || 0,
        product_score: s.product_score || 0,
        social_score: s.social_score || 0,
        vision_score: s.vision_score || 0
      })));
    }
  };

  const loadUsers = async () => {
    // Note: This requires a users table - adjust query based on your schema
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (data) setUsers(data);
  };

  const saveGODScore = async (startupId: string) => {
    const edits = scoreEdits[startupId];
    if (!edits) return;

    const { error } = await supabase
      .from('startup_uploads')
      .update({
        ...edits,
        updated_at: new Date().toISOString()
      })
      .eq('id', startupId);

    if (!error) {
      setEditingScore(null);
      delete scoreEdits[startupId];
      loadGODScores();
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'god', label: 'GOD Scores', icon: Sparkles },
    { id: 'ml', label: 'ML Engine', icon: Cpu },
    { id: 'scrapers', label: 'Scrapers', icon: Webhook },
    { id: 'ai', label: 'AI', icon: Brain },
    { id: 'matching', label: 'Matching', icon: Target },
    { id: 'processes', label: 'Processes', icon: Activity },
    { id: 'users', label: 'Users', icon: Users }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-orange-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-orange-400">Admin Dashboard</h1>
              <p className="text-slate-400 text-sm">Unified control center for all systems</p>
            </div>
            <button
              onClick={loadAllData}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-800/30 border-b border-slate-700 sticky top-[73px] z-30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-orange-400 text-orange-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="text-slate-400 text-sm mb-1">Startups</div>
                <div className="text-3xl font-bold text-white">{stats.totalStartups.toLocaleString()}</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="text-slate-400 text-sm mb-1">Investors</div>
                <div className="text-3xl font-bold text-white">{stats.totalInvestors.toLocaleString()}</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="text-slate-400 text-sm mb-1">Matches</div>
                <div className="text-3xl font-bold text-cyan-400">{stats.totalMatches.toLocaleString()}</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="text-slate-400 text-sm mb-1">Avg GOD Score</div>
                <div className="text-3xl font-bold text-orange-400">{stats.avgGodScore}</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="text-slate-400 text-sm mb-1">Active Processes</div>
                <div className="text-3xl font-bold text-green-400">{stats.activeProcesses}</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="text-slate-400 text-sm mb-1">Errors</div>
                <div className="text-3xl font-bold text-red-400">{stats.errorProcesses}</div>
              </div>
            </div>

            {/* Latest Matches */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-400" />
                Latest Matches
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-700">
                      <th className="pb-2">Startup</th>
                      <th className="pb-2">Investor</th>
                      <th className="pb-2 text-right">Match Score</th>
                      <th className="pb-2 text-right">GOD Score</th>
                      <th className="pb-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestMatches.map(match => (
                      <tr key={match.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="py-3">{match.startup_name}</td>
                        <td className="py-3">{match.investor_name}</td>
                        <td className="py-3 text-right">
                          <span className="font-bold text-cyan-400">{match.match_score}%</span>
                        </td>
                        <td className="py-3 text-right">
                          <span className="font-bold text-orange-400">{match.god_score}</span>
                        </td>
                        <td className="py-3 text-slate-400 text-sm">
                          {new Date(match.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* GOD Scores Tab - EDITABLE */}
        {activeTab === 'god' && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-400" />
              GOD Scores (Editable)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-700">
                    <th className="pb-2">Startup</th>
                    <th className="pb-2 text-right">Total</th>
                    <th className="pb-2 text-right">Traction</th>
                    <th className="pb-2 text-right">Team</th>
                    <th className="pb-2 text-right">Market</th>
                    <th className="pb-2 text-right">Product</th>
                    <th className="pb-2 text-right">Social</th>
                    <th className="pb-2 text-right">Vision</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {godScores.map(score => {
                    const isEditing = editingScore === score.startup_id;
                    const edits = scoreEdits[score.startup_id] || {};
                    return (
                      <tr key={score.startup_id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="py-3">{score.startup_name}</td>
                        <td className="py-3 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              className="w-16 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-right"
                              defaultValue={score.total_god_score}
                              onChange={(e) => setScoreEdits({
                                ...scoreEdits,
                                [score.startup_id]: { ...edits, total_god_score: parseInt(e.target.value) }
                              })}
                            />
                          ) : (
                            <span className="font-bold text-orange-400">{score.total_god_score}</span>
                          )}
                        </td>
                        {['traction_score', 'team_score', 'market_score', 'product_score', 'social_score', 'vision_score'].map(field => (
                          <td key={field} className="py-3 text-right">
                            {isEditing ? (
                              <input
                                type="number"
                                className="w-16 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-right"
                                defaultValue={score[field as keyof GODScore] as number}
                                onChange={(e) => setScoreEdits({
                                  ...scoreEdits,
                                  [score.startup_id]: { ...edits, [field]: parseInt(e.target.value) }
                                })}
                              />
                            ) : (
                              <span className="text-slate-300">{score[field as keyof GODScore]}</span>
                            )}
                          </td>
                        ))}
                        <td className="py-3">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveGODScore(score.startup_id)}
                                className="p-1 bg-green-600 hover:bg-green-700 rounded"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingScore(null);
                                  delete scoreEdits[score.startup_id];
                                }}
                                className="p-1 bg-red-600 hover:bg-red-700 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingScore(score.startup_id)}
                              className="p-1 bg-orange-600 hover:bg-orange-700 rounded"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Other tabs - Placeholders for now */}
        {activeTab === 'processes' && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-400" />
              Real-Time Processes
            </h2>
            <div className="space-y-3">
              {processes.map(process => (
                <div key={process.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {process.status === 'running' ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : process.status === 'error' ? (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-slate-400" />
                    )}
                    <div>
                      <div className="font-semibold">{process.name}</div>
                      <div className="text-sm text-slate-400">
                        Last run: {process.lastRun ? new Date(process.lastRun).toLocaleString() : 'Never'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      process.status === 'running' ? 'bg-green-500/20 text-green-400' :
                      process.status === 'error' ? 'bg-red-500/20 text-red-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {process.status}
                    </span>
                    {process.status === 'running' ? (
                      <button className="p-2 bg-red-600 hover:bg-red-700 rounded">
                        <Pause className="w-4 h-4" />
                      </button>
                    ) : (
                      <button className="p-2 bg-green-600 hover:bg-green-700 rounded">
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'matching' && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-400" />
              Matching Engine
            </h2>
            <p className="text-slate-400">Matching engine controls and monitoring will go here.</p>
          </div>
        )}

        {activeTab === 'ml' && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-orange-400" />
              ML Engine
            </h2>
            <p className="text-slate-400">ML engine controls and monitoring will go here.</p>
          </div>
        )}

        {activeTab === 'scrapers' && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Webhook className="w-5 h-5 text-orange-400" />
              Scrapers
            </h2>
            <p className="text-slate-400">Scraper controls and monitoring will go here.</p>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-orange-400" />
              AI Processing
            </h2>
            <p className="text-slate-400">AI processing controls and monitoring will go here.</p>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-400" />
              User Management
            </h2>
            <p className="text-slate-400">User management will go here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

