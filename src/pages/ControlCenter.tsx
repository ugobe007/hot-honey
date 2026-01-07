import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Settings, Database, Users, Rocket, Activity, Zap,
  BarChart3, Radio, Clock, CheckCircle2, RefreshCw,
  FileText, AlertCircle, TrendingUp
} from 'lucide-react';

interface Stats {
  startups: number;
  investors: number;
  matches: number;
  pending: number;
}

export default function ControlCenter() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [startups, investors, matches, pending] = await Promise.all([
          supabase.from('startup_uploads').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('investors').select('*', { count: 'exact', head: true }),
          supabase.from('startup_investor_matches').select('*', { count: 'exact', head: true }),
          supabase.from('startup_uploads').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        ]);

        setStats({
          startups: startups.count || 0,
          investors: investors.count || 0,
          matches: matches.count || 0,
          pending: pending.count || 0
        });
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const tools = [
    { name: 'Pipeline Monitor', icon: Radio, path: '/admin/pipeline', color: 'cyan', desc: 'Real-time pipeline view' },
    { name: 'System Health', icon: Activity, path: '/admin/health', color: 'green', desc: 'Diagnostics & status' },
    { name: 'Review Queue', icon: Clock, path: '/admin/review', color: 'yellow', desc: 'Pending startups' },
    { name: 'RSS Discoveries', icon: Zap, path: '/admin/discovered-startups', color: 'cyan', desc: 'Scraped data' },
    { name: 'RSS Manager', icon: Database, path: '/admin/rss-manager', color: 'purple', desc: 'Feed sources' },
    { name: 'Edit Startups', icon: Rocket, path: '/admin/edit-startups', color: 'pink', desc: 'Modify startup data' },
    { name: 'Investors', icon: Users, path: '/admin/discovered-investors', color: 'blue', desc: 'Investor database' },
    { name: 'Analytics', icon: BarChart3, path: '/admin/analytics', color: 'indigo', desc: 'Data insights' },
    { name: 'GOD Scores', icon: TrendingUp, path: '/admin/god-scores', color: 'red', desc: 'Score management' },
    { name: 'AI Logs', icon: FileText, path: '/admin/ai-logs', color: 'gray', desc: 'System events' },
    { name: 'Bulk Import', icon: Database, path: '/admin/bulk-import', color: 'teal', desc: 'Mass data upload' },
    { name: 'Instructions', icon: AlertCircle, path: '/admin/instructions', color: 'blue', desc: 'Help guide' },
  ];

  const colorMap: Record<string, string> = {
    cyan: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400',
    green: 'bg-green-500/20 border-green-500/50 text-green-400',
    yellow: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
    orange: 'bg-cyan-600/20 border-cyan-500/50 text-cyan-400',
    purple: 'bg-purple-500/20 border-purple-500/50 text-purple-400',
    pink: 'bg-pink-500/20 border-pink-500/50 text-pink-400',
    blue: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
    indigo: 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400',
    red: 'bg-red-500/20 border-red-500/50 text-red-400',
    gray: 'bg-gray-500/20 border-gray-500/50 text-gray-400',
    teal: 'bg-teal-500/20 border-teal-500/50 text-teal-400',
    amber: 'bg-cyan-500/20 border-cyan-500/50 text-blue-400',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Settings className="w-8 h-8 text-cyan-400" />
              Control Center
            </h1>
            <p className="text-gray-400 mt-1">All admin tools in one place</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats?.startups.toLocaleString()}</p>
              <p className="text-gray-400 text-sm">Startups</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats?.investors.toLocaleString()}</p>
              <p className="text-gray-400 text-sm">Investors</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats?.matches.toLocaleString()}</p>
              <p className="text-gray-400 text-sm">Matches</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">{stats?.pending}</p>
              <p className="text-gray-400 text-sm">Pending</p>
            </div>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tools.map((tool) => (
              <Link
                key={tool.path}
                to={tool.path}
                className={`p-4 rounded-xl border ${colorMap[tool.color]} hover:scale-[1.02] transition-all`}
              >
                <tool.icon className="w-6 h-6 mb-2" />
                <p className="text-white font-medium">{tool.name}</p>
                <p className="text-gray-500 text-sm">{tool.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
