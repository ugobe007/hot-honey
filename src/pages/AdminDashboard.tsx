import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import StartupCardOfficial from '../components/StartupCardOfficial';
import HamburgerMenu from '../components/HamburgerMenu';
import NewsUpdate from '../components/NewsUpdate';
import startupData from '../data/startupData';
import { generateRecentActivities } from '../utils/activityGenerator';

interface StartupData {
  id: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  website?: string;
  pitch?: string;
  description?: string;
  badges?: string[];
}

interface YesVote {
  id: number;
  name: string;
  pitch?: string;
  tagline?: string;
  stage?: number;
  fivePoints?: string[];
  votedAt: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalStartups: 0,
    pendingStartups: 0,
    approvedStartups: 0,
    rejectedStartups: 0,
  });
  const [pendingStartups, setPendingStartups] = useState<StartupData[]>([]);
  const [recentStartups, setRecentStartups] = useState<StartupData[]>([]);
  const [myYesVotes, setMyYesVotes] = useState<YesVote[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'myvotes' | 'pending' | 'all' | 'investors'>('overview');

  useEffect(() => {
    console.log('🔍 AdminDashboard - User object:', user);
    console.log('🔍 AdminDashboard - isAdmin:', user?.isAdmin);
    console.log('🔍 AdminDashboard - localStorage currentUser:', localStorage.getItem('currentUser'));
    console.log('🔍 AdminDashboard - localStorage userProfile:', localStorage.getItem('userProfile'));
    
    // Don't redirect here - let the render handle it with proper UI
    if (!user?.isAdmin) {
      console.warn('⚠️ AdminDashboard: User is not admin');
      return;
    }
    
    console.log('✅ AdminDashboard: User is admin, loading data...');
    loadDashboardData();
    loadMyVotes();
    
    // Load activities with error handling
    console.log('👑 AdminDashboard: About to load activities...');
    generateRecentActivities()
      .then((recentActivities) => {
        console.log(`👑 AdminDashboard: Received ${recentActivities.length} activities`);
        setActivities(recentActivities);
      })
      .catch((error) => {
        console.error('👑 AdminDashboard: Error loading activities:', error);
      });
  }, [user]);

  const loadMyVotes = () => {
    // Load from localStorage for now (both authenticated and anonymous users)
    const myYesVotesStr = localStorage.getItem('myYesVotes');
    if (myYesVotesStr) {
      try {
        const yesVotesArray = JSON.parse(myYesVotesStr);
        const uniqueVotesMap = new Map();
        yesVotesArray.forEach((vote: YesVote) => {
          if (vote && vote.id !== undefined) {
            uniqueVotesMap.set(vote.id, vote);
          }
        });
        setMyYesVotes(Array.from(uniqueVotesMap.values()));
      } catch (e) {
        console.error('Error loading votes from localStorage:', e);
      }
    }
  };

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

  // Show loading state while checking auth
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Checking Authentication...</h2>
          <p className="text-slate-600">Please log in with admin credentials</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⛔</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-4">You need admin privileges to access this page</p>
          <p className="text-sm text-slate-500 mb-4">Current user: {user.email}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
            >
              Login as Admin
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-slate-100 py-8 px-4">
      {/* Hamburger Menu */}
      <HamburgerMenu />

      {/* Current Page Button */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40">
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-full bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 text-slate-800 font-medium text-sm flex items-center gap-2 shadow-lg hover:from-slate-400 hover:via-slate-300 hover:to-slate-500 transition-all cursor-pointer"
          style={{
            boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.2)',
            textShadow: '0 1px 1px rgba(255,255,255,0.8)'
          }}>
          <span>🏠</span>
          <span>Home</span>
        </button>
      </div>

      <div className="max-w-7xl mx-auto pt-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-orange-600 mb-2">
              👑 Admin Dashboard
            </h1>
            <p className="text-slate-700">
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

        {/* Activity Ticker */}
        <div className="mb-8">
          <NewsUpdate activities={activities} />
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 border-2 border-slate-300 shadow-lg">
            <div className="text-3xl font-bold text-slate-800 mb-2">{stats.totalStartups}</div>
            <div className="text-slate-600 font-medium">Total Startups</div>
          </div>
          <div className="bg-amber-50 backdrop-blur-md rounded-xl p-6 border-2 border-orange-400 shadow-lg">
            <div className="text-3xl font-bold text-orange-700 mb-2">{stats.pendingStartups}</div>
            <div className="text-orange-700 font-medium">Pending Review</div>
          </div>
          <div className="bg-emerald-50 backdrop-blur-md rounded-xl p-6 border-2 border-green-500 shadow-lg">
            <div className="text-3xl font-bold text-green-700 mb-2">{stats.approvedStartups}</div>
            <div className="text-green-700 font-medium">Approved</div>
          </div>
          <div className="bg-slate-100 backdrop-blur-md rounded-xl p-6 border-2 border-slate-400 shadow-lg">
            <div className="text-3xl font-bold text-slate-700 mb-2">{stats.rejectedStartups}</div>
            <div className="text-slate-700 font-medium">Rejected</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 bg-white/80 backdrop-blur-md rounded-lg p-2 overflow-x-auto border-2 border-slate-300 shadow-lg">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('myvotes')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'myvotes'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            ⭐ My YES Votes ({myYesVotes.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            ⏳ Pending ({stats.pendingStartups})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            🚀 All Startups
          </button>
          <button
            onClick={() => setActiveTab('investors')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'investors'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            💼 Investors
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl border-2 border-slate-300 p-6 shadow-lg">
          {loading ? (
            <div className="text-center py-12 text-slate-700">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <div className="font-medium">Loading dashboard data...</div>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div>
                  <h2 className="text-2xl font-bold text-orange-600 mb-6">Dashboard Overview</h2>
                  
                  {/* Pending Startups Alert */}
                  {stats.pendingStartups > 0 && (
                    <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-xl p-6 mb-6 border-2 border-orange-600 shadow-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-white mb-2">
                            🎯 {stats.pendingStartups} Startup{stats.pendingStartups > 1 ? 's' : ''} Awaiting Review
                          </h3>
                          <p className="text-white/90 mb-4 font-medium">
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
                              className="px-6 py-3 bg-purple-700 text-white font-bold rounded-lg hover:bg-purple-800 transition shadow-lg"
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
                      className="bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-6 rounded-xl transition shadow-lg"
                    >
                      <div className="text-3xl mb-2">✏️</div>
                      <div className="text-lg">Edit & Approve</div>
                      <div className="text-sm opacity-90">Manage all startups</div>
                    </button>
                    <button
                      onClick={() => navigate('/admin/bulk-import')}
                      className="bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-6 rounded-xl transition shadow-lg"
                    >
                      <div className="text-3xl mb-2">🚀</div>
                      <div className="text-lg">Bulk Import</div>
                      <div className="text-sm opacity-90">Import with AI</div>
                    </button>
                    <button
                      onClick={() => navigate('/vote')}
                      className="bg-gradient-to-br from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white font-bold py-6 rounded-xl transition shadow-lg"
                    >
                      <div className="text-3xl mb-2">🗳️</div>
                      <div className="text-lg">Vote Page</div>
                      <div className="text-sm opacity-90">See live startups</div>
                    </button>
                    <button
                      onClick={() => navigate('/submit')}
                      className="bg-gradient-to-br from-purple-700 to-purple-900 hover:from-purple-800 hover:to-purple-950 text-lime-400 font-bold py-6 rounded-xl transition shadow-lg"
                    >
                      <div className="text-3xl mb-2 text-lime-400">➕</div>
                      <div className="text-lg">Submit Startup</div>
                      <div className="text-sm opacity-90">Add one manually</div>
                    </button>
                  </div>

                  {/* Developer Tools */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <button
                      onClick={() => navigate('/admin/database-check')}
                      className="bg-gradient-to-br from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold py-6 rounded-xl transition shadow-lg"
                    >
                      <div className="text-3xl mb-2">🔍</div>
                      <div className="text-lg">Database Check</div>
                      <div className="text-sm opacity-90">Verify data integrity</div>
                    </button>
                    <button
                      onClick={() => navigate('/admin/diagnostic')}
                      className="bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-bold py-6 rounded-xl transition shadow-lg"
                    >
                      <div className="text-3xl mb-2">🛠️</div>
                      <div className="text-lg">System Diagnostic</div>
                      <div className="text-sm opacity-90">Check system status</div>
                    </button>
                  </div>

                  {/* Recent Startups */}
                  <h3 className="text-xl font-bold text-slate-800 mb-4">Recent Submissions</h3>
                  <div className="space-y-3">
                    {recentStartups.length === 0 ? (
                      <div className="text-center py-8 text-slate-600">
                        No startups found. Import some startups to get started!
                      </div>
                    ) : (
                      recentStartups.map((startup) => (
                        <div
                          key={startup.id}
                          className="bg-slate-50 hover:bg-slate-100 rounded-lg p-4 border-2 border-slate-200 transition shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-lg font-semibold text-slate-800">
                                  {startup.name}
                                </h4>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    startup.status === 'approved'
                                      ? 'bg-green-100 text-green-700 border border-green-300'
                                      : startup.status === 'pending'
                                      ? 'bg-amber-100 text-orange-700 border border-orange-300'
                                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                                  }`}
                                >
                                  {startup.status}
                                </span>
                              </div>
                              <p className="text-slate-600 text-sm mb-2 line-clamp-2">
                                {startup.description || 'No description'}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                <span>
                                  {new Date(startup.created_at).toLocaleDateString()}
                                </span>
                                {startup.website && (
                                  <>
                                    <span>•</span>
                                    <a
                                      href={startup.website}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:text-orange-600 underline"
                                    >
                                      Website
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => navigate(`/admin/edit-startups?id=${startup.id}`)}
                              className="ml-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition font-medium"
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

              {/* My YES Votes Tab */}
              {activeTab === 'myvotes' && (
                <div>
                  <h2 className="text-2xl font-bold text-orange-600 mb-6">⭐ My YES Votes</h2>
                  
                  {myYesVotes.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🗳️</div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">No votes yet!</h3>
                      <p className="text-slate-600 mb-6">
                        Start voting on startups to see them here
                      </p>
                      <button
                        onClick={() => navigate('/vote')}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold rounded-lg transition shadow-lg"
                      >
                        Go to Vote Page
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 text-slate-700 font-medium">
                        You've voted YES on {myYesVotes.length} startup{myYesVotes.length !== 1 ? 's' : ''}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
                        {myYesVotes.map((vote) => {
                          const startup = startupData.find(s => s.id === vote.id);
                          if (!startup) return null;
                          
                          return (
                            <StartupCardOfficial
                              key={vote.id}
                              startup={startup}
                              onVote={() => {
                                // Reload votes after removal
                                loadMyVotes();
                              }}
                            />
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Pending Tab */}
              {activeTab === 'pending' && (
                <div>
                  <h2 className="text-2xl font-bold text-orange-600 mb-6">
                    Pending Approval ({pendingStartups.length})
                  </h2>
                  <div className="space-y-4">
                    {pendingStartups.length === 0 ? (
                      <div className="text-center py-12 text-slate-600">
                        <div className="text-5xl mb-4">✅</div>
                        <div className="text-xl">No pending startups. Great job!</div>
                      </div>
                    ) : (
                      pendingStartups.map((startup) => (
                        <div
                          key={startup.id}
                          className="bg-white rounded-lg p-6 border-2 border-orange-200 shadow-sm"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-slate-800 mb-2">
                                {startup.name}
                              </h3>
                              <p className="text-slate-600 mb-3">
                                {startup.pitch || startup.description || 'No description provided'}
                              </p>
                              {startup.website && (
                                <a
                                  href={startup.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-orange-600 hover:text-orange-700 text-sm underline font-medium"
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
                    <h2 className="text-2xl font-bold text-orange-600">
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
                        className="bg-white hover:bg-slate-50 rounded-lg p-4 border-2 border-slate-200 transition cursor-pointer shadow-sm"
                        onClick={() => navigate(`/admin/edit-startups?id=${startup.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="text-lg font-semibold text-slate-800">
                                {startup.name}
                              </h4>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  startup.status === 'approved'
                                    ? 'bg-green-100 text-green-700 border border-green-300'
                                    : startup.status === 'pending'
                                    ? 'bg-amber-100 text-orange-700 border border-orange-300'
                                    : 'bg-red-100 text-red-700 border border-red-300'
                                }`}
                              >
                                {startup.status}
                              </span>
                            </div>
                          </div>
                          <div className="text-slate-600 text-sm font-medium">
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
                <div className="text-center py-12 text-slate-600">
                  <div className="text-5xl mb-4">💼</div>
                  <div className="text-xl mb-2 text-slate-800 font-semibold">Investor Management</div>
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
