import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain, Rss, Cpu, TrendingUp, TrendingDown, Activity, Zap, Database,
  Clock, AlertCircle, CheckCircle, RefreshCw, BarChart3, Newspaper,
  Bot, Flame, ArrowUp, ArrowDown, Loader2, Settings, Eye, Play, Pause,
  Download, Upload, Filter, Search, Users, Building2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

// CONFIG - Update if your table names differ
const TABLES = {
  AI_LOGS: 'ai_logs',
  RSS_ARTICLES: 'rss_articles',
  ML_JOBS: 'ml_jobs',
  STARTUPS: 'startup_uploads',
  SCORE_HISTORY: 'score_history',
  INVESTORS: 'investors'
};

const REFRESH_INTERVAL = 30000; // 30 seconds

// Types
interface AILog {
  id: string;
  operation: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  status: string;
  created_at: string;
}

interface RSSArticle {
  id: string;
  headline: string;
  source: string;
  source_url: string;
  processed: boolean;
  published_at: string;
}

interface MLJob {
  id: string;
  job_type: string;
  status: string;
  records_processed: number;
  records_total: number;
  started_at: string;
  completed_at: string;
}

interface ScoreHistory {
  id: string;
  startup_id: string;
  old_score: number;
  new_score: number;
  change_reason: string;
  created_at: string;
  startup?: { name: string; total_god_score?: number };
}

interface DashboardStats {
  aiLogs: AILog[];
  rssArticles: RSSArticle[];
  mlJobs: MLJob[];
  startups: any[];
  scoreHistory: ScoreHistory[];
  totals: {
    startups: number;
    investors: number;
    aiCallsToday: number;
    articlesToday: number;
  };
}

