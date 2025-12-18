import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Upload, Trash2, Sparkles, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ImportItem {
  id: string;
  name: string;
  website: string;
  status: 'pending' | 'enriching' | 'done' | 'error';
  enriched?: any;
}

export default function BulkImport() {
  const [urls, setUrls] = useState('');
  const [items, setItems] = useState<ImportItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const extractName = (url: string): string => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      const name = domain.split('.')[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    } catch { return 'Unknown'; }
  };

  const parseUrls = () => {
    const parsed = urls.split('\n').filter(u => u.trim()).map(u => ({
      id: Math.random().toString(36).slice(2),
      name: extractName(u.trim()),
      website: u.trim(),
      status: 'pending' as const
    }));
    setItems(parsed);
  };

  const enrichAndImport = async () => {
    if (!items.length) return;
    setImporting(true);
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setProgress({ current: i + 1, total: items.length });
      setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'enriching' } : it));

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Research this company. Return JSON: { pitch, fivePoints (5 strings), industry, stage, funding }' },
              { role: 'user', content: `Company: ${item.name}\nWebsite: ${item.website}` }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.8
          })
        });

        if (response.ok) {
          const data = await response.json();
          const enriched = JSON.parse(data.choices[0].message.content);

          await supabase.from('startup_uploads').insert({
            name: item.name,
            tagline: enriched.pitch?.slice(0, 200),
            pitch: enriched.pitch,
            status: 'pending',
            extracted_data: { fivePoints: enriched.fivePoints, industry: enriched.industry, stage: enriched.stage, funding: enriched.funding }
          });

          setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'done', enriched } : it));
        } else {
          setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'error' } : it));
        }
      } catch {
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'error' } : it));
      }
    }
    setImporting(false);
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));
  const clearAll = () => { setItems([]); setUrls(''); };

  const counts = {
    total: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    done: items.filter(i => i.status === 'done').length,
    error: items.filter(i => i.status === 'error').length
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-4 py-2 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">📤 Bulk Import</h1>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/" className="text-gray-400 hover:text-white">Home</Link>
            <Link to="/admin" className="text-gray-400 hover:text-white">Control Center</Link>
            <Link to="/admin/edit-startups" className="text-cyan-400 hover:text-cyan-300">Edit</Link>
            <Link to="/matching" className="text-orange-400 hover:text-orange-300 font-bold">⚡ Match</Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-4 space-y-4">
        {/* Input Area */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-white mb-2">Paste Website URLs (one per line)</h3>
          <textarea
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder="https://company1.com&#10;https://company2.com&#10;https://company3.com"
            className="w-full h-32 bg-gray-700 border border-gray-600 rounded-lg p-3 text-white text-sm font-mono resize-none"
          />
          <div className="flex gap-2 mt-3">
            <button onClick={parseUrls} className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 text-sm flex items-center gap-2">
              <Upload className="w-4 h-4" /> Parse URLs
            </button>
            <button onClick={clearAll} className="px-4 py-2 bg-gray-600/50 text-gray-400 rounded hover:bg-gray-600 text-sm">
              Clear All
            </button>
          </div>
        </div>

        {/* Stats & Actions */}
        {items.length > 0 && (
          <div className="grid grid-cols-5 gap-3 text-xs">
            <div className="bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700">
              <div className="text-xl font-bold font-mono text-white">{counts.total}</div>
              <div className="text-gray-500 text-[10px]">Total</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700">
              <div className="text-xl font-bold font-mono text-yellow-400">{counts.pending}</div>
              <div className="text-gray-500 text-[10px]">Pending</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700">
              <div className="text-xl font-bold font-mono text-green-400">{counts.done}</div>
              <div className="text-gray-500 text-[10px]">Done</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700">
              <div className="text-xl font-bold font-mono text-red-400">{counts.error}</div>
              <div className="text-gray-500 text-[10px]">Errors</div>
            </div>
            <button
              onClick={enrichAndImport}
              disabled={importing || counts.pending === 0}
              className="bg-green-500/20 border border-green-500/30 rounded-lg px-3 py-2 text-green-400 hover:bg-green-500/30 disabled:opacity-50"
            >
              <div className="text-xl font-bold">{importing ? '⏳' : <Sparkles className="w-5 h-5 mx-auto" />}</div>
              <div className="text-[10px]">{importing ? `${progress.current}/${progress.total}` : 'Enrich & Import'}</div>
            </button>
          </div>
        )}

        {/* Table */}
        {items.length > 0 && (
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Company</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Website</th>
                  <th className="text-center px-4 py-2 text-gray-400 font-medium">Status</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Result</th>
                  <th className="text-center px-4 py-2 text-gray-400 font-medium w-20">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                    <td className="px-4 py-2 text-white font-medium">{item.name}</td>
                    <td className="px-4 py-2">
                      <a href={item.website} target="_blank" rel="noopener" className="text-gray-400 hover:text-blue-400 text-xs truncate max-w-64 block flex items-center gap-1">
                        {item.website.replace(/https?:\/\//, '').slice(0, 40)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        item.status === 'done' ? 'bg-green-500/20 text-green-400' :
                        item.status === 'enriching' ? 'bg-blue-500/20 text-blue-400 animate-pulse' :
                        item.status === 'error' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {item.status === 'enriching' ? '⏳ enriching...' : item.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs">
                      {item.enriched?.pitch?.slice(0, 50) || '-'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => removeItem(item.id)} className="p-1 hover:bg-red-500/20 rounded text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Quick Links */}
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">⚡ Quick Actions</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link to="/admin/discovered-startups" className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-500/30">🔍 RSS Discoveries</Link>
            <Link to="/admin/edit-startups" className="px-3 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded text-orange-400 hover:bg-orange-500/30">✏️ Edit Startups</Link>
            <Link to="/admin/dashboard" className="px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 rounded text-violet-400 hover:bg-violet-500/30">📊 Dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
