import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Upload, Users, Rss, Brain, Zap, Activity, TrendingUp, 
  CheckCircle, AlertCircle, Clock, Eye, Play, RefreshCw,
  Database, ArrowRight, Loader2, Plus, Edit, BarChart3, Lock, Home
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WorkflowStage {
  id: string;
  name: string;
  icon: any;
  status: 'idle' | 'running' | 'success' | 'error';
  count: number;
  lastRun?: string;
  link: string;
  color: string;
}

export default function AdminWorkflowDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  
  // Stage data
  const [stages, setStages] = useState<WorkflowStage[]>([
    {
      id: 'startups',
      name: 'Startups',
      icon: Upload,
      status: 'idle',
      count: 0,
      link: '/admin/edit-startups',
      color: 'orange'
    },
    {
      id: 'investors',
      name: 'Investors',
      icon: Users,
      status: 'idle',
      count: 0,
      link: '/investors',
      color: 'cyan'
    },
    {
      id: 'rss',
      name: 'RSS Sources',
      icon: Rss,
      status: 'idle',
      count: 0,
      link: '/admin/rss-manager',
      color: 'blue'
    },
    {
      id: 'ai',
      name: 'AI Processing',
      icon: Brain,
      status: 'idle',
      count: 0,
      link: '/admin/ai-logs',
      color: 'purple'
    },
    {
      id: 'god',
      name: 'GOD Score',
      icon: Zap,
      status: 'idle',
      count: 0,
      link: '/admin/god-scores',
      color: 'yellow'
    },
    {
      id: 'matching',
      name: 'Matching Engine',
      icon: Activity,
      status: 'success',
      count: 0,
      link: '/matching',
      color: 'green'
    }
  ]);

  // Summary stats
  const [summary, setSummary] = useState({
    totalStartups: 0,
    approvedStartups: 0,
    totalInvestors: 0,
    aiOperations: 0,
    rssArticles: 0,
    avgGodScore: 0,
    activeMatches: 0,
    todayActivity: 0
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!autoRefresh || !isAuthenticated) return;
    
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, isAuthenticated]);

  const checkAuth = async () => {
    try {
      // Check both Supabase auth AND localStorage auth
      const { data: { session } } = await supabase.auth.getSession();
      const localUser = localStorage.getItem('currentUser');
      const localLoggedIn = localStorage.getItem('isLoggedIn');
      
      // User is authenticated if EITHER Supabase session OR localStorage auth exists
      const isAuth = !!session || (!!localUser && localLoggedIn === 'true');
      setIsAuthenticated(isAuth);
      
      if (!isAuth) {
        console.warn('Admin Workflow Dashboard: Authentication required');
      } else {
        console.log('Admin Workflow authenticated:', session ? 'Supabase' : 'LocalStorage');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setAuthChecking(false);
    }
  };

  const loadDashboardData = async () => {
    if (!isAuthenticated) {
      console.warn('Cannot load dashboard data: Not authenticated');
      return;
    }

    try {
      setLoading(true);

      // Load all data in parallel
      const [
        startupsRes,
        investorsRes,
        aiLogsRes,
        rssRes,
        scoresRes,
        mlJobsRes
      ] = await Promise.all([
        supabase.from('startup_uploads').select('id, status, total_god_score'),
        supabase.from('investors').select('id, status'),
        (supabase.from as any)('ai_logs').select('id, status, created_at'),
        (supabase.from as any)('rss_articles').select('id, processed, published_at'),
        (supabase.from as any)('score_history').select('id, new_score, created_at'),
        (supabase.from as any)('ml_jobs').select('id, status, started_at')
      ]);

      const startups = startupsRes.data || [];
      const investors = investorsRes.data || [];
      const aiLogs = aiLogsRes.data || [];
      const rssArticles = rssRes.data || [];
      const scores = scoresRes.data || [];
      const mlJobs = mlJobsRes.data || [];

      // Calculate summary
      const approvedStartups = startups.filter(s => s.status === 'approved');
      const avgScore = approvedStartups.length > 0
        ? approvedStartups.reduce((sum, s) => sum + (s.total_god_score || 0), 0) / approvedStartups.length
        : 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayActivity = [
        ...aiLogs.filter((l: any) => new Date(l.created_at) >= today),
        ...rssArticles.filter((a: any) => new Date(a.published_at) >= today),
        ...scores.filter((s: any) => new Date(s.created_at) >= today)
      ].length;

      setSummary({
        totalStartups: startups.length,
        approvedStartups: approvedStartups.length,
        totalInvestors: investors.length,
        aiOperations: aiLogs.length,
        rssArticles: rssArticles.length,
        avgGodScore: Math.round(avgScore),
        activeMatches: approvedStartups.length * 5, // Estimate: 5 matches per startup
        todayActivity
      });

      // Update stage statuses
      const updatedStages = [...stages];
      
      // Startups stage
      updatedStages[0].count = startups.length;
      updatedStages[0].status = startups.length > 0 ? 'success' : 'idle';
      
      // Investors stage
      updatedStages[1].count = investors.length;
      updatedStages[1].status = investors.length > 0 ? 'success' : 'idle';
      
      // RSS stage
      updatedStages[2].count = rssArticles.length;
      updatedStages[2].status = rssArticles.length > 0 ? 'success' : 'idle';
      
      // AI stage
      const runningAI = aiLogs.filter((l: any) => l.status === 'running').length;
      updatedStages[3].count = aiLogs.length;
      updatedStages[3].status = runningAI > 0 ? 'running' : aiLogs.length > 0 ? 'success' : 'idle';
      if (aiLogs.length > 0) {
        updatedStages[3].lastRun = new Date(aiLogs[0].created_at).toLocaleString();
      }
      
      // GOD Score stage
      const runningML = mlJobs.filter((j: any) => j.status === 'running').length;
      updatedStages[4].count = approvedStartups.length;
      updatedStages[4].status = runningML > 0 ? 'running' : scores.length > 0 ? 'success' : 'idle';
      if (mlJobs.length > 0) {
        updatedStages[4].lastRun = new Date(mlJobs[0].started_at).toLocaleString();
      }
      
      // Matching stage
      updatedStages[5].count = approvedStartups.length * 5;
      updatedStages[5].status = approvedStartups.length > 0 && investors.length > 0 ? 'success' : 'idle';

      setStages(updatedStages);
      setLastRefresh(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStageColor = (color: string) => {
    const colors: Record<string, string> = {
      orange: 'from-orange-500/20 to-amber-500/20 border-orange-500/50',
      cyan: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/50',
      blue: 'from-blue-500/20 to-indigo-500/20 border-blue-500/50',
      purple: 'from-purple-500/20 to-indigo-500/20 border-purple-500/50',
      yellow: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/50',
      green: 'from-green-500/20 to-emerald-500/20 border-green-500/50'
    };
    return colors[color] || colors.purple;
  };

  const getStageTextColor = (color: string) => {
    const colors: Record<string, string> = {
      orange: 'text-orange-400',
      cyan: 'text-cyan-400',
      blue: 'text-blue-400',
      purple: 'text-purple-400',
      yellow: 'text-yellow-400',
      green: 'text-green-400'
    };
    return colors[color] || colors.purple;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1140] via-[#2d1b69] to-[#4a2a8f] relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Authentication Check */}
      {authChecking ? (
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
            <p className="text-white text-xl">Checking authentication...</p>
          </div>
        </div>
      ) : !isAuthenticated ? (
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-lg border-2 border-orange-500/50 rounded-3xl p-12 max-w-2xl mx-8 text-center shadow-2xl">
            <Lock className="w-20 h-20 text-orange-400 mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-white mb-4">Authentication Required</h2>
            <p className="text-gray-300 text-lg mb-8">
              This dashboard requires admin authentication to access workflow monitoring and management features.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate('/login')}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/')}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-xl transition-all"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
        {/* Navigation Bar */}
        <div className="fixed top-0 left-0 right-0 bg-white/5 backdrop-blur-lg border-b border-white/10 z-50">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-center gap-2 text-sm">
            <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white transition-all">← Back</button>
            <span className="text-gray-600">|</span>
            <Link to="/" className="text-gray-400 hover:text-white transition-all">🏠 Home</Link>
            <span className="text-gray-600">|</span>
            <Link to="/admin/control" className="text-gray-400 hover:text-white transition-all">⚙️ Admin</Link>
            <span className="text-gray-600">|</span>
            <Link to="/admin/analytics" className="text-orange-400 hover:text-orange-300 transition-all font-bold">📊 Analytics</Link>
            <span className="text-gray-600">|</span>
            <Link to="/admin/operations" className="text-gray-400 hover:text-white transition-all">🎛️ Operations</Link>
            <span className="text-gray-600">|</span>
            <Link to="/bulkupload" className="text-gray-400 hover:text-white transition-all">📤 Bulk Upload</Link>
            <span className="text-gray-600">|</span>
            <Link to="/admin/startups" className="text-gray-400 hover:text-white transition-all">🚀 Startups</Link>
            <span className="text-gray-600">|</span>
            <Link to="/admin/investors" className="text-gray-400 hover:text-white transition-all">👥 Investors</Link>
            <span className="text-gray-600">|</span>
            <Link to="/admin/investor-enrichment" className="text-gray-400 hover:text-white transition-all">🔄 Enrichment</Link>
            <span className="text-gray-600">|</span>
            <Link to="/vote" className="text-orange-400 hover:text-orange-300 transition-all font-bold">⚡ Match</Link>
          </div>
        </div>

        <div className="relative z-10 container mx-auto px-8 py-12 pt-16">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-5xl font-bold text-white mb-3">
                Admin <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">Workflow</span>
              </h1>
              <p className="text-gray-400 text-lg">Monitor and manage the entire Hot Money pipeline</p>
            </div>

            <div className="flex items-center gap-4">
              {/* HOME button */}
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-lg transition-all shadow-lg"
              >
                <Home className="w-4 h-4" />
                HOME
              </button>

              {/* Auto-refresh toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  autoRefresh
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : 'bg-gray-500/20 border-gray-500 text-gray-400'
                }`}
              >
                {autoRefresh ? <Play className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                Auto-Refresh {autoRefresh ? 'ON' : 'OFF'}
              </button>

              {/* Manual refresh */}
              <button
                onClick={loadDashboardData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              {/* Back to Operations */}
              <button
                onClick={() => navigate('/admin/operations')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all"
              >
                Operations →
              </button>
            </div>
          </div>

          {/* Last refresh */}
          <div className="text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>

        {/* Summary Panel */}
        <div className="mb-12">
          <div className="bg-gradient-to-br from-gray-900/80 to-purple-900/50 backdrop-blur-lg border-2 border-purple-500/30 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-8 h-8 text-purple-400" />
              <h2 className="text-3xl font-bold text-white">System Summary</h2>
            </div>

            <div className="grid grid-cols-4 gap-6">
              {/* Total Startups */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <Upload className="w-6 h-6 text-orange-400" />
                  <h3 className="text-gray-400 text-sm uppercase tracking-wide">Startups</h3>
                </div>
                <div className="text-4xl font-bold text-white">{summary.totalStartups}</div>
                <div className="text-sm text-gray-500 mt-1">{summary.approvedStartups} approved</div>
              </div>

              {/* Total Investors */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-6 h-6 text-cyan-400" />
                  <h3 className="text-gray-400 text-sm uppercase tracking-wide">Investors</h3>
                </div>
                <div className="text-4xl font-bold text-white">{summary.totalInvestors}</div>
                <div className="text-sm text-gray-500 mt-1">Active profiles</div>
              </div>

              {/* Average GOD Score */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-gray-400 text-sm uppercase tracking-wide">Avg GOD Score</h3>
                </div>
                <div className="text-4xl font-bold text-white">{summary.avgGodScore}</div>
                <div className="text-sm text-gray-500 mt-1">Out of 100</div>
              </div>

              {/* Active Matches */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-6 h-6 text-green-400" />
                  <h3 className="text-gray-400 text-sm uppercase tracking-wide">Matches</h3>
                </div>
                <div className="text-4xl font-bold text-white">{summary.activeMatches}</div>
                <div className="text-sm text-gray-500 mt-1">Generated pairs</div>
              </div>
            </div>

            {/* Activity stats */}
            <div className="grid grid-cols-4 gap-6 mt-6">
              <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/30">
                <div className="text-sm text-gray-400">AI Operations</div>
                <div className="text-2xl font-bold text-purple-400">{summary.aiOperations}</div>
              </div>
              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
                <div className="text-sm text-gray-400">RSS Articles</div>
                <div className="text-2xl font-bold text-blue-400">{summary.rssArticles}</div>
              </div>
              <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
                <div className="text-sm text-gray-400">Today's Activity</div>
                <div className="text-2xl font-bold text-green-400">{summary.todayActivity}</div>
              </div>
              <div className="bg-orange-500/10 rounded-lg p-4 border border-orange-500/30">
                <div className="text-sm text-gray-400">Pipeline Health</div>
                <div className="text-2xl font-bold text-orange-400">
                  {stages.filter(s => s.status === 'success').length}/{stages.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Pipeline */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">Pipeline Workflow</h2>
          
          <div className="space-y-4">
            {stages.map((stage, index) => (
              <div key={stage.id}>
                {/* Stage card */}
                <button
                  onClick={() => navigate(stage.link)}
                  className={`w-full bg-gradient-to-br ${getStageColor(stage.color)} backdrop-blur-lg border-2 rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 shadow-xl text-left group`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      {/* Stage number */}
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getStageColor(stage.color)} flex items-center justify-center text-2xl font-bold text-white border-2`}>
                        {index + 1}
                      </div>

                      {/* Icon */}
                      <div className={`${getStageTextColor(stage.color)}`}>
                        <stage.icon className="w-10 h-10" />
                      </div>

                      {/* Stage info */}
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-1">{stage.name}</h3>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(stage.status)}
                            <span className="text-sm text-gray-400 capitalize">{stage.status}</span>
                          </div>
                          {stage.lastRun && (
                            <div className="text-sm text-gray-500">
                              Last: {stage.lastRun}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Count and action */}
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className={`text-4xl font-bold ${getStageTextColor(stage.color)}`}>
                          {stage.count}
                        </div>
                        <div className="text-sm text-gray-500">
                          {stage.id === 'matching' ? 'Matches' : 'Items'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-white group-hover:text-purple-300 transition-colors">
                        <Eye className="w-5 h-5" />
                        <span className="text-sm font-medium">View</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </button>

                {/* Connector arrow (except for last item) */}
                {index < stages.length - 1 && (
                  <div className="flex justify-center py-2">
                    <div className="text-gray-600">
                      <ArrowRight className="w-6 h-6 rotate-90" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-6">
          <button
            onClick={() => navigate('/submit')}
            className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 border-2 border-orange-500/50 rounded-xl p-6 hover:scale-105 transition-all text-left group"
          >
            <div className="flex items-center gap-3 mb-3">
              <Plus className="w-6 h-6 text-orange-400" />
              <h3 className="text-xl font-bold text-white">Add Startup</h3>
            </div>
            <p className="text-gray-400 text-sm">Submit a new startup to the platform</p>
            <div className="flex items-center gap-2 text-orange-400 mt-4 text-sm font-medium group-hover:gap-3 transition-all">
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          <button
            onClick={() => navigate('/investors')}
            className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500/50 rounded-xl p-6 hover:scale-105 transition-all text-left group"
          >
            <div className="flex items-center gap-3 mb-3">
              <Plus className="w-6 h-6 text-cyan-400" />
              <h3 className="text-xl font-bold text-white">Add Investor</h3>
            </div>
            <p className="text-gray-400 text-sm">Add a new investor profile</p>
            <div className="flex items-center gap-2 text-cyan-400 mt-4 text-sm font-medium group-hover:gap-3 transition-all">
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/command-center')}
            className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border-2 border-purple-500/50 rounded-xl p-6 hover:scale-105 transition-all text-left group"
          >
            <div className="flex items-center gap-3 mb-3">
              <Database className="w-6 h-6 text-purple-400" />
              <h3 className="text-xl font-bold text-white">Command Center</h3>
            </div>
            <p className="text-gray-400 text-sm">Advanced monitoring and controls</p>
            <div className="flex items-center gap-2 text-purple-400 mt-4 text-sm font-medium group-hover:gap-3 transition-all">
              <span>Open</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
        </div>
        </>
      )}

      {/* Custom scrollbar */}
      <style>{`
        ::-webkit-scrollbar {
          width: 12px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(26, 17, 64, 0.5);
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #8b5cf6, #6366f1);
          border-radius: 6px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #a78bfa, #818cf8);
        }
      `}</style>
    </div>
  );
}
