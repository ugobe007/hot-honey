import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { RefreshCw, Check, XCircle, ExternalLink } from 'lucide-react';

interface StartupData {
  id: string;
  name: string;
  tagline?: string | null;
  sectors?: string[] | null;
  status: 'pending' | 'approved' | 'rejected' | string | null;
  total_god_score?: number | null;
  created_at: string | null;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalStartups: 0, pendingStartups: 0, approvedStartups: 0, avgGodScore: 0 });
  const [pendingStartups, setPendingStartups] = useState<StartupData[]>([]);
  const [recentStartups, setRecentStartups] = useState<StartupData[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'recent' | 'all'>('pending');

  useEffect(() => {
    if (!user?.isAdmin) return;
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: allStartups } = await supabase
        .from('startup_uploads')
        .select('id, name, tagline, sectors, status, total_god_score, created_at')
        .order('created_at', { ascending: false });

      const startups = (allStartups || []) as StartupData[];
      const pending = startups.filter(s => s.status === 'pending');
      const approved = startups.filter(s => s.status === 'approved');
      const withScores = startups.filter(s => s.total_god_score);
      const avgScore = withScores.length > 0 
        ? Math.round(withScores.reduce((sum, s) => sum + (s.total_god_score || 0), 0) / withScores.length)
        : 0;

      setStats({
        totalStartups: startups.length,
        pendingStartups: pending.length,
        approvedStartups: approved.length,
        avgGodScore: avgScore,
      });
      setPendingStartups(pending.slice(0, 50) as StartupData[]);
      setRecentStartups(startups.slice(0, 50) as StartupData[]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleApprove = async (id: string) => {
    await supabase.from('startup_uploads').update({ status: 'approved' }).eq('id', id);
    await loadDashboardData();
  };

  const handleReject = async (id: string) => {
    await supabase.from('startup_uploads').update({ status: 'rejected' }).eq('id', id);
    await loadDashboardData();
  };

  const formatTime = (d: string | null) => {
    if (!d) return '-';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const getScoreClass = (score?: number | null) => {
    if (!score) return 'text-gray-500';
    if (score >= 90) return 'text-amber-400 font-bold';
    if (score >= 80) return 'text-orange-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-gray-400';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <p className="text-gray-400 mb-4">Please log in with admin credentials</p>
          <button onClick={() => navigate('/login')} className="px-4 py-2 bg-orange-600 text-white rounded-lg">Login</button>
        </div>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⛔</div>
          <p className="text-gray-400 mb-4">Admin access required</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-gray-600 text-white rounded-lg">Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-4 py-2 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">👑 Admin Dashboard</h1>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/" className="text-gray-400 hover:text-white">Home</Link>
            <Link to="/admin" className="text-gray-400 hover:text-white">Control Center</Link>
            <Link to="/admin/operations" className="text-gray-400 hover:text-white">Operations</Link>
            <Link to="/admin/analytics" className="text-orange-400 hover:text-orange-300">Analytics</Link>
            <Link to="/matching" className="text-orange-400 hover:text-orange-300 font-bold">⚡ Match</Link>
            <button onClick={refresh} className="text-gray-400 hover:text-white">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 text-xs">
          {[
            { label: 'Total Startups', value: stats.totalStartups, color: 'text-orange-400' },
            { label: 'Pending Review', value: stats.pendingStartups, color: 'text-yellow-400' },
            { label: 'Approved', value: stats.approvedStartups, color: 'text-green-400' },
            { label: 'Avg GOD Score', value: stats.avgGodScore, color: 'text-cyan-400' }
          ].map((s, i) => (
            <div key={i} className="bg-gray-800/50 rounded-lg px-4 py-3 border border-gray-700">
              <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 text-xs border-b border-gray-800 pb-2">
          {[
            { id: 'pending', label: `⏳ Pending (${stats.pendingStartups})` },
            { id: 'recent', label: '📱 Recent' },
            { id: 'all', label: '�� All Startups' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded transition-all ${
                activeTab === tab.id
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Startups Table */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="px-4 py-12 text-center text-gray-500">Loading...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Startup</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Tagline</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Sectors</th>
                  <th className="text-center px-4 py-2 text-gray-400 font-medium">Status</th>
                  <th className="text-right px-4 py-2 text-gray-400 font-medium">GOD</th>
                  <th className="text-right px-4 py-2 text-gray-400 font-medium">Age</th>
                  <th className="text-center px-4 py-2 text-gray-400 font-medium w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(activeTab === 'pending' ? pendingStartups : recentStartups).map((s) => (
                  <tr key={s.id} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                    <td className="px-4 py-2">
                      <Link to={`/startup/${s.id}`} className="text-white font-medium hover:text-orange-400">{s.name}</Link>
                    </td>
                    <td className="px-4 py-2 text-gray-400 truncate max-w-48">{s.tagline || '-'}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 flex-wrap">
                        {(s.sectors || []).slice(0, 2).map(sec => (
                          <span key={sec} className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300 text-[10px]">{sec}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        s.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        s.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>{s.status}</span>
                    </td>
                    <td className={`px-4 py-2 text-right font-mono ${getScoreClass(s.total_god_score)}`}>
                      {s.total_god_score || '-'}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500">{formatTime(s.created_at)}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 justify-center">
                        {s.status === 'pending' && (
                          <>
                            <button onClick={() => handleApprove(s.id)} className="p-1 hover:bg-green-500/20 rounded text-green-400" title="Approve">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleReject(s.id)} className="p-1 hover:bg-red-500/20 rounded text-red-400" title="Reject">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button onClick={() => navigate(`/admin/edit-startups?id=${s.id}`)} className="p-1 hover:bg-blue-500/20 rounded text-blue-400" title="Edit">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(activeTab === 'pending' ? pendingStartups : recentStartups).length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No startups found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">⚡ Quick Actions</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link to="/admin/edit-startups" className="px-3 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded text-orange-400 hover:bg-orange-500/30">✏️ Edit Startups</Link>
            <Link to="/admin/bulk-import" className="px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 rounded text-violet-400 hover:bg-violet-500/30">📤 Bulk Import</Link>
            <Link to="/admin/discovered-startups" className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-500/30">🔍 Discovered</Link>
            <Link to="/investors" className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded text-green-400 hover:bg-green-500/30">💰 Investors</Link>
            <Link to="/admin/rss-manager" className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-500/30">📡 RSS</Link>
            <Link to="/admin/god-scores" className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded text-amber-400 hover:bg-amber-500/30">🏆 GOD Scores</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
