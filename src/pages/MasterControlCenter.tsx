import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface QuickStat {
  label: string;
  value: number | string;
  color: string;
}

interface ToolRow {
  id: string;
  name: string;
  description: string;
  route: string;
  category: 'primary' | 'data' | 'tools' | 'admin';
  status?: 'active' | 'legacy' | 'new';
}

export default function MasterControlCenter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<QuickStat[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const tools: ToolRow[] = [
    // PRIMARY DASHBOARDS
    { id: 'workflow', name: 'Workflow Dashboard', description: 'Main pipeline view - startups, investors, AI, matching', route: '/admin/dashboard', category: 'primary', status: 'active' },
    { id: 'operations', name: 'Operations Center', description: 'System operations and quick actions', route: '/admin/operations', category: 'primary', status: 'active' },
    { id: 'analytics', name: 'Admin Analytics', description: 'Data quality, enrichment tools, operational metrics', route: '/admin/analytics', category: 'primary', status: 'new' },
    { id: 'agent', name: 'AI Agent Dashboard', description: 'Monitor AI agent, watchdog, system health', route: '/admin/agent', category: 'primary', status: 'new' },
    { id: 'ml', name: 'ML Dashboard', description: 'Machine learning, recommendations, training', route: '/admin/ml-dashboard', category: 'primary', status: 'active' },
    { id: 'ai-intelligence', name: 'AI Intelligence', description: 'AI analysis and insights', route: '/admin/ai-intelligence', category: 'primary', status: 'active' },

    // DATA MANAGEMENT
    { id: 'discovered', name: 'Discovered Startups', description: 'Startups scraped from RSS - pending review', route: '/admin/discovered-startups', category: 'data', status: 'active' },
    { id: 'edit-startups', name: 'Edit Startups', description: 'Manage all startups - approve, edit, bulk actions', route: '/admin/edit-startups', category: 'data', status: 'active' },
    { id: 'investors', name: 'Investor Directory', description: 'View, search, edit investor profiles', route: '/investors', category: 'data', status: 'active' },
    { id: 'investor-enrichment', name: 'Investor Enrichment', description: 'Track investor discovery & enrichment status', route: '/admin/investor-enrichment', category: 'data', status: 'new' },
    { id: 'rss', name: 'RSS Manager', description: 'Manage RSS feeds for startup discovery', route: '/admin/rss-manager', category: 'data', status: 'active' },
    { id: 'market-trends', name: 'Market Trends', description: 'Sector analysis, supply/demand, top performers', route: '/market-trends', category: 'data', status: 'active' },

    // TOOLS & ACTIONS
    { id: 'review', name: 'Review Queue', description: 'Review pending startup submissions', route: '/admin/review', category: 'tools', status: 'active' },
    { id: 'bulk-import', name: 'Bulk Import', description: 'Upload multiple startups from spreadsheet', route: '/admin/bulk-import', category: 'tools', status: 'active' },
    { id: 'add-investor', name: 'Add Investor', description: 'Quickly add new investor with AI research', route: '/invite-investor', category: 'tools', status: 'active' },
    { id: 'god-scores', name: 'GOD Scores', description: 'View and manage GOD algorithm scores', route: '/admin/god-scores', category: 'tools', status: 'active' },
    { id: 'ai-logs', name: 'AI Logs', description: 'View AI processing logs and history', route: '/admin/ai-logs', category: 'tools', status: 'active' },
    { id: 'matching', name: 'Matching Engine', description: 'Run AI-powered startup-investor matching', route: '/matching', category: 'tools', status: 'active' },

    // ADMIN & SETUP
    { id: 'setup', name: 'Database Setup', description: 'Initial setup, seed data, manage duplicates', route: '/admin/setup', category: 'admin', status: 'active' },
    { id: 'diagnostic', name: 'Diagnostic', description: 'System health check and troubleshooting', route: '/admin/diagnostic', category: 'admin', status: 'active' },
    { id: 'metrics', name: 'Public Metrics', description: 'Public-facing metrics dashboard', route: '/metrics', category: 'admin', status: 'active' },
    { id: 'instructions', name: 'Instructions', description: 'Admin help and documentation', route: '/admin/instructions', category: 'admin', status: 'active' }
  ];

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [startupsRes, investorsRes, discoveredRes, matchesRes] = await Promise.all([
        supabase.from('startup_uploads').select('id, status'),
        supabase.from('investors').select('id'),
        supabase.from('discovered_startups').select('id, imported_to_startups'),
        supabase.from('startup_investor_matches').select('id')
      ]);

      const startups = startupsRes.data || [];
      const investors = investorsRes.data || [];
      const discovered = discoveredRes.data || [];
      const matches = matchesRes.data || [];

      setStats([
        { label: 'Startups', value: startups.length, color: 'orange' },
        { label: 'Investors', value: investors.length, color: 'violet' },
        { label: 'Matches', value: matches.length.toLocaleString(), color: 'green' },
        { label: 'Pending Review', value: discovered.filter(d => !d.imported_to_startups).length, color: 'yellow' }
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Error loading stats:', error);
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', label: 'All Tools' },
    { id: 'primary', label: 'Dashboards' },
    { id: 'data', label: 'Data Management' },
    { id: 'tools', label: 'Tools & Actions' },
    { id: 'admin', label: 'Admin & Setup' }
  ];

  const filteredTools = selectedCategory === 'all' 
    ? tools 
    : tools.filter(t => t.category === selectedCategory);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'primary': return 'text-purple-400';
      case 'data': return 'text-cyan-400';
      case 'tools': return 'text-orange-400';
      case 'admin': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 pt-4">
      {/* Page Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 sticky top-0 z-30">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 pl-20">
            <h1 className="text-xl font-bold text-white">🎛️ Admin Control Center</h1>
          </div>
          <button onClick={loadStats} className="text-gray-400 hover:text-white p-2">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-4 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 text-xs">
          {stats.map((stat, i) => (
            <div key={i} className="bg-gray-800/50 rounded-lg px-4 py-3 border border-gray-700">
              <div className={`text-2xl font-bold font-mono ${stat.color === 'orange' ? 'text-orange-400' : stat.color === 'violet' ? 'text-violet-400' : stat.color === 'green' ? 'text-green-400' : 'text-yellow-400'}`}>
                {stat.value}
              </div>
              <div className="text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Category Tabs - Minimal */}
        <div className="flex gap-2 text-xs border-b border-gray-800 pb-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded transition-all ${
                selectedCategory === cat.id
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Tools Table */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Tool</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Description</th>
                <th className="text-center px-4 py-3 text-gray-400 font-medium">Category</th>
                <th className="text-center px-4 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTools.map((tool) => (
                <tr 
                  key={tool.id} 
                  className="border-t border-gray-700/50 hover:bg-gray-700/30 cursor-pointer"
                  onClick={() => navigate(tool.route)}
                >
                  <td className="px-4 py-3">
                    <Link to={tool.route} className="text-white font-medium hover:text-orange-400 flex items-center gap-2">
                      {tool.name}
                      {tool.status === 'new' && (
                        <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded uppercase">New</span>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{tool.description}</td>
                  <td className={`px-4 py-3 text-center ${getCategoryColor(tool.category)}`}>
                    {tool.category === 'primary' ? '📊 Dashboard' : 
                     tool.category === 'data' ? '📁 Data' : 
                     tool.category === 'tools' ? '🛠️ Tool' : 
                     '⚙️ Admin'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">Active</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link 
                      to={tool.route} 
                      className="text-orange-400 hover:text-orange-300 flex items-center gap-1 justify-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick Links */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">⚡ Quick Navigation</h3>
          <div className="grid grid-cols-6 gap-3 text-xs">
            <Link to="/matching" className="px-3 py-2 bg-orange-500/20 border border-orange-500/30 rounded text-orange-400 hover:bg-orange-500/30 text-center">
              🔥 Matching Engine
            </Link>
            <Link to="/admin/analytics" className="px-3 py-2 bg-violet-500/20 border border-violet-500/30 rounded text-violet-400 hover:bg-violet-500/30 text-center">
              📊 Analytics
            </Link>
            <Link to="/market-trends" className="px-3 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-500/30 text-center">
              📈 Market Trends
            </Link>
            <Link to="/investors" className="px-3 py-2 bg-green-500/20 border border-green-500/30 rounded text-green-400 hover:bg-green-500/30 text-center">
              💰 Investors
            </Link>
            <Link to="/startups" className="px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-500/30 text-center">
              🚀 Startups
            </Link>
            <Link to="/admin/bulk-import" className="px-3 py-2 bg-amber-500/20 border border-amber-500/30 rounded text-amber-400 hover:bg-amber-500/30 text-center">
              📤 Bulk Import
            </Link>
          </div>
        </div>

        {/* All Admin Routes Reference */}
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
          <h3 className="text-xs font-semibold text-gray-500 mb-2">All Routes</h3>
          <div className="flex flex-wrap gap-2 text-[10px]">
            {tools.map(t => (
              <Link key={t.id} to={t.route} className="text-gray-500 hover:text-orange-400">
                {t.route}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
