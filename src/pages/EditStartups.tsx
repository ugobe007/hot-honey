import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';

interface StartupUpload {
  id: string;
  name: string;
  pitch: string | null;
  tagline: string | null;
  status: string;
  extracted_data: any;
  admin_notes: string | null;
  created_at: string;
}

export default function EditStartups() {
  const navigate = useNavigate();
  const [startups, setStartups] = useState<StartupUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [sourceFilter, setSourceFilter] = useState<string>('all'); // 'all', 'supabase', 'localStorage'

  useEffect(() => {
    loadStartups();
  }, [statusFilter]);

  const loadStartups = async () => {
    setLoading(true);
    
    // Load from Supabase only
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

    console.log('✅ Loaded from Supabase:', data);

    // Apply status filter
    let filtered = data || [];
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    // Store debug info
    setDebugInfo({
      totalInDatabase: data?.length || 0,
      totalShowing: filtered.length,
      statuses: (data || []).map(s => ({ name: s.name, status: s.status }))
    });

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
    
    const wasApproved = editData.status === 'approved';
    
    // Save to Supabase only
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

    alert('✅ Saved successfully!');
    
    // If approved, redirect to admin dashboard
    if (wasApproved) {
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 500);
    } else {
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

  const bulkApprove = async () => {
    // Only approve startups that are 'approved' status AND not under review
    const approvableStartups = startups.filter(s => 
      s.status === 'approved' && 
      !s.admin_notes?.includes('UNDER_REVIEW')
    );
    
    if (approvableStartups.length === 0) {
      alert('No startups available for bulk approval. Make sure startups are marked as "approved" and not under review.');
      return;
    }

    if (!confirm(`Publish ${approvableStartups.length} approved startups to the Vote page?\n\n(Startups marked "Under Review" will be skipped)`)) {
      return;
    }

    setSaving(true);
    
    try {
      for (const startup of approvableStartups) {
        // No actual status change needed since they're already approved
        // This is just confirming they're ready for voting
        console.log(`✅ ${startup.name} ready for voting`);
      }
      
      alert(`✅ ${approvableStartups.length} startups are now live on the Vote page!`);
      
      // Always redirect to admin dashboard after bulk approval
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 500);
    } catch (err) {
      alert('Error during bulk approval');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const bulkApprovePending = async () => {
    // Get all pending startups (not under review)
    const pendingStartups = startups.filter(s => 
      s.status === 'pending' && 
      !s.admin_notes?.includes('UNDER_REVIEW')
    );
    
    if (pendingStartups.length === 0) {
      alert('No pending startups to approve.\n\nTip: Upload new startups using Bulk Import, then come here to approve them.');
      return;
    }

    if (!confirm(`🚀 Approve & Publish ${pendingStartups.length} Startups?\n\nThis will:\n✅ Change status to "approved"\n✅ Make them visible on Vote page immediately\n✅ Users can start voting on them\n\n(Startups marked "Under Review" will be skipped)`)) {
      return;
    }

    setSaving(true);
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      // Update all pending startups to approved
      for (const startup of pendingStartups) {
        const { error } = await supabase
          .from('startup_uploads')
          .update({ status: 'approved' })
          .eq('id', startup.id);
        
        if (error) {
          console.error(`Failed to approve ${startup.name}:`, error);
          failCount++;
        } else {
          console.log(`✅ Approved: ${startup.name}`);
          successCount++;
        }
      }
      
      if (successCount > 0) {
        alert(`✅ Success!\n\n${successCount} startups approved and published!\n${failCount > 0 ? `\n⚠️ ${failCount} failed (check console)` : ''}\n\nUsers can now vote on them.\n\n💡 Tip: Visit the Vote page to see how they look!`);
        
        // Reload to show updated statuses
        await loadStartups();
        
        // Redirect to admin dashboard
        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 800);
      } else {
        alert('❌ Failed to approve any startups. Check console for errors.');
      }
    } catch (err) {
      alert('Error during bulk approval');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleUnderReview = async (startup: StartupUpload) => {
    const isCurrentlyUnderReview = startup.admin_notes?.includes('UNDER_REVIEW');
    const newNotes = isCurrentlyUnderReview
      ? (startup.admin_notes || '').replace('UNDER_REVIEW', '').trim()
      : `${startup.admin_notes || ''} UNDER_REVIEW`.trim();

    const { error } = await supabase
      .from('startup_uploads')
      .update({ admin_notes: newNotes })
      .eq('id', startup.id);

    if (error) {
      alert('Failed to update review status');
      console.error(error);
    } else {
      await loadStartups();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-slate-100 p-8 flex items-center justify-center">
        <div className="text-orange-600 text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-5xl font-bold text-orange-600">✏️ Edit Startups</h1>
          <div className="flex gap-3">
            <Link
              to="/admin/migrate-data"
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold rounded-xl transition-all shadow-lg"
            >
              🔄 Migrate Code to DB
            </Link>
            <Link
              to="/admin/sync"
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold rounded-xl transition-all shadow-lg"
            >
              🔄 Sync from Code
            </Link>
            <Link
              to="/admin/migrate"
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-lg"
            >
              � Migrate localStorage
            </Link>
            <Link
              to="/"
              className="px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-bold rounded-xl transition-all shadow-lg"
            >
              ← Back
            </Link>
          </div>
        </div>

        {/* Status Filter */}
        <div className="bg-white rounded-xl p-4 mb-6 border-2 border-orange-200 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-slate-800 font-bold">Filter by Status:</span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All ({startups.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  statusFilter === 'approved'
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  statusFilter === 'rejected'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Rejected
              </button>
            </div>
            
            {/* Primary Bulk Approve Button - For Pending Startups */}
            <button
              onClick={bulkApprovePending}
              disabled={saving || startups.filter(s => s.status === 'pending' && !s.admin_notes?.includes('UNDER_REVIEW')).length === 0}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-xl text-lg"
            >
              {saving ? '⏳ Approving...' : `🚀 Bulk Approve & Publish (${startups.filter(s => s.status === 'pending' && !s.admin_notes?.includes('UNDER_REVIEW')).length})`}
            </button>
          </div>
        </div>

        {/* Debug Panel */}
        {debugInfo && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 mb-6">
            <h3 className="text-amber-800 font-bold mb-2">🗄️ Database Info:</h3>
            <div className="text-slate-700 space-y-2">
              <p>
                <strong>Total in Database:</strong> {debugInfo.totalInDatabase} startups
              </p>
              <p>
                <strong>Showing after filter:</strong> {debugInfo.totalShowing} startups
              </p>
              {debugInfo.statuses && debugInfo.statuses.length > 0 && (
                <div className="mt-3 pt-3 border-t border-amber-300">
                  <p className="font-bold mb-2">All Startups:</p>
                  <ul className="text-sm space-y-1">
                    {debugInfo.statuses.map((item: any, i: number) => (
                      <li key={i}>
                        • <span className="text-slate-800">{item.name}</span> - 
                        <span className={`ml-1 font-bold ${
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
          </div>
        )}

        <div className="grid gap-6">
          {startups.map((startup) => (
            <div
              key={startup.id}
              className="bg-white rounded-2xl p-6 border-2 border-orange-200 shadow-lg"
            >
              {editingId === startup.id ? (
                // EDIT MODE
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-800 font-bold mb-2">Startup Name</label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-white text-slate-800 border-2 border-orange-200 focus:border-orange-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-800 font-bold mb-2">Tagline / Value Prop</label>
                    <input
                      type="text"
                      value={editData.tagline}
                      onChange={(e) => setEditData({ ...editData, tagline: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-white text-slate-800 border-2 border-orange-200 focus:border-orange-500 outline-none"
                      placeholder="Max 60 characters"
                      maxLength={60}
                    />
                    <p className="text-xs text-slate-500 mt-1">{editData.tagline?.length || 0}/60 chars</p>
                  </div>

                  <div>
                    <label className="block text-slate-800 font-bold mb-2">Status</label>
                    <select
                      value={editData.status}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-white text-slate-800 border-2 border-orange-200 focus:border-orange-500 outline-none font-semibold"
                    >
                      <option value="pending" className="bg-white">⏳ Pending</option>
                      <option value="approved" className="bg-white">✅ Approved (Shows in voting)</option>
                      <option value="rejected" className="bg-white">❌ Rejected</option>
                      <option value="reviewing" className="bg-white">👀 Reviewing</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
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
                      className="px-8 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // VIEW MODE
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-bold text-slate-800">{startup.name}</h2>
                        
                        {/* Under Review Checkbox */}
                        <label className="flex items-center gap-2 cursor-pointer bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded-lg transition-all border border-amber-300">
                          <input
                            type="checkbox"
                            checked={startup.admin_notes?.includes('UNDER_REVIEW') || false}
                            onChange={() => toggleUnderReview(startup)}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span className="text-sm font-semibold text-amber-800">
                            🔍 Under Review
                          </span>
                        </label>
                      </div>
                      
                      <p className="text-orange-600 font-semibold">{startup.tagline || startup.pitch}</p>
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
                        {startup.status === 'approved' && !startup.admin_notes?.includes('UNDER_REVIEW') && (
                          <span className="text-xs text-green-600 font-semibold">
                            🎯 Live on Vote page
                          </span>
                        )}
                        {startup.admin_notes?.includes('UNDER_REVIEW') && (
                          <span className="text-xs text-amber-600 font-semibold">
                            🔍 Excluded from bulk publish
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
                    <div className="bg-white border-2 border-orange-200 rounded-xl p-4">
                      <p className="text-slate-800 font-bold mb-2">5 Points:</p>
                      <ol className="space-y-1 text-slate-700">
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
            <p className="text-slate-600 text-xl">No startups found</p>
          </div>
        )}
      </div>
    </div>
  );
}
