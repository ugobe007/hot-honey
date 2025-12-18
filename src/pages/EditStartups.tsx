import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { RefreshCw, Edit2, Trash2, Check, X, Save } from 'lucide-react';

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
  const [startups, setStartups] = useState<StartupUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadStartups();
  }, [statusFilter]);

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

    let filtered = data || [];
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }
    setStartups(filtered as StartupUpload[]);
    setLoading(false);
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadStartups();
    setRefreshing(false);
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

  const deleteStartup = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await supabase.from('startup_uploads').delete().eq('id', id);
    loadStartups();
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
    all: startups.length,
    pending: startups.filter(s => s.status === 'pending').length,
    approved: startups.filter(s => s.status === 'approved').length,
    rejected: startups.filter(s => s.status === 'rejected').length
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-4 py-2 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">✏️ Edit Startups</h1>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/" className="text-gray-400 hover:text-white">Home</Link>
            <Link to="/admin" className="text-gray-400 hover:text-white">Control Center</Link>
            <Link to="/admin/dashboard" className="text-gray-400 hover:text-white">Dashboard</Link>
            <Link to="/admin/discovered-startups" className="text-cyan-400 hover:text-cyan-300">RSS Discoveries</Link>
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
          {[
            { label: 'Total', value: counts.all, color: 'text-white', filter: 'all' },
            { label: 'Pending', value: counts.pending, color: 'text-yellow-400', filter: 'pending' },
            { label: 'Approved', value: counts.approved, color: 'text-green-400', filter: 'approved' },
            { label: 'Rejected', value: counts.rejected, color: 'text-red-400', filter: 'rejected' },
          ].map((s, i) => (
            <button 
              key={i} 
              onClick={() => setStatusFilter(s.filter)}
              className={`bg-gray-800/50 rounded-lg px-3 py-2 border transition-all text-left ${
                statusFilter === s.filter ? 'border-orange-500/50 bg-orange-500/10' : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-gray-500 text-[10px]">{s.label}</div>
            </button>
          ))}
          <button
            onClick={bulkApprove}
            disabled={saving || counts.pending === 0}
            className="bg-green-500/20 border border-green-500/30 rounded-lg px-3 py-2 text-green-400 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-xl font-bold">🚀</div>
            <div className="text-[10px]">Approve All ({counts.pending})</div>
          </button>
        </div>

        {/* Table */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="px-4 py-12 text-center text-gray-500">Loading...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Startup</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Tagline</th>
                  <th className="text-center px-4 py-2 text-gray-400 font-medium">Status</th>
                  <th className="text-right px-4 py-2 text-gray-400 font-medium">GOD</th>
                  <th className="text-right px-4 py-2 text-gray-400 font-medium">Age</th>
                  <th className="text-center px-4 py-2 text-gray-400 font-medium w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {startups.map((s) => (
                  <tr key={s.id} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                    <td className="px-4 py-2">
                      {editingId === s.id ? (
                        <input
                          type="text"
                          value={editData.name}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                        />
                      ) : (
                        <Link to={`/startup/${s.id}`} className="text-white font-medium hover:text-orange-400">{s.name}</Link>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingId === s.id ? (
                        <input
                          type="text"
                          value={editData.tagline}
                          onChange={(e) => setEditData({ ...editData, tagline: e.target.value })}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                          maxLength={60}
                        />
                      ) : (
                        <span className="text-gray-400 truncate max-w-48 block">{s.tagline || s.pitch?.slice(0, 60) || '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {editingId === s.id ? (
                        <select
                          value={editData.status}
                          onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                        >
                          <option value="pending">pending</option>
                          <option value="approved">approved</option>
                          <option value="rejected">rejected</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          s.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                          s.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>{s.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-amber-400">{s.total_god_score || '-'}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{formatTime(s.created_at)}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 justify-center">
                        {editingId === s.id ? (
                          <>
                            <button onClick={saveEdit} disabled={saving} className="p-1 hover:bg-green-500/20 rounded text-green-400" title="Save">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEdit} className="p-1 hover:bg-gray-500/20 rounded text-gray-400" title="Cancel">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(s)} className="p-1 hover:bg-blue-500/20 rounded text-blue-400" title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteStartup(s.id, s.name)} className="p-1 hover:bg-red-500/20 rounded text-red-400" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {startups.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No startups found</td></tr>
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
