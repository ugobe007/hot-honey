import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import AdminNavBar from '../components/AdminNavBar';

interface StartupUpload {
  id: string;
  name: string;
  pitch: string | null;
  tagline: string | null;
  status: string;
  extracted_data: any;
  admin_notes: string | null;
  created_at: string;
  total_god_score?: number;
}

export default function EditStartups() {
  const navigate = useNavigate();
  const [startups, setStartups] = useState<StartupUpload[]>([]);
  const [loading, setLoading] = useState(true);
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
      alert(`Error: ${error.message}`);
      setLoading(false);
      return;
    }

    let filtered = data || [];
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    setStartups(filtered);
    setLoading(false);
  };

  const startEdit = (startup: StartupUpload) => {
    setEditingId(startup.id);
    setEditData({
      name: startup.name,
      pitch: startup.pitch || '',
      tagline: startup.tagline || '',
      status: startup.status,
      fivePoints: startup.extracted_data?.fivePoints || ['', '', '', '', ''],
      problem: startup.extracted_data?.problem || '',
      solution: startup.extracted_data?.solution || '',
      team: startup.extracted_data?.team || '',
      funding: startup.extracted_data?.funding || '',
      industry: startup.extracted_data?.industry || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editData) return;

    setSaving(true);
    
    const { error } = await supabase
      .from('startup_uploads')
      .update({
        name: editData.name,
        pitch: editData.pitch,
        tagline: editData.tagline,
        status: editData.status,
        extracted_data: {
          fivePoints: editData.fivePoints,
          problem: editData.problem,
          solution: editData.solution,
          team: editData.team,
          funding: editData.funding,
          industry: editData.industry,
        }
      })
      .eq('id', editingId);

    if (error) {
      console.error('Error saving:', error);
      alert('Failed to save changes: ' + error.message);
      setSaving(false);
      return;
    }

    await loadStartups();
    setEditingId(null);
    setEditData(null);
    setSaving(false);
  };

  const updateFivePoint = (index: number, value: string) => {
    const newPoints = [...editData.fivePoints];
    newPoints[index] = value;
    setEditData({ ...editData, fivePoints: newPoints });
  };

  const deleteStartup = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    const { error } = await supabase
      .from('startup_uploads')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Failed to delete');
    } else {
      loadStartups();
    }
  };

  const bulkApprovePending = async () => {
    const pendingStartups = startups.filter(s => 
      s.status === 'pending' && 
      !s.admin_notes?.includes('UNDER_REVIEW')
    );
    
    if (pendingStartups.length === 0) {
      alert('No pending startups to approve.');
      return;
    }

    if (!confirm(`Approve & Publish ${pendingStartups.length} startups?`)) {
      return;
    }

    setSaving(true);
    
    try {
      let successCount = 0;
      
      for (const startup of pendingStartups) {
        const { error } = await supabase
          .from('startup_uploads')
          .update({ status: 'approved' })
          .eq('id', startup.id);
        
        if (!error) successCount++;
      }
      
      alert(`✅ Approved ${successCount} startups!`);
      await loadStartups();
      navigate('/admin/dashboard');
    } catch (err) {
      alert('Error during bulk approval');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0729] via-[#1a0f3a] to-[#2d1558] p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⚡</div>
          <div className="text-white text-2xl font-medium">Loading startup data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0729] via-[#1a0f3a] to-[#2d1558] scrollbar-hide overflow-y-auto">
      {/* Navigation Bar */}
      <AdminNavBar currentPage="/admin/edit-startups" />

      <div className="p-8">
      {/* Quick Navigation Bar - Always Visible */}
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
          onClick={() => navigate('/admin/discovered-startups')}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold shadow-lg transition-all"
        >
          🔍 RSS Discoveries
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
        {/* Info Banner */}
        <div className="mb-6 p-6 bg-cyan-500/20 border-2 border-cyan-400/50 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="text-3xl">📋</div>
            <div>
              <h3 className="text-xl font-bold text-cyan-300 mb-2">Manual Upload Review Queue</h3>
              <p className="text-cyan-200 mb-3">
                This page shows startups uploaded via <strong>Bulk Import</strong> or <strong>Submit</strong> forms.
              </p>
              <div className="bg-yellow-500/20 p-3 rounded-lg border border-yellow-400/30 mb-3">
                <p className="text-yellow-200 text-sm font-bold">
                  ⚠️ Looking for RSS-imported startups? They're in a different table!
                </p>
                <button
                  onClick={() => navigate('/admin/discovered-startups')}
                  className="mt-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-all"
                >
                  View RSS Discoveries & Imports →
                </button>
              </div>
              <p className="text-cyan-200 text-sm">
                💡 <strong>Workflow:</strong> Review → Edit if needed → Approve → Goes live!
              </p>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-purple-500 text-white text-sm font-bold px-3 py-1 rounded-full">STEP 2</span>
              <h1 className="text-5xl font-extrabold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                ✏️ Manage Startups
              </h1>
            </div>
            <p className="text-xl text-gray-300">Edit, optimize with AI, and control GOD scores</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/matching-engine')}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl transition-all shadow-lg flex items-center gap-2"
            >
              Next: View Matches 🔥
            </button>
            <button
              onClick={() => navigate('/admin/discovered-startups')}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-bold rounded-xl transition-all shadow-lg"
            >
              🔍 RSS Discoveries
            </button>
            <button
              onClick={() => navigate('/admin/bulk-import')}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold rounded-xl transition-all shadow-lg"
            >
              🤖 Bulk Import
            </button>
            <button
              onClick={() => navigate('/admin/operations')}
              className="px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-bold rounded-xl transition-all shadow-lg"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 backdrop-blur-xl rounded-2xl p-6 mb-6 border-2 border-purple-500/50 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-white font-bold text-lg">Filter:</span>
              <button onClick={() => setStatusFilter('all')} className={`px-5 py-2 rounded-lg font-semibold transition-all ${statusFilter === 'all' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                All ({startups.length})
              </button>
              <button onClick={() => setStatusFilter('pending')} className={`px-5 py-2 rounded-lg font-semibold transition-all ${statusFilter === 'pending' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                Pending
              </button>
              <button onClick={() => setStatusFilter('approved')} className={`px-5 py-2 rounded-lg font-semibold transition-all ${statusFilter === 'approved' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                Approved
              </button>
              <button onClick={() => setStatusFilter('rejected')} className={`px-5 py-2 rounded-lg font-semibold transition-all ${statusFilter === 'rejected' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                Rejected
              </button>
            </div>
            
            <button onClick={bulkApprovePending} disabled={saving || startups.filter(s => s.status === 'pending').length === 0} className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl transition-all shadow-xl">
              {saving ? '⏳ Approving...' : `🚀 Bulk Approve (${startups.filter(s => s.status === 'pending').length})`}
            </button>
          </div>
        </div>

        {/* Startups List */}
        <div className="grid gap-6">
          {startups.map((startup) => (
            <div key={startup.id} className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 border-white/10 hover:border-purple-400/50 transition-all shadow-xl">
              {editingId === startup.id ? (
                <div className="space-y-4">
                  <input type="text" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/10 text-white border-2 border-purple-400/50 focus:border-cyan-400 outline-none" placeholder="Startup Name" />
                  <input type="text" value={editData.tagline} onChange={(e) => setEditData({ ...editData, tagline: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/10 text-white border-2 border-purple-400/50 focus:border-cyan-400 outline-none" placeholder="Tagline (60 chars)" maxLength={60} />
                  <select value={editData.status} onChange={(e) => setEditData({ ...editData, status: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/10 text-white border-2 border-purple-400/50 focus:border-cyan-400 outline-none font-semibold">
                    <option value="pending">⏳ Pending</option>
                    <option value="approved">✅ Approved</option>
                    <option value="rejected">❌ Rejected</option>
                  </select>
                  <div className="flex gap-3">
                    <button onClick={saveEdit} disabled={saving} className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition">
                      {saving ? 'Saving...' : '💾 Save'}
                    </button>
                    <button onClick={cancelEdit} className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-white mb-2">{startup.name}</h2>
                      <p className="text-purple-200">{startup.tagline || startup.pitch}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          startup.status === 'approved' ? 'bg-green-500/30 border border-green-400 text-green-300' :
                          startup.status === 'pending' ? 'bg-orange-500/30 border border-orange-400 text-orange-300' :
                          'bg-red-500/30 border border-red-400 text-red-300'
                        }`}>
                          {startup.status === 'approved' ? '✅ APPROVED' :
                           startup.status === 'pending' ? '⏳ PENDING' :
                           '❌ REJECTED'}
                        </span>
                        {startup.total_god_score && (
                          <span className="bg-yellow-500/30 border border-yellow-400 text-yellow-300 px-3 py-1 rounded-full text-xs font-bold">
                            ⚡ GOD: {startup.total_god_score}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(startup)} className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl transition">
                        ✏️ Edit
                      </button>
                      <button onClick={() => deleteStartup(startup.id, startup.name)} className="px-6 py-2 bg-red-600/80 hover:bg-red-700 text-white font-bold rounded-xl transition">
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {startups.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-xl">
            No startups found with this filter
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
