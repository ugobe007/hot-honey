import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface StartupData {
  id: string;
  company_name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  website_url?: string;
  description?: string;
  badges?: string[];
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStartups: 0,
    pendingStartups: 0,
    approvedStartups: 0,
    rejectedStartups: 0,
  });
  const [pendingStartups, setPendingStartups] = useState<StartupData[]>([]);
  const [recentStartups, setRecentStartups] = useState<StartupData[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'all' | 'investors'>('overview');

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    loadDashboardData();
  }, [user, navigate]);

  const loadDashboardData = async () => {
    setLoading(true);

    try {
      // Get all startups
      const { data: allStartups, error: allError } = await supabase
        .from('startup_uploads')
        .select('*')
        .order('created_at', { ascending: false });

      if (allError) throw allError;

      // Calculate stats
      const pending = allStartups?.filter(s => s.status === 'pending') || [];
      const approved = allStartups?.filter(s => s.status === 'approved') || [];
      const rejected = allStartups?.filter(s => s.status === 'rejected') || [];

      setStats({
        totalStartups: allStartups?.length || 0,
        pendingStartups: pending.length,
        approvedStartups: approved.length,
        rejectedStartups: rejected.length,
      });

      setPendingStartups(pending);
      setRecentStartups(allStartups?.slice(0, 10) || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (startupId: string) => {
    const { error } = await supabase
      .from('startup_uploads')
      .update({ status: 'approved' })
      .eq('id', startupId);

    if (!error) {
      await loadDashboardData();
    }
  };

  const handleReject = async (startupId: string) => {
    const { error } = await supabase
      .from('startup_uploads')
      .update({ status: 'rejected' })
      .eq('id', startupId);

    if (!error) {
      await loadDashboardData();
    }
  };

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              👑 Admin Dashboard
            </h1>
            <p className="text-purple-200">
              Manage startups, investors, and review pending submissions
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
          >
            ← Back
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="text-3xl font-bold text-white mb-2">{stats.totalStartups}</div>
            <div className="text-purple-200">Total Startups</div>
          </div>
          <div className="bg-orange-500/20 backdrop-blur-md rounded-xl p-6 border border-orange-400/30">
            <div className="text-3xl font-bold text-white mb-2">{stats.pendingStartups}</div>
            <div className="text-orange-200">Pending Review</div>
          </div>
          <div className="bg-green-500/20 backdrop-blur-md rounded-xl p-6 border border-green-400/30">
            <div className="text-3xl font-bold text-white mb-2">{stats.approvedStartups}</div>
            <div className="text-green-200">Approved</div>
          </div>
          <div className="bg-red-500/20 backdrop-blur-md rounded-xl p-6 border border-red-400/30">
            <div className="text-3xl font-bold text-white mb-2">{stats.rejectedStartups}</div>
            <div className="text-red-200">Rejected</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 bg-white/10 backdrop-blur-md rounded-lg p-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
              activeTab === 'overview'
                ? 'bg-purple-600 text-white'
                : 'text-purple-200 hover:bg-white/10'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
              activeTab === 'pending'
                ? 'bg-purple-600 text-white'
                : 'text-purple-200 hover:bg-white/10'
            }`}
          >
            ⏳ Pending ({stats.pendingStartups})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
              activeTab === 'all'
                ? 'bg-purple-600 text-white'
                : 'text-purple-200 hover:bg-white/10'
            }`}
          >
            🚀 All Startups
          </button>
          <button
            onClick={() => setActiveTab('investors')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
              activeTab === 'investors'
                ? 'bg-purple-600 text-white'
                : 'text-purple-200 hover:bg-white/10'
            }`}
          >
            💼 Investors
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          {loading ? (
            <div className="text-center py-12 text-white">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <div>Loading dashboard data...</div>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Dashboard Overview</h2>
                  
                  {/* Pending Startups Alert */}
                  {stats.pendingStartups > 0 && (
                    <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl p-6 mb-6 border-2 border-orange-400 shadow-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-white mb-2">
                            🎯 {stats.pendingStartups} Startup{stats.pendingStartups > 1 ? 's' : ''} Awaiting Review
                          </h3>
                          <p className="text-orange-100 mb-4">
                            New submissions need your approval before appearing on the Vote page
                          </p>
                          <div className="flex gap-3">
                            <button
                              onClick={() => setActiveTab('pending')}
                              className="px-6 py-3 bg-white text-orange-600 font-bold rounded-lg hover:bg-orange-50 transition shadow-lg"
                            >
                              👀 Quick Review Here
                            </button>
                            <button
                              onClick={() => navigate('/admin/edit-startups')}
                              className="px-6 py-3 bg-purple-900 text-white font-bold rounded-lg hover:bg-purple-800 transition shadow-lg"
                            >
                              ✏️ Detailed Review & Bulk Approve
                            </button>
                          </div>
                        </div>
                        <div className="text-6xl">📋</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <button
                      onClick={() => navigate('/admin/edit-startups')}
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold py-6 rounded-xl transition shadow-lg"
                    >
                      <div className="text-3xl mb-2">✏️</div>
                      <div className="text-lg">Edit & Approve</div>
                      <div className="text-sm opacity-90">Manage all startups</div>
                    </button>
                    <button
                      onClick={() => navigate('/admin/bulk-import')}
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-6 rounded-xl transition shadow-lg"
                    >
                      <div className="text-3xl mb-2">🚀</div>
                      <div className="text-lg">Bulk Import</div>
                      <div className="text-sm opacity-90">Import with AI</div>
                    </button>
                    <button
                      onClick={() => navigate('/vote')}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-6 rounded-xl transition shadow-lg"
                    >
                      <div className="text-3xl mb-2">🗳️</div>
                      <div className="text-lg">Vote Page</div>
                      <div className="text-sm opacity-90">See live startups</div>
                    </button>
                    <button
                      onClick={() => navigate('/submit')}
                      className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold py-6 rounded-xl transition shadow-lg"
                    >
                      <div className="text-3xl mb-2">➕</div>
                      <div className="text-lg">Submit Startup</div>
                      <div className="text-sm opacity-90">Add one manually</div>
                    </button>
                  </div>

                  {/* Recent Startups */}
                  <h3 className="text-xl font-bold text-white mb-4">Recent Submissions</h3>
                  <div className="space-y-3">
                    {recentStartups.length === 0 ? (
                      <div className="text-center py-8 text-purple-200">
                        No startups found. Import some startups to get started!
                      </div>
                    ) : (
                      recentStartups.map((startup) => (
                        <div
                          key={startup.id}
                          className="bg-white/5 hover:bg-white/10 rounded-lg p-4 border border-white/10 transition"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-lg font-semibold text-white">
                                  {startup.company_name}
                                </h4>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    startup.status === 'approved'
                                      ? 'bg-green-500/30 text-green-200'
                                      : startup.status === 'pending'
                                      ? 'bg-orange-500/30 text-orange-200'
                                      : 'bg-red-500/30 text-red-200'
                                  }`}
                                >
                                  {startup.status}
                                </span>
                              </div>
                              <p className="text-purple-200 text-sm mb-2 line-clamp-2">
                                {startup.description || 'No description'}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-purple-300">
                                <span>
                                  {new Date(startup.created_at).toLocaleDateString()}
                                </span>
                                {startup.website_url && (
                                  <>
                                    <span>•</span>
                                    <a
                                      href={startup.website_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:text-purple-100 underline"
                                    >
                                      Website
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => navigate(`/admin/edit-startups?id=${startup.id}`)}
                              className="ml-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Pending Tab */}
              {activeTab === 'pending' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">
                    Pending Approval ({pendingStartups.length})
                  </h2>
                  <div className="space-y-4">
                    {pendingStartups.length === 0 ? (
                      <div className="text-center py-12 text-purple-200">
                        <div className="text-5xl mb-4">✅</div>
                        <div className="text-xl">No pending startups. Great job!</div>
                      </div>
                    ) : (
                      pendingStartups.map((startup) => (
                        <div
                          key={startup.id}
                          className="bg-white/5 rounded-lg p-6 border border-orange-400/30"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-white mb-2">
                                {startup.company_name}
                              </h3>
                              <p className="text-purple-200 mb-3">
                                {startup.description || 'No description provided'}
                              </p>
                              {startup.website_url && (
                                <a
                                  href={startup.website_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-purple-300 hover:text-purple-100 text-sm underline"
                                >
                                  {startup.website_url}
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleApprove(startup.id)}
                              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => navigate(`/admin/edit-startups?id=${startup.id}`)}
                              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
                            >
                              ✏️ Edit First
                            </button>
                            <button
                              onClick={() => handleReject(startup.id)}
                              className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                            >
                              ❌ Reject
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* All Startups Tab */}
              {activeTab === 'all' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">
                      All Startups ({stats.totalStartups})
                    </h2>
                    <button
                      onClick={() => navigate('/admin/edit-startups')}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                    >
                      Manage All →
                    </button>
                  </div>
                  <div className="space-y-3">
                    {recentStartups.map((startup) => (
                      <div
                        key={startup.id}
                        className="bg-white/5 hover:bg-white/10 rounded-lg p-4 border border-white/10 transition cursor-pointer"
                        onClick={() => navigate(`/admin/edit-startups?id=${startup.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="text-lg font-semibold text-white">
                                {startup.company_name}
                              </h4>
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  startup.status === 'approved'
                                    ? 'bg-green-500/30 text-green-200'
                                    : startup.status === 'pending'
                                    ? 'bg-orange-500/30 text-orange-200'
                                    : 'bg-red-500/30 text-red-200'
                                }`}
                              >
                                {startup.status}
                              </span>
                            </div>
                          </div>
                          <div className="text-purple-300 text-sm">
                            {new Date(startup.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Investors Tab */}
              {activeTab === 'investors' && (
                <div className="text-center py-12 text-purple-200">
                  <div className="text-5xl mb-4">💼</div>
                  <div className="text-xl mb-2">Investor Management</div>
                  <div className="mb-6">Coming soon - manage investor profiles and portfolios</div>
                  <button
                    onClick={() => navigate('/admin/add-investor')}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
                  >
                    Add Investor
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
