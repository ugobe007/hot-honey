import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { RefreshCw, Edit2, Trash2, Check, X, Save, Search, CheckCircle, XCircle } from 'lucide-react';

interface StartupUpload {
  id: string;
  name: string;
  pitch: string | null;
  tagline: string | null;
  status: string | null;
  extracted_data: any;
  created_at: string | null;
  total_god_score?: number | null;
}

export default function EditStartups() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [startups, setStartups] = useState<StartupUpload[]>([]);
  const [allStartups, setAllStartups] = useState<StartupUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const filterParam = searchParams.get('filter');
    return filterParam || 'all';
  });

  useEffect(() => {
    loadStartups();
  }, []);

  useEffect(() => {
    filterStartups();
  }, [statusFilter, searchQuery, allStartups]);

  const loadStartups = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('startup_uploads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading startups:', error);
      setLoading(false);
      return;
    }

    setAllStartups(data || []);
    setLoading(false);
  };

  const filterStartups = () => {
    let filtered = allStartups;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.name?.toLowerCase().includes(q) || 
        s.tagline?.toLowerCase().includes(q) ||
        s.pitch?.toLowerCase().includes(q)
      );
    }
    
    setStartups(filtered);
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadStartups();
    setRefreshing(false);
  };

  const quickApprove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('startup_uploads').update({ status: 'approved' }).eq('id', id);
    setAllStartups(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' } : s));
  };

  const quickReject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('startup_uploads').update({ status: 'rejected' }).eq('id', id);
    setAllStartups(prev => prev.map(s => s.id === id ? { ...s, status: 'rejected' } : s));
  };

  const startEdit = (s: StartupUpload) => {
    setEditingId(s.id);
    setEditData({ name: s.name, tagline: s.tagline || '', status: s.status });
  };

  const saveEdit = async () => {
    if (!editingId || !editData) return;
    setSaving(true);
    await supabase.from('startup_uploads').update(editData).eq('id', editingId);
    await loadStartups();
    setEditingId(null);
    setEditData(null);
    setSaving(false);
  };

  const cancelEdit = () => { setEditingId(null); setEditData(null); };

  const deleteStartup = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${name}"?`)) return;
    await supabase.from('startup_uploads').delete().eq('id', id);
    setAllStartups(prev => prev.filter(s => s.id !== id));
  };

  const bulkApprove = async () => {
    const pending = startups.filter(s => s.status === 'pending');
    if (!pending.length || !confirm(`Approve ${pending.length} startups?`)) return;
    setSaving(true);
    for (const s of pending) {
      await supabase.from('startup_uploads').update({ status: 'approved' }).eq('id', s.id);
    }
    await loadStartups();
    setSaving(false);
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

  const counts = {
    all: allStartups.length,
    pending: allStartups.filter(s => s.status === 'pending').length,
    approved: allStartups.filter(s => s.status === 'approved').length,
    rejected: allStartups.filter(s => s.status === 'rejected').length
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 overflow-auto">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white pl-16">✏️ Edit Startups</h1>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/" className="text-gray-400 hover:text-white">Home</Link>
            <Link to="/admin/control" className="text-gray-400 hover:text-white">Control Center</Link>
            <Link to="/admin/discovered-startups" className="text-cyan-400 hover:text-cyan-300">RSS Discoveries</Link>
            <Link to="/matching" className="text-orange-400 hover:text-orange-300 font-bold">⚡ Match</Link>
            <button onClick={refresh} className="text-gray-400 hover:text-white p-2">
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        {/* Search Row */}
        <div className="relative max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search startups by name, tagline..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white focus:border-orange-500/50 focus:outline-none"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total', value: counts.all, color: 'text-white', bg: 'bg-gray-800', filter: 'all' },
            { label: 'Pending', value: counts.pending, color: 'text-yellow-400', bg: 'bg-yellow-500/10', filter: 'pending' },
            { label: 'Approved', value: counts.approved, color: 'text-green-400', bg: 'bg-green-500/10', filter: 'approved' },
            { label: 'Rejected', value: counts.rejected, color: 'text-red-400', bg: 'bg-red-500/10', filter: 'rejected' },
          ].map((s, i) => (
            <button 
              key={i} 
              onClick={() => setStatusFilter(s.filter)}
              className={`${s.bg} rounded-xl px-5 py-4 border-2 transition-all text-left ${
                statusFilter === s.filter ? 'border-orange-500' : 'border-transparent hover:border-gray-600'
              }`}
            >
              <div className={`text-3xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-gray-400 text-sm mt-1">{s.label}</div>
            </button>
          ))}
          <button
            onClick={bulkApprove}
            disabled={saving || counts.pending === 0}
            className="bg-green-500/20 border-2 border-green-500/50 rounded-xl px-5 py-4 text-green-400 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <div className="text-3xl font-bold">✅</div>
            <div className="text-sm mt-1">Approve All ({counts.pending})</div>
          </button>
        </div>

        {/* Table */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="px-6 py-16 text-center text-gray-500">Loading...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="text-left px-6 py-4 text-gray-400 font-medium">Startup</th>
                  <th className="text-left px-6 py-4 text-gray-400 font-medium">Tagline</th>
                  <th className="text-center px-6 py-4 text-gray-400 font-medium">Status</th>
                  <th className="text-right px-6 py-4 text-gray-400 font-medium">GOD</th>
                  <th className="text-right px-6 py-4 text-gray-400 font-medium">Age</th>
                  <th className="text-center px-6 py-4 text-gray-400 font-medium w-48">Actions</th>
                </tr>
              </thead>
              <tbody>
                {startups.map((s) => (
                  <tr 
                    key={s.id} 
                    className="border-t border-gray-700/50 hover:bg-gray-700/30 cursor-pointer"
                    onClick={() => editingId !== s.id && navigate(`/startup/${s.id}`)}
                  >
                    <td className="px-6 py-4">
                      {editingId === s.id ? (
                        <input
                          type="text"
                          value={editData.name}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-white font-medium hover:text-orange-400 text-lg">{s.name}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === s.id ? (
                        <input
                          type="text"
                          value={editData.tagline}
                          onChange={(e) => setEditData({ ...editData, tagline: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                          maxLength={60}
                        />
                      ) : (
                        <span className="text-gray-400 max-w-xs block">{s.tagline || s.pitch?.slice(0, 80) || '-'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      {editingId === s.id ? (
                        <select
                          value={editData.status}
                          onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                        >
                          <option value="pending">pending</option>
                          <option value="approved">approved</option>
                          <option value="rejected">rejected</option>
                        </select>
                      ) : (
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                          s.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                          s.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>{s.status}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-amber-400 text-lg">{s.total_god_score || '-'}</td>
                    <td className="px-6 py-4 text-right text-gray-500">{formatTime(s.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
                        {editingId === s.id ? (
                          <>
                            <button onClick={saveEdit} disabled={saving} className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-green-400" title="Save">
                              <Save className="w-5 h-5" />
                            </button>
                            <button onClick={cancelEdit} className="p-2 bg-gray-500/20 hover:bg-gray-500/30 rounded-lg text-gray-400" title="Cancel">
                              <X className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Quick Approve/Reject for pending */}
                            {s.status === 'pending' && (
                              <>
                                <button onClick={(e) => quickApprove(s.id, e)} className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-green-400" title="Approve">
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                                <button onClick={(e) => quickReject(s.id, e)} className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400" title="Reject">
                                  <XCircle className="w-5 h-5" />
                                </button>
                              </>
                            )}
                            <button onClick={() => startEdit(s)} className="p-2 hover:bg-blue-500/20 rounded-lg text-blue-400" title="Edit">
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button onClick={(e) => deleteStartup(s.id, s.name, e)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400" title="Delete">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {startups.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-500 text-lg">No startups found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">⚡ Quick Actions</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link to="/admin/bulk-import" className="px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 rounded text-violet-400 hover:bg-violet-500/30">📤 Bulk Import</Link>
            <Link to="/admin/discovered-startups" className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-500/30">🔍 RSS Discoveries</Link>
            <Link to="/admin/dashboard" className="px-3 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded text-orange-400 hover:bg-orange-500/30">📊 Dashboard</Link>
            <Link to="/matching" className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded text-green-400 hover:bg-green-500/30">🔥 View Matches</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
