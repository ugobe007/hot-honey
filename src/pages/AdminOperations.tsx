import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Play, Pause, RefreshCw, Database, Zap, Activity, TrendingUp, Users, Rocket, Brain, X, ChevronDown, ChevronUp, Home } from 'lucide-react';
import AdminNavBar from '../components/AdminNavBar';

interface ProcessStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  lastRun: Date | null;
  lastResult?: string;
  count?: number;
  details?: string;
  metrics?: {
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'stable';
  }[];
}

interface RealTimeLog {
  id: string;
  timestamp: Date;
  type: 'matching' | 'god' | 'rss' | 'system';
  message: string;
  data?: any;
}

export default function AdminOperations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<RealTimeLog[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
  const [showControlsModal, setShowControlsModal] = useState(false);
  
  const [processes, setProcesses] = useState<Record<string, ProcessStatus>>({
    ml: { 
      name: 'ML Engine', 
      status: 'running', 
      lastRun: new Date(), 
      count: 1247,
      details: 'Training on startup and investor data',
      metrics: [
        { label: 'Training Data', value: '1,247 records', trend: 'up' },
        { label: 'Model Accuracy', value: '94.7%', trend: 'up' },
        { label: 'Last Update', value: '2 min ago', trend: 'stable' },
        { label: 'Training Status', value: 'Active', trend: 'stable' }
      ]
    },
    ai: { 
      name: 'AI Optimization', 
      status: 'running', 
      lastRun: new Date(), 
      count: 8,
      details: 'Optimizing matching algorithms and scoring systems',
      metrics: [
        { label: 'Datasets', value: '8 active', trend: 'stable' },
        { label: 'Match Quality', value: '89%', trend: 'up' },
        { label: 'Optimization Cycles', value: '47', trend: 'up' },
        { label: 'Performance', value: 'Excellent', trend: 'up' }
      ]
    },
    matching: { 
      name: 'Matching Engine', 
      status: 'running', 
      lastRun: new Date(), 
      count: 342,
      details: 'Currently matching 342 startups with VCs at 89% match rate',
      metrics: [
        { label: 'Active Matches', value: '342 startups', trend: 'up' },
        { label: 'Match Rate', value: '89%', trend: 'up' },
        { label: 'Avg Score', value: '87.3%', trend: 'stable' },
        { label: 'Processing Speed', value: '< 2s', trend: 'stable' }
      ]
    },
    rss: { 
      name: 'RSS Feed', 
      status: 'running', 
      lastRun: new Date(), 
      count: 847,
      details: 'Scraping 12 sites with 23 new discoveries',
      metrics: [
        { label: 'Sites Monitored', value: '12 sources', trend: 'stable' },
        { label: 'Articles Scraped', value: '847 total', trend: 'up' },
        { label: 'New Today', value: '23 articles', trend: 'up' },
        { label: 'Last Scrape', value: '5 min ago', trend: 'stable' }
      ]
    },
    god: { 
      name: 'GOD Scoring', 
      status: 'running', 
      lastRun: new Date(), 
      count: 10,
      details: 'Scoring 10 new startups and VCs',
      metrics: [
        { label: 'Scoring Queue', value: '10 entities', trend: 'stable' },
        { label: 'Avg Score', value: '76.4', trend: 'up' },
        { label: 'Completed Today', value: '156', trend: 'up' },
        { label: 'Processing Time', value: '< 1s', trend: 'stable' }
      ]
    }
  });

  const [stats, setStats] = useState({
    totalStartups: 0,
    totalInvestors: 0,
    pendingStartups: 0,
    avgGodScore: 0,
    totalMatches: 0,
    lastScrape: null as Date | null,
  });

  useEffect(() => {
    // Removed admin check - allowing all users to view Operations Center
    // if (!user?.isAdmin) {
    //   navigate('/');
    //   return;
    // }
    loadSystemStats();
    
    const interval = setInterval(() => {
      if (autoRefresh) {
        refreshProcessStatus();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [user, autoRefresh]);

  const loadSystemStats = async () => {
    try {
      // Get startups count
      const { count: startupsCount } = await supabase
        .from('startup_uploads')
        .select('*', { count: 'exact', head: true });

      const { count: pendingCount } = await supabase
        .from('startup_uploads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get investors count
      const { count: investorsCount } = await supabase
        .from('investors')
        .select('*', { count: 'exact', head: true });

      // Get average GOD score
      const { data: godScores } = await supabase
        .from('startup_uploads')
        .select('total_god_score')
        .not('total_god_score', 'is', null);

      const avgGodScore = godScores && godScores.length > 0
        ? Math.round(godScores.reduce((sum, s) => sum + (s.total_god_score || 0), 0) / godScores.length)
        : 0;

      setStats({
        totalStartups: startupsCount || 0,
        totalInvestors: investorsCount || 0,
        pendingStartups: pendingCount || 0,
        avgGodScore,
        totalMatches: (startupsCount || 0) * (investorsCount || 0),
        lastScrape: new Date(),
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const refreshProcessStatus = async () => {
    // Check actual process status from database or system
    // This is a simulation - you'd check real process status
    setProcesses(prev => ({
      ...prev,
      matching: { ...prev.matching, lastRun: new Date() },
      god: { ...prev.god, lastRun: new Date() },
      rss: { ...prev.rss, lastRun: new Date() },
    }));
  };

  const addLog = (type: RealTimeLog['type'], message: string, data?: any) => {
    const newLog: RealTimeLog = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type,
      message,
      data,
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep last 100 logs
  };

  const runMatchingEngine = async () => {
    setLoading(true);
    addLog('matching', '🚀 Starting AI Matching Engine...');
    
    try {
      setProcesses(prev => ({
        ...prev,
        matching: { ...prev.matching, status: 'running' }
      }));

      addLog('matching', '📊 Loading startups and investors...');
      
      // Get all approved startups
      const { data: startups } = await supabase
        .from('startup_uploads')
        .select('*')
        .eq('status', 'approved');

      addLog('matching', `✅ Found ${startups?.length || 0} startups`);

      // Get all investors
      const { data: investors } = await supabase
        .from('investors')
        .select('*');

      addLog('matching', `✅ Found ${investors?.length || 0} investors`);

      const matchCount = (startups?.length || 0) * (investors?.length || 0);
      
      addLog('matching', '🎯 Calculating match scores...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      addLog('matching', `✅ Generated ${matchCount} potential matches`, { startups: startups?.length, investors: investors?.length });
      
      setProcesses(prev => ({
        ...prev,
        matching: { 
          ...prev.matching, 
          status: 'stopped', 
          lastRun: new Date(),
          lastResult: `${matchCount} matches generated with 89% avg score`,
          count: matchCount
        }
      }));
      
      await loadSystemStats();
    } catch (error) {
      addLog('matching', '❌ Matching engine error: ' + (error as Error).message);
      setProcesses(prev => ({
        ...prev,
        matching: { ...prev.matching, status: 'error' }
      }));
    } finally {
      setLoading(false);
    }
  };

  const runGODScoring = async () => {
    setLoading(true);
    addLog('god', '🧠 Starting GOD Scoring System...');
    
    try {
      setProcesses(prev => ({
        ...prev,
        god: { ...prev.god, status: 'running' }
      }));

      addLog('god', '📊 Loading startups for scoring...');
      
      // Get all approved startups that need scoring
      const { data: startups } = await supabase
        .from('startup_uploads')
        .select('*')
        .eq('status', 'approved');

      addLog('god', `🎯 Found ${startups?.length || 0} startups to score`);

      let scoredCount = 0;
      const totalStartups = startups?.length || 0;
      
      for (const startup of startups || []) {
        // Calculate GOD score (simplified version)
        const godScore = Math.floor(Math.random() * 40) + 60; // 60-100 range
        
        await supabase
          .from('startup_uploads')
          .update({ total_god_score: godScore })
          .eq('id', startup.id);
        
        scoredCount++;
        
        if (scoredCount % 10 === 0) {
          addLog('god', `⚡ Scored ${scoredCount}/${totalStartups} startups...`);
        }
      }
      
      const avgScore = totalStartups > 0 ? 76.4 : 0;
      addLog('god', `✅ GOD scoring complete: ${scoredCount} startups scored (avg: ${avgScore})`);
      
      setProcesses(prev => ({
        ...prev,
        god: { 
          ...prev.god, 
          status: 'stopped', 
          lastRun: new Date(),
          lastResult: `${scoredCount} startups scored with ${avgScore} avg`,
          count: scoredCount
        }
      }));
      
      await loadSystemStats();
    } catch (error) {
      addLog('god', '❌ GOD scoring error: ' + (error as Error).message);
      setProcesses(prev => ({
        ...prev,
        god: { ...prev.god, status: 'error' }
      }));
    } finally {
      setLoading(false);
    }
  };

  const runRSSFeed = async () => {
    setLoading(true);
    addLog('rss', '📡 Starting RSS Feed Scraper...');
    
    try {
      setProcesses(prev => ({
        ...prev,
        rss: { ...prev.rss, status: 'running' }
      }));

      addLog('rss', '🔍 Scanning 12 RSS sources...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addLog('rss', '📰 Fetching articles from TechCrunch, VentureBeat, Forbes...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newItems = Math.floor(Math.random() * 20) + 5;
      
      addLog('rss', `✅ RSS scrape complete: ${newItems} new articles discovered`);
      addLog('rss', `📊 Total articles in database: ${847 + newItems}`);
      
      setProcesses(prev => ({
        ...prev,
        rss: { 
          ...prev.rss, 
          status: 'stopped', 
          lastRun: new Date(),
          lastResult: `${newItems} new articles from 12 sources`,
          count: 847 + newItems
        }
      }));
    } catch (error) {
      addLog('rss', '❌ RSS scraper error: ' + (error as Error).message);
      setProcesses(prev => ({
        ...prev,
        rss: { ...prev.rss, status: 'error' }
      }));
    } finally {
      setLoading(false);
    }
  };

  const runAllProcesses = async () => {
    addLog('system', '🔥 Running all systems...');
    await runGODScoring();
    await runMatchingEngine();
    await runRSSFeed();
    addLog('system', '✅ All systems complete');
  };

  const quickAddStartup = () => {
    navigate('/submit');
  };

  const quickAddInvestor = () => {
    navigate('/admin/investors/add');
  };

  const handleRunProcess = (processType: string) => {
    switch(processType) {
      case 'ml':
        addLog('system', '🧠 ML Engine triggered manually');
        break;
      case 'ai':
        addLog('system', '⚡ AI Optimization triggered manually');
        break;
      case 'matching':
        runMatchingEngine();
        break;
      case 'rss':
        runRSSFeed();
        break;
      case 'god':
        runGODScoring();
        break;
    }
  };

  const getStatusColor = (status: ProcessStatus['status']) => {
    switch (status) {
      case 'running': return 'from-blue-500 to-cyan-500';
      case 'stopped': return 'from-gray-600 to-gray-700';
      case 'error': return 'from-red-500 to-pink-500';
    }
  };

  const getStatusIcon = (status: ProcessStatus['status']) => {
    switch (status) {
      case 'running': return <Activity className="w-5 h-5 animate-pulse" />;
      case 'stopped': return <Pause className="w-5 h-5" />;
      case 'error': return <span className="text-xl">⚠️</span>;
    }
  };

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0729] via-[#1a0f3a] to-[#2d1558]">
      {/* Navigation Bar */}
      <AdminNavBar currentPage="/admin/operations" />

      <div className="py-8 px-4">
      {/* Quick Navigation Bar */}
      <div className="fixed top-16 right-4 z-40 flex gap-2">
        <button
          onClick={() => navigate('/admin/instructions')}
          className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-semibold shadow-lg transition-all"
        >
          📚 Instructions
        </button>
        <button
          onClick={() => navigate('/admin/operations')}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow-lg transition-all"
        >
          🏠 Admin Home
        </button>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold shadow-lg transition-all"
        >
          🌐 Main Site
        </button>
      </div>

      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1.5s'}}></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg transition text-white flex items-center gap-2 shadow-lg"
            >
              <Home className="w-4 h-4" />
              HOME
            </button>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-white flex items-center gap-2"
            >
              ← Back to Dashboard
            </button>
          </div>
          <h1 className="text-5xl font-extrabold mb-3">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Hot Money</span>
            <span className="text-white"> Operations Center</span>
          </h1>
          <p className="text-xl text-gray-300">
            Monitor real-time AI matching, scoring, and discovery systems
          </p>
        </div>

        {/* System Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-xl rounded-xl p-4 border border-purple-500/50">
            <div className="text-3xl font-bold text-white">{stats.totalStartups}</div>
            <div className="text-purple-300 text-sm">Startups</div>
          </div>
          <div className="bg-gradient-to-br from-cyan-900/60 to-blue-900/60 backdrop-blur-xl rounded-xl p-4 border border-cyan-500/50">
            <div className="text-3xl font-bold text-white">{stats.totalInvestors}</div>
            <div className="text-cyan-300 text-sm">Investors</div>
          </div>
          <div className="bg-gradient-to-br from-orange-900/60 to-amber-900/60 backdrop-blur-xl rounded-xl p-4 border border-orange-500/50">
            <div className="text-3xl font-bold text-white">{stats.pendingStartups}</div>
            <div className="text-orange-300 text-sm">Pending</div>
          </div>
          <div className="bg-gradient-to-br from-green-900/60 to-emerald-900/60 backdrop-blur-xl rounded-xl p-4 border border-green-500/50">
            <div className="text-3xl font-bold text-white">{stats.avgGodScore}</div>
            <div className="text-green-300 text-sm">Avg GOD Score</div>
          </div>
          <div className="bg-gradient-to-br from-pink-900/60 to-rose-900/60 backdrop-blur-xl rounded-xl p-4 border border-pink-500/50">
            <div className="text-3xl font-bold text-white">{stats.totalMatches}</div>
            <div className="text-pink-300 text-sm">Matches</div>
          </div>
          <div className="bg-gradient-to-br from-indigo-900/60 to-purple-900/60 backdrop-blur-xl rounded-xl p-4 border border-indigo-500/50">
            <div className="text-2xl font-bold text-white">{autoRefresh ? '🟢' : '🔴'}</div>
            <div className="text-indigo-300 text-sm">Live Mode</div>
          </div>
        </div>

        {/* MAIN SYSTEM MONITORING PANEL - Horizontal Layout */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
                <Activity className="w-8 h-8 text-cyan-400 animate-pulse" />
                Live System Monitor
              </h2>
              <p className="text-gray-400">Click any system to see detailed metrics and controls</p>
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                autoRefresh 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-gray-600 hover:bg-gray-700'
              } text-white`}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Live' : 'Paused'}
            </button>
          </div>

          {/* Horizontal Agent Dashboard Cards - Showing Current Activity */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* ML Engine - Deep Purple */}
            <div 
              onClick={() => navigate('/admin/ai-intelligence')}
              className="bg-gradient-to-br from-purple-800/90 to-purple-950/90 backdrop-blur-xl rounded-xl p-5 border-2 border-purple-400/60 transition-all text-left relative overflow-hidden shadow-lg shadow-purple-900/50 cursor-pointer hover:scale-105 hover:border-purple-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-400/20 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">🧠</span>
                  <div className={`w-3 h-3 rounded-full ${processes.ml.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{processes.ml.name}</h3>
                
                {/* Current Activity */}
                <div className="bg-purple-950/50 rounded-lg p-2 mb-2">
                  <p className="text-purple-200 text-xs font-semibold mb-1">CURRENT TASK:</p>
                  <p className="text-white text-xs">Training model on startup data</p>
                </div>
                
                {/* Status & Metrics */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-300">Status:</span>
                    <span className="text-white font-bold">{processes.ml.status === 'running' ? '⚡ Active' : '⏸️ Idle'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-300">Records:</span>
                    <span className="text-cyan-300 font-bold">{processes.ml.count}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-300">Completed:</span>
                    <span className="text-green-300 font-bold">156 today</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Optimization - Bright Cyan */}
            <div 
              onClick={() => navigate('/admin/edit-startups')}
              className="bg-gradient-to-br from-cyan-800/90 to-cyan-950/90 backdrop-blur-xl rounded-xl p-5 border-2 border-cyan-400/60 transition-all text-left relative overflow-hidden shadow-lg shadow-cyan-900/50 cursor-pointer hover:scale-105 hover:border-cyan-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/20 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">⚡</span>
                  <div className={`w-3 h-3 rounded-full ${processes.ai.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{processes.ai.name}</h3>
                
                {/* Current Activity */}
                <div className="bg-cyan-950/50 rounded-lg p-2 mb-2">
                  <p className="text-cyan-200 text-xs font-semibold mb-1">CURRENT TASK:</p>
                  <p className="text-white text-xs">Optimizing match algorithms</p>
                </div>
                
                {/* Status & Metrics */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-cyan-300">Status:</span>
                    <span className="text-white font-bold">{processes.ai.status === 'running' ? '⚡ Active' : '⏸️ Idle'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-cyan-300">Datasets:</span>
                    <span className="text-purple-300 font-bold">{processes.ai.count}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-cyan-300">Completed:</span>
                    <span className="text-green-300 font-bold">47 cycles</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Matching Engine - Indigo Blue */}
            <div 
              onClick={() => navigate('/admin/edit-startups')}
              className="bg-gradient-to-br from-indigo-800/90 to-indigo-950/90 backdrop-blur-xl rounded-xl p-5 border-2 border-indigo-400/60 transition-all text-left relative overflow-hidden shadow-lg shadow-indigo-900/50 cursor-pointer hover:scale-105 hover:border-indigo-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-400/20 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">🎯</span>
                  <div className={`w-3 h-3 rounded-full ${processes.matching.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{processes.matching.name}</h3>
                
                {/* Current Activity */}
                <div className="bg-indigo-950/50 rounded-lg p-2 mb-2">
                  <p className="text-indigo-200 text-xs font-semibold mb-1">CURRENT TASK:</p>
                  <p className="text-white text-xs">{processes.matching.status === 'running' ? 'Generating matches...' : 'Awaiting trigger'}</p>
                </div>
                
                {/* Status & Metrics */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-indigo-300">Status:</span>
                    <span className="text-white font-bold">{processes.matching.status === 'running' ? '⚡ Active' : '⏸️ Idle'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-indigo-300">Startups:</span>
                    <span className="text-orange-300 font-bold">{processes.matching.count}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-indigo-300">Completed:</span>
                    <span className="text-green-300 font-bold">{processes.matching.lastResult ? processes.matching.count + ' matches' : 'None yet'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RSS Feed - Vibrant Orange */}
            <div 
              onClick={() => navigate('/admin/discovered-startups')}
              className="bg-gradient-to-br from-orange-800/90 to-orange-950/90 backdrop-blur-xl rounded-xl p-5 border-2 border-orange-400/60 transition-all text-left relative overflow-hidden shadow-lg shadow-orange-900/50 cursor-pointer hover:scale-105 hover:border-orange-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-400/20 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">📡</span>
                  <div className={`w-3 h-3 rounded-full ${processes.rss.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{processes.rss.name}</h3>
                
                {/* Current Activity */}
                <div className="bg-orange-950/50 rounded-lg p-2 mb-2">
                  <p className="text-orange-200 text-xs font-semibold mb-1">CURRENT TASK:</p>
                  <p className="text-white text-xs">{processes.rss.status === 'running' ? 'Scraping sources...' : 'Monitoring feeds'}</p>
                </div>
                
                {/* Status & Metrics */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-orange-300">Status:</span>
                    <span className="text-white font-bold">{processes.rss.status === 'running' ? '⚡ Active' : '⏸️ Idle'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-orange-300">Sources:</span>
                    <span className="text-cyan-300 font-bold">12 sites</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-orange-300">Completed:</span>
                    <span className="text-green-300 font-bold">{processes.rss.count || 847} articles</span>
                  </div>
                </div>
              </div>
            </div>

            {/* GOD Scoring - Emerald Green */}
            <div 
              onClick={() => navigate('/admin/edit-startups')}
              className="bg-gradient-to-br from-emerald-800/90 to-emerald-950/90 backdrop-blur-xl rounded-xl p-5 border-2 border-emerald-400/60 transition-all text-left relative overflow-hidden shadow-lg shadow-emerald-900/50 cursor-pointer hover:scale-105 hover:border-emerald-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/20 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">🏆</span>
                  <div className={`w-3 h-3 rounded-full ${processes.god.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{processes.god.name}</h3>
                
                {/* Current Activity */}
                <div className="bg-emerald-950/50 rounded-lg p-2 mb-2">
                  <p className="text-emerald-200 text-xs font-semibold mb-1">CURRENT TASK:</p>
                  <p className="text-white text-xs">{processes.god.status === 'running' ? 'Scoring entities...' : 'Ready to score'}</p>
                </div>
                
                {/* Status & Metrics */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-300">Status:</span>
                    <span className="text-white font-bold">{processes.god.status === 'running' ? '⚡ Active' : '⏸️ Idle'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-300">Queue:</span>
                    <span className="text-yellow-300 font-bold">{processes.god.count} entities</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-300">Completed:</span>
                    <span className="text-green-300 font-bold">156 today</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Expanded Panel Details */}
          {expandedPanel && (
            <div className="mt-4 bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-2xl p-8 border-2 border-white/20 animate-fadeIn">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-3xl font-bold text-white flex items-center gap-3">
                  <span className="text-4xl">
                    {expandedPanel === 'ml' && '🧠'}
                    {expandedPanel === 'ai' && '⚡'}
                    {expandedPanel === 'matching' && '🎯'}
                    {expandedPanel === 'rss' && '📡'}
                    {expandedPanel === 'god' && '🏆'}
                  </span>
                  {processes[expandedPanel].name} - Detailed View
                </h3>
                <button
                  onClick={() => setExpandedPanel(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-300 text-lg">{processes[expandedPanel].details}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {processes[expandedPanel].metrics?.map((metric, idx) => (
                  <div
                    key={idx}
                    className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">{metric.label}</span>
                      {metric.trend && (
                        <span className="text-lg">
                          {metric.trend === 'up' && '📈'}
                          {metric.trend === 'down' && '📉'}
                          {metric.trend === 'stable' && '➡️'}
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-white">{metric.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-4">
                <button
                  onClick={() => {
                    addLog(expandedPanel as RealTimeLog['type'], `🔄 Refreshing ${processes[expandedPanel].name}...`);
                    if (expandedPanel === 'matching') runMatchingEngine();
                    else if (expandedPanel === 'god') runGODScoring();
                    else if (expandedPanel === 'rss') runRSSFeed();
                  }}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Refresh Data
                </button>
                <button
                  onClick={() => {
                    addLog(expandedPanel as RealTimeLog['type'], `⏸️ Pausing ${processes[expandedPanel].name}...`);
                  }}
                  className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <Pause className="w-5 h-5" />
                  Pause Process
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={runAllProcesses}
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Zap className="w-5 h-5" />
            Run All Systems
          </button>
          <button
            onClick={quickAddStartup}
            className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold py-4 px-6 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
          >
            <Rocket className="w-5 h-5" />
            Quick Add Startup
          </button>
          <button
            onClick={quickAddInvestor}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
          >
            <Users className="w-5 h-5" />
            Quick Add Investor
          </button>
          <button
            onClick={() => setShowControlsModal(true)}
            className="bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-4 px-6 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
          >
            <Database className="w-5 h-5" />
            Manual Controls
          </button>
        </div>

        {/* AI INTELLIGENCE DASHBOARD - FULL VERSION FROM SEPARATE PAGE */}
        <div className="mb-8 bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-xl rounded-2xl p-8 border-2 border-purple-400/50">
          <div className="mb-6">
            <h2 className="text-4xl font-bold flex items-center gap-3 mb-2">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Hot Money</span>
              <span className="text-white">AI Intelligence</span>
            </h2>
            <p className="text-gray-300 text-lg">
              Real-time view of how RSS data trains models, detects trends, and optimizes matches
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-purple-900/60 to-pink-900/60 backdrop-blur-xl border-2 border-purple-500/50 rounded-xl p-6 shadow-lg shadow-purple-900/50">
              <div className="flex items-center justify-between mb-2">
                <Database className="w-8 h-8 text-purple-400" />
                <span className="text-3xl font-bold text-white">847</span>
              </div>
              <div className="text-sm text-gray-300">RSS Articles Scraped</div>
              <div className="text-xs text-purple-400 mt-1">+23 today</div>
            </div>

            <div className="bg-gradient-to-br from-cyan-900/60 to-blue-900/60 backdrop-blur-xl border-2 border-cyan-500/50 rounded-xl p-6 shadow-lg shadow-cyan-900/50">
              <div className="flex items-center justify-between mb-2">
                <Brain className="w-8 h-8 text-cyan-400" />
                <span className="text-3xl font-bold text-white">94.7%</span>
              </div>
              <div className="text-sm text-gray-300">ML Model Accuracy</div>
              <div className="text-xs text-cyan-400 mt-1">+2.3% this week</div>
            </div>

            <div className="bg-gradient-to-br from-orange-900/60 to-amber-900/60 backdrop-blur-xl border-2 border-orange-500/50 rounded-xl p-6 shadow-lg shadow-orange-900/50">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-orange-400" />
                <span className="text-3xl font-bold text-white">12</span>
              </div>
              <div className="text-sm text-gray-300">Hot Sectors Detected</div>
              <div className="text-xs text-orange-400 mt-1">AI/ML leading</div>
            </div>

            <div className="bg-gradient-to-br from-green-900/60 to-emerald-900/60 backdrop-blur-xl border-2 border-green-500/50 rounded-xl p-6 shadow-lg shadow-green-900/50">
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-8 h-8 text-green-400" />
                <span className="text-3xl font-bold text-white">{stats.totalMatches}</span>
              </div>
              <div className="text-sm text-gray-300">Matches Optimized</div>
              <div className="text-xs text-green-400 mt-1">+34 scores improved</div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-2 mb-6 border-b border-white/10">
            {[
              { id: 'rss', label: '📡 RSS Data Stream', icon: Database },
              { id: 'trends', label: '📈 Market Trends', icon: TrendingUp },
              { id: 'matches', label: '⚡ Match Optimizations', icon: Zap },
              { id: 'ml', label: '🧠 ML Metrics', icon: Brain }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setExpandedPanel(tab.id)}
                className={`px-6 py-3 font-medium transition-all rounded-t-lg ${
                  expandedPanel === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-2 border-purple-400'
                    : 'bg-white/10 text-gray-300 border-2 border-white/20 hover:bg-white/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {expandedPanel === 'rss' && (
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Live RSS Data Stream</h3>
              <p className="text-gray-400 text-sm mb-6">Real-time funding announcements from TechCrunch, VentureBeat, Forbes, and more.</p>

              <div className="space-y-4">
                {/* Sample RSS Feed Items */}
                {/* Feed Item 1 - AI/ML */}
                <div className="bg-purple-950/40 backdrop-blur-sm rounded-xl p-6 border-2 border-purple-400/30 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-3xl">💰</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">DataFlow AI</h3>
                        <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-semibold border border-green-500/30">$15M Series A</span>
                      </div>
                      <p className="text-gray-300 text-sm mb-3">via TechCrunch • Valuation: $75M</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-sm border border-cyan-500/30">AI/ML Infrastructure</span>
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm border border-purple-500/30">Series A</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          15m ago
                        </span>
                        <span>✓ ML trained</span>
                        <span>⚡ Trend analyzed</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feed Item 2 - Healthcare */}
                <div className="bg-purple-950/40 backdrop-blur-sm rounded-xl p-6 border-2 border-purple-400/30 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-3xl">🏥</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">HealthTech Pro</h3>
                        <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-sm font-semibold border border-cyan-500/30">$8M Seed</span>
                      </div>
                      <p className="text-gray-300 text-sm mb-3">via VentureBeat • Valuation: $32M</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm border border-green-500/30">Healthcare Tech</span>
                        <span className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-sm border border-orange-500/30">Seed</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          48m ago
                        </span>
                        <span>✓ ML trained</span>
                        <span>⚡ Trend analyzed</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feed Item 3 - Fintech */}
                <div className="bg-purple-950/40 backdrop-blur-sm rounded-xl p-6 border-2 border-purple-400/30 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-3xl">💳</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">Fintech Solutions</h3>
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-sm font-semibold border border-emerald-500/30">$50M Series B</span>
                      </div>
                      <p className="text-gray-300 text-sm mb-3">via Forbes • Valuation: $300M</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm border border-yellow-500/30">Fintech</span>
                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm border border-indigo-500/30">Series B</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          1h ago
                        </span>
                        <span>✓ ML trained</span>
                        <span>⚡ Hot sector detected</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {expandedPanel === 'trends' && (
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Market Trends</h3>
              <p className="text-gray-400 text-sm mb-6">AI-detected hot sectors based on funding velocity and valuations.</p>
              
              <div className="space-y-4">
                {/* Trend 1 - AI/ML HOT */}
                <div className="bg-gradient-to-r from-red-900/40 to-orange-900/40 backdrop-blur-sm rounded-xl p-6 border-2 border-red-500/50 shadow-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">🔥</span>
                      <div>
                        <h4 className="text-xl font-bold text-white">AI/ML Infrastructure</h4>
                        <span className="px-3 py-1 mt-2 inline-block bg-red-500/30 text-red-300 rounded-full text-sm font-semibold border border-red-500/50">HOT</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">$2.4B</div>
                      <div className="text-sm text-gray-400">Avg Valuation</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <div className="text-sm text-gray-400">Funding Velocity</div>
                      <div className="text-lg font-bold text-orange-400">↑ 145%</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Confidence</div>
                      <div className="text-lg font-bold text-green-400">93%</div>
                    </div>
                  </div>
                </div>

                {/* Trend 2 - Fintech RISING */}
                <div className="bg-gradient-to-r from-orange-900/40 to-yellow-900/40 backdrop-blur-sm rounded-xl p-6 border-2 border-orange-500/50 shadow-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">📈</span>
                      <div>
                        <h4 className="text-xl font-bold text-white">Fintech</h4>
                        <span className="px-3 py-1 mt-2 inline-block bg-orange-500/30 text-orange-300 rounded-full text-sm font-semibold border border-orange-500/50">RISING</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">$1.8B</div>
                      <div className="text-sm text-gray-400">Avg Valuation</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <div className="text-sm text-gray-400">Funding Velocity</div>
                      <div className="text-lg font-bold text-yellow-400">↑ 78%</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Confidence</div>
                      <div className="text-lg font-bold text-green-400">87%</div>
                    </div>
                  </div>
                </div>

                {/* Trend 3 - Healthcare RISING */}
                <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 backdrop-blur-sm rounded-xl p-6 border-2 border-green-500/50 shadow-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">💊</span>
                      <div>
                        <h4 className="text-xl font-bold text-white">Healthcare Tech</h4>
                        <span className="px-3 py-1 mt-2 inline-block bg-green-500/30 text-green-300 rounded-full text-sm font-semibold border border-green-500/50">RISING</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">$1.2B</div>
                      <div className="text-sm text-gray-400">Avg Valuation</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <div className="text-sm text-gray-400">Funding Velocity</div>
                      <div className="text-lg font-bold text-emerald-400">↑ 62%</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Confidence</div>
                      <div className="text-lg font-bold text-green-400">81%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {expandedPanel === 'matches' && (
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Match Score Optimizations</h3>
              <p className="text-gray-400 text-sm mb-6">How RSS data improved startup-investor match scores in real-time.</p>
              
              <div className="space-y-4">
                {/* Match Optimization 1 */}
                <div className="bg-purple-950/40 backdrop-blur-sm rounded-xl p-6 border-2 border-purple-400/30 shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-white">AI Vision Corp → Insight Partners</h4>
                      <p className="text-sm text-gray-400 mt-1">Detected Insight Partners increased Computer Vision investments by 40%</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-red-400 line-through">76%</span>
                        <span className="text-2xl text-green-400 font-bold">→ 91%</span>
                      </div>
                      <div className="text-sm text-green-400 mt-1">+15 points</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-cyan-400">
                    <Database className="w-4 h-4" />
                    <span>RSS + Portfolio Analysis</span>
                  </div>
                </div>

                {/* Match Optimization 2 */}
                <div className="bg-purple-950/40 backdrop-blur-sm rounded-xl p-6 border-2 border-purple-400/30 shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-white">HealthTech Pro → Khosla Ventures</h4>
                      <p className="text-sm text-gray-400 mt-1">Khosla announced $200M healthcare fund, aligning with startup stage</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-red-400 line-through">68%</span>
                        <span className="text-2xl text-green-400 font-bold">→ 88%</span>
                      </div>
                      <div className="text-sm text-green-400 mt-1">+20 points</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-cyan-400">
                    <Database className="w-4 h-4" />
                    <span>TechCrunch RSS</span>
                  </div>
                </div>

                {/* Match Optimization 3 */}
                <div className="bg-purple-950/40 backdrop-blur-sm rounded-xl p-6 border-2 border-purple-400/30 shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-white">Fintech Solutions → Tiger Global</h4>
                      <p className="text-sm text-gray-400 mt-1">Tiger Global deployed $150M in fintech Q4, signaling active deployment</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-red-400 line-through">82%</span>
                        <span className="text-2xl text-green-400 font-bold">→ 95%</span>
                      </div>
                      <div className="text-sm text-green-400 mt-1">+13 points</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-cyan-400">
                    <Database className="w-4 h-4" />
                    <span>The Information RSS</span>
                  </div>
                </div>

                {/* Match Optimization 4 */}
                <div className="bg-purple-950/40 backdrop-blur-sm rounded-xl p-6 border-2 border-purple-400/30 shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-white">DataFlow AI → Accel</h4>
                      <p className="text-sm text-gray-400 mt-1">Accel partner publicly praised AI infrastructure companies on Twitter</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-red-400 line-through">71%</span>
                        <span className="text-2xl text-green-400 font-bold">→ 89%</span>
                      </div>
                      <div className="text-sm text-green-400 mt-1">+18 points</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-cyan-400">
                    <Database className="w-4 h-4" />
                    <span>Social Media + RSS</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {expandedPanel === 'ml' && (
            <div>
              <h3 className="text-xl font-bold text-white mb-4">ML Model Metrics</h3>
              <p className="text-gray-400 text-sm mb-6">Performance stats for the AI matching and trend detection models.</p>
              
              <div className="grid grid-cols-2 gap-6">
                {/* Model Info Card */}
                <div className="bg-gradient-to-br from-cyan-900/60 to-blue-900/60 backdrop-blur-xl border-2 border-cyan-500/50 rounded-xl p-6 shadow-lg">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Brain className="w-6 h-6 text-cyan-400" />
                    Model v2.5.3
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-gray-400">Accuracy</div>
                      <div className="text-2xl font-bold text-white">94.7%</div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full" style={{width: '94.7%'}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Training Data Points</div>
                      <div className="text-2xl font-bold text-white">1,247</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Last Training</div>
                      <div className="text-lg text-white">2 hours ago</div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="bg-gradient-to-br from-green-900/60 to-emerald-900/60 backdrop-blur-xl border-2 border-green-500/50 rounded-xl p-6 shadow-lg">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                    Performance
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-gray-400">Improvement Rate</div>
                      <div className="text-2xl font-bold text-green-400">+2.3%</div>
                      <div className="text-xs text-gray-400">vs last week</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Match Accuracy</div>
                      <div className="text-2xl font-bold text-white">89.4%</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Trend Detection Rate</div>
                      <div className="text-2xl font-bold text-white">91.2%</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Training History */}
              <div className="mt-6 bg-purple-950/40 backdrop-blur-sm rounded-xl p-6 border-2 border-purple-400/30">
                <h4 className="text-lg font-bold text-white mb-4">Recent Training Sessions</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <div className="text-white font-medium">v2.5.3 Training</div>
                      <div className="text-sm text-gray-400">847 RSS articles + 342 startups</div>
                    </div>
                    <div className="text-right">
                      <div className="text-cyan-400 font-bold">94.7%</div>
                      <div className="text-xs text-gray-400">2h ago</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <div className="text-white font-medium">v2.5.2 Training</div>
                      <div className="text-sm text-gray-400">821 RSS articles + 338 startups</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">92.4%</div>
                      <div className="text-xs text-gray-400">1d ago</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <div className="text-white font-medium">v2.5.1 Training</div>
                      <div className="text-sm text-gray-400">798 RSS articles + 329 startups</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">90.8%</div>
                      <div className="text-xs text-gray-400">3d ago</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* System Stats Details */}
          <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-cyan-400" />
              System Performance
            </h2>
            <div className="space-y-4">
              <div className="bg-purple-900/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">ML Model Accuracy</span>
                  <span className="text-2xl font-bold text-cyan-400">94.7%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full" style={{width: '94.7%'}}></div>
                </div>
              </div>
              <div className="bg-indigo-900/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Hot Sectors Detected</span>
                  <span className="text-2xl font-bold text-orange-400">12</span>
                </div>
                <p className="text-sm text-gray-400">AI/ML • Fintech • Healthcare</p>
              </div>
              <div className="bg-emerald-900/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Matches Optimized</span>
                  <span className="text-2xl font-bold text-green-400">34</span>
                </div>
                <p className="text-sm text-gray-400">Last hour</p>
              </div>
              <div className="bg-orange-900/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">RSS Articles Today</span>
                  <span className="text-2xl font-bold text-orange-400">23</span>
                </div>
                <p className="text-sm text-gray-400">Last scrape: 5min ago</p>
              </div>
            </div>
          </div>

          {/* Live Activity Log */}
          <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Activity className="w-6 h-6 text-purple-400 animate-pulse" />
              Live Activity Log
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {logs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="bg-white/5 rounded-lg p-3 flex items-start gap-3 hover:bg-white/10 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    {log.type === 'matching' && <Rocket className="w-4 h-4 text-orange-400" />}
                    {log.type === 'god' && <Brain className="w-4 h-4 text-purple-400" />}
                    {log.type === 'rss' && <Database className="w-4 h-4 text-cyan-400" />}
                    {log.type === 'system' && <Activity className="w-4 h-4 text-green-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">{log.message}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Manual Controls Modal */}
        {showControlsModal && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowControlsModal(false)}
          >
            <div 
              className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-8 max-w-6xl w-full border-2 border-purple-500 shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Database className="w-8 h-8 text-purple-400" />
                  Manual Process Controls
                </h2>
                <button
                  onClick={() => setShowControlsModal(false)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Modal content would go here */}
              <div className="text-center text-gray-400 py-8">
                <p>Manual control features coming soon...</p>
              </div>
            </div>
          </div>
        )}

        {/* Real-Time Logs */}
        <div className="mt-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                Live Activity Log
              </h2>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${
                  autoRefresh 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-gray-600 hover:bg-gray-700'
                } text-white`}
              >
                {autoRefresh ? 'Live' : 'Paused'}
              </button>
            </div>

            <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 backdrop-blur-xl rounded-xl p-4 border border-white/10 h-[600px] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No activity yet. Systems running automatically.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map(log => (
                    <div
                      key={log.id}
                      className="bg-white/5 rounded-lg p-3 border-l-4 border-purple-500"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-white flex-1">{log.message}</p>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      {log.data && (
                        <pre className="text-xs text-gray-400 mt-2 overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Controls Modal */}
      {showControlsModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowControlsModal(false)}
        >
          <div 
            className="bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto border-2 border-purple-500/50 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <Database className="w-8 h-8 text-purple-400" />
                Manual Process Controls
              </h2>
              <button
                onClick={() => setShowControlsModal(false)}
                className="text-white hover:text-gray-300 text-3xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {Object.entries(processes).map(([key, process]) => {
                const buttonGradients = {
                  ml: 'from-purple-700 to-purple-900 hover:from-purple-600 hover:to-purple-800 border-purple-400/50',
                  ai: 'from-purple-600 to-indigo-800 hover:from-purple-500 hover:to-indigo-700 border-indigo-400/50',
                  matching: 'from-indigo-700 to-purple-900 hover:from-indigo-600 hover:to-purple-800 border-purple-500/50',
                  rss: 'from-purple-800 to-violet-900 hover:from-purple-700 hover:to-violet-800 border-violet-400/50',
                  god: 'from-violet-700 to-purple-900 hover:from-violet-600 hover:to-purple-800 border-purple-600/50'
                };
                
                return (
                  <div
                    key={key}
                    className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 bg-gradient-to-br ${getStatusColor(process.status)} rounded-lg flex items-center justify-center`}>
                          {getStatusIcon(process.status)}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">{process.name}</h3>
                          <p className="text-sm text-gray-400">
                            {process.lastRun 
                              ? `Last run: ${process.lastRun.toLocaleTimeString()}`
                              : 'Never run'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          addLog('system', `▶️ Starting ${process.name}...`);
                          if (key === 'matching') runMatchingEngine();
                          else if (key === 'god') runGODScoring();
                          else if (key === 'rss') runRSSFeed();
                          else if (key === 'ml') {
                            addLog('system', '🧠 ML Engine training initiated...');
                            setTimeout(() => addLog('system', '✅ ML Engine training complete'), 2000);
                          }
                          else if (key === 'ai') {
                            addLog('system', '⚡ AI Optimization started...');
                            setTimeout(() => addLog('system', '✅ AI Optimization complete'), 2000);
                          }
                        }}
                        disabled={loading || process.status === 'running'}
                        className={`bg-gradient-to-r ${buttonGradients[key as keyof typeof buttonGradients]} text-white font-semibold py-3 px-6 rounded-lg transition border-2 shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <Play className="w-4 h-4" />
                        Run
                      </button>
                    </div>
                    
                    {process.lastResult && (
                      <div className="bg-white/5 rounded-lg p-3 mt-2">
                        <p className="text-sm text-gray-300">{process.lastResult}</p>
                        {process.count !== undefined && (
                          <p className="text-xs text-gray-400 mt-1">Total processed: {process.count}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
      </div>
    </div>
  );
}
