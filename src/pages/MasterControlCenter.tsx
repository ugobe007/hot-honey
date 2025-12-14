import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Home, Database, Users, Briefcase, Brain, Zap, Activity, 
  Settings, FileText, TrendingUp, Rss, Upload, Eye, Play,
  BarChart3, Target, Search, CheckCircle, Clock, Wrench, RefreshCw, ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface QuickStat {
  label: string;
  value: number | string;
  change?: string;
  icon: any;
  color: string;
}

interface ToolCard {
  id: string;
  name: string;
  description: string;
  icon: any;
  route: string;
  category: 'primary' | 'data' | 'tools' | 'admin';
  color: string;
  status?: 'active' | 'legacy' | 'new';
}

export default function MasterControlCenter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<QuickStat[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const tools: ToolCard[] = [
    // PRIMARY DASHBOARDS
    {
      id: 'workflow',
      name: 'Workflow Dashboard',
      description: 'Main pipeline view - startups, investors, AI, matching',
      icon: Activity,
      route: '/admin/dashboard',
      category: 'primary',
      color: 'purple',
      status: 'active'
    },
    {
      id: 'operations',
      name: 'Operations Center',
      description: 'System operations and quick actions',
      icon: Target,
      route: '/admin/operations',
      category: 'primary',
      color: 'cyan',
      status: 'active'
    },
    {
      id: 'ml',
      name: 'ML Dashboard',
      description: 'Machine learning, recommendations, training',
      icon: Brain,
      route: '/admin/ml-dashboard',
      category: 'primary',
      color: 'purple',
      status: 'active'
    },
    {
      id: 'ai-intelligence',
      name: 'AI Intelligence',
      description: 'AI analysis and insights',
      icon: Zap,
      route: '/admin/ai-intelligence',
      category: 'primary',
      color: 'yellow',
      status: 'active'
    },

    // DATA MANAGEMENT
    {
      id: 'discovered',
      name: 'Discovered Startups',
      description: '421 startups scraped from RSS - pending review',
      icon: Search,
      route: '/admin/discovered-startups',
      category: 'data',
      color: 'orange',
      status: 'active'
    },
    {
      id: 'edit-startups',
      name: 'Edit Startups',
      description: 'Manage all startups - approve, edit, bulk actions',
      icon: FileText,
      route: '/admin/edit-startups',
      category: 'data',
      color: 'blue',
      status: 'active'
    },
    {
      id: 'investors',
      name: 'Investor Directory',
      description: '166 investors - view, search, edit profiles',
      icon: Users,
      route: '/investors',
      category: 'data',
      color: 'cyan',
      status: 'active'
    },
    {
      id: 'investor-enrichment',
      name: 'Investor Enrichment',
      description: 'NEW: Track investor discovery & enrichment status',
      icon: TrendingUp,
      route: '/admin/investor-enrichment',
      category: 'data',
      color: 'green',
      status: 'new'
    },
    {
      id: 'rss',
      name: 'RSS Manager',
      description: 'Manage RSS feeds for startup discovery',
      icon: Rss,
      route: '/admin/rss-manager',
      category: 'data',
      color: 'blue',
      status: 'active'
    },

    // TOOLS & ACTIONS
    {
      id: 'review',
      name: 'Review Queue',
      description: 'Review pending startup submissions',
      icon: CheckCircle,
      route: '/admin/review',
      category: 'tools',
      color: 'green',
      status: 'active'
    },
    {
      id: 'bulk-import',
      name: 'Bulk Import',
      description: 'Upload multiple startups from spreadsheet',
      icon: Upload,
      route: '/admin/bulk-import',
      category: 'tools',
      color: 'orange',
      status: 'active'
    },
    {
      id: 'add-investor',
      name: 'Add Investor',
      description: 'Quickly add new investor with AI research',
      icon: Users,
      route: '/invite-investor',
      category: 'tools',
      color: 'green',
      status: 'active'
    },
    {
      id: 'god-scores',
      name: 'GOD Scores',
      description: 'View and manage GOD algorithm scores',
      icon: Zap,
      route: '/admin/god-scores',
      category: 'tools',
      color: 'yellow',
      status: 'active'
    },
    {
      id: 'ai-logs',
      name: 'AI Logs',
      description: 'View AI processing logs and history',
      icon: Eye,
      route: '/admin/ai-logs',
      category: 'tools',
      color: 'purple',
      status: 'active'
    },

    // ADMIN & SETUP
    {
      id: 'setup',
      name: 'Database Setup',
      description: 'Initial setup, seed data, manage duplicates',
      icon: Database,
      route: '/admin/setup',
      category: 'admin',
      color: 'gray',
      status: 'active'
    },
    {
      id: 'diagnostic',
      name: 'Diagnostic',
      description: 'System health check and troubleshooting',
      icon: Wrench,
      route: '/admin/diagnostic',
      category: 'admin',
      color: 'gray',
      status: 'active'
    },
    {
      id: 'metrics',
      name: 'Public Metrics',
      description: 'Public-facing metrics dashboard',
      icon: BarChart3,
      route: '/metrics',
      category: 'admin',
      color: 'blue',
      status: 'active'
    },
    {
      id: 'instructions',
      name: 'Instructions',
      description: 'Admin help and documentation',
      icon: FileText,
      route: '/admin/instructions',
      category: 'admin',
      color: 'gray',
      status: 'active'
    }
  ];

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [startupsRes, investorsRes, discoveredRes, aiLogsRes] = await Promise.all([
        supabase.from('startup_uploads').select('id, status'),
        supabase.from('investors').select('id, last_enrichment_date, partners'),
        supabase.from('discovered_startups').select('id, imported_to_startups'),
        supabase.from('ai_logs').select('id, status')
      ]);

      const startups = startupsRes.data || [];
      const investors = investorsRes.data || [];
      const discovered = discoveredRes.data || [];
      const aiLogs = aiLogsRes.data || [];

      setStats([
        {
          label: 'Total Startups',
          value: startups.length,
          change: '+12 this week',
          icon: Briefcase,
          color: 'orange'
        },
        {
          label: 'Total Investors',
          value: investors.length,
          change: `${investors.filter(i => i.partners).length} enriched`,
          icon: Users,
          color: 'cyan'
        },
        {
          label: 'Pending Discovery',
          value: discovered.filter(d => !d.imported_to_startups).length,
          change: 'Need review',
          icon: Search,
          color: 'purple'
        },
        {
          label: 'AI Operations',
          value: aiLogs.length,
          change: `${aiLogs.filter(l => l.status === 'running').length} running`,
          icon: Brain,
          color: 'green'
        }
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Error loading stats:', error);
      setLoading(false);
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; hover: string }> = {
      orange: { bg: 'from-orange-600/40 to-amber-600/40', border: 'border-orange-400/70', text: 'text-orange-300', hover: 'hover:border-orange-300' },
      cyan: { bg: 'from-cyan-600/40 to-blue-500/40', border: 'border-cyan-400/70', text: 'text-cyan-300', hover: 'hover:border-cyan-300' },
      purple: { bg: 'from-purple-600/40 to-indigo-600/40', border: 'border-purple-400/70', text: 'text-purple-300', hover: 'hover:border-purple-300' },
      blue: { bg: 'from-blue-500/40 to-cyan-500/40', border: 'border-blue-400/70', text: 'text-blue-300', hover: 'hover:border-blue-300' },
      green: { bg: 'from-emerald-600/40 to-green-600/40', border: 'border-emerald-400/70', text: 'text-emerald-300', hover: 'hover:border-emerald-300' },
      yellow: { bg: 'from-yellow-500/40 to-amber-500/40', border: 'border-yellow-400/70', text: 'text-yellow-300', hover: 'hover:border-yellow-300' },
      gray: { bg: 'from-slate-600/40 to-gray-600/40', border: 'border-slate-400/70', text: 'text-slate-300', hover: 'hover:border-slate-300' }
    };
    return colors[color] || colors.orange;
  };

  const categories = [
    { id: 'all', label: 'All Tools', icon: Home },
    { id: 'primary', label: 'Dashboards', icon: BarChart3 },
    { id: 'data', label: 'Data Management', icon: Database },
    { id: 'tools', label: 'Tools & Actions', icon: Wrench },
    { id: 'admin', label: 'Admin & Setup', icon: Settings }
  ];

  const filteredTools = selectedCategory === 'all' 
    ? tools 
    : tools.filter(t => t.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1140] via-[#2d1b69] to-[#4a2a8f] relative overflow-hidden">
      {/* Navigation Bar */}
      <div className="bg-white/5 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-center gap-2 text-sm">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white transition-all">← Back</button>
          <span className="text-gray-600">|</span>
          <Link to="/" className="text-gray-400 hover:text-white transition-all">🏠 Home</Link>
          <span className="text-gray-600">|</span>
          <Link to="/admin/dashboard" className="text-gray-400 hover:text-white transition-all">📊 Workflow</Link>
          <span className="text-gray-600">|</span>
          <Link to="/admin/operations" className="text-gray-400 hover:text-white transition-all">🎛️ Operations</Link>
          <span className="text-gray-600">|</span>
          <Link to="/bulkupload" className="text-gray-400 hover:text-white transition-all">📤 Bulk Upload</Link>
          <span className="text-gray-600">|</span>
          <Link to="/admin/startups" className="text-gray-400 hover:text-white transition-all">🚀 Startups</Link>
          <span className="text-gray-600">|</span>
          <Link to="/admin/investors" className="text-gray-400 hover:text-white transition-all">👥 Investors</Link>
          <span className="text-gray-600">|</span>
          <Link to="/admin/investor-enrichment" className="text-gray-400 hover:text-white transition-all">🔄 Enrichment</Link>
          <span className="text-gray-600">|</span>
          <Link to="/vote" className="text-orange-400 hover:text-orange-300 transition-all font-bold">⚡ Match</Link>
        </div>
      </div>

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="relative z-10 container mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-5xl font-bold text-white mb-3">
                Admin <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">Control Center</span>
              </h1>
              <p className="text-gray-300 text-lg">Direct access to all Hot Money tools and operations</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-lg transition-all shadow-lg"
              >
                <Home className="w-5 h-5" />
                HOME
              </button>
              <button
                onClick={loadStats}
                className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-gradient-to-br from-gray-900/80 to-orange-900/50 backdrop-blur-lg border-2 border-orange-500/30 rounded-3xl p-8 shadow-2xl mb-12">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-8 h-8 text-orange-400" />
            <h2 className="text-3xl font-bold text-white">System Overview</h2>
          </div>
          <div className="grid grid-cols-4 gap-6">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="w-6 h-6 text-orange-400" />
                    <h3 className="text-gray-300 text-sm uppercase tracking-wide">{stat.label}</h3>
                  </div>
                  <div className="text-4xl font-bold text-white mb-1">{stat.value}</div>
                  {stat.change && <div className="text-sm text-gray-400">{stat.change}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all whitespace-nowrap border-2 ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-lg'
                    : 'bg-gray-800/50 text-gray-300 border-gray-600 hover:bg-gray-700/50 hover:border-gray-500'
                }`}
              >
                <Icon className="w-5 h-5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-3 gap-6">
          {filteredTools.map(tool => {
            const Icon = tool.icon;
            const colors = getColorClasses(tool.color);
            return (
              <button
                key={tool.id}
                onClick={() => navigate(tool.route)}
                className={`bg-gradient-to-br ${colors.bg} backdrop-blur-lg border-2 ${colors.border} rounded-xl p-6 hover:scale-105 transition-all text-left group shadow-lg`}
              >
                {tool.status === 'new' && (
                  <div className="absolute top-4 right-4 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full uppercase">
                    NEW
                  </div>
                )}

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-black/30 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <Icon className={`w-6 h-6 ${colors.text}`} />
                  </div>
                  <h3 className="text-white font-bold text-xl">
                    {tool.name}
                  </h3>
                </div>

                <p className="text-gray-300 text-sm mb-4">
                  {tool.description}
                </p>

                <div className="flex items-center gap-2 text-orange-400 font-bold text-sm group-hover:gap-3 transition-all">
                  <span>Launch</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Access */}
        <div className="mt-12 bg-gradient-to-br from-gray-900/80 to-amber-900/50 backdrop-blur-lg border-2 border-amber-500/30 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-8 h-8 text-amber-400" />
            <h2 className="text-3xl font-bold text-white">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/matching')}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg"
            >
              🔥 Matching Engine
            </button>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg"
            >
              📊 Workflow Dashboard
            </button>
            <button
              onClick={() => navigate('/investors')}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg"
            >
              💰 View Investors
            </button>
            <button
              onClick={() => navigate('/startups')}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg"
            >
              🚀 Browse Startups
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
