import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Plus, Edit2, Trash2, Check, X, ExternalLink, Rss } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RSSSource {
  id: string;
  name: string;
  url: string;
  category: string;
  active: boolean | null;
  last_scraped?: string | null;
  articles_count?: number;
}

export default function RSSManager() {
  const [sources, setSources] = useState<RSSSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [newSource, setNewSource] = useState({ name: '', url: '', category: 'Tech News', active: true });

  useEffect(() => { loadSources(); }, []);

  const loadSources = async () => {
    setLoading(true);
    const { data } = await supabase.from('rss_sources').select('*').order('name');
    if (data) {
      const withCounts = await Promise.all(data.map(async (s) => {
        const { count } = await (supabase.from as any)('rss_articles').select('*', { count: 'exact', head: true }).eq('source', s.name);
        return { ...s, articles_count: count || 0 };
      }));
      setSources(withCounts as RSSSource[]);
    }
    setLoading(false);
  };

  const refresh = async () => { setRefreshing(true); await loadSources(); setRefreshing(false); };

  const addSource = async () => {
    if (!newSource.name || !newSource.url) return;
    await supabase.from('rss_sources').insert([newSource]);
    setShowAddForm(false);
    setNewSource({ name: '', url: '', category: 'Tech News', active: true });
    await loadSources();
  };

  const toggleActive = async (id: string, active: boolean | null) => {
    await supabase.from('rss_sources').update({ active: !active }).eq('id', id);
    await loadSources();
  };

  const deleteSource = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await supabase.from('rss_sources').delete().eq('id', id);
    await loadSources();
  };

  const startEdit = (s: RSSSource) => {
    setEditingId(s.id);
    setEditData({ name: s.name, url: s.url, category: s.category });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await supabase.from('rss_sources').update(editData).eq('id', editingId);
    setEditingId(null);
    await loadSources();
  };

  const formatTime = (d?: string | null) => {
    if (!d) return 'Never';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const stats = {
    total: sources.length,
    active: sources.filter(s => s.active).length,
    articles: sources.reduce((sum, s) => sum + (s.articles_count || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 overflow-auto">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 sticky top-0 z-30">
        <div className="max-w-[1800px] mx-auto px-4 py-2 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white pl-20">📡 RSS Manager</h1>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/" className="text-gray-400 hover:text-white">Home</Link>
            <Link to="/admin" className="text-gray-400 hover:text-white">Control Center</Link>
            <Link to="/admin/discovered-startups" className="text-cyan-400 hover:text-cyan-300">Discoveries</Link>
            <Link to="/matching" className="text-orange-400 hover:text-orange-300 font-bold">⚡ Match</Link>
            <button onClick={refresh} className="text-gray-400 hover:text-white">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 text-xs">
          <div className="bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700">
            <div className="text-xl font-bold font-mono text-blue-400">{stats.total}</div>
            <div className="text-gray-500 text-[10px]">Total Sources</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700">
            <div className="text-xl font-bold font-mono text-green-400">{stats.active}</div>
            <div className="text-gray-500 text-[10px]">Active</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700">
            <div className="text-xl font-bold font-mono text-orange-400">{stats.articles}</div>
            <div className="text-gray-500 text-[10px]">Articles</div>
          </div>
          <button onClick={() => setShowAddForm(true)} className="bg-green-500/20 border border-green-500/30 rounded-lg px-3 py-2 text-green-400 hover:bg-green-500/30">
            <div className="text-xl font-bold"><Plus className="w-5 h-5 mx-auto" /></div>
            <div className="text-[10px]">Add Source</div>
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-gray-800/50 rounded-lg border border-green-500/50 p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Add RSS Source</h3>
            <div className="grid grid-cols-4 gap-3">
              <input type="text" placeholder="Source Name" value={newSource.name}
                onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm" />
              <input type="text" placeholder="RSS URL" value={newSource.url}
                onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm" />
              <select value={newSource.category} onChange={(e) => setNewSource({ ...newSource, category: e.target.value })}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm">
                <option>Tech News</option>
                <option>Startups</option>
                <option>VC/Funding</option>
                <option>Other</option>
              </select>
              <div className="flex gap-2">
                <button onClick={addSource} className="flex-1 bg-green-500/20 text-green-400 rounded px-3 py-2 hover:bg-green-500/30 flex items-center justify-center gap-1">
                  <Check className="w-4 h-4" /> Add
                </button>
                <button onClick={() => setShowAddForm(false)} className="bg-gray-600/50 text-gray-400 rounded px-3 py-2 hover:bg-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="px-4 py-12 text-center text-gray-500">Loading...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Source</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">URL</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Category</th>
                  <th className="text-right px-4 py-2 text-gray-400 font-medium">Articles</th>
                  <th className="text-center px-4 py-2 text-gray-400 font-medium">Status</th>
                  <th className="text-right px-4 py-2 text-gray-400 font-medium">Last Scraped</th>
                  <th className="text-center px-4 py-2 text-gray-400 font-medium w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                    <td className="px-4 py-2">
                      {editingId === s.id ? (
                        <input type="text" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Rss className="w-4 h-4 text-orange-400" />
                          <span className="text-white font-medium">{s.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingId === s.id ? (
                        <input type="text" value={editData.url} onChange={(e) => setEditData({ ...editData, url: e.target.value })}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm" />
                      ) : (
                        <a href={s.url} target="_blank" rel="noopener" className="text-gray-400 hover:text-blue-400 text-xs truncate max-w-48 block">
                          {s.url.replace(/https?:\/\//, '').slice(0, 40)}...
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingId === s.id ? (
                        <select value={editData.category} onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs">
                          <option>Tech News</option><option>Startups</option><option>VC/Funding</option><option>Other</option>
                        </select>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-700 rounded text-gray-300 text-xs">{s.category}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-gray-300">{s.articles_count || 0}</td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => toggleActive(s.id, s.active)}
                        className={`px-2 py-0.5 rounded text-xs ${s.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {s.active ? 'active' : 'paused'}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500 text-xs">{formatTime(s.last_scraped)}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 justify-center">
                        {editingId === s.id ? (
                          <>
                            <button onClick={saveEdit} className="p-1 hover:bg-green-500/20 rounded text-green-400"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingId(null)} className="p-1 hover:bg-gray-500/20 rounded text-gray-400"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(s)} className="p-1 hover:bg-blue-500/20 rounded text-blue-400"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => deleteSource(s.id, s.name)} className="p-1 hover:bg-red-500/20 rounded text-red-400"><Trash2 className="w-4 h-4" /></button>
                            <a href={s.url} target="_blank" rel="noopener" className="p-1 hover:bg-gray-500/20 rounded text-gray-400"><ExternalLink className="w-4 h-4" /></a>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {sources.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No RSS sources configured</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">⚡ Quick Actions</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link to="/admin/discovered-startups" className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-500/30">🔍 View Discoveries</Link>
            <Link to="/admin/operations" className="px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 rounded text-violet-400 hover:bg-violet-500/30">⚙️ Operations</Link>
            <Link to="/admin/dashboard" className="px-3 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded text-orange-400 hover:bg-orange-500/30">📊 Dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
