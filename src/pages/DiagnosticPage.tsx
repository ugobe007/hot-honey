import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function DiagnosticPage() {
  const navigate = useNavigate();
  const [supabaseData, setSupabaseData] = useState<any>(null);
  const [localStorageData, setLocalStorageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    // Check Supabase
    const { data: allStartups, error } = await supabase
      .from('startup_uploads')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: approvedStartups } = await supabase
      .from('startup_uploads')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    const { data: pendingStartups } = await supabase
      .from('startup_uploads')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    setSupabaseData({
      all: allStartups || [],
      approved: approvedStartups || [],
      pending: pendingStartups || [],
      error: error?.message || null,
    });

    // Check localStorage
    const uploaded = localStorage.getItem('uploadedStartups');
    const myVotes = localStorage.getItem('myYesVotes');
    const votedStartups = localStorage.getItem('votedStartups');

    setLocalStorageData({
      uploadedStartups: uploaded ? JSON.parse(uploaded) : [],
      myYesVotes: myVotes ? JSON.parse(myVotes) : [],
      votedStartups: votedStartups ? JSON.parse(votedStartups) : [],
    });

    setLoading(false);
  };

  const clearLocalStorage = () => {
    if (confirm('Clear all localStorage data?')) {
      localStorage.removeItem('uploadedStartups');
      localStorage.removeItem('myYesVotes');
      localStorage.removeItem('votedStartups');
      alert('✅ localStorage cleared!');
      loadData();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-8 flex items-center justify-center">
        <div className="text-white text-2xl">Loading diagnostic data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-5xl font-bold text-white">🔍 System Diagnostic</h1>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl transition-all"
          >
            ← Back
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={loadData}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all"
          >
            🔄 Refresh Data
          </button>
          <button
            onClick={clearLocalStorage}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all"
          >
            🗑️ Clear localStorage
          </button>
          <button
            onClick={() => navigate('/admin/migrate')}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-all"
          >
            🔄 Migrate localStorage → Supabase
          </button>
        </div>

        <div className="grid gap-6">
          
          {/* Supabase Data */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-3xl font-bold text-white mb-4">🗄️ Supabase Database</h2>
            
            {supabaseData?.error && (
              <div className="bg-red-500/20 border border-red-400 rounded-xl p-4 mb-4">
                <p className="text-white font-bold">❌ Error: {supabaseData.error}</p>
              </div>
            )}

            <div className="grid gap-4">
              <div className="bg-blue-500/20 border border-blue-400 rounded-xl p-4">
                <h3 className="text-white font-bold text-xl mb-2">
                  📊 Total Startups: {supabaseData?.all.length || 0}
                </h3>
                {supabaseData?.all.length > 0 && (
                  <ul className="text-white/80 text-sm space-y-1 mt-3">
                    {supabaseData.all.map((s: any, i: number) => (
                      <li key={i}>
                        • <span className="text-yellow-300">{s.name}</span> - 
                        <span className={`ml-2 font-bold ${
                          s.status === 'approved' ? 'text-green-400' :
                          s.status === 'pending' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>{s.status}</span>
                        <span className="text-white/60 ml-2 text-xs">
                          {new Date(s.created_at).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-green-500/20 border border-green-400 rounded-xl p-4">
                <h3 className="text-white font-bold text-xl mb-2">
                  ✅ Approved (Visible in Voting): {supabaseData?.approved.length || 0}
                </h3>
                {supabaseData?.approved.length > 0 && (
                  <ul className="text-white/80 text-sm space-y-1 mt-3">
                    {supabaseData.approved.map((s: any, i: number) => (
                      <li key={i}>• {s.name}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-yellow-500/20 border border-yellow-400 rounded-xl p-4">
                <h3 className="text-white font-bold text-xl mb-2">
                  ⏳ Pending Review: {supabaseData?.pending.length || 0}
                </h3>
                {supabaseData?.pending.length > 0 && (
                  <ul className="text-white/80 text-sm space-y-1 mt-3">
                    {supabaseData.pending.map((s: any, i: number) => (
                      <li key={i}>• {s.name}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* localStorage Data */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-3xl font-bold text-white mb-4">💾 localStorage (Legacy)</h2>
            
            <div className="grid gap-4">
              <div className="bg-orange-500/20 border border-orange-400 rounded-xl p-4">
                <h3 className="text-white font-bold text-xl mb-2">
                  📦 Uploaded Startups: {localStorageData?.uploadedStartups.length || 0}
                </h3>
                {localStorageData?.uploadedStartups.length > 0 ? (
                  <>
                    <p className="text-orange-300 text-sm mb-2">
                      ⚠️ These should be migrated to Supabase!
                    </p>
                    <ul className="text-white/80 text-sm space-y-1 mt-3">
                      {localStorageData.uploadedStartups.map((s: any, i: number) => (
                        <li key={i}>• {s.name || 'Unnamed'}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-green-300 text-sm">✅ No legacy data (good!)</p>
                )}
              </div>

              <div className="bg-purple-500/20 border border-purple-400 rounded-xl p-4">
                <h3 className="text-white font-bold text-xl mb-2">
                  ❤️ Your YES Votes: {localStorageData?.myYesVotes.length || 0}
                </h3>
              </div>

              <div className="bg-indigo-500/20 border border-indigo-400 rounded-xl p-4">
                <h3 className="text-white font-bold text-xl mb-2">
                  🗳️ Voted Startups: {localStorageData?.votedStartups.length || 0}
                </h3>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-3xl font-bold text-white mb-4">📋 System Status</h2>
            
            <div className="space-y-3 text-white">
              <p>
                <strong className="text-green-400">✅ Supabase Connection:</strong> {supabaseData?.error ? 'Failed' : 'Working'}
              </p>
              <p>
                <strong className="text-blue-400">📊 Data Storage:</strong> {
                  localStorageData?.uploadedStartups.length > 0 
                    ? '⚠️ Mixed (Supabase + localStorage)' 
                    : '✅ Supabase Only'
                }
              </p>
              <p>
                <strong className="text-yellow-400">🚀 Total Approved for Voting:</strong> {supabaseData?.approved.length || 0}
              </p>
              <p>
                <strong className="text-purple-400">⏳ Awaiting Review:</strong> {supabaseData?.pending.length || 0}
              </p>
            </div>

            {localStorageData?.uploadedStartups.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-orange-300 font-bold mb-2">
                  ⚠️ Action Required:
                </p>
                <p className="text-white/80 text-sm">
                  You have {localStorageData.uploadedStartups.length} startups in localStorage.
                  Click "Migrate localStorage → Supabase" above to move them to the database.
                </p>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-3xl font-bold text-white mb-4">🔗 Quick Links</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => navigate('/submit')}
                className="py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all"
              >
                📝 Submit Startup
              </button>
              <button
                onClick={() => navigate('/vote')}
                className="py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all"
              >
                🗳️ Vote
              </button>
              <button
                onClick={() => navigate('/admin/edit-startups')}
                className="py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all"
              >
                ✏️ Edit Startups
              </button>
              <button
                onClick={() => navigate('/admin/bulk-import')}
                className="py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-all"
              >
                🚀 Bulk Import
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
