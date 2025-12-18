import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { RefreshCw, Download, Check, ExternalLink, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DiscoveredStartup {
  id: string;
  name: string;
  website: string | null;
  description: string | null;
  funding_amount: string | null;
  funding_stage: string | null;
  article_url: string | null;
  rss_source: string | null;
  imported_to_startups: boolean | null;
  discovered_at: string | null;
}

export default function DiscoveredStartups() {
  const navigate = useNavigate();
  const [startups, setStartups] = useState<DiscoveredStartup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'unimported' | 'imported'>('all');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  useEffect(() => { loadStartups(); }, [filter]);

  const loadStartups = async () => {
    setLoading(true);
    let query = supabase.from('discovered_startups').select('*').order('discovered_at', { ascending: false });
    if (filter === 'unimported') query = query.eq('imported_to_startups', false);
    else if (filter === 'imported') query = query.eq('imported_to_startups', true);
    
    const { data, error } = await query;
    if (!error) setStartups((data || []).map(d => ({ ...d, imported_to_startups: d.imported_to_startups ?? false })) as DiscoveredStartup[]);
    setLoading(false);
  };

  const refresh = async () => { setRefreshing(true); await loadStartups(); setRefreshing(false); };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    const unimported = startups.filter(s => !s.imported_to_startups);
    if (selectedIds.size === unimported.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(unimported.map(s => s.id)));
  };

  const exportCSV = () => {
    const selected = startups.filter(s => selectedIds.has(s.id));
    const csv = [['Name', 'Website', 'Description', 'Funding', 'Stage', 'Source'], 
      ...selected.map(s => [s.name, s.website || '', s.description, s.funding_amount || '', s.funding_stage || '', s.rss_source])
    ].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `discovered-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const importSelected = async () => {
    const selected = startups.filter(s => selectedIds.has(s.id));
    if (!selected.length || !confirm(`Import ${selected.length} startups with AI enrichment?`)) return;
    
    setImporting(true);
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    for (let i = 0; i < selected.length; i++) {
      const startup = selected[i];
      setImportProgress({ current: i + 1, total: selected.length });
      
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Create a startup card with: pitch (tagline), fivePoints (5 short strings), industry, stage, funding. Return JSON.' },
              { role: 'user', content: `Company: ${startup.name}\nWebsite: ${startup.website || 'N/A'}\n${startup.description}` }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.8
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const enriched = JSON.parse(data.choices[0].message.content);
          
          await supabase.from('startup_uploads').insert({
            name: startup.name,
            tagline: enriched.pitch?.slice(0, 200),
            pitch: startup.description || '',
            status: 'pending',
            source_type: 'rss_discovery',
            extracted_data: { fivePoints: enriched.fivePoints, industry: enriched.industry, stage: enriched.stage, funding: enriched.funding }
          });
          
          await supabase.from('discovered_startups').update({ imported_to_startups: true }).eq('id', startup.id);
        }
      } catch (e) { console.error('Import error:', e); }
    }
    
    setImporting(false);
    setSelectedIds(new Set());
    await loadStartups();
  };

  const formatTime = (d: string | null) => {
    if (!d) return '-';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const counts = { 
    all: startups.length, 
    unimported: startups.filter(s => !s.imported_to_startups).length,
    imported: startups.filter(s => s.imported_to_startups).length 
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-4 py-2 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">🔍 RSS Discoveries</h1>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/" className="text-gray-400 hover:text-white">Home</Link>
            <Link to="/admin" className="text-gray-400 hover:text-white">Control Center</Link>
            <Link to="/admin/dashboard" className="text-gray-400 hover:text-white">Dashboard</Link>
            <Link to="/admin/edit-startups" className="text-cyan-400 hover:text-cyan-300">Manual Uploads</Link>
            <Link to="/matching" className="text-orange-400 hover:text-orange-300 font-bold">⚡ Match</Link>
            <button onClick={refresh} className="text-gray-400 hover:text-white">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-4 space-y-4">
        {/* Stats & Filters */}
        <div className="grid grid-cols-6 gap-3 text-xs">
          {[
            { label: 'All', value: counts.all, color: 'text-white', f: 'all' as const },
            { label: 'Unimported', value: counts.unimported, color: 'text-yellow-400', f: 'unimported' as const },
            { label: 'Imported', value: counts.imported, color: 'text-green-400', f: 'imported' as const },
          ].map((s, i) => (
            <button key={i} onClick={() => setFilter(s.f)}
              className={`bg-gray-800/50 rounded-lg px-3 py-2 border text-left transition-all ${
                filter === s.f ? 'border-orange-500/50 bg-orange-500/10' : 'border-gray-700 hover:border-gray-600'
              }`}>
              <div className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-gray-500 text-[10px]">{s.label}</div>
            </button>
          ))}
          <button onClick={selectAll} className="bg-blue-500/20 border border-blue-500/30 rounded-lg px-3 py-2 text-blue-400 hover:bg-blue-500/30">
            <div className="text-xl font-bold">{selectedIds.size > 0 ? '☐' : '☑'}</div>
            <div className="text-[10px]">{selectedIds.size > 0 ? 'Deselect All' : 'Select All'}</div>
          </button>
          <button onClick={exportCSV} disabled={!selectedIds.size} className="bg-violet-500/20 border border-violet-500/30 rounded-lg px-3 py-2 text-violet-400 hover:bg-violet-500/30 disabled:opacity-50">
            <div className="text-xl font-bold"><Download className="w-5 h-5 mx-auto" /></div>
            <div className="text-[10px]">Export CSV</div>
          </button>
          <button onClick={importSelected} disabled={!selectedIds.size || importing}
            className="bg-green-500/20 border border-green-500/30 rounded-lg px-3 py-2 text-green-400 hover:bg-green-500/30 disabled:opacity-50">
            <div className="text-xl font-bold">{importing ? '⏳' : <Sparkles className="w-5 h-5 mx-auto" />}</div>
            <div className="text-[10px]">{importing ? `${importProgress.current}/${importProgress.total}` : `Import (${selectedIds.size})`}</div>
          </button>
        </div>

        {/* Table */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="px-4 py-12 text-center text-gray-500">Loading...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="w-10 px-4 py-2"></th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Startup</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Description</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Funding</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Source</th>
                  <th className="text-center px-4 py-2 text-gray-400 font-medium">Status</th>
                  <th className="text-right px-4 py-2 text-gray-400 font-medium">Age</th>
                  <th className="w-20 px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {startups.map((s) => (
                  <tr key={s.id} className={`border-t border-gray-700/50 hover:bg-gray-700/30 ${selectedIds.has(s.id) ? 'bg-blue-500/10' : ''}`}>
                    <td className="px-4 py-2 text-center">
                      {!s.imported_to_startups && (
                        <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)}
                          className="w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500" />
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-white font-medium">{s.name}</div>
                      {s.website && (
                        <a href={s.website} target="_blank" rel="noopener" className="text-xs text-gray-500 hover:text-blue-400 truncate block max-w-40">
                          {s.website.replace(/https?:\/\//, '')}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs max-w-64 truncate">{s.description}</td>
                    <td className="px-4 py-2">
                      {s.funding_amount && <span className="text-green-400 text-xs">{s.funding_amount}</span>}
                      {s.funding_stage && <span className="text-gray-500 text-xs ml-1">({s.funding_stage})</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{s.rss_source}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${s.imported_to_startups ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {s.imported_to_startups ? 'imported' : 'new'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500 text-xs">{formatTime(s.discovered_at)}</td>
                    <td className="px-4 py-2 text-center">
                      {s.article_url ? (
                        <a href={s.article_url} target="_blank" rel="noopener" className="p-1 hover:bg-blue-500/20 rounded text-blue-400 inline-block" title="View Article">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {startups.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No startups found. Run RSS scrapers to discover new startups.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">⚡ Quick Actions</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link to="/admin/rss-manager" className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-500/30">📡 RSS Manager</Link>
            <Link to="/admin/edit-startups" className="px-3 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded text-orange-400 hover:bg-orange-500/30">✏️ Manual Uploads</Link>
            <Link to="/admin/dashboard" className="px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 rounded text-violet-400 hover:bg-violet-500/30">📊 Dashboard</Link>
            <Link to="/matching" className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded text-green-400 hover:bg-green-500/30">🔥 View Matches</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
