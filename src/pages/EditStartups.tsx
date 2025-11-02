import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

interface StartupUpload {
  id: string;
  name: string;
  pitch?: string;
  tagline?: string;
  status: string;
  extracted_data?: {
    fivePoints?: string[];
    problem?: string;
    solution?: string;
    team?: string;
    funding?: string;
    industry?: string;
  };
  created_at: string;
}

export default function EditStartups() {
  const [startups, setStartups] = useState<StartupUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    loadStartups();
  }, [statusFilter]);

  const loadStartups = async () => {
    setLoading(true);
    
    // First, try to get ALL startups without any filter to debug
    const { data: allData, error: allError } = await supabase
      .from('startup_uploads')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('🔍 DEBUG - All startups in database:', allData);
    console.log('🔍 DEBUG - Error if any:', allError);
    console.log('🔍 DEBUG - Total count:', allData?.length);

    // Store debug info
    setDebugInfo({
      totalInDatabase: allData?.length || 0,
      names: allData?.map(s => s.name) || [],
      statuses: allData?.map(s => ({ name: s.name, status: s.status })) || []
    });

    let query = supabase
      .from('startup_uploads')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply status filter if not 'all'
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading startups:', error);
      alert(`Failed to load startups: ${error.message}`);
    } else {
      console.log('🔍 DEBUG - Filtered startups:', data);
      setStartups(data || []);
    }
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
      alert('Failed to save changes');
    } else {
      alert('✅ Saved successfully!');
      await loadStartups();
      setEditingId(null);
      setEditData(null);
    }
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
      alert('✅ Deleted');
      loadStartups();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-8 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-5xl font-bold text-white">✏️ Edit Startups</h1>
          <Link
            to="/"
            className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl transition-all"
          >
            ← Back
          </Link>
        </div>

        {/* Status Filter */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 mb-6 border border-white/20">
          <div className="flex items-center gap-4">
            <span className="text-white font-bold">Filter by Status:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-purple-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              All ({startups.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                statusFilter === 'pending'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                statusFilter === 'approved'
                  ? 'bg-green-500 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                statusFilter === 'rejected'
                  ? 'bg-red-500 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Rejected
            </button>
          </div>
        </div>

        {/* Debug Panel */}
        {debugInfo && (
          <div className="bg-yellow-500/20 border-2 border-yellow-400 rounded-xl p-4 mb-6">
            <h3 className="text-yellow-300 font-bold mb-2">🔍 Debug Info:</h3>
            <p className="text-white">
              <strong>Total in database:</strong> {debugInfo.totalInDatabase} startups
            </p>
            <p className="text-white">
              <strong>Showing filtered:</strong> {startups.length} startups
            </p>
            {debugInfo.statuses.length > 0 && (
              <div className="mt-2">
                <p className="text-white font-bold">All startups in DB:</p>
                <ul className="text-white text-sm">
                  {debugInfo.statuses.map((item: any, i: number) => (
                    <li key={i}>
                      • {item.name} - <span className={`font-bold ${
                        item.status === 'approved' ? 'text-green-400' :
                        item.status === 'pending' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>{item.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-6">
          {startups.map((startup) => (
            <div
              key={startup.id}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
            >
              {editingId === startup.id ? (
                // EDIT MODE
                <div className="space-y-4">
                  <div>
                    <label className="block text-white font-bold mb-2">Startup Name</label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-white/20 text-white border border-white/30 focus:border-orange-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-bold mb-2">Tagline / Value Prop</label>
                    <input
                      type="text"
                      value={editData.tagline}
                      onChange={(e) => setEditData({ ...editData, tagline: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-white/20 text-white border border-white/30 focus:border-orange-400 outline-none"
                      placeholder="Max 60 characters"
                      maxLength={60}
                    />
                    <p className="text-xs text-white/60 mt-1">{editData.tagline?.length || 0}/60 chars</p>
                  </div>

                  <div>
                    <label className="block text-white font-bold mb-2">Status</label>
                    <select
                      value={editData.status}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-white/20 text-white border border-white/30 focus:border-orange-400 outline-none font-semibold"
                    >
                      <option value="pending" className="bg-purple-900">⏳ Pending</option>
                      <option value="approved" className="bg-purple-900">✅ Approved (Shows in voting)</option>
                      <option value="rejected" className="bg-purple-900">❌ Rejected</option>
                      <option value="reviewing" className="bg-purple-900">👀 Reviewing</option>
                    </select>
                    <p className="text-xs text-white/60 mt-1">
                      {editData.status === 'approved' ? '✅ This startup will appear in voting' : '⚠️ This startup will NOT appear in voting'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-white font-bold mb-2">Pitch</label>
                    <textarea
                      value={editData.pitch}
                      onChange={(e) => setEditData({ ...editData, pitch: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-white/20 text-white border border-white/30 focus:border-orange-400 outline-none"
                      rows={2}
                    />
                  </div>

                  <div className="border-t border-white/20 pt-4">
                    <label className="block text-white font-bold mb-3">5 Points (Max 10 words each)</label>
                    {editData.fivePoints.map((point: string, index: number) => (
                      <div key={index} className="mb-3">
                        <label className="text-sm text-white/80 mb-1 block">
                          Point {index + 1}: {['Problem', 'Solution', 'Market', 'Team', 'Raise'][index]}
                        </label>
                        <input
                          type="text"
                          value={point}
                          onChange={(e) => updateFivePoint(index, e.target.value)}
                          className="w-full px-4 py-2 rounded-xl bg-white/20 text-white border border-white/30 focus:border-orange-400 outline-none"
                          placeholder={`E.g., "${['SMBs lack affordable cybersecurity', 'AI-powered threat detection', '$50B SMB security market', 'Ex-NSA security experts', 'Raising $2.5M Seed'][index]}"`}
                        />
                        <p className="text-xs text-white/60 mt-1">{point?.split(' ').length || 0} words</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white font-bold mb-2">Problem (max 100 chars)</label>
                      <textarea
                        value={editData.problem}
                        onChange={(e) => setEditData({ ...editData, problem: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-white/20 text-white border border-white/30 focus:border-orange-400 outline-none"
                        rows={2}
                        maxLength={100}
                      />
                      <p className="text-xs text-white/60 mt-1">{editData.problem?.length || 0}/100</p>
                    </div>
                    <div>
                      <label className="block text-white font-bold mb-2">Solution (max 100 chars)</label>
                      <textarea
                        value={editData.solution}
                        onChange={(e) => setEditData({ ...editData, solution: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-white/20 text-white border border-white/30 focus:border-orange-400 outline-none"
                        rows={2}
                        maxLength={100}
                      />
                      <p className="text-xs text-white/60 mt-1">{editData.solution?.length || 0}/100</p>
                    </div>
                    <div>
                      <label className="block text-white font-bold mb-2">Team (max 100 chars)</label>
                      <input
                        type="text"
                        value={editData.team}
                        onChange={(e) => setEditData({ ...editData, team: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-white/20 text-white border border-white/30 focus:border-orange-400 outline-none"
                        maxLength={100}
                      />
                      <p className="text-xs text-white/60 mt-1">{editData.team?.length || 0}/100</p>
                    </div>
                    <div>
                      <label className="block text-white font-bold mb-2">Funding</label>
                      <input
                        type="text"
                        value={editData.funding}
                        onChange={(e) => setEditData({ ...editData, funding: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-white/20 text-white border border-white/30 focus:border-orange-400 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : '💾 Save Changes'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className="px-8 py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // VIEW MODE
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{startup.name}</h2>
                      <p className="text-orange-400 font-semibold">{startup.tagline || startup.pitch}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          startup.status === 'approved' ? 'bg-green-500 text-white' :
                          startup.status === 'pending' ? 'bg-yellow-500 text-white' :
                          startup.status === 'rejected' ? 'bg-red-500 text-white' :
                          'bg-blue-500 text-white'
                        }`}>
                          {startup.status === 'approved' ? '✅ APPROVED' :
                           startup.status === 'pending' ? '⏳ PENDING' :
                           startup.status === 'rejected' ? '❌ REJECTED' :
                           '👀 REVIEWING'}
                        </span>
                        {startup.status === 'approved' && (
                          <span className="text-xs text-green-400 font-semibold">
                            🎯 In voting rotation
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(startup)}
                        className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => deleteStartup(startup.id, startup.name)}
                        className="px-6 py-2 bg-red-500/80 hover:bg-red-600 text-white font-bold rounded-xl transition-all"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {startup.extracted_data?.fivePoints && (
                    <div className="bg-black/20 rounded-xl p-4">
                      <p className="text-white font-bold mb-2">5 Points:</p>
                      <ol className="space-y-1 text-white/90">
                        {startup.extracted_data.fivePoints.map((point, i) => (
                          <li key={i} className="text-sm">
                            {i + 1}. {point}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {startups.length === 0 && (
          <div className="text-center py-16">
            <p className="text-white text-xl">No startups found</p>
          </div>
        )}
      </div>
    </div>
  );
}
