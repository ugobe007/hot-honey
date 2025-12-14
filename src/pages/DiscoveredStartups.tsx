import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, ExternalLink, Download, CheckCircle2, XCircle, RefreshCw, Sparkles, Home, Settings, BarChart3, Upload, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminNavBar from '../components/AdminNavBar';

interface DiscoveredStartup {
  id: string;
  name: string;
  website: string | null;
  description: string;
  funding_amount: string | null;
  funding_stage: string | null;
  investors_mentioned: string[] | null;
  article_url: string;
  article_title: string;
  article_date: string | null;
  rss_source: string;
  imported_to_startups: boolean;
  discovered_at: string;
  website_status: string | null;
}

export default function DiscoveredStartups() {
  console.log('🔍 DiscoveredStartups component mounting...');
  
  const navigate = useNavigate();
  const [startups, setStartups] = useState<DiscoveredStartup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'unimported' | 'imported'>('all');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [lastImportCount, setLastImportCount] = useState(0);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, currentName: '' });

  // Check authentication on mount
  useEffect(() => {
    console.log('🔐 Checking authentication...');
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const localUser = localStorage.getItem('currentUser');
    const localLoggedIn = localStorage.getItem('isLoggedIn');
    
    const isAuth = !!session || (!!localUser && localLoggedIn === 'true');
    setIsAuthenticated(isAuth);
    
    if (!isAuth) {
      console.warn('Authentication required for Discovered Startups');
    }
  };

  useEffect(() => {
    loadStartups();
  }, [filter]);

  const loadStartups = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('discovered_startups')
        .select('*')
        .order('discovered_at', { ascending: false });

      if (filter === 'unimported') {
        query = query.eq('imported_to_startups', false);
      } else if (filter === 'imported') {
        query = query.eq('imported_to_startups', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading discovered startups:', error);
        console.error('Full error details:', JSON.stringify(error, null, 2));
        alert(`Error loading startups: ${error.message}\n\nThis might be a permissions issue. Check browser console for details.`);
        return;
      }

      console.log('✅ Loaded startups:', data?.length || 0);
      setStartups(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === startups.filter(s => !s.imported_to_startups).length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(startups.filter(s => !s.imported_to_startups).map(s => s.id)));
    }
  };

  const exportToCSV = () => {
    const selected = startups.filter(s => selectedIds.has(s.id));
    
    const csv = [
      ['Name', 'Website', 'Description', 'Funding Amount', 'Funding Stage', 'Investors', 'Article URL', 'Source'],
      ...selected.map(s => [
        s.name,
        s.website || '',
        s.description,
        s.funding_amount || '',
        s.funding_stage || '',
        (s.investors_mentioned || []).join('; '),
        s.article_url,
        s.rss_source
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `discovered-startups-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const importSelected = async () => {
    const selected = startups.filter(s => selectedIds.has(s.id));
    
    if (selected.length === 0) {
      alert('Please select at least one startup to import');
      return;
    }

    const confirm = window.confirm(
      `Import ${selected.length} startup${selected.length > 1 ? 's' : ''}?\n\n` +
      `This will:\n` +
      `1. Enrich each startup with AI (OpenAI GPT-4o-mini)\n` +
      `2. Save to your main startups database\n` +
      `3. Mark as imported in discovered startups\n\n` +
      `Continue?`
    );

    if (!confirm) return;

    setLoading(true);
    
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!apiKey || apiKey === 'your-openai-api-key-here') {
        alert('⚠️ OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.');
        setLoading(false);
        return;
      }
      
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      
      // Process in batches of 10 for speed
      const BATCH_SIZE = 10;
      const totalBatches = Math.ceil(selected.length / BATCH_SIZE);
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, selected.length);
        const batch = selected.slice(start, end);
        
        console.log(`\n📦 Batch ${batchIndex + 1}/${totalBatches}: Processing ${batch.length} startups (${start + 1}-${end})`);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (startup, idx) => {
          const globalIdx = start + idx;
          
          try {
            setImportProgress({
              current: globalIdx + 1,
              total: selected.length,
              currentName: startup.name
            });
            
            console.log(`  [${globalIdx + 1}/${selected.length}] 🤖 Enriching ${startup.name}...`);
            
            const systemPrompt = `Create a 5-point StartupCard for this company. Return JSON with: pitch (catchy tagline as string), fivePoints (array of 5 SHORT strings - max 12 words each - following this format: ["Problem: one line", "Solution: one line", "Market: one line with $ size only", "Team: former employers only (e.g. 'Ex-Google, Meta')", "Funding: amount only"]), industry (string), stage (string), funding (string). Keep team to ONE line focusing on notable former employers. Keep market size to ONE line with $ amount only.`;
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                  {
                    role: 'system',
                    content: systemPrompt
                  },
                  {
                    role: 'user',
                    content: `Research or infer details about:\n\nCompany: ${startup.name}\nWebsite: ${startup.website || 'N/A'}\n${startup.description || ''}\n\nCreate a compelling 5-point card.`
                  }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.8,
                max_tokens: 1000
              })
            });

            if (!response.ok) {
              const errorMsg = `OpenAI API error: ${response.statusText}`;
              console.error(`  ❌ ${errorMsg} for ${startup.name}`);
              return { success: false, error: errorMsg, name: startup.name };
            }

            const data = await response.json();
            const enriched = JSON.parse(data.choices[0].message.content);

            // Ensure fivePoints is an array of strings
            let fivePoints = enriched.fivePoints || [];
            if (fivePoints.length > 0 && typeof fivePoints[0] === 'object') {
              fivePoints = fivePoints.map((point: any) => {
                if (typeof point === 'string') return point;
                const values = Object.values(point);
                return values[0] || '';
              });
            }

            // Map stage string to integer (database expects INTEGER not TEXT)
            const stageMap: { [key: string]: number } = {
              'pre-seed': 1,
              'seed': 1,
              'series a': 2,
              'series b': 3,
              'series c': 4,
              'series d': 5,
              'series e+': 6,
              'growth': 4,
              'late stage': 5,
              'early stage': 1,
              'stealth': 1,
              'ipo': 7
            };
            
            const stageString = (enriched.stage || startup.funding_stage || 'Seed').toLowerCase();
            const stageInt = stageMap[stageString] || 1;

            // Check if startup already exists (by name to avoid duplicates)
            // NOTE: Use startup_uploads table, not 'startups'
            const { data: existingStartup } = await supabase
              .from('startup_uploads')
              .select('id')
              .eq('name', startup.name)
              .maybeSingle();

            let newStartup;

            if (existingStartup) {
              console.log(`  ℹ️ ${startup.name} already exists, skipping insert`);
              newStartup = existingStartup;
            } else {
              const startupId = crypto.randomUUID();
              // Use actual website or article URL - don't create fake placeholder URLs
              const websiteUrl = startup.website || startup.article_url || null;
              
              // Minimal insert - only core columns to avoid schema cache issues
              const { data: insertedStartup, error: insertError } = await supabase
                .from('startup_uploads')
                .insert([{
                  id: startupId,
                  name: startup.name,
                  website: websiteUrl,
                  pitch: enriched.pitch || startup.description || '',
                  tagline: enriched.pitch || startup.description || '',
                  source_type: 'manual'
                }])
                .select()
                .single();

              if (insertError) {
                const errorMsg = `Database error: ${insertError.message}`;
                console.error(`  ❌ ${errorMsg}`);
                return { success: false, error: errorMsg, name: startup.name };
              }
              
              newStartup = insertedStartup;
            }

            // Mark as imported
            await supabase
              .from('discovered_startups')
              .update({
                imported_to_startups: true,
                imported_at: new Date().toISOString(),
                startup_id: newStartup.id
              })
              .eq('id', startup.id);

            console.log(`  ✅ ${startup.name} imported successfully`);
            return { success: true, name: startup.name };

          } catch (error: any) {
            console.error(`  ❌ Error processing ${startup.name}:`, error);
            return { success: false, error: error.message, name: startup.name };
          }
        });
        
        // Wait for batch to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Count successes and failures
        batchResults.forEach(result => {
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            errors.push(`${result.name}: ${result.error}`);
          }
        });
        
        console.log(`✅ Batch ${batchIndex + 1} complete: ${batchResults.filter(r => r.success).length}/${batch.length} successful`);
        
        // Small delay between batches to avoid rate limits
        if (batchIndex < totalBatches - 1) {
          console.log('⏱️ Waiting 1 second before next batch...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Clear progress
      setImportProgress({ current: 0, total: 0, currentName: '' });
      
      // Show results
      console.log(`\n📊 Import complete: ${successCount} successful, ${errorCount} failed`);
      
      if (errorCount > 0) {
        console.error('❌ Errors:', errors.slice(0, 5));
        alert(
          `Import complete with errors:\n\n` +
          `✅ Successful: ${successCount}\n` +
          `❌ Failed: ${errorCount}\n\n` +
          `First errors:\n${errors.slice(0, 3).join('\n')}\n\n` +
          `Check console for full error list.`
        );
      }
      
      // Show success banner
      setLastImportCount(successCount);
      setShowSuccessBanner(true);
      
      // Reload the list
      console.log('🔄 Reloading discovered startups list...');
      setFilter('imported');
      setSelectedIds(new Set());
      console.log('✅ Reload complete');

    } catch (error: any) {
      console.error('Import error:', error);
      alert(`Error during import: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const unimportedCount = startups.filter(s => !s.imported_to_startups).length;
  const importedCount = startups.filter(s => s.imported_to_startups).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-950 text-white">
      {/* Navigation Bar */}
      <AdminNavBar currentPage="/admin/discovered-startups" />

      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Success Banner */}
        {showSuccessBanner && (
          <div className="mb-8 p-6 bg-green-500/20 border-2 border-green-500/50 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl">✅</div>
                <div>
                  <h3 className="text-xl font-bold text-green-300 mb-2">Import Successful!</h3>
                  <p className="text-green-200">
                    {lastImportCount} startup{lastImportCount !== 1 ? 's' : ''} imported and enriched with AI. They're now in your admin review queue with "pending" status.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/admin/dashboard')}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-all"
                >
                  View in Admin Dashboard →
                </button>
                <button
                  onClick={() => setShowSuccessBanner(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Authentication Warning */}
        {!isAuthenticated && (
          <div className="mb-8 p-6 bg-amber-500/20 border-2 border-amber-500/50 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="text-4xl">⚠️</div>
              <div>
                <h3 className="text-xl font-bold text-amber-300 mb-2">Authentication Required</h3>
                <p className="text-amber-200 mb-4">
                  You must be signed in to view and manage discovered startups.
                </p>
                <button
                  onClick={() => navigate('/signin')}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-all"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="bg-green-500 text-white text-sm font-bold px-3 py-1 rounded-full">STEP 3</span>
                <h1 className="text-5xl font-bold">
                  <Sparkles className="inline w-12 h-12 mr-3 text-cyan-400" />
                  Discovered <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Startups</span>
                </h1>
              </div>
              <p className="text-gray-300 text-lg mb-3">
                Startups automatically discovered from RSS feeds
              </p>
              <div className="bg-blue-500/20 border border-blue-400/50 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">ℹ️</div>
                  <div>
                    <h3 className="font-bold text-blue-300 mb-2">How This Works:</h3>
                    <ol className="text-sm text-blue-200 space-y-1 list-decimal list-inside">
                      <li><strong>Discover:</strong> AI scans RSS feeds and finds startups automatically</li>
                      <li><strong>Review:</strong> Check the discovered startups in the "Ready to Import" tab below</li>
                      <li><strong>Select & Import:</strong> Choose startups → Click "Import Selected" → AI enriches with 5-point format</li>
                      <li><strong>View Results:</strong> Imported startups move to "Imported" tab and appear in your Admin Dashboard for review</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-purple-500/50"
              >
                🏠 Admin Home
              </button>
              <button
                onClick={loadStartups}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600/80 to-blue-600/80 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border-2 border-cyan-500/30">
              <div className="text-4xl font-bold text-cyan-400">{startups.length}</div>
              <div className="text-gray-300 mt-2">Total Discovered</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border-2 border-orange-500/30">
              <div className="text-4xl font-bold text-orange-400">{unimportedCount}</div>
              <div className="text-gray-300 mt-2">Ready to Import</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border-2 border-green-500/30">
              <div className="text-4xl font-bold text-green-400">{importedCount}</div>
              <div className="text-gray-300 mt-2">Already Imported</div>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              All ({startups.length})
            </button>
            <button
              onClick={() => setFilter('unimported')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                filter === 'unimported'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Ready to Import ({unimportedCount})
            </button>
            <button
              onClick={() => setFilter('imported')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                filter === 'imported'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Imported ({importedCount})
            </button>
          </div>

          <div className="flex gap-3">
            {filter === 'unimported' && unimportedCount > 0 && (
              <button
                onClick={selectAll}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-all"
              >
                {selectedIds.size === unimportedCount ? 'Deselect All' : 'Select All'}
              </button>
            )}
            
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={importSelected}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Import Selected ({selectedIds.size})
                </button>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all"
                >
                  <Download className="w-5 h-5" />
                  Export CSV ({selectedIds.size})
                </button>
              </>
            )}
          </div>
        </div>

        {/* Import Progress */}
        {loading && importProgress.total > 0 && (
          <div className="mb-8 bg-orange-50 border-2 border-orange-400 rounded-2xl p-8">
            <div className="text-center mb-6">
              <h3 className="text-slate-800 text-2xl font-bold mb-2">
                🤖 Importing & Enriching Startups...
              </h3>
              <p className="text-orange-700 mb-4">
                Processing {importProgress.total} startups in parallel batches of 10
              </p>
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {importProgress.current} / {importProgress.total} completed
              </div>
              {importProgress.currentName && (
                <div className="text-sm text-slate-600">
                  Currently processing: <strong>{importProgress.currentName}</strong>
                </div>
              )}
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-4 mb-3">
              <div 
                className="bg-gradient-to-r from-orange-500 to-orange-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
              />
            </div>
            
            <div className="text-slate-600 text-sm text-center">
              ⚡ Processing 10 startups per batch with 1s delay
            </div>
            <div className="text-slate-600 text-sm text-center mt-1">
              ⏱️ Estimated time: ~{Math.ceil(importProgress.total / 10)} seconds
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && importProgress.total === 0 && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-12 h-12 animate-spin text-cyan-400" />
          </div>
        )}

        {/* Startups List */}
        {!loading && startups.length === 0 && (
          <div className="text-center py-20">
            <Building2 className="w-20 h-20 mx-auto mb-6 text-gray-500" />
            <h3 className="text-2xl font-bold text-gray-400 mb-2">No Startups Found</h3>
            <p className="text-gray-500">
              Run the discovery script to find startups from RSS feeds:<br />
              <code className="bg-white/10 px-3 py-1 rounded mt-2 inline-block">
                node discover-startups-from-rss.js
              </code>
            </p>
          </div>
        )}

        {!loading && startups.length > 0 && (
          <div className="space-y-4">
            {startups.map((startup) => (
              <div
                key={startup.id}
                className={`bg-white/10 backdrop-blur-xl rounded-xl p-6 border-2 transition-all ${
                  startup.imported_to_startups
                    ? 'border-green-500/30 opacity-60'
                    : selectedIds.has(startup.id)
                    ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/20'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <div className="flex items-start gap-6">
                  {/* Checkbox */}
                  {!startup.imported_to_startups && (
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(startup.id)}
                        onChange={() => toggleSelect(startup.id)}
                        className="w-6 h-6 rounded border-2 border-cyan-500/50 bg-white/10 checked:bg-cyan-500"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
                          {startup.name}
                          {startup.imported_to_startups && (
                            <span className="flex items-center gap-1 text-sm font-normal bg-green-500/20 text-green-300 px-3 py-1 rounded-full border border-green-500/30">
                              <CheckCircle2 className="w-4 h-4" />
                              Imported
                            </span>
                          )}
                        </h3>
                        {startup.website && (
                          <a
                            href={startup.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm"
                          >
                            {startup.website}
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>

                      {startup.funding_amount && (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-orange-400">
                            {startup.funding_amount}
                          </div>
                          {startup.funding_stage && (
                            <div className="text-sm text-gray-400">{startup.funding_stage}</div>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-gray-300 mb-4">{startup.description}</p>

                    {startup.investors_mentioned && startup.investors_mentioned.length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm text-gray-400 mb-2">Investors:</div>
                        <div className="flex flex-wrap gap-2">
                          {startup.investors_mentioned.map((investor, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm border border-purple-500/30"
                            >
                              {investor}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-6 text-sm text-gray-400">
                      <span className="flex items-center gap-2">
                        📰 {startup.rss_source}
                      </span>
                      <span>
                        🗓️ {new Date(startup.discovered_at).toLocaleDateString()}
                      </span>
                      <a
                        href={startup.article_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                      >
                        View Article <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-12 bg-blue-500/10 backdrop-blur-xl rounded-xl p-8 border-2 border-blue-500/30">
          <h3 className="text-2xl font-bold text-blue-300 mb-4">💡 How to Use</h3>
          <div className="space-y-3 text-gray-300">
            <p><strong>1. Run Discovery:</strong> Execute <code className="bg-white/10 px-2 py-1 rounded">node discover-startups-from-rss.js</code> to scrape RSS feeds</p>
            <p><strong>2. Review Startups:</strong> Check the discovered startups here and select ones you want to import</p>
            <p><strong>3. Export CSV:</strong> Export selected startups to CSV for bulk upload to startup profiles</p>
            <p><strong>4. Import:</strong> Use the bulk upload feature to add startups to your database</p>
          </div>
        </div>

      </div>
    </div>
  );
}
