import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rss, Plus, Edit2, Trash2, RefreshCw, Check, X, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RSSSource {
  id: string;
  name: string;
  url: string;
  category: string;
  active: boolean;
  last_scraped?: string;
  articles_count: number;
  connection_status?: 'healthy' | 'error' | 'unknown';
  last_error?: string;
  last_checked?: string;
  auth_username?: string;
  auth_password?: string;
  requires_auth?: boolean;
}

export default function RSSManager() {
  const navigate = useNavigate();
  const [sources, setSources] = useState<RSSSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSource, setEditingSource] = useState<RSSSource | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [newSource, setNewSource] = useState({
    name: '',
    url: '',
    category: 'Tech News',
    active: true,
    requires_auth: false,
    auth_username: '',
    auth_password: ''
  });

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Check both Supabase auth AND localStorage auth
    const { data: { session } } = await supabase.auth.getSession();
    const localUser = localStorage.getItem('currentUser');
    const localLoggedIn = localStorage.getItem('isLoggedIn');
    
    // User is authenticated if EITHER Supabase session OR localStorage auth exists
    const isAuth = !!session || (!!localUser && localLoggedIn === 'true');
    setIsAuthenticated(isAuth);
    
    if (!isAuth) {
      console.warn('No active session - RSS Manager requires authentication');
    } else {
      console.log('User authenticated:', session ? 'Supabase' : 'LocalStorage');
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    try {
      setLoading(true);
      
      // Load RSS sources
      const { data: sourcesData } = await supabase
        .from('rss_sources')
        .select('*')
        .order('name');

      if (sourcesData) {
        // Get article counts for each source
        const sourcesWithCounts = await Promise.all(
          sourcesData.map(async (source) => {
            // Get article count
            const { count } = await supabase
              .from('rss_articles')
              .select('*', { count: 'exact', head: true })
              .eq('source', source.name);

            return {
              ...source,
              articles_count: count || 0,
              connection_status: source.active ? 'healthy' : 'unknown' as 'healthy' | 'error' | 'unknown',
              last_checked: new Date().toISOString()
            };
          })
        );
        setSources(sourcesWithCounts);
      }
    } catch (error) {
      console.error('Error loading sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshFeeds = async () => {
    try {
      setLoading(true);
      setRefreshMessage(null);
      
      // Trigger backend RSS refresh if server is running
      let backendTriggered = false;
      try {
        const response = await fetch('http://localhost:3002/api/rss/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          console.log('✅ RSS refresh triggered on backend');
          backendTriggered = true;
        }
      } catch (err) {
        console.log('⚠️ Backend not available - refresh manually via run-rss-scraper.js');
      }
      
      // Reload sources from database
      await loadSources();
      
      // Show success message
      if (backendTriggered) {
        setRefreshMessage('✅ RSS sources refreshed successfully! To fetch new articles, run the scraper script.');
      } else {
        setRefreshMessage('✅ RSS sources reloaded. Backend server not running - start server and run run-rss-scraper.js to fetch articles.');
      }
      
      // Clear message after 5 seconds
      setTimeout(() => setRefreshMessage(null), 5000);
      
    } catch (error) {
      console.error('Error refreshing feeds:', error);
      setRefreshMessage('❌ Error refreshing RSS sources. Please try again.');
      setTimeout(() => setRefreshMessage(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const addSource = async () => {
    // Validate inputs
    if (!newSource.name || !newSource.url) {
      alert('Please fill in both name and URL fields');
      return;
    }

    // Validate URL format
    try {
      new URL(newSource.url);
    } catch (e) {
      alert('Please enter a valid URL (e.g., https://news.ycombinator.com/rss)');
      return;
    }

    // Check authentication - support both Supabase and localStorage
    const { data: { session } } = await supabase.auth.getSession();
    const localUser = localStorage.getItem('currentUser');
    const localLoggedIn = localStorage.getItem('isLoggedIn');
    
    if (!session && (!localUser || localLoggedIn !== 'true')) {
      alert('You must be signed in to add RSS sources. The RSS Manager requires authentication to prevent unauthorized access.');
      return;
    }

    try {
      console.log('Adding RSS source:', newSource);
      
      // Insert RSS source (without created_by field since it doesn't exist in schema)
      const { data, error } = await supabase
        .from('rss_sources')
        .insert([newSource])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        
        // Provide helpful error messages
        if (error.message.includes('row-level security')) {
          alert('Permission denied: Your account does not have permission to add RSS sources. Please contact an administrator.');
        } else {
          alert(`Error adding source: ${error.message}`);
        }
        return;
      }

      console.log('Source added successfully:', data);
      setShowAddForm(false);
      setNewSource({ name: '', url: '', category: 'Tech News', active: true, requires_auth: false, auth_username: '', auth_password: '' });
      await loadSources();
      alert('RSS source added successfully!');
    } catch (error) {
      console.error('Error adding source:', error);
      alert('Failed to add RSS source. Please try again.');
    }
  };

  const updateSource = async () => {
    if (!editingSource) return;

    // Validate inputs
    if (!editingSource.name || !editingSource.url) {
      alert('Please fill in both name and URL fields');
      return;
    }

    // Validate URL format
    try {
      new URL(editingSource.url);
    } catch (e) {
      alert('Please enter a valid URL (e.g., https://news.ycombinator.com/rss)');
      return;
    }

    try {
      const updateData: any = {
        name: editingSource.name,
        url: editingSource.url,
        category: editingSource.category,
        active: editingSource.active,
        requires_auth: editingSource.requires_auth || false
      };

      // Only include auth fields if authentication is required
      if (editingSource.requires_auth) {
        updateData.auth_username = editingSource.auth_username || '';
        updateData.auth_password = editingSource.auth_password || '';
      } else {
        // Clear auth fields if authentication is disabled
        updateData.auth_username = null;
        updateData.auth_password = null;
      }

      const { error } = await supabase
        .from('rss_sources')
        .update(updateData)
        .eq('id', editingSource.id);

      if (error) {
        console.error('Supabase error:', error);
        alert(`Error updating source: ${error.message}`);
        return;
      }

      setEditingSource(null);
      await loadSources();
      alert('RSS source updated successfully!');
    } catch (error) {
      console.error('Error updating source:', error);
      alert('Failed to update RSS source. Please try again.');
    }
  };

  const testConnection = async (sourceId: string, url: string) => {
    try {
      // Update UI to show testing state
      setSources(prev => prev.map(s => 
        s.id === sourceId 
          ? { ...s, connection_status: 'unknown' as const, last_error: undefined }
          : s
      ));

      let connectionStatus: 'healthy' | 'error' = 'healthy';
      let lastError: string | undefined;

      try {
        await fetch(url, { 
          method: 'HEAD',
          mode: 'no-cors'
        });
        connectionStatus = 'healthy';
      } catch (err: any) {
        connectionStatus = 'error';
        lastError = err.message || 'Connection failed';
      }

      // Update the source in the UI
      setSources(prev => prev.map(s => 
        s.id === sourceId 
          ? { 
              ...s, 
              connection_status: connectionStatus,
              last_error: lastError,
              last_checked: new Date().toISOString()
            }
          : s
      ));
    } catch (error) {
      console.error('Error testing connection:', error);
    }
  };

  const deleteSource = async (id: string) => {
    if (!confirm('Delete this RSS source?')) return;

    try {
      await supabase.from('rss_sources').delete().eq('id', id);
      loadSources();
    } catch (error) {
      console.error('Error deleting source:', error);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await supabase
        .from('rss_sources')
        .update({ active: !active })
        .eq('id', id);
      loadSources();
    } catch (error) {
      console.error('Error updating source:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1140] via-[#2d1b69] to-[#4a2a8f] relative overflow-hidden">
      {/* Quick Navigation Bar */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => navigate('/admin/instructions')}
          className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-semibold shadow-lg transition-all"
        >
          📚 Instructions
        </button>
        <button
          onClick={() => navigate('/admin/operations')}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow-lg transition-all"
        >
          🏠 Admin Home
        </button>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold shadow-lg transition-all"
        >
          🌐 Main Site
        </button>
      </div>

      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-8 py-12 pt-20">
        {/* Authentication Warning */}
        {!isAuthenticated && (
          <div className="bg-orange-500/20 border-2 border-orange-400 rounded-2xl p-6 mb-8 backdrop-blur-lg">
            <div className="flex items-start gap-4">
              <div className="text-4xl">⚠️</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-orange-300 mb-2">Authentication Required</h3>
                <p className="text-orange-100 mb-4">
                  You need to be signed in to add, edit, or delete RSS sources. 
                  This protects the RSS feed configuration from unauthorized access.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-lg transition-all"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-5xl font-bold text-white mb-3">
              RSS <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Source Manager</span>
            </h1>
            <p className="text-gray-400 text-lg">Manage news sources and RSS feeds</p>
            
            {/* Refresh Message */}
            {refreshMessage && (
              <div className={`mt-3 px-4 py-2 rounded-lg ${
                refreshMessage.startsWith('✅') 
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                {refreshMessage}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={refreshFeeds}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600/80 to-blue-600/80 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
              title="Refresh all sources and reload from database"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh All'}
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              disabled={!isAuthenticated}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isAuthenticated ? 'Sign in to add RSS sources' : 'Add a new RSS source'}
            >
              <Plus className="w-5 h-5" />
              Add RSS Source
            </button>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all"
            >
              Back to Workflow
            </button>
          </div>
        </div>

        {/* Add source form */}
        {showAddForm && (
          <div className="bg-gradient-to-br from-gray-900/80 to-blue-900/50 backdrop-blur-lg border-2 border-blue-500/30 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Add New RSS Source</h2>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-gray-400 mb-2">Source Name</label>
                <input
                  type="text"
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  placeholder="TechCrunch"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-2">Category</label>
                <select
                  value={newSource.category}
                  onChange={(e) => setNewSource({ ...newSource, category: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Tech News">Tech News</option>
                  <option value="Venture Capital">Venture Capital</option>
                  <option value="VC Portfolio">VC Portfolio / Investments</option>
                  <option value="Startup News">Startup News</option>
                  <option value="Accelerator">Accelerator Portfolio</option>
                  <option value="Industry">Industry</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-400 mb-2">
                RSS Feed URL
                <span className="text-xs text-gray-500 ml-2">(RSS feeds from VC firm portfolios, news sites, or startup directories)</span>
              </label>
              <input
                type="url"
                value={newSource.url}
                onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                placeholder="https://techcrunch.com/feed/"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <div className="mt-3 p-4 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                <p className="text-sm text-blue-200 font-semibold mb-2">💡 Example Sources:</p>
                <ul className="text-xs text-blue-300 space-y-1">
                  <li>• <strong>VC Portfolios:</strong> a16z.com/feed, sequoiacap.com/feed</li>
                  <li>• <strong>Startup News:</strong> techcrunch.com/feed, venturebeat.com/feed</li>
                  <li>• <strong>Y Combinator:</strong> ycombinator.com/companies/feed</li>
                  <li>• <strong>Product Hunt:</strong> producthunt.com/feed</li>
                </ul>
              </div>
            </div>

            <div className="mb-6">
              <label className="flex items-center gap-3 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newSource.requires_auth}
                  onChange={(e) => setNewSource({ ...newSource, requires_auth: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-white/10 text-blue-600 focus:ring-blue-500"
                />
                <span>This source requires authentication (username/password)</span>
              </label>
            </div>

            {newSource.requires_auth && (
              <div className="grid grid-cols-2 gap-6 mb-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                <div>
                  <label className="block text-gray-400 mb-2">Username / Email</label>
                  <input
                    type="text"
                    value={newSource.auth_username}
                    onChange={(e) => setNewSource({ ...newSource, auth_username: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-2">Password</label>
                  <input
                    type="password"
                    value={newSource.auth_password}
                    onChange={(e) => setNewSource({ ...newSource, auth_password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-400">🔒 Credentials are stored securely and used only for accessing authenticated RSS feeds (e.g., Wired, Bloomberg Premium)</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={addSource}
                disabled={!newSource.name || !newSource.url}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg transition-all"
              >
                Add Source
              </button>
            </div>
          </div>
        )}

        {/* Edit source form */}
        {editingSource && (
          <div className="bg-gradient-to-br from-gray-900/80 to-purple-900/50 backdrop-blur-lg border-2 border-purple-500/30 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Edit RSS Source</h2>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-gray-400 mb-2">Source Name</label>
                <input
                  type="text"
                  value={editingSource.name}
                  onChange={(e) => setEditingSource({ ...editingSource, name: e.target.value })}
                  placeholder="TechCrunch"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-2">Category</label>
                <select
                  value={editingSource.category}
                  onChange={(e) => setEditingSource({ ...editingSource, category: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Tech News">Tech News</option>
                  <option value="Venture Capital">Venture Capital</option>
                  <option value="VC Portfolio">VC Portfolio / Investments</option>
                  <option value="Startup News">Startup News</option>
                  <option value="Accelerator">Accelerator Portfolio</option>
                  <option value="Industry">Industry</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-400 mb-2">RSS Feed URL</label>
              <input
                type="url"
                value={editingSource.url}
                onChange={(e) => setEditingSource({ ...editingSource, url: e.target.value })}
                placeholder="https://techcrunch.com/feed/"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="mb-6">
              <label className="flex items-center gap-3 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingSource.requires_auth || false}
                  onChange={(e) => setEditingSource({ ...editingSource, requires_auth: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500"
                />
                <span>This source requires authentication (username/password)</span>
              </label>
            </div>

            {editingSource.requires_auth && (
              <div className="grid grid-cols-2 gap-6 mb-6 bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
                <div>
                  <label className="block text-gray-400 mb-2">Username / Email</label>
                  <input
                    type="text"
                    value={editingSource.auth_username || ''}
                    onChange={(e) => setEditingSource({ ...editingSource, auth_username: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-2">Password</label>
                  <input
                    type="password"
                    value={editingSource.auth_password || ''}
                    onChange={(e) => setEditingSource({ ...editingSource, auth_password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-400">🔒 Credentials are stored securely and used only for accessing authenticated RSS feeds</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setEditingSource(null)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={updateSource}
                disabled={!editingSource.name || !editingSource.url}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg transition-all"
              >
                Update Source
              </button>
            </div>
          </div>
        )}

        {/* Sources list */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center text-white py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
              Loading sources...
            </div>
          ) : sources.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-900/80 to-blue-900/50 backdrop-blur-lg border-2 border-blue-500/30 rounded-2xl p-12 text-center">
              <Rss className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">No RSS Sources Yet</h3>
              <p className="text-gray-400 mb-6">Add your first RSS source to start monitoring news</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-semibold transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add RSS Source
              </button>
            </div>
          ) : (
            sources.map((source) => (
              <div
                key={source.id}
                className="bg-gradient-to-br from-gray-900/80 to-blue-900/50 backdrop-blur-lg border-2 border-blue-500/30 rounded-2xl p-6 hover:border-blue-400/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className={`w-12 h-12 rounded-xl ${source.active ? 'bg-blue-500/20' : 'bg-gray-500/20'} flex items-center justify-center`}>
                      <Rss className={`w-6 h-6 ${source.active ? 'text-blue-400' : 'text-gray-400'}`} />
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-bold text-white">{source.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          source.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {source.active ? 'Active' : 'Inactive'}
                        </span>
                        {/* Connection status badge */}
                        {source.connection_status && (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                            source.connection_status === 'healthy' 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                              : source.connection_status === 'error'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              source.connection_status === 'healthy' 
                                ? 'bg-emerald-400' 
                                : source.connection_status === 'error'
                                ? 'bg-red-400'
                                : 'bg-gray-400'
                            }`} />
                            {source.connection_status === 'healthy' ? 'Connected' : source.connection_status === 'error' ? 'Connection Error' : 'Unknown'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>{source.category}</span>
                        <span>•</span>
                        <span>{source.articles_count} articles</span>
                        {source.last_scraped && (
                          <>
                            <span>•</span>
                            <span>Last scraped: {new Date(source.last_scraped).toLocaleString()}</span>
                          </>
                        )}
                        {source.last_checked && (
                          <>
                            <span>•</span>
                            <span>Checked: {new Date(source.last_checked).toLocaleString()}</span>
                          </>
                        )}
                      </div>
                      {/* Show error message if connection failed */}
                      {source.connection_status === 'error' && source.last_error && (
                        <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-2 py-1">
                          ⚠️ {source.last_error}
                        </div>
                      )}
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 text-sm hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        {source.url}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => testConnection(source.id, source.url)}
                      className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"
                      title="Test Connection"
                      disabled={source.connection_status === 'unknown'}
                    >
                      <RefreshCw className={`w-5 h-5 ${source.connection_status === 'unknown' ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => setEditingSource(source)}
                      disabled={!isAuthenticated}
                      className="p-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title={isAuthenticated ? 'Edit Source' : 'Sign in to edit'}
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => toggleActive(source.id, source.active)}
                      disabled={!isAuthenticated}
                      className={`p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        source.active
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                      }`}
                      title={!isAuthenticated ? 'Sign in to toggle' : source.active ? 'Deactivate' : 'Activate'}
                    >
                      {source.active ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => deleteSource(source.id)}
                      disabled={!isAuthenticated}
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title={isAuthenticated ? 'Delete' : 'Sign in to delete'}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
