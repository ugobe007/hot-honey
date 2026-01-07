import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AdminNavBar from './AdminNavBar';
import {
  Activity, Zap, Database, TrendingUp, Clock, CheckCircle2,
  AlertCircle, RefreshCw, Rocket, Users, ArrowRight, Settings,
  BarChart3, Radio, Layers
} from 'lucide-react';

interface Stats {
  approvedStartups: number;
  pendingStartups: number;
  totalInvestors: number;
  totalMatches: number;
  recentActivity: number;
}

export default function AdminWorkflowDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [approved, pending, investors, matches] = await Promise.all([
          supabase.from('startup_uploads').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('startup_uploads').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('investors').select('*', { count: 'exact', head: true }),
          supabase.from('startup_investor_matches').select('*', { count: 'exact', head: true })
        ]);

        setStats({
          approvedStartups: approved.count || 0,
          pendingStartups: pending.count || 0,
          totalInvestors: investors.count || 0,
          totalMatches: matches.count || 0,
          recentActivity: 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <AdminNavBar currentPage="Workflow Dashboard" />
      <div className="pt-16 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Layers className="w-8 h-8 text-cyan-400" />
              Admin Workflow Dashboard
            </h1>
            <p className="text-gray-400 mt-1">Monitor and manage the entire Hot Money pipeline</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-3">
                <Rocket className="w-5 h-5 text-green-400" />
                <span className="text-gray-400 text-sm">Approved Startups</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats?.approvedStartups.toLocaleString()}</p>
            </div>

            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-5 h-5 text-yellow-400" />
                <span className="text-gray-400 text-sm">Pending Review</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats?.pendingStartups.toLocaleString()}</p>
            </div>

            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-5 h-5 text-purple-400" />
                <span className="text-gray-400 text-sm">Total Investors</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats?.totalInvestors.toLocaleString()}</p>
            </div>

            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                <span className="text-gray-400 text-sm">Total Matches</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats?.totalMatches.toLocaleString()}</p>
            </div>
          </div>

          {/* Pipeline Workflow */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-6">Pipeline Workflow</h2>
            <div className="flex items-center justify-between gap-4 overflow-x-auto pb-4">
              <div className="flex-shrink-0 text-center">
                <div className="w-16 h-16 bg-cyan-600/20 border border-cyan-500/50 rounded-xl flex items-center justify-center mb-2 mx-auto">
                  <Zap className="w-6 h-6 text-cyan-400" />
                </div>
                <p className="text-cyan-400 text-sm font-medium">Scrape</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-600 flex-shrink-0" />
              <div className="flex-shrink-0 text-center">
                <div className="w-16 h-16 bg-purple-500/20 border border-purple-500/50 rounded-xl flex items-center justify-center mb-2 mx-auto">
                  <Database className="w-6 h-6 text-purple-400" />
                </div>
                <p className="text-purple-400 text-sm font-medium">Enrich</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-600 flex-shrink-0" />
              <div className="flex-shrink-0 text-center">
                <div className="w-16 h-16 bg-green-500/20 border border-green-500/50 rounded-xl flex items-center justify-center mb-2 mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-green-400 text-sm font-medium">Approve</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-600 flex-shrink-0" />
              <div className="flex-shrink-0 text-center">
                <div className="w-16 h-16 bg-cyan-500/20 border border-cyan-500/50 rounded-xl flex items-center justify-center mb-2 mx-auto">
                  <Users className="w-6 h-6 text-cyan-400" />
                </div>
                <p className="text-cyan-400 text-sm font-medium">Match</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-600 flex-shrink-0" />
              <div className="flex-shrink-0 text-center">
                <div className="w-16 h-16 bg-pink-500/20 border border-pink-500/50 rounded-xl flex items-center justify-center mb-2 mx-auto">
                  <Rocket className="w-6 h-6 text-pink-400" />
                </div>
                <p className="text-pink-400 text-sm font-medium">Live</p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/admin/pipeline" className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-cyan-500/50 transition-all">
              <Radio className="w-6 h-6 text-cyan-400 mb-2" />
              <p className="text-white font-medium">Pipeline Monitor</p>
              <p className="text-gray-500 text-sm">Real-time view</p>
            </Link>

            <Link to="/admin/health" className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-green-500/50 transition-all">
              <Activity className="w-6 h-6 text-green-400 mb-2" />
              <p className="text-white font-medium">System Health</p>
              <p className="text-gray-500 text-sm">Diagnostics</p>
            </Link>

            <Link to="/admin/review" className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-yellow-500/50 transition-all">
              <Clock className="w-6 h-6 text-yellow-400 mb-2" />
              <p className="text-white font-medium">Review Queue</p>
              <p className="text-gray-500 text-sm">Pending items</p>
            </Link>

            <Link to="/admin/control" className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-purple-500/50 transition-all">
              <Settings className="w-6 h-6 text-purple-400 mb-2" />
              <p className="text-white font-medium">Control Center</p>
              <p className="text-gray-500 text-sm">All tools</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
