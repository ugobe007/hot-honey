'use client';

import React, { useState } from 'react';

interface Script {
  name: string;
  file: string;
  category: string;
  dangerous?: boolean;
}

const SCRIPTS: Script[] = [
  // Core
  { name: 'Scraper Manager', file: 'scraper-manager.js', category: 'Core' },
  { name: 'Match Updater', file: 'incremental-match-updater.js', category: 'Core' },
  { name: 'Safeguard Matches', file: 'safeguard-match-count.ts', category: 'Core' },
  { name: 'Ingest Signals', file: 'ingest-signals.ts', category: 'Core' },
  { name: 'Notifications', file: 'notifications.ts', category: 'Core' },
  
  // Enrichment
  { name: 'Enrich Investors', file: 'enrich-investor-stats.ts', category: 'Enrichment' },
  { name: 'Enrich Startups', file: 'enrich-startups-inference.js', category: 'Enrichment' },
  { name: 'Normalize Sectors', file: 'normalize-sectors.ts', category: 'Enrichment' },
  { name: 'Apply Enrichment', file: 'apply-enrichment.js', category: 'Enrichment' },
  
  // Cleanup
  { name: 'Database Cleanup', file: 'database-cleanup.js', category: 'Cleanup', dangerous: true },
  { name: 'Investor Cleanup', file: 'investor-cleanup.js', category: 'Cleanup', dangerous: true },
  { name: 'Fix RSS Sources', file: 'fix-rss-sources.ts', category: 'Cleanup' },
  
  // Reports
  { name: 'Daily Report', file: 'daily-report.ts', category: 'Reports' },
  { name: 'Health Email', file: 'daily-health-email.js', category: 'Reports' },
  
  // Tools
  { name: 'Investor Lookup', file: 'investor-lookup.js', category: 'Tools' },
  { name: 'Recalculate Scores', file: 'recalculate-scores.ts', category: 'Tools', dangerous: true },
  { name: 'Force Recalculate', file: 'force-recalculate-scores.ts', category: 'Tools', dangerous: true },
  { name: 'Export Missing Data', file: 'export-investors-missing-data.js', category: 'Tools' },
  
  // Scrapers
  { name: 'Add VC Firms', file: 'add-vc-firms-from-list.js', category: 'Scrapers' },
  { name: 'Process VC Table', file: 'process-vc-firms-table.js', category: 'Scrapers' },
  { name: 'Press Enrichment', file: 'startup-press-enrichment.mjs', category: 'Scrapers' },
];

const CATEGORIES = ['Core', 'Enrichment', 'Cleanup', 'Reports', 'Tools', 'Scrapers'];

export default function ScriptsControlPanel() {
  const [output, setOutput] = useState<string>('');
  const [running, setRunning] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Script | null>(null);

  const run = async (script: Script) => {
    if (script.dangerous && !confirm) {
      setConfirm(script);
      return;
    }
    setConfirm(null);
    setRunning(script.file);
    
    const isTS = script.file.endsWith('.ts') || script.file.endsWith('.mjs');
    const cmd = `${isTS ? 'npx tsx' : 'node'} scripts/${script.file}`;
    
    try {
      const res = await fetch('/api/admin/run-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: script.file }),
      });
      const data = await res.json();
      setOutput(data.success ? `✓ ${script.name}\n${data.output || ''}` : `✗ ${data.error}`);
    } catch (error: any) {
      // Fallback: show command to run manually
      setOutput(`$ ${cmd}\n\n💡 API endpoint not available. Run manually:\n${cmd}`);
      try {
        await navigator.clipboard.writeText(cmd);
        setOutput(prev => prev + '\n\n✅ Command copied to clipboard!');
      } catch {
        // Clipboard API not available
      }
    } finally {
      setRunning(null);
    }
  };

  const copy = async (script: Script) => {
    const isTS = script.file.endsWith('.ts') || script.file.endsWith('.mjs');
    const cmd = `${isTS ? 'npx tsx' : 'node'} scripts/${script.file}`;
    try {
      await navigator.clipboard.writeText(cmd);
      setOutput(`$ ${cmd}\n\n✅ Copied to clipboard!`);
    } catch {
      setOutput(`$ ${cmd}`);
    }
  };

  return (
    <div className="text-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-medium text-white/90">Scripts</h1>
        <p className="text-white/40 text-sm mt-1">{SCRIPTS.length} available</p>
      </div>

      {/* Confirm Modal */}
      {confirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setConfirm(null)}>
          <div className="bg-[#141414] border border-white/10 rounded-lg p-6 max-w-sm" onClick={e => e.stopPropagation()}>
            <p className="text-white/90 mb-1">Run {confirm.name}?</p>
            <p className="text-white/40 text-sm mb-6">This script can modify data.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="flex-1 py-2 text-white/60 hover:text-white/90 transition-colors">
                Cancel
              </button>
              <button onClick={() => run(confirm)} className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded transition-colors">
                Run
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scripts by Category */}
      <div className="space-y-8">
        {CATEGORIES.map(cat => {
          const scripts = SCRIPTS.filter(s => s.category === cat);
          if (!scripts.length) return null;
          
          return (
            <div key={cat}>
              <h2 className="text-white/40 text-xs uppercase tracking-wider mb-3">{cat}</h2>
              <div className="space-y-1">
                {scripts.map(script => (
                  <div
                    key={script.file}
                    className={`
                      group flex items-center justify-between py-2 px-3 -mx-3 rounded
                      hover:bg-white/5 transition-colors cursor-pointer
                      ${running === script.file ? 'bg-white/5' : ''}
                    `}
                    onClick={() => run(script)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`
                        w-1.5 h-1.5 rounded-full flex-shrink-0
                        ${script.dangerous ? 'bg-orange-500/80' : 'bg-white/20'}
                      `} />
                      <span className="text-white/80 truncate">{script.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); copy(script); }}
                        className="text-white/40 hover:text-white/80 text-xs px-2 py-1"
                      >
                        copy
                      </button>
                      <span className="text-white/40 text-xs">
                        {running === script.file ? '...' : '→'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Output */}
      {output && (
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/40 text-xs uppercase tracking-wider">Output</span>
            <button onClick={() => setOutput('')} className="text-white/30 hover:text-white/60 text-xs">
              clear
            </button>
          </div>
          <code className="text-white/60 text-sm font-mono block whitespace-pre-wrap break-words">{output}</code>
        </div>
      )}
    </div>
  );
}
