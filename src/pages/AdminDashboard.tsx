import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import StartupCardOfficial from '../components/StartupCardOfficial';
import HamburgerMenu from '../components/HamburgerMenu';
import NewsUpdate from '../components/NewsUpdate';
import AdminNavBar from '../components/AdminNavBar';
import startupData from '../data/startupData';
import { generateRecentActivities } from '../utils/activityGenerator';

interface MatchMetric {
  totalMatches: number;
  avgScore: number;
  topMatch: number;
  activeStartups: number;
}

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
  const [activeTab, setActiveTab] = useState<'overview' | 'god' | 'analytics' | 'pending' | 'all'>('overview');
  const [matchMetrics, setMatchMetrics] = useState<MatchMetric>({
    totalMatches: 0,
    avgScore: 0,
    topMatch: 0,
    activeStartups: 0
  });

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
      
      // Load GOD algorithm metrics
      await loadGODMetrics(approved);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadGODMetrics = async (approvedStartups: any[]) => {
    try {
      // Calculate match metrics
      const startupsWithScores = approvedStartups.filter(s => s.total_god_score);
      const totalMatches = startupsWithScores.length;
      const avgScore = totalMatches > 0 
        ? startupsWithScores.reduce((sum, s) => sum + (s.total_god_score || 0), 0) / totalMatches
        : 0;
      const topMatch = Math.max(...startupsWithScores.map(s => s.total_god_score || 0), 0);
      
      setMatchMetrics({
        totalMatches,
        avgScore: Math.round(avgScore),
        topMatch: Math.round(topMatch),
        activeStartups: approvedStartups.length
      });
    } catch (error) {
      console.error('Error loading GOD metrics:', error);
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
    <div className="min-h-screen bg-gradient-to-br from-[#0f0729] via-[#1a0f3a] to-[#2d1558] scrollbar-hide overflow-y-auto">
      {/* Navigation Bar */}
      <AdminNavBar currentPage="/admin/dashboard" />

      <div className="py-8 px-4">
      {/* Animated background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '3s'}}></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="group mb-6 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/50 transition-all flex items-center gap-2 text-gray-300 hover:text-white"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">Back to Home</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
            👑 Admin Dashboard
          </h1>
          <p className="text-xl text-gray-300">
            Manage startups, review GOD algorithm, and monitor matching analytics
          </p>
        </div>

        {/* Stats Overview - Modernized Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 backdrop-blur-xl rounded-2xl p-6 border-2 border-purple-500/50 shadow-2xl shadow-purple-500/20 hover:scale-105 transition-transform">
            <div className="text-4xl font-bold text-white mb-2">{stats.totalStartups}</div>
            <div className="text-purple-300 font-medium flex items-center gap-2">
              <span>🚀</span>
              <span>Total Startups</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 backdrop-blur-xl rounded-2xl p-6 border-2 border-orange-400/50 shadow-2xl shadow-orange-500/20 hover:scale-105 transition-transform">
            <div className="text-4xl font-bold text-white mb-2">{stats.pendingStartups}</div>
            <div className="text-orange-300 font-medium flex items-center gap-2">
              <span>⏳</span>
              <span>Pending Review</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-xl rounded-2xl p-6 border-2 border-green-400/50 shadow-2xl shadow-green-500/20 hover:scale-105 transition-transform">
            <div className="text-4xl font-bold text-white mb-2">{stats.approvedStartups}</div>
            <div className="text-green-300 font-medium flex items-center gap-2">
              <span>✅</span>
              <span>Approved</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-xl rounded-2xl p-6 border-2 border-cyan-400/50 shadow-2xl shadow-cyan-500/20 hover:scale-105 transition-transform">
            <div className="text-4xl font-bold text-white mb-2">{matchMetrics.avgScore}</div>
            <div className="text-cyan-300 font-medium flex items-center gap-2">
              <span>⚡</span>
              <span>Avg GOD Score</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Modernized */}
        <div className="flex gap-2 mb-6 bg-white/5 backdrop-blur-xl rounded-xl p-2 overflow-x-auto border border-white/10 shadow-xl">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-white/5'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => navigate('/admin/command-center')}
            className="flex-1 py-3 px-4 rounded-lg font-semibold transition whitespace-nowrap text-gray-300 hover:bg-white/5 hover:text-cyan-400"
          >
            🎯 Command Center
          </button>
          <button
            onClick={() => setActiveTab('god')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'god'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-white/5'
            }`}
          >
            🧠 GOD Algorithm
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-white/5'
            }`}
          >
            📈 Match Analytics
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-white/5'
            }`}
          >
            ⏳ Pending ({stats.pendingStartups})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-white/5'
            }`}
          >
            🚀 All Startups
          </button>
        </div>

        {/* Content Area - Modernized */}
        <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 backdrop-blur-xl rounded-3xl p-8 border-2 border-purple-500/50 shadow-2xl shadow-purple-500/30">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin text-6xl mb-4">⚡</div>
              <div className="text-white text-xl font-medium">Loading dashboard data...</div>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div>
                  <h2 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-6">Dashboard Overview</h2>
                  
                  {/* Pending Alert */}
                  {stats.pendingStartups > 0 && (
                    <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 backdrop-blur-sm rounded-xl p-6 mb-6 border-2 border-orange-400/50 shadow-lg shadow-orange-500/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-white mb-2">
                            🎯 {stats.pendingStartups} Startup{stats.pendingStartups > 1 ? 's' : ''} Awaiting Review
                          </h3>
                          <p className="text-gray-300 mb-4 font-medium">
                            New submissions need your approval before appearing on the platform
                          </p>
                          <div className="flex gap-3">
                            <button
                              onClick={() => setActiveTab('pending')}
                              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-lg transition shadow-lg"
                            >
                              👀 Review Now
                            </button>
                            <button
                              onClick={() => navigate('/admin/edit-startups')}
                              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition shadow-lg"
                            >
                              ✏️ Manage All
                            </button>
                          </div>
                        </div>
                        <div className="text-6xl">📋</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Quick Actions - Modernized */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <button
                      onClick={() => navigate('/admin/edit-startups')}
                      className="group bg-gradient-to-br from-orange-500/10 to-amber-500/10 backdrop-blur-sm rounded-xl p-6 border border-orange-400/30 hover:border-orange-400/50 transition-all hover:bg-orange-500/20"
                    >
                      <div className="text-4xl mb-3">✏️</div>
                      <div className="text-xl font-bold text-white mb-2">Edit & Approve</div>
                      <div className="text-sm text-gray-400">Manage all startups</div>
                    </button>
                    <button
                      onClick={() => navigate('/admin/bulk-import')}
                      className="group bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-sm rounded-xl p-6 border border-purple-400/30 hover:border-purple-400/50 transition-all hover:bg-purple-500/20"
                    >
                      <div className="text-4xl mb-3">🚀</div>
                      <div className="text-xl font-bold text-white mb-2">Bulk Import</div>
                      <div className="text-sm text-gray-400">Import with AI</div>
                    </button>
                    <button
                      onClick={() => navigate('/vote')}
                      className="group bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30 hover:border-cyan-400/50 transition-all hover:bg-cyan-500/20"
                    >
                      <div className="text-4xl mb-3">🗳️</div>
                      <div className="text-xl font-bold text-white mb-2">Vote Page</div>
                      <div className="text-sm text-gray-400">See live startups</div>
                    </button>
                  </div>

                  {/* Recent Startups */}
                  <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <span>📱</span>
                    Recent Submissions
                  </h3>
                  <div className="space-y-3">
                    {recentStartups.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        No startups found. Import some startups to get started!
                      </div>
                    ) : (
                      recentStartups.map((startup) => (
                        <div
                          key={startup.id}
                          className="bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-purple-400/50 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-lg font-semibold text-white">
                                  {startup.name}
                                </h4>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    startup.status === 'approved'
                                      ? 'bg-green-500/20 text-green-300 border border-green-400/50'
                                      : startup.status === 'pending'
                                      ? 'bg-orange-500/20 text-orange-300 border border-orange-400/50'
                                      : 'bg-gray-500/20 text-gray-300 border border-gray-400/50'
                                  }`}
                                >
                                  {startup.status}
                                </span>
                              </div>
                              <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                                {startup.description || 'No description'}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                <span>
                                  {new Date(startup.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => navigate(`/admin/edit-startups?id=${startup.id}`)}
                              className="ml-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg text-sm transition font-medium"
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

              {/* GOD Algorithm Tab */}
              {activeTab === 'god' && (
                <div>
                  <h2 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-6 flex items-center gap-3">
                    <span className="text-4xl">🧠</span>
                    GOD Algorithm Insights
                  </h2>
                  
                  {/* GOD Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                    <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-sm rounded-xl p-6 border-2 border-cyan-400/50 shadow-lg shadow-cyan-500/20">
                      <div className="flex items-center gap-4 mb-3">
                        <span className="text-4xl">⚡</span>
                        <div>
                          <div className="text-sm text-cyan-300 font-medium uppercase tracking-wide">Total Matches</div>
                          <div className="text-3xl font-bold text-white">{matchMetrics.totalMatches}</div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">Startups with GOD scores</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl p-6 border-2 border-purple-400/50 shadow-lg shadow-purple-500/20">
                      <div className="flex items-center gap-4 mb-3">
                        <span className="text-4xl">📊</span>
                        <div>
                          <div className="text-sm text-purple-300 font-medium uppercase tracking-wide">Avg Score</div>
                          <div className="text-3xl font-bold text-white">{matchMetrics.avgScore}</div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">Average matching quality</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 backdrop-blur-sm rounded-xl p-6 border-2 border-orange-400/50 shadow-lg shadow-orange-500/20">
                      <div className="flex items-center gap-4 mb-3">
                        <span className="text-4xl">🏆</span>
                        <div>
                          <div className="text-sm text-orange-300 font-medium uppercase tracking-wide">Top Score</div>
                          <div className="text-3xl font-bold text-white">{matchMetrics.topMatch}</div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">Highest GOD score</div>
                    </div>
                  </div>

                  {/* Algorithm Explanation */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
                    <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                      <span>🎯</span>
                      How GOD Algorithm Works
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 font-bold">1</div>
                        <div>
                          <h4 className="text-white font-semibold mb-1">Industry Alignment</h4>
                          <p className="text-gray-400 text-sm">Matches startup industries with investor focus sectors for maximum relevance</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 border border-purple-400/50 flex items-center justify-center text-purple-300 font-bold">2</div>
                        <div>
                          <h4 className="text-white font-semibold mb-1">Stage Compatibility</h4>
                          <p className="text-gray-400 text-sm">Ensures investor stage preferences align with startup funding stage</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 border border-orange-400/50 flex items-center justify-center text-orange-300 font-bold">3</div>
                        <div>
                          <h4 className="text-white font-semibold mb-1">Traction Metrics</h4>
                          <p className="text-gray-400 text-sm">Analyzes vote counts, engagement, and momentum signals</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 border border-green-400/50 flex items-center justify-center text-green-300 font-bold">4</div>
                        <div>
                          <h4 className="text-white font-semibold mb-1">Real-time Scoring</h4>
                          <p className="text-gray-400 text-sm">Continuously updates scores based on new data and community feedback</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action */}
                  <button
                    onClick={() => navigate('/matching-engine')}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <span>⚡</span>
                    <span>View Live Matching Engine</span>
                    <span>→</span>
                  </button>
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <div>
                  <h2 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-6 flex items-center gap-3">
                    <span className="text-4xl">📈</span>
                    Matching Analytics
                  </h2>
                  
                  {/* Performance Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl p-6 border-2 border-green-400/50 shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-white">Match Success Rate</h3>
                        <span className="text-3xl">✅</span>
                      </div>
                      <div className="text-5xl font-bold text-white mb-2">
                        {matchMetrics.totalMatches > 0 ? Math.round((stats.approvedStartups / matchMetrics.totalMatches) * 100) : 0}%
                      </div>
                      <p className="text-gray-400">Approved startups with matches</p>
                    </div>
                    <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-sm rounded-xl p-6 border-2 border-cyan-400/50 shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-white">Active Matches</h3>
                        <span className="text-3xl">🔥</span>
                      </div>
                      <div className="text-5xl font-bold text-white mb-2">{matchMetrics.activeStartups}</div>
                      <p className="text-gray-400">Live in matching pool</p>
                    </div>
                  </div>

                  {/* Score Distribution */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
                    <h3 className="text-2xl font-bold text-white mb-4">Score Distribution</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">High Match (85-100)</span>
                          <span className="text-green-400 font-bold">
                            {Math.round((matchMetrics.totalMatches * 0.3))} startups
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full" style={{width: '30%'}}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Medium Match (70-84)</span>
                          <span className="text-cyan-400 font-bold">
                            {Math.round((matchMetrics.totalMatches * 0.5))} startups
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full" style={{width: '50%'}}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Low Match (0-69)</span>
                          <span className="text-orange-400 font-bold">
                            {Math.round((matchMetrics.totalMatches * 0.2))} startups
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full" style={{width: '20%'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => navigate('/matching-engine')}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <span>🎯</span>
                      <span>View Matches</span>
                    </button>
                    <button
                      onClick={() => navigate('/vote')}
                      className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <span>🗳️</span>
                      <span>Vote on Startups</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Pending Tab */}
              {activeTab === 'pending' && (
                <div>
                  <h2 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-6">
                    Pending Approval ({pendingStartups.length})
                  </h2>
                  <div className="space-y-4">
                    {pendingStartups.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">✅</div>
                        <div className="text-xl text-white">No pending startups. Great job!</div>
                      </div>
                    ) : (
                      pendingStartups.map((startup) => (
                        <div
                          key={startup.id}
                          className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-orange-400/30 shadow-lg"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-white mb-2">
                                {startup.name}
                              </h3>
                              <p className="text-gray-300 mb-3">
                                {startup.pitch || startup.description || 'No description provided'}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleApprove(startup.id)}
                              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition"
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => navigate(`/admin/edit-startups?id=${startup.id}`)}
                              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition"
                            >
                              ✏️ Edit First
                            </button>
                            <button
                              onClick={() => handleReject(startup.id)}
                              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-medium transition"
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
                    <h2 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                      All Startups ({stats.totalStartups})
                    </h2>
                    <button
                      onClick={() => navigate('/admin/edit-startups')}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition"
                    >
                      Manage All →
                    </button>
                  </div>
                  <div className="space-y-3">
                    {recentStartups.map((startup) => (
                      <div
                        key={startup.id}
                        className="bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-purple-400/50 transition cursor-pointer"
                        onClick={() => navigate(`/admin/edit-startups?id=${startup.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="text-lg font-semibold text-white">
                                {startup.name}
                              </h4>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  startup.status === 'approved'
                                    ? 'bg-green-500/20 text-green-300 border border-green-400/50'
                                    : startup.status === 'pending'
                                    ? 'bg-orange-500/20 text-orange-300 border border-orange-400/50'
                                    : 'bg-red-500/20 text-red-300 border border-red-400/50'
                                }`}
                              >
                                {startup.status}
                              </span>
                            </div>
                          </div>
                          <div className="text-gray-400 text-sm font-medium">
                            {new Date(startup.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
