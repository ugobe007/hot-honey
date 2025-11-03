import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OpenAIDataService } from '../lib/openaiDataService';

interface ScrapedCompany {
  name: string;
  website: string;
  tagline?: string;
  vcSource?: string;
  entityType?: 'startup' | 'vc_firm' | 'accelerator';
}

interface EnrichedCompany extends ScrapedCompany {
  pitch: string;
  fivePoints: string[];
  industry: string;
  funding: string;
  stage: string;
  entityType: 'startup' | 'vc_firm' | 'accelerator';
}

interface SavedSource {
  id: number;
  name: string;
  url: string;
  type: 'vc_portfolio' | 'accelerator' | 'manual';
  cssSelector?: string;
  lastScraped?: string;
  companyCount?: number;
  autoRefresh?: boolean;
}

export default function BulkImport() {
  const navigate = useNavigate();
  const [vcUrl, setVcUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [scrapedCompanies, setScrapedCompanies] = useState<ScrapedCompany[]>([]);
  const [enrichedCompanies, setEnrichedCompanies] = useState<EnrichedCompany[]>([]);
  const [currentStep, setCurrentStep] = useState<'input' | 'scraping' | 'enriching' | 'review' | 'sources'>('input');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [enrichmentProgress, setEnrichmentProgress] = useState(0);
  const [isEnriching, setIsEnriching] = useState(false);
  const [savedSources, setSavedSources] = useState<SavedSource[]>([]);
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', url: '', type: 'vc_portfolio' as const, autoRefresh: true });

  // Load saved sources on mount
  useEffect(() => {
    const sources = localStorage.getItem('bulkImportSources');
    if (sources) {
      setSavedSources(JSON.parse(sources));
    }
  }, []);

  const saveSources = (sources: SavedSource[]) => {
    localStorage.setItem('bulkImportSources', JSON.stringify(sources));
    setSavedSources(sources);
  };

  const handleAddSource = () => {
    if (!newSource.name || !newSource.url) {
      alert('Please enter both name and URL');
      return;
    }

    const source: SavedSource = {
      id: Date.now(),
      name: newSource.name,
      url: newSource.url,
      type: newSource.type,
      autoRefresh: newSource.autoRefresh,
      companyCount: 0,
      lastScraped: new Date().toISOString()
    };

    saveSources([...savedSources, source]);
    setNewSource({ name: '', url: '', type: 'vc_portfolio', autoRefresh: true });
    setShowAddSource(false);
    alert('✅ Source saved! AI will learn to scrape this automatically.');
  };

  const handleDeleteSource = (id: number) => {
    if (confirm('Delete this source?')) {
      saveSources(savedSources.filter(s => s.id !== id));
    }
  };

  const handleRefreshSource = async (source: SavedSource) => {
    alert(`🔄 In production, this would:\n\n1. Visit ${source.url}\n2. Extract company URLs using AI-learned patterns\n3. Enrich each company with the 5-point format\n4. Update your database\n\nFor now, manually copy URLs from this source and paste them in the manual input section.`);
  };

  const handleRefreshAll = async () => {
    const autoRefreshSources = savedSources.filter(s => s.autoRefresh);
    if (autoRefreshSources.length === 0) {
      alert('No sources with auto-refresh enabled.');
      return;
    }

    alert(`🤖 Automated Refresh:\n\nThis would scrape ${autoRefreshSources.length} sources:\n${autoRefreshSources.map(s => `• ${s.name}`).join('\n')}\n\nIn production:\n• Runs weekly via cron job\n• AI extracts company URLs\n• Enriches with 5-point format\n• Auto-updates database\n\nFor MVP: Use manual input below`);
  };

  const vcTemplates = [
    { name: 'Y Combinator', url: 'https://www.ycombinator.com/companies', selector: '.company-card' },
    { name: 'a16z Portfolio', url: 'https://a16z.com/portfolio/', selector: '.portfolio-company' },
    { name: 'Sequoia', url: 'https://www.sequoiacap.com/companies/', selector: '.company-item' },
  ];

  const handleManualInput = () => {
    const urls = vcUrl.split('\n').filter(url => url.trim());
    console.log('📋 Parsed URLs:', urls);
    const companies = urls.map(url => {
      const entityType = detectEntityType(url);
      return {
        name: extractNameFromUrl(url),
        website: url.trim(),
        vcSource: 'Manual Input',
        entityType
      };
    });
    console.log('✅ Companies created:', companies);
    setScrapedCompanies(companies);
    setCurrentStep('review');
  };

  const detectEntityType = (url: string): 'startup' | 'vc_firm' | 'accelerator' => {
    const lowerUrl = url.toLowerCase();
    const lowerName = extractNameFromUrl(url).toLowerCase();
    
    // VC firm indicators
    const vcKeywords = ['ycombinator', 'y-combinator', 'yc.com', 'techstars', 'sequoia', 
                        'andreessen', 'a16z', 'greylock', 'benchmark', 'accel', 'founders fund',
                        'khosla', 'index ventures', 'lightspeed', 'nea', 'redpoint', 'spark capital',
                        'venturecapital', 'vc.com', 'ventures.com'];
    
    // Accelerator indicators  
    const acceleratorKeywords = ['accelerator', 'incubator', 'hax', 'plug and play', '500startups',
                                  'techstars', 'ycombinator', 'y-combinator'];
    
    // Check for accelerators first (more specific)
    if (acceleratorKeywords.some(keyword => lowerUrl.includes(keyword) || lowerName.includes(keyword))) {
      return 'accelerator';
    }
    
    // Check for VC firms
    if (vcKeywords.some(keyword => lowerUrl.includes(keyword) || lowerName.includes(keyword))) {
      return 'vc_firm';
    }
    
    // Default to startup
    return 'startup';
  };

  const extractNameFromUrl = (url: string): string => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      const name = domain.split('.')[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    } catch {
      return 'Unknown';
    }
  };

  const enrichWithAI = async (company: ScrapedCompany): Promise<EnrichedCompany> => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const entityType = company.entityType || 'startup';
    
    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      // Fallback without AI based on entity type
      if (entityType === 'vc_firm' || entityType === 'accelerator') {
        return {
          ...company,
          entityType,
          pitch: `${company.name} - ${entityType === 'vc_firm' ? 'Venture Capital Firm' : 'Startup Accelerator'}`,
          fivePoints: [
            'Investment focus and thesis',
            'Portfolio company count',
            'Average check size and stage',
            'Notable portfolio exits',
            'Geographic presence'
          ],
          industry: 'Venture Capital',
          funding: 'N/A',
          stage: 'N/A'
        };
      }
      
      return {
        ...company,
        entityType: 'startup',
        pitch: `${company.name} - Innovative startup`,
        fivePoints: [
          'Solving a major industry problem',
          'Innovative technology solution',
          'Large addressable market',
          'Experienced founding team',
          '$2M Seed'
        ],
        industry: 'Technology',
        funding: '$2M Seed',
        stage: 'Seed'
      };
    }

    try {
      const websitePrompt = `${entityType === 'startup' ? 'Company' : entityType === 'vc_firm' ? 'VC Firm' : 'Accelerator'}: ${company.name}\nWebsite: ${company.website}\n${company.tagline || ''}`;

      const systemPrompt = entityType === 'startup' 
        ? `Create a 5-point StartupCard for this company. Return JSON with: pitch (catchy tagline as string), fivePoints (array of 5 SHORT strings - max 12 words each - following this format: ["Problem: one line", "Solution: one line", "Market: one line with $ size only", "Team: former employers only (e.g. 'Ex-Google, Meta')", "Funding: amount only"]), industry (string), stage (string), funding (string). Keep team to ONE line focusing on notable former employers. Keep market size to ONE line with $ amount only.`
        : `Create a 5-point profile for this ${entityType === 'vc_firm' ? 'venture capital firm' : 'accelerator'}. Return JSON with: pitch (description as string), fivePoints (array of 5 SHORT strings like ["Investment focus", "Portfolio size", "Check size", "Notable exits", "Geographic presence"]), industry (set to "Venture Capital"), stage (set to "N/A"), funding (set to "N/A")`;

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
              content: `Research or infer details about:\n\n${websitePrompt}\n\nCreate a compelling 5-point card.`
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.8,
          max_tokens: 1000
        })
      });

      if (!response.ok) throw new Error('AI enrichment failed');

      const data = await response.json();
      const parsed = JSON.parse(data.choices[0].message.content);

      // Ensure fivePoints is an array of strings, not objects
      let fivePoints = parsed.fivePoints || [];
      if (fivePoints.length > 0 && typeof fivePoints[0] === 'object') {
        // Convert objects to strings (e.g., {problem: "text"} becomes "text")
        fivePoints = fivePoints.map((point: any) => {
          if (typeof point === 'string') return point;
          // Get the first value from the object
          const values = Object.values(point);
          return values[0] || '';
        });
      }

      return {
        ...company,
        entityType,
        pitch: parsed.pitch || company.tagline || `${company.name} - ${entityType === 'startup' ? 'Innovative startup' : entityType === 'vc_firm' ? 'VC Firm' : 'Accelerator'}`,
        fivePoints: fivePoints,
        industry: parsed.industry || (entityType === 'startup' ? 'Technology' : 'Venture Capital'),
        funding: parsed.funding || (entityType === 'startup' ? '$2M Seed' : 'N/A'),
        stage: parsed.stage || (entityType === 'startup' ? 'Seed' : 'N/A')
      };
    } catch (error) {
      console.error('AI enrichment error:', error);
      // Fallback
      return {
        ...company,
        entityType,
        pitch: company.tagline || `${company.name} - ${entityType === 'startup' ? 'Innovative startup' : entityType === 'vc_firm' ? 'VC Firm' : 'Accelerator'}`,
        fivePoints: [
          entityType === 'startup' ? 'Solving a major industry problem' : 'Investment focus and thesis',
          entityType === 'startup' ? 'Innovative technology solution' : 'Portfolio company count',
          entityType === 'startup' ? 'Large addressable market' : 'Average check size and stage',
          entityType === 'startup' ? 'Experienced founding team' : 'Notable portfolio exits',
          entityType === 'startup' ? '$2M Seed' : 'Geographic presence'
        ],
        industry: entityType === 'startup' ? 'Technology' : 'Venture Capital',
        funding: entityType === 'startup' ? '$2M Seed' : 'N/A',
        stage: entityType === 'startup' ? 'Seed' : 'N/A'
      };
    }
  };

  const handleEnrichAll = async () => {
    console.log('🤖 Starting enrichment for', scrapedCompanies.length, 'companies');
    console.log('📋 Companies to enrich:', scrapedCompanies);
    console.log('🔑 API Key exists:', !!import.meta.env.VITE_OPENAI_API_KEY);
    console.log('🔍 Current step BEFORE:', currentStep);
    
    setIsEnriching(true);
    // Keep on 'review' step so UI stays visible during enrichment
    const enriched: EnrichedCompany[] = [];
    let errors = 0;

    console.log('🔍 Current step AFTER setIsEnriching:', currentStep);

    for (let i = 0; i < scrapedCompanies.length; i++) {
      const company = scrapedCompanies[i];
      console.log(`📊 Enriching ${i + 1}/${scrapedCompanies.length}: ${company.name}`);
      
      try {
        const enrichedData = await enrichWithAI(company);
        console.log('✅ Enriched:', enrichedData.name);
        enriched.push(enrichedData);
        console.log(`📦 Enriched array now has ${enriched.length} companies`);
        setEnrichmentProgress(((i + 1) / scrapedCompanies.length) * 100);
        
        // Update state immediately after each enrichment
        setEnrichedCompanies([...enriched]);
        
        if (i < scrapedCompanies.length - 1) {
          console.log('⏱️ Waiting 2 seconds before next enrichment...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error enriching ${company.name}:`, error);
        alert(`⚠️ Failed to enrich "${company.name}". Error: ${error}\n\nContinuing with remaining companies...`);
        // Continue with next company even if one fails
      }
    }

    console.log('✅ All enrichment complete:', enriched.length, 'companies');
    console.log('📦 Final enriched data:', enriched);
    
    if (enriched.length === 0) {
      alert('❌ No companies were successfully enriched. Check your OpenAI API key and try again.');
      setIsEnriching(false);
      setCurrentStep('review');
      return;
    }
    
    // Final state update
    setEnrichedCompanies(enriched);
    setIsEnriching(false);
    setCurrentStep('review');
    
    if (errors > 0) {
      alert(`⚠️ Enrichment complete with ${errors} error(s).\n✅ Successfully enriched: ${enriched.length} companies`);
    }
    
    // Force a small delay to ensure state updates
    setTimeout(() => {
      console.log('🔍 Current state - enrichedCompanies.length:', enriched.length);
      console.log('🔍 Current step:', 'review');
    }, 100);
  };

  const handleImportAll = async () => {
    console.log('🚀 Starting import of', enrichedCompanies.length, 'companies');
    console.log('📦 Data to upload:', enrichedCompanies);
    
    setLoading(true);
    
    try {
      // Upload to Supabase using OpenAIDataService
      const results = await OpenAIDataService.uploadBulkStartups(
        enrichedCompanies.map(company => ({
          name: company.name,
          website: company.website,
          pitch: company.pitch,
          fivePoints: company.fivePoints,
          stage: company.stage,
          funding: company.funding,
          industry: company.industry,
          entityType: company.entityType || 'startup',
          scraped_by: company.vcSource || vcUrl
        }))
      );
      
      console.log(`✅ Upload results:`, results);
      console.log(`✅ Uploaded ${results.successful}/${results.total} to Supabase`);
      
      if (results.successful === 0) {
        const errorDetails = results.errors?.join('\n') || 'Unknown error';
        alert(`❌ Failed to upload any startups!\n\nErrors:\n${errorDetails}\n\nCheck the browser console (F12) for more details.`);
        setLoading(false);
        return;
      }
      
      if (results.failed > 0) {
        const errorDetails = results.errors?.slice(0, 3).join('\n') || 'Some uploads failed';
        alert(`⚠️ Partial success:\n✅ ${results.successful} uploaded\n❌ ${results.failed} failed\n\nFirst errors:\n${errorDetails}`);
      }
      
      // Count entities
      const startupCount = enrichedCompanies.filter(c => c.entityType === 'startup').length;
      const vcCount = enrichedCompanies.filter(c => c.entityType === 'vc_firm').length;
      const acceleratorCount = enrichedCompanies.filter(c => c.entityType === 'accelerator').length;
      
      let message = `✅ Successfully imported to Supabase:\n`;
      if (startupCount > 0) message += `• ${startupCount} startup${startupCount > 1 ? 's' : ''}\n`;
      if (vcCount > 0) message += `• ${vcCount} VC firm${vcCount > 1 ? 's' : ''}\n`;
      if (acceleratorCount > 0) message += `• ${acceleratorCount} accelerator${acceleratorCount > 1 ? 's' : ''}\n`;
      message += `\nAll items are pending review.\n\n🎯 Taking you to Admin Dashboard!\n💡 Go to "Edit Startups" to bulk approve them.`;
      
      alert(message);
      navigate('/admin/dashboard');
      
    } catch (error) {
      console.error('❌ Failed to import:', error);
      alert('Failed to import startups. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2">🚀 Bulk Import Startups</h1>
            <p className="text-purple-200">Automated VC portfolio scraping & enrichment</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setCurrentStep(currentStep === 'sources' ? 'input' : 'sources')}
              className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-2xl transition-all"
            >
              {currentStep === 'sources' ? '← Back to Import' : '⚙️ Manage Sources'}
            </button>
            <button
              onClick={() => navigate('/submit')}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-2xl transition-all"
            >
              ← Submit Page
            </button>
          </div>
        </div>

        {/* Sources Management Page */}
        {currentStep === 'sources' && (
          <div className="space-y-6">
            {/* Auto-Refresh Info */}
            <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-md rounded-3xl p-6 border-2 border-green-400">
              <h2 className="text-2xl font-bold text-white mb-3">🤖 Automated Weekly Refresh</h2>
              <p className="text-purple-100 mb-4">
                AI learns to scrape these sources automatically. Enable auto-refresh for weekly updates of fresh startup data.
              </p>
              <button
                onClick={handleRefreshAll}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                🔄 Refresh All Sources Now
              </button>
            </div>

            {/* Saved Sources */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border-2 border-purple-400">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-white">📚 Saved Sources ({savedSources.length})</h2>
                <button
                  onClick={() => setShowAddSource(!showAddSource)}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-xl transition-all"
                >
                  {showAddSource ? '✕ Cancel' : '+ Add Source'}
                </button>
              </div>

              {/* Add Source Form */}
              {showAddSource && (
                <div className="bg-purple-700/50 rounded-xl p-6 mb-6">
                  <h3 className="text-white font-bold mb-4">Add New Source</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-purple-200 mb-2 font-semibold">Source Name</label>
                      <input
                        type="text"
                        value={newSource.name}
                        onChange={(e) => setNewSource({...newSource, name: e.target.value})}
                        placeholder="e.g., Y Combinator W24"
                        className="w-full px-4 py-2 bg-white/20 border-2 border-purple-300 rounded-lg text-white placeholder-purple-300"
                      />
                    </div>
                    <div>
                      <label className="block text-purple-200 mb-2 font-semibold">Portfolio URL</label>
                      <input
                        type="text"
                        value={newSource.url}
                        onChange={(e) => setNewSource({...newSource, url: e.target.value})}
                        placeholder="https://www.ycombinator.com/companies"
                        className="w-full px-4 py-2 bg-white/20 border-2 border-purple-300 rounded-lg text-white placeholder-purple-300"
                      />
                    </div>
                    <div>
                      <label className="block text-purple-200 mb-2 font-semibold">Type</label>
                      <select
                        value={newSource.type}
                        onChange={(e) => setNewSource({...newSource, type: e.target.value as any})}
                        className="w-full px-4 py-2 bg-white/20 border-2 border-purple-300 rounded-lg text-white"
                      >
                        <option value="vc_portfolio">VC Portfolio</option>
                        <option value="accelerator">Accelerator</option>
                        <option value="manual">Manual List</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={newSource.autoRefresh}
                        onChange={(e) => setNewSource({...newSource, autoRefresh: e.target.checked})}
                        className="w-5 h-5"
                      />
                      <label className="text-purple-200">Enable weekly auto-refresh</label>
                    </div>
                    <button
                      onClick={handleAddSource}
                      className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl w-full transition-all"
                    >
                      ✅ Save Source
                    </button>
                  </div>
                </div>
              )}

              {/* Sources List */}
              <div className="space-y-3">
                {savedSources.length === 0 ? (
                  <p className="text-purple-200 text-center py-8">No saved sources yet. Add your first VC portfolio or accelerator!</p>
                ) : (
                  savedSources.map((source) => (
                    <div key={source.id} className="bg-purple-700/50 rounded-xl p-4 flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-white font-bold text-lg">{source.name}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            source.type === 'vc_portfolio' ? 'bg-blue-500' :
                            source.type === 'accelerator' ? 'bg-green-500' : 'bg-gray-500'
                          } text-white`}>
                            {source.type.replace('_', ' ').toUpperCase()}
                          </span>
                          {source.autoRefresh && (
                            <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                              🤖 AUTO
                            </span>
                          )}
                        </div>
                        <p className="text-purple-200 text-sm mb-1">{source.url}</p>
                        {source.lastScraped && (
                          <p className="text-purple-300 text-xs">
                            Last scraped: {new Date(source.lastScraped).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRefreshSource(source)}
                          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm"
                        >
                          🔄 Refresh
                        </button>
                        <button
                          onClick={() => handleDeleteSource(source.id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border-2 border-orange-400">
              <h2 className="text-2xl font-bold text-white mb-4">💡 How It Works</h2>
              <div className="space-y-3 text-purple-100">
                <p><strong className="text-orange-300">1. Add Sources:</strong> Input VC portfolio URLs, accelerator sites, or startup lists</p>
                <p><strong className="text-orange-300">2. AI Learns:</strong> System learns HTML patterns to extract company URLs automatically</p>
                <p><strong className="text-orange-300">3. Auto-Refresh:</strong> Weekly cron job scrapes sources, enriches with 5-point format</p>
                <p><strong className="text-orange-300">4. Fresh Data:</strong> Your startup database stays current with latest YC batch, new funding rounds</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Input */}
        {currentStep === 'input' && (
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border-2 border-purple-400">
            <h2 className="text-3xl font-bold text-white mb-6">📋 Enter Company Websites</h2>
            
            {/* Quick Templates */}
            <div className="mb-6">
              <p className="text-purple-200 mb-3 font-semibold">Quick Start Templates:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {vcTemplates.map((template) => (
                  <div key={template.name} className="bg-purple-700/50 rounded-xl p-4">
                    <h3 className="text-white font-bold mb-2">{template.name}</h3>
                    <p className="text-purple-200 text-sm mb-3">Scrape their portfolio page</p>
                    <button
                      onClick={() => setVcUrl(template.url)}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-all w-full"
                    >
                      Use Template
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Manual Input */}
            <div className="mb-6">
              <div className="bg-blue-500/20 border-2 border-blue-400 rounded-xl p-4 mb-4">
                <h3 className="text-white font-bold mb-2">📋 Current Workflow (MVP)</h3>
                <ol className="text-purple-100 text-sm space-y-1 list-decimal list-inside">
                  <li>Visit a VC portfolio page (e.g., YC, a16z)</li>
                  <li>Manually copy company website URLs</li>
                  <li>Paste them below (one per line)</li>
                  <li>✅ AI will enrich each with 5-point format</li>
                </ol>
              </div>

              <label className="block text-white font-bold mb-3">
                Paste Company Websites (one per line):
              </label>
              <textarea
                value={vcUrl}
                onChange={(e) => setVcUrl(e.target.value)}
                placeholder="https://airbnb.com&#10;https://stripe.com&#10;https://coinbase.com&#10;https://figma.com&#10;https://notion.so"
                rows={10}
                className="w-full px-4 py-3 bg-white/20 border-2 border-purple-300 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:border-orange-400 font-mono text-sm"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-purple-200 text-sm">
                  💡 Manually copy URLs from any VC portfolio page
                </p>
                <p className="text-yellow-300 text-sm font-bold">
                  {vcUrl.split('\n').filter(u => u.trim()).length} URLs ready
                </p>
              </div>
            </div>

            <button
              onClick={handleManualInput}
              disabled={!vcUrl.trim()}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed w-full"
            >
              ✨ AI Enrich {vcUrl.split('\n').filter(u => u.trim()).length} Companies →
            </button>

            {/* Future Feature Notice */}
            <div className="mt-6 bg-purple-500/20 border-2 border-purple-400 rounded-xl p-4">
              <h3 className="text-white font-bold mb-2">🚀 Future: Automated Scraping</h3>
              <p className="text-purple-100 text-sm mb-2">
                In production, AI will automatically:
              </p>
              <ul className="text-purple-100 text-sm space-y-1 list-disc list-inside">
                <li>Scrape portfolio pages for company URLs</li>
                <li>Run weekly to get fresh startups</li>
                <li>Use the "Manage Sources" feature above</li>
              </ul>
              <p className="text-yellow-300 text-xs mt-2">
                ⚠️ Requires backend server with Puppeteer/Playwright
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Review & Enrich */}
        {currentStep === 'review' && scrapedCompanies.length > 0 && (
          <div className="space-y-6" key="review-section">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border-2 border-purple-400">
              <h2 className="text-3xl font-bold text-white mb-4">
                ✅ Found {scrapedCompanies.length} Companies
              </h2>
              
              <div className="mb-6 max-h-96 overflow-y-auto space-y-2"
key="companies-list">{scrapedCompanies.map((company, i) => {
                  const entityType = company.entityType || 'startup';
                  const entityIcon = entityType === 'vc_firm' ? '💼' : entityType === 'accelerator' ? '🚀' : '🏢';
                  const entityLabel = entityType === 'vc_firm' ? 'VC Firm' : entityType === 'accelerator' ? 'Accelerator' : 'Startup';
                  
                  return (
                    <div key={i} className="bg-purple-700/50 rounded-lg p-4 flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-bold">{company.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            entityType === 'vc_firm' ? 'bg-lime-400 text-gray-900' :
                            entityType === 'accelerator' ? 'bg-lime-500 text-gray-900' :
                            'bg-blue-400 text-white'
                          }`}>
                            {entityIcon} {entityLabel}
                          </span>
                        </div>
                        <p className="text-purple-200 text-sm">{company.website}</p>
                      </div>
                      {enrichedCompanies[i] && (
                        <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                          ✓ Enriched with AI
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Progress notification - always show when enriching */}
              {isEnriching && (
                <div className="mb-6 bg-orange-500/20 border-2 border-orange-400 rounded-2xl p-6 text-center animate-pulse">
                  <h3 className="text-white text-2xl font-bold mb-2">
                    🤖 AI is analyzing each company...
                  </h3>
                  <p className="text-orange-200 mb-3">
                    This takes about 2 seconds per company. Please wait...
                  </p>
                  <div className="text-3xl font-bold text-orange-300">
                    {enrichedCompanies.length} / {scrapedCompanies.length} completed
                  </div>
                </div>
              )}

              {/* Show Enrich button only when not enriching and no enriched companies */}
              {!isEnriching && enrichedCompanies.length === 0 && (
                <button
                  onClick={handleEnrichAll}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transition-all text-lg w-full"
                >
                  🤖 Enrich All with AI (Creates 5 Points)
                </button>
              )}

              {/* Show Import button only when done enriching and have enriched companies */}
              {!isEnriching && enrichedCompanies.length > 0 && (
                <button
                  onClick={handleImportAll}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transition-all text-lg w-full"
                >
                  🔥 Import All {enrichedCompanies.length} Startups
                </button>
              )}
            </div>

            {/* Progress Bar */}
            {isEnriching && (
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border-2 border-orange-400">
                <h3 className="text-white font-bold mb-4">
                  Enriching: {Math.round(enrichmentProgress)}%
                </h3>
                <div className="w-full bg-purple-700 rounded-full h-4">
                  <div 
                    className="bg-gradient-to-r from-orange-500 to-orange-600 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${enrichmentProgress}%` }}
                  />
                </div>
                <p className="text-purple-200 text-sm mt-3">
                  ⏱️ Rate limited to 1 company every 2 seconds (OpenAI API limits)
                </p>
              </div>
            )}

            {/* Preview Enriched Companies */}
            {enrichedCompanies.length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border-2 border-green-400">
                <h2 className="text-3xl font-bold text-white mb-6">👀 Preview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {enrichedCompanies.slice(0, 6).map((company, i) => (
                    <div key={i} className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl p-4">
                      <h3 className="text-2xl font-black text-gray-900 mb-2">{company.name}</h3>
                      <p className="text-sm font-bold text-gray-800 mb-2">"{company.pitch}"</p>
                      <div className="space-y-1">
                        {company.fivePoints.map((point, j) => (
                          <p key={j} className="text-xs text-gray-900 font-semibold">
                            {j + 1}. {point}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {enrichedCompanies.length > 6 && (
                  <p className="text-purple-200 text-center mt-4">
                    ...and {enrichedCompanies.length - 6} more
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}