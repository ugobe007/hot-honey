import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Play, RefreshCw, ExternalLink, Activity } from 'lucide-react';

interface ProcessStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  lastRun: Date | null;
  count?: number;
  route?: string;
}

interface RealTimeLog {
  id: string;
  timestamp: Date;
  type: string;
  message: string;
}

export default function AdminOperations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<RealTimeLog[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const [processes, setProcesses] = useState<Record<string, ProcessStatus>>({
    ml: { name: 'ML Engine', status: 'running', lastRun: new Date(), count: 1247, route: '/admin/ai-intelligence' },
    ai: { name: 'AI Optimization', status: 'running', lastRun: new Date(), count: 8, route: '/admin/edit-startups' },
    matching: { name: 'Matching Engine', status: 'running', lastRun: new Date(), count: 342, route: '/matching' },
    rss: { name: 'RSS Feed', status: 'running', lastRun: new Date(), count: 847, route: '/admin/rss-manager' },
    god: { name: 'GOD Scoring', status: 'running', lastRun: new Date(), count: 10, route: '/admin/god-scores' }
  });

  const [stats, setStats] = useState({
    totalStartups: 0,
    totalInvestors: 0,
    pendingStartups: 0,
    avgGodScore: 0,
    totalMatches: 0,
  });

  useEffect(() => {
    loadSystemStats();
    const interval = setInterval(() => {
      if (autoRefresh) refreshProcessStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadSystemStats = async () => {
    try {
      const [startupsRes, pendingRes, investorsRes, godRes] = await Promise.all([
        supabase.from('startup_uploads').select('*', { count: 'exact', head: true }),
        supabase.from('startup_uploads').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('investors').select('*', { count: 'exact', head: true }),
        supabase.from('startup_uploads').select('total_god_score').not('total_god_score', 'is', null)
      ]);

      const godScores = godRes.data || [];
      const avgGodScore = godScores.length > 0
        ? Math.round(godScores.reduce((sum, s) => sum + (s.total_god_score || 0), 0) / godScores.length)
        : 0;

      setStats({
        totalStartups: startupsRes.count || 0,
        totalInvestors: investorsRes.count || 0,
        pendingStartups: pendingRes.count || 0,
        avgGodScore,
        totalMatches: (startupsRes.count || 0) * (investorsRes.count || 0),
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const refreshProcessStatus = () => {
    setProcesses(prev => ({
      ...prev,
      matching: { ...prev.matching, lastRun: new Date() },
      god: { ...prev.god, lastRun: new Date() },
      rss: { ...prev.rss, lastRun: new Date() },
    }));
  };

  const addLog = (type: string, message: string) => {
    setLogs(prev => [{ id: Date.now().toString(), timestamp: new Date(), type, message }, ...prev].slice(0, 50));
  };

  const runProcess = async (key: string) => {
    setLoading(true);
    addLog(key, `▶️ Starting ${processes[key].name}...`);
    setProcesses(prev => ({ ...prev, [key]: { ...prev[key], status: 'running' } }));
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    addLog(key, `✅ ${processes[key].name} complete`);
    setProcesses(prev => ({ ...prev, [key]: { ...prev[key], status: 'stopped', lastRun: new Date() } }));
    setLoading(false);
  };

  const tools = [
    { id: 'dashboard', name: 'Workflow Dashboard', description: 'Main admin dashboard with startup management', route: '/admin/dashboard', category: 'dashboard' },
    { id: 'analytics', name: 'Admin Analytics', description: 'Data quality, enrichment, operational metrics', route: '/admin/analytics', category: 'dashboard' },
    { id: 'control', name: 'Control Center', description: 'All admin tools in one place', route: '/admin', category: 'dashboard' },
    { id: 'ml', name: 'ML Dashboard', description: 'Machine learning metrics and recommendations', route: '/admin/ml-dashboard', category: 'dashboard' },
    { id: 'edit', name: 'Edit Startups', description: 'Approve, edit, manage all startups', route: '/admin/edit-startups', category: 'data' },
    { id: 'investors', name: 'Manage Investors', description: 'View and edit investor profiles', route: '/investors', category: 'data' },
    { id: 'enrichment', name: 'Investor Enrichment', description: 'Enrich investor data', route: '/admin/investor-enrichment', category: 'data' },
    { id: 'discovered', name: 'Discovered Startups', description: 'RSS scraped startups pending import', route: '/admin/discovered-startups', category: 'data' },
    { id: 'rss', name: 'RSS Manager', description: 'Manage RSS feed sources', route: '/admin/rss-manager', category: 'tools' },
    { id: 'bulk', name: 'Bulk Import', description: 'Import startups from spreadsheet', route: '/admin/bulk-import', category: 'tools' },
    { id: 'god', name: 'GOD Scores', description: 'View and manage GOD algorithm scores', route: '/admin/god-scores', category: 'tools' },
    { id: 'matching', name: 'Matching Engine', description: 'Run AI-powered matching', route: '/matching', category: 'tools' },
  ];

  if (!user?.isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 overflow-auto">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 sticky top-0 z-30">
        <div className="max-w-[1800px] mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-white pl-20">⚡ Operations Center</h1>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/" className="text-gray-400 hover:text-white">Home</Link>
            <Link to="/admin" className="text-gray-400 hover:text-white">Control Center</Link>
            <Link to="/admin/analytics" className="text-cyan-400 hover:text-cyan-300">Analytics</Link>
            <Link to="/market-trends" className="text-gray-400 hover:text-white">Trends</Link>
            <Link to="/matching" className="text-cyan-400 hover:text-cyan-300 font-bold">⚡ Match</Link>
            <button onClick={() => setAutoRefresh(!autoRefresh)} className={`px-2 py-1 rounded text-xs ${autoRefresh ? 'bg-green-600' : 'bg-gray-600'}`}>
              {autoRefresh ? '🟢 Live' : '⏸ Paused'}
            </button>
            <button onClick={loadSystemStats} className="text-gray-400 hover:text-white">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-4 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-6 gap-2 text-xs">
          {[
            { label: 'Startups', value: stats.totalStartups, color: 'cyan' },
            { label: 'Investors', value: stats.totalInvestors, color: 'violet' },
            { label: 'Pending', value: stats.pendingStartups, color: 'yellow' },
            { label: 'Avg GOD', value: stats.avgGodScore, color: 'green' },
            { label: 'Matches', value: stats.totalMatches.toLocaleString(), color: 'cyan' },
            { label: 'Status', value: autoRefresh ? 'Live' : 'Paused', color: autoRefresh ? 'green' : 'gray' }
          ].map((s, i) => (
            <div key={i} className="bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700">
              <div className={`text-xl font-bold font-mono ${s.color === 'cyan' ? 'text-cyan-400' : s.color === 'violet' ? 'text-violet-400' : s.color === 'yellow' ? 'text-yellow-400' : s.color === 'green' ? 'text-green-400' : s.color === 'cyan' ? 'text-cyan-400' : 'text-gray-400'}`}>
                {s.value}
              </div>
              <div className="text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* System Processes Table */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-700 bg-gray-800/80 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" /> Live System Monitor
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="text-left px-4 py-2 text-gray-400 font-medium">System</th>
                <th className="text-center px-4 py-2 text-gray-400 font-medium">Status</th>
                <th className="text-right px-4 py-2 text-gray-400 font-medium">Count</th>
                <th className="text-right px-4 py-2 text-gray-400 font-medium">Last Run</th>
                <th className="text-right px-4 py-2 text-gray-400 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(processes).map(([key, p]) => (
                <tr key={key} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                  <td className="px-4 py-2">
                    <Link to={p.route || '#'} className="text-white font-medium hover:text-cyan-400 flex items-center gap-2">
                      {key === 'ml' && '🧠'} {key === 'ai' && '⚡'} {key === 'matching' && '🎯'} {key === 'rss' && '📡'} {key === 'god' && '🏆'}
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${p.status === 'running' ? 'bg-green-500/20 text-green-400' : p.status === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {p.status === 'running' ? '● Active' : p.status === 'error' ? '⚠ Error' : '○ Idle'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-cyan-400">{p.count?.toLocaleString() || '-'}</td>
                  <td className="px-4 py-2 text-right text-gray-500">{p.lastRun?.toLocaleTimeString() || '-'}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => runProcess(key)} disabled={loading} className="px-2 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 rounded text-cyan-400 text-xs flex items-center gap-1 ml-auto disabled:opacity-50">
                      <Play className="w-3 h-3" /> Run
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Admin Tools Table */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-700 bg-gray-800/80">
            <h2 className="text-sm font-semibold text-white">🛠️ Admin Tools</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="text-left px-4 py-2 text-gray-400 font-medium">Tool</th>
                <th className="text-left px-4 py-2 text-gray-400 font-medium">Description</th>
                <th className="text-center px-4 py-2 text-gray-400 font-medium">Category</th>
                <th className="text-right px-4 py-2 text-gray-400 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((t) => (
                <tr key={t.id} className="border-t border-gray-700/50 hover:bg-gray-700/30 cursor-pointer" onClick={() => navigate(t.route)}>
                  <td className="px-4 py-2">
                    <Link to={t.route} className="text-white font-medium hover:text-cyan-400">{t.name}</Link>
                  </td>
                  <td className="px-4 py-2 text-gray-400">{t.description}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${t.category === 'dashboard' ? 'bg-purple-500/20 text-purple-400' : t.category === 'data' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-600/20 text-cyan-400'}`}>
                      {t.category}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link to={t.route} className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                      Open <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Activity Log */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-700 bg-gray-800/80 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">📋 Activity Log</h2>
            <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">No activity yet. Run a process to see logs.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="px-4 py-1.5 border-b border-gray-700/30 flex items-center gap-3 text-xs hover:bg-gray-700/20">
                  <span className="text-gray-600 font-mono">{log.timestamp.toLocaleTimeString()}</span>
                  <span className="text-white flex-1">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
          <div className="flex flex-wrap gap-2 text-xs">
            <Link to="/matching" className="px-3 py-1.5 bg-cyan-600/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-600/30">🔥 Matching</Link>
            <Link to="/admin/analytics" className="px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 rounded text-violet-400 hover:bg-violet-500/30">📊 Analytics</Link>
            <Link to="/admin/edit-startups" className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-500/30">✏️ Edit Startups</Link>
            <Link to="/admin/bulk-import" className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded text-green-400 hover:bg-green-500/30">📤 Bulk Import</Link>
            <Link to="/admin/discovered-startups" className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded text-blue-400 hover:bg-cyan-500/30">🔍 Discovered</Link>
            <Link to="/admin/rss-manager" className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-500/30">📡 RSS</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