// Helper: Format time ago
function formatTimeAgo(dateString: string): string {
  if (!dateString) return 'N/A';
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Dashboard Widget Component
interface WidgetProps {
  title: string;
  icon: React.ElementType;
  gradient: string;
  children: React.ReactNode;
  loading?: boolean;
  actions?: React.ReactNode;
}

const DashboardWidget: React.FC<WidgetProps> = ({ title, icon: Icon, gradient, children, loading, actions }) => (
  <div className={`bg-gradient-to-br ${gradient} backdrop-blur-xl rounded-2xl p-6 border-2 border-white/10 shadow-2xl hover:border-white/20 transition-all`}>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-white/10">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
        {loading && <Loader2 className="w-4 h-4 text-white animate-spin" />}
      </div>
      {actions}
    </div>
    {children}
  </div>
);

// Main Dashboard Component
const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    aiLogs: [],
    rssArticles: [],
    mlJobs: [],
    startups: [],
    scoreHistory: [],
    totals: { startups: 0, investors: 0, aiCallsToday: 0, articlesToday: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeModal, setActiveModal] = useState<'ai' | 'rss' | 'ml' | 'god' | 'matching' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Run ML training job - actually triggers the process
  const runMLJob = async () => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/ml/training/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start ML training');
      }
      
      alert(`✅ ${data.message || 'ML training started successfully!'}`);
      
      // Refresh data after a delay
      setTimeout(async () => {
        await loadDashboardData();
      }, 3000);
    } catch (error: any) {
      console.error('Error running ML job:', error);
      alert(`❌ Error: ${error.message || 'Failed to start ML training'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Run RSS scraper - actually triggers the process
  const runRSSScraper = async () => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/rss/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start RSS scraper');
      }
      
      alert(`✅ ${data.message || 'RSS scraper started successfully!'}`);
      
      // Refresh data after a delay
      setTimeout(async () => {
        await loadDashboardData();
      }, 3000);
    } catch (error: any) {
      console.error('Error running RSS scraper:', error);
      alert(`❌ Error: ${error.message || 'Failed to start RSS scraper'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Run investor scraper - actually triggers the process
  const runInvestorScraper = async () => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/investors/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start investor scraper');
      }
      
      alert(`✅ ${data.message || 'Investor scraper started successfully!'}`);
      
      // Refresh data after a delay
      setTimeout(async () => {
        await loadDashboardData();
      }, 5000);
    } catch (error: any) {
      console.error('Error running investor scraper:', error);
      alert(`❌ Error: ${error.message || 'Failed to start investor scraper'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate GOD scores - actually triggers the process
  const calculateGodScores = async () => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/god-scores/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start GOD score calculation');
      }
      
      alert(`✅ ${data.message || 'GOD score calculation started successfully!'}`);
      
      // Refresh data after a delay
      setTimeout(async () => {
        await loadDashboardData();
      }, 5000);
    } catch (error: any) {
      console.error('Error calculating GOD scores:', error);
      alert(`❌ Error: ${error.message || 'Failed to start GOD score calculation'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // AI Logs
      const { data: aiLogs } = await supabase
        .from(TABLES.AI_LOGS)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // RSS Articles
      const { data: rssArticles } = await supabase
        .from(TABLES.RSS_ARTICLES)
        .select('*')
        .order('published_at', { ascending: false })
        .limit(20);

      // ML Jobs
      const { data: mlJobs } = await supabase
        .from(TABLES.ML_JOBS)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // Startups
      const { data: startups, count: startupsCount } = await supabase
        .from(TABLES.STARTUPS)
        .select('id, name, total_god_score, created_at', { count: 'exact' })
        .eq('status', 'approved')
        .order('total_god_score', { ascending: false })
        .limit(100);

      // Investors
      const { count: investorsCount } = await supabase
        .from(TABLES.INVESTORS)
        .select('id', { count: 'exact' });

      // Score History (last 24h)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const { data: scoreHistory } = await supabase
        .from(TABLES.SCORE_HISTORY)
        .select(`
          *,
          startup:${TABLES.STARTUPS}(name, total_god_score)
        `)
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      // Calculate totals
      const aiCallsToday = aiLogs?.filter(log => 
        new Date(log.created_at) >= todayStart
      ).length || 0;

      const articlesToday = rssArticles?.filter(article => 
        new Date(article.published_at || article.created_at) >= todayStart
      ).length || 0;

      setStats({
        aiLogs: aiLogs || [],
        rssArticles: rssArticles || [],
        mlJobs: mlJobs || [],
        startups: startups || [],
        scoreHistory: scoreHistory || [],
        totals: {
          startups: startupsCount || 0,
          investors: investorsCount || 0,
          aiCallsToday,
          articlesToday
        }
      });

      setLastRefresh(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    if (autoRefresh) {
      const interval = setInterval(loadDashboardData, REFRESH_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [loadDashboardData, autoRefresh]);

  // Calculate AI stats
  const aiStats = {
    totalCalls: stats.aiLogs.length,
    successRate: stats.aiLogs.length 
      ? (stats.aiLogs.filter(l => l.status === 'success').length / stats.aiLogs.length * 100).toFixed(1)
      : '0',
    totalTokens: stats.aiLogs.reduce((sum, log) => sum + (log.input_tokens || 0) + (log.output_tokens || 0), 0),
    avgTokensPerCall: stats.aiLogs.length 
      ? Math.round(stats.aiLogs.reduce((sum, log) => sum + (log.input_tokens || 0) + (log.output_tokens || 0), 0) / stats.aiLogs.length)
      : 0
  };

  // RSS stats
  const rssStats = {
    total: stats.rssArticles.length,
    unprocessed: stats.rssArticles.filter(a => !a.processed).length,
    sources: [...new Set(stats.rssArticles.map(a => a.source))].length
  };

  // ML stats
  const latestMLJob = stats.mlJobs[0];
  const mlStats = {
    lastRun: latestMLJob ? formatTimeAgo(latestMLJob.started_at) : 'Never',
    status: latestMLJob?.status || 'idle',
    progress: latestMLJob 
      ? `${latestMLJob.records_processed}/${latestMLJob.records_total}`
      : 'N/A'
  };

  // GOD Score stats
  const avgGodScore = stats.startups.length 
    ? Math.round(stats.startups.reduce((sum, s) => sum + (s.total_god_score || 0), 0) / stats.startups.length)
    : 0;

  // Top movers
  const topMovers = stats.scoreHistory
    .map(h => ({
      ...h,
      change: (h.new_score || 0) - (h.old_score || 0)
    }))
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1140] via-[#2d1b69] to-[#4a2a8f] relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-2xl blur-xl opacity-50"></div>
                <div className="relative bg-gradient-to-br from-purple-600 to-cyan-600 p-4 rounded-2xl">
                  <Zap className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-5xl font-bold">
                  <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                    Hot Money
                  </span>
                  <span className="text-white"> Command Center</span>
                </h1>
                <p className="text-gray-400 mt-2">Real-time AI system monitoring & analytics</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  autoRefresh 
                    ? 'bg-green-500/20 text-green-400 border-2 border-green-500/30' 
                    : 'bg-gray-500/20 text-gray-400 border-2 border-gray-500/30'
                }`}
              >
                {autoRefresh ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                {autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
              </button>
              <button
                onClick={loadDashboardData}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-purple-500/50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">
                Last updated: <span className="text-white font-semibold">{lastRefresh.toLocaleTimeString()}</span>
              </span>
              {autoRefresh && (
                <span className="text-gray-500 ml-2">• Refreshes every 30s</span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/control')}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all border border-white/10"
              >
                <Settings className="w-4 h-4" />
                Operations
              </button>
              <button
                onClick={() => navigate('/admin/edit-startups')}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all border border-white/10"
              >
                <Building2 className="w-4 h-4" />
                Manage Startups
              </button>
              <button
                onClick={() => navigate('/investors')}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all border border-white/10"
              >
                <Users className="w-4 h-4" />
                Investors
              </button>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="group relative bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-violet-500/20 backdrop-blur-xl rounded-2xl p-6 border-2 border-cyan-500/30 hover:border-cyan-400/50 transition-all hover:scale-105 cursor-pointer shadow-xl hover:shadow-cyan-500/30">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-cyan-400" />
                <span className="text-cyan-300 text-sm font-medium">Total Startups</span>
              </div>
              <div className="text-4xl font-bold text-white mb-1">{stats.totals.startups}</div>
              <div className="text-cyan-300/70 text-xs">Active in platform</div>
            </div>
          </div>
          
          <div className="group relative bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-indigo-500/20 backdrop-blur-xl rounded-2xl p-6 border-2 border-cyan-500/30 hover:border-cyan-400/50 transition-all hover:scale-105 cursor-pointer shadow-xl hover:shadow-cyan-500/30">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <span className="text-cyan-300 text-sm font-medium">Total Investors</span>
              </div>
              <div className="text-4xl font-bold text-white mb-1">{stats.totals.investors}</div>
              <div className="text-cyan-300/70 text-xs">In network</div>
            </div>
          </div>
          
          <div className="group relative bg-gradient-to-br from-purple-500/20 via-indigo-500/10 to-purple-500/20 backdrop-blur-xl rounded-2xl p-6 border-2 border-purple-500/30 hover:border-purple-400/50 transition-all hover:scale-105 cursor-pointer shadow-xl hover:shadow-purple-500/30">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-purple-400" />
                <span className="text-purple-300 text-sm font-medium">AI Calls Today</span>
              </div>
              <div className="text-4xl font-bold text-white mb-1">{stats.totals.aiCallsToday}</div>
              <div className="text-purple-300/70 text-xs">Processing requests</div>
            </div>
          </div>
          
          <div className="group relative bg-gradient-to-br from-green-500/20 via-emerald-500/10 to-green-500/20 backdrop-blur-xl rounded-2xl p-6 border-2 border-green-500/30 hover:border-green-400/50 transition-all hover:scale-105 cursor-pointer shadow-xl hover:shadow-green-500/30">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/5 to-green-500/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Newspaper className="w-5 h-5 text-green-400" />
                <span className="text-green-300 text-sm font-medium">Articles Today</span>
              </div>
              <div className="text-4xl font-bold text-white mb-1">{stats.totals.articlesToday}</div>
              <div className="text-green-300/70 text-xs">RSS feed updates</div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* AI Activity Panel */}
          <div onClick={() => setActiveModal('ai')} className="cursor-pointer">
            <DashboardWidget
              title="AI Activity"
              icon={Brain}
              gradient="from-purple-900/80 via-indigo-900/80 to-purple-900/80"
              loading={loading}
              actions={
                <button className="text-white/60 hover:text-white transition-colors">
                  <Eye className="w-5 h-5" />
                </button>
              }
            >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-4 hover:bg-white/15 transition-all border border-white/10">
                  <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{aiStats.totalCalls}</div>
                  <div className="text-xs text-gray-300 mt-1">Total Calls</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4 hover:bg-white/15 transition-all border border-white/10">
                  <div className="text-3xl font-bold text-green-400">{aiStats.successRate}%</div>
                  <div className="text-xs text-gray-300 mt-1">Success Rate</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4 hover:bg-white/15 transition-all border border-white/10">
                  <div className="text-2xl font-bold text-white">{aiStats.totalTokens.toLocaleString()}</div>
                  <div className="text-xs text-gray-300 mt-1">Total Tokens</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4 hover:bg-white/15 transition-all border border-white/10">
                  <div className="text-2xl font-bold text-cyan-400">{aiStats.avgTokensPerCall}</div>
                  <div className="text-xs text-gray-300 mt-1">Avg/Call</div>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                {stats.aiLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="bg-white/5 hover:bg-white/10 rounded-lg p-3 flex items-center justify-between transition-all border border-white/5">
                    <div>
                      <span className="text-white text-sm font-medium">{log.operation}</span>
                      <span className="text-gray-400 text-xs ml-2">({log.model})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {log.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className="text-xs text-gray-400">{formatTimeAgo(log.created_at)}</span>
                    </div>
                  </div>
                ))}
                {stats.aiLogs.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Brain className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No AI activity yet</p>
                  </div>
                )}
              </div>
            </div>
          </DashboardWidget>
          </div>

          {/* RSS Feed Panel */}
          <div onClick={() => setActiveModal('rss')} className="cursor-pointer">
            <DashboardWidget
              title="RSS Feed"
              icon={Rss}
              gradient="from-cyan-900/80 via-blue-900/80 to-cyan-900/80"
              loading={loading}
              actions={
                <button className="text-white/60 hover:text-white transition-colors">
                  <Eye className="w-5 h-5" />
                </button>
              }
            >
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-xl p-4 hover:bg-white/15 transition-all border border-white/10">
                  <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{rssStats.total}</div>
                  <div className="text-xs text-gray-300 mt-1">Total Articles</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4 hover:bg-white/15 transition-all border border-white/10">
                  <div className="text-3xl font-bold text-cyan-400">{rssStats.unprocessed}</div>
                  <div className="text-xs text-gray-300 mt-1">Unprocessed</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4 hover:bg-white/15 transition-all border border-white/10">
                  <div className="text-3xl font-bold text-green-400">{rssStats.sources}</div>
                  <div className="text-xs text-gray-300 mt-1">Sources</div>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                {stats.rssArticles.slice(0, 5).map(article => (
                  <div key={article.id} className="bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-all border border-white/5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-white text-sm font-medium line-clamp-1">{article.headline}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-cyan-400">{article.source}</span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500">{formatTimeAgo(article.published_at)}</span>
                        </div>
                      </div>
                      {!article.processed && (
                        <Flame className="w-5 h-5 text-cyan-400 flex-shrink-0 ml-2 animate-pulse" />
                      )}
                    </div>
                  </div>
                ))}
                {stats.rssArticles.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Rss className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No articles yet</p>
                  </div>
                )}
              </div>
            </div>
          </DashboardWidget>
          </div>

          {/* ML Status Panel */}
          <div onClick={() => setActiveModal('ml')} className="cursor-pointer">
            <DashboardWidget
              title="ML Jobs"
              icon={Cpu}
              gradient="from-emerald-900/80 via-green-900/80 to-emerald-900/80"
              loading={loading}
              actions={
                <button className="text-white/60 hover:text-white transition-colors">
                  <Eye className="w-5 h-5" />
                </button>
              }
            >
            <div className="space-y-4">
              <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-300 text-sm">Last Run:</span>
                  <span className="text-white font-bold">{mlStats.lastRun}</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-300 text-sm">Status:</span>
                  <span className={`font-bold px-3 py-1 rounded-full text-sm ${
                    mlStats.status === 'running' ? 'bg-green-500/20 text-green-400' :
                    mlStats.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                    mlStats.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {mlStats.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Progress:</span>
                  <span className="text-white font-bold">{mlStats.progress}</span>
                </div>
              </div>

              <div className="max-h-32 overflow-y-auto space-y-2 custom-scrollbar">
                {stats.mlJobs.slice(0, 5).map(job => (
                  <div key={job.id} className="bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-all border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-medium">{job.job_type}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        job.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                        job.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatTimeAgo(job.started_at)}
                    </div>
                  </div>
                ))}
                {stats.mlJobs.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Cpu className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No ML jobs yet</p>
                  </div>
                )}
              </div>
            </div>
          </DashboardWidget>
          </div>

          {/* GOD Score Distribution */}
          <div onClick={() => setActiveModal('god')} className="cursor-pointer">
            <DashboardWidget
              title="GOD Score Analytics"
              icon={Zap}
              gradient="from-slate-800/80 via-slate-700/80 to-slate-800/80"
              loading={loading}
              actions={
                <button className="text-white/60 hover:text-white transition-colors">
                  <Eye className="w-5 h-5" />
                </button>
              }
            >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-4 hover:bg-white/15 transition-all border border-white/10">
                  <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{avgGodScore}</div>
                  <div className="text-xs text-gray-300 mt-1">Avg Score</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4 hover:bg-white/15 transition-all border border-white/10">
                  <div className="text-3xl font-bold text-yellow-400">{stats.scoreHistory.length}</div>
                  <div className="text-xs text-gray-300 mt-1">Changes (24h)</div>
                </div>
              </div>

              <div>
                <h4 className="text-sm text-gray-300 mb-3 font-semibold">Top Movers (24h)</h4>
                <div className="space-y-2">
                  {topMovers.map(mover => (
                    <div key={mover.id} className="bg-white/5 hover:bg-white/10 rounded-lg p-3 flex items-center justify-between transition-all border border-white/5">
                      <span className="text-white text-sm font-medium truncate flex-1">
                        {mover.startup?.name || 'Unknown'}
                      </span>
                      <div className="flex items-center gap-2">
                        {mover.change > 0 ? (
                          <ArrowUp className="w-5 h-5 text-green-400" />
                        ) : (
                          <ArrowDown className="w-5 h-5 text-red-400" />
                        )}
                        <span className={`text-sm font-bold px-2 py-1 rounded ${
                          mover.change > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {Math.abs(mover.change)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {topMovers.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No score changes yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DashboardWidget>
          </div>
        </div>

        {/* Activity Log */}
        <DashboardWidget
          title="Recent Activity"
          icon={Activity}
          gradient="from-gray-800/80 via-gray-900/80 to-gray-800/80"
          loading={loading}
        >
          <div className="max-h-96 overflow-y-auto space-y-2 custom-scrollbar">
            {[
              ...stats.aiLogs.slice(0, 3).map(log => ({
                type: 'ai' as const,
                time: log.created_at,
                message: `AI ${log.operation} - ${log.status}`,
                icon: Brain,
                color: 'purple'
              })),
              ...stats.rssArticles.slice(0, 3).map(article => ({
                type: 'rss' as const,
                time: article.published_at,
                message: `New article: ${article.headline}`,
                icon: Newspaper,
                color: 'cyan'
              })),
              ...stats.scoreHistory.slice(0, 3).map(score => ({
                type: 'score' as const,
                time: score.created_at,
                message: `${score.startup?.name || 'Startup'} score changed: ${score.old_score} → ${score.new_score}`,
                icon: TrendingUp,
                color: 'orange'
              }))
            ]
              .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
              .slice(0, 10)
              .map((activity, idx) => {
                const Icon = activity.icon;
                const colorClasses = {
                  purple: 'text-purple-400 bg-purple-500/10',
                  cyan: 'text-cyan-400 bg-cyan-500/10',
                  orange: 'text-cyan-400 bg-cyan-600/10'
                }[activity.color];
                
                return (
                  <div key={idx} className="bg-white/5 hover:bg-white/10 rounded-lg p-4 flex items-start gap-3 transition-all border border-white/5">
                    <div className={`p-2 rounded-lg ${colorClasses}`}>
                      <Icon className="w-5 h-5 flex-shrink-0" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium">{activity.message}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-400">{formatTimeAgo(activity.time)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            {stats.aiLogs.length === 0 && stats.rssArticles.length === 0 && stats.scoreHistory.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Activity className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No recent activity</p>
                <p className="text-xs text-gray-500 mt-1">Activity will appear here as the system processes data</p>
              </div>
            )}
          </div>
        </DashboardWidget>

        {/* Modals for detailed views */}
        {activeModal && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setActiveModal(null)}
          >
            <div 
              className="bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 rounded-3xl p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto border-2 border-purple-500/30 shadow-2xl custom-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  {activeModal === 'ai' && <Brain className="w-8 h-8 text-purple-400" />}
                  {activeModal === 'rss' && <Rss className="w-8 h-8 text-cyan-400" />}
                  {activeModal === 'ml' && <Cpu className="w-8 h-8 text-green-400" />}
                  {activeModal === 'god' && <Zap className="w-8 h-8 text-cyan-400" />}
                  {activeModal === 'matching' && <Activity className="w-8 h-8 text-pink-400" />}
                  <h2 className="text-3xl font-bold text-white">
                    {activeModal === 'ai' && 'AI Activity Dashboard'}
                    {activeModal === 'rss' && 'RSS Feed Dashboard'}
                    {activeModal === 'ml' && 'ML Jobs Dashboard'}
                    {activeModal === 'god' && 'GOD Score Dashboard'}
                    {activeModal === 'matching' && 'Matching Engine Dashboard'}
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  {/* Action buttons based on modal type */}
                  {activeModal === 'ai' && (
                    <button
                      onClick={runInvestorScraper}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-all text-sm font-medium"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      Run Investor Scraper
                    </button>
                  )}
                  {activeModal === 'rss' && (
                    <button
                      onClick={runRSSScraper}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white rounded-lg transition-all text-sm font-medium"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      Run RSS Scraper
                    </button>
                  )}
                  {activeModal === 'ml' && (
                    <button
                      onClick={runMLJob}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-all text-sm font-medium"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      Run ML Job
                    </button>
                  )}
                  {activeModal === 'god' && (
                    <button
                      onClick={calculateGodScores}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-600 text-white rounded-lg transition-all text-sm font-medium"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      Calculate GOD Scores
                    </button>
                  )}
                  <button
                    onClick={() => setActiveModal(null)}
                    className="text-white hover:text-gray-300 text-3xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* AI Modal Content */}
              {activeModal === 'ai' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-purple-500/20 rounded-xl p-4 border border-purple-500/30">
                      <div className="text-3xl font-bold text-white">{aiStats.totalCalls}</div>
                      <div className="text-sm text-purple-300">Total API Calls</div>
                    </div>
                    <div className="bg-green-500/20 rounded-xl p-4 border border-green-500/30">
                      <div className="text-3xl font-bold text-green-400">{aiStats.successRate}%</div>
                      <div className="text-sm text-green-300">Success Rate</div>
                    </div>
                    <div className="bg-blue-500/20 rounded-xl p-4 border border-blue-500/30">
                      <div className="text-3xl font-bold text-blue-400">{aiStats.totalTokens.toLocaleString()}</div>
                      <div className="text-sm text-blue-300">Total Tokens</div>
                    </div>
                    <div className="bg-cyan-500/20 rounded-xl p-4 border border-cyan-500/30">
                      <div className="text-3xl font-bold text-cyan-400">{aiStats.avgTokensPerCall}</div>
                      <div className="text-sm text-cyan-300">Avg Tokens/Call</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white mb-3">Recent AI Operations</h3>
                    {stats.aiLogs.map(log => (
                      <div key={log.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-white font-semibold">{log.operation}</span>
                            <span className="text-gray-400 text-sm">({log.model})</span>
                          </div>
                          {log.status === 'success' ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-gray-400">Input Tokens:</span>
                            <span className="text-white ml-2">{log.input_tokens || 0}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Output Tokens:</span>
                            <span className="text-white ml-2">{log.output_tokens || 0}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Time:</span>
                            <span className="text-white ml-2">{formatTimeAgo(log.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RSS Modal Content */}
              {activeModal === 'rss' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-cyan-500/20 rounded-xl p-4 border border-cyan-500/30">
                      <div className="text-3xl font-bold text-white">{rssStats.total}</div>
                      <div className="text-sm text-cyan-300">Total Articles</div>
                    </div>
                    <div className="bg-cyan-600/20 rounded-xl p-4 border border-cyan-500/30">
                      <div className="text-3xl font-bold text-cyan-400">{rssStats.unprocessed}</div>
                      <div className="text-sm text-cyan-300">Unprocessed</div>
                    </div>
                    <div className="bg-green-500/20 rounded-xl p-4 border border-green-500/30">
                      <div className="text-3xl font-bold text-green-400">{rssStats.sources}</div>
                      <div className="text-sm text-green-300">Active Sources</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white mb-3">Recent Articles</h3>
                    {stats.rssArticles.map(article => (
                      <div key={article.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-white font-semibold mb-2">{article.headline}</h4>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-cyan-400">{article.source}</span>
                              <span className="text-gray-500">{formatTimeAgo(article.published_at)}</span>
                            </div>
                            {article.source_url && (
                              <a 
                                href={article.source_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block"
                              >
                                View Article →
                              </a>
                            )}
                          </div>
                          {!article.processed && (
                            <div className="flex items-center gap-2 bg-cyan-600/20 px-3 py-1 rounded-full">
                              <Flame className="w-4 h-4 text-cyan-400 animate-pulse" />
                              <span className="text-cyan-300 text-xs font-medium">New</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ML Modal Content */}
              {activeModal === 'ml' && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl p-6 border border-green-500/30">
                    <h3 className="text-xl font-bold text-white mb-4">Current Status</h3>
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <div className="text-gray-300 text-sm mb-1">Last Run</div>
                        <div className="text-2xl font-bold text-white">{mlStats.lastRun}</div>
                      </div>
                      <div>
                        <div className="text-gray-300 text-sm mb-1">Status</div>
                        <div className={`text-2xl font-bold ${
                          mlStats.status === 'running' ? 'text-green-400' :
                          mlStats.status === 'completed' ? 'text-blue-400' :
                          mlStats.status === 'failed' ? 'text-red-400' :
                          'text-gray-400'
                        }`}>{mlStats.status}</div>
                      </div>
                      <div>
                        <div className="text-gray-300 text-sm mb-1">Progress</div>
                        <div className="text-2xl font-bold text-white">{mlStats.progress}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white mb-3">Job History</h3>
                    {stats.mlJobs.map(job => (
                      <div key={job.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-white font-semibold">{job.job_type}</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            job.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                            job.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {job.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-gray-400">Processed:</span>
                            <span className="text-white ml-2">{job.records_processed || 0}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Total:</span>
                            <span className="text-white ml-2">{job.records_total || 0}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Started:</span>
                            <span className="text-white ml-2">{formatTimeAgo(job.started_at)}</span>
                          </div>
                        </div>
                        {job.completed_at && (
                          <div className="text-sm text-gray-400 mt-2">
                            Completed: {formatTimeAgo(job.completed_at)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GOD Score Modal Content */}
              {activeModal === 'god' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-cyan-600/20 rounded-xl p-4 border border-cyan-500/30">
                      <div className="text-3xl font-bold text-white">{avgGodScore}</div>
                      <div className="text-sm text-cyan-300">Average GOD Score</div>
                    </div>
                    <div className="bg-yellow-500/20 rounded-xl p-4 border border-cyan-500/30">
                      <div className="text-3xl font-bold text-yellow-400">{stats.scoreHistory.length}</div>
                      <div className="text-sm text-yellow-300">Score Changes (24h)</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">Top Startups by Score</h3>
                    <div className="space-y-2">
                      {stats.startups.slice(0, 10).map((startup, idx) => (
                        <div key={startup.id} className="bg-white/5 rounded-lg p-4 border border-white/10 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                              {idx + 1}
                            </div>
                            <span className="text-white font-semibold">{startup.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                                {startup.total_god_score || 0}
                              </div>
                              <div className="text-xs text-gray-400">GOD Score</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">Recent Score Changes</h3>
                    <div className="space-y-2">
                      {stats.scoreHistory.map(change => (
                        <div key={change.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <div className="flex items-center justify-between">
                            <span className="text-white font-semibold">{change.startup?.name || 'Unknown'}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-gray-400">{change.old_score}</span>
                              {(change.new_score || 0) > (change.old_score || 0) ? (
                                <ArrowUp className="w-5 h-5 text-green-400" />
                              ) : (
                                <ArrowDown className="w-5 h-5 text-red-400" />
                              )}
                              <span className="text-white font-bold">{change.new_score}</span>
                              <span className={`px-2 py-1 rounded text-sm font-bold ${
                                (change.new_score || 0) > (change.old_score || 0) 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {(change.new_score || 0) > (change.old_score || 0) ? '+' : ''}
                                {(change.new_score || 0) - (change.old_score || 0)}
                              </span>
                            </div>
                          </div>
                          {change.change_reason && (
                            <div className="text-sm text-gray-400 mt-2">{change.change_reason}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">{formatTimeAgo(change.created_at)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-bold rounded-xl transition-all"
                >
                  Close Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.7);
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
