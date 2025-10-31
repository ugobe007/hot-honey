import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface StartupFile {
  id: string;
  companyName: string;
  url: string;
  fivePoints: string[];
  additionalData: any;
  scrapedAt: string;
  validated: boolean;
  validationEmailSent: boolean;
}

const StartupReview: React.FC = () => {
  const [startups, setStartups] = useState<StartupFile[]>([]);
  const [filter, setFilter] = useState<'all' | 'validated' | 'pending'>('all');
  const [exportCode, setExportCode] = useState('');
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    loadStartups();
  }, []);

  const loadStartups = () => {
    const stored = localStorage.getItem('startupFiles');
    if (stored) {
      const files = JSON.parse(stored);
      setStartups(files);
    }
  };

  const filteredStartups = startups.filter(startup => {
    if (filter === 'validated') return startup.validated;
    if (filter === 'pending') return !startup.validated;
    return true;
  });

  const generateStartupCode = () => {
    const code = filteredStartups.map((startup, index) => {
      const id = `startup-${index + 12}`; // Continuing from existing 11
      return `  {
    id: '${id}',
    name: '${startup.companyName}',
    tagline: '${startup.fivePoints[0].substring(0, 100)}',
    pitch: '${startup.fivePoints[1]}',
    fivePoints: [
      '${startup.fivePoints[0]}',
      '${startup.fivePoints[1]}',
      '${startup.fivePoints[2]}',
      '${startup.fivePoints[3]}',
      '${startup.fivePoints[4]}'
    ],
    secretFact: 'AI-researched startup from Hot Money Honey',
    logo: '${startup.url}/favicon.ico',
    website: '${startup.url}',
    scrapedAt: '${startup.scrapedAt}'
  }`;
    }).join(',\n\n');

    const fullCode = `// Generated StartupCards - Add to startupData.ts\n\nexport const newStartups = [\n${code}\n];\n\n// Instructions:\n// 1. Copy this entire array\n// 2. Open src/data/startupData.ts\n// 3. Add these objects to the startups array\n// 4. Save and deploy!\n\n// Total: ${filteredStartups.length} startups`;
    
    setExportCode(fullCode);
    setShowExport(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(exportCode);
    alert('✅ Code copied to clipboard!');
  };

  const stats = {
    total: startups.length,
    validated: startups.filter(s => s.validated).length,
    pending: startups.filter(s => !s.validated).length,
    withTeamInfo: startups.filter(s => !s.fivePoints[3].includes('not available')).length,
    withFunding: startups.filter(s => !s.fivePoints[4].includes('not available')).length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/admin/startup-processor" className="text-pink-300 hover:text-pink-100 mb-4 inline-block">
            ← Back to Processor
          </Link>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-300 to-pink-300 text-transparent bg-clip-text">
            🎯 Startup Review Dashboard
          </h1>
          <p className="text-xl text-pink-200">
            Review all processed startups before adding them to your site
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="text-4xl font-bold text-yellow-300">{stats.total}</div>
            <div className="text-sm text-pink-200">Total Startups</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="text-4xl font-bold text-green-300">{stats.validated}</div>
            <div className="text-sm text-pink-200">Validated</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="text-4xl font-bold text-orange-300">{stats.pending}</div>
            <div className="text-sm text-pink-200">Pending</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="text-4xl font-bold text-blue-300">{stats.withTeamInfo}</div>
            <div className="text-sm text-pink-200">With Team Data</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="text-4xl font-bold text-purple-300">{stats.withFunding}</div>
            <div className="text-sm text-pink-200">With Funding</div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              filter === 'all'
                ? 'bg-gradient-to-r from-yellow-400 to-pink-400 text-black'
                : 'bg-white/10 hover:bg-white/20 border border-white/20'
            }`}
          >
            All ({startups.length})
          </button>
          <button
            onClick={() => setFilter('validated')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              filter === 'validated'
                ? 'bg-gradient-to-r from-yellow-400 to-pink-400 text-black'
                : 'bg-white/10 hover:bg-white/20 border border-white/20'
            }`}
          >
            ✅ Validated ({stats.validated})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              filter === 'pending'
                ? 'bg-gradient-to-r from-yellow-400 to-pink-400 text-black'
                : 'bg-white/10 hover:bg-white/20 border border-white/20'
            }`}
          >
            ⏳ Pending ({stats.pending})
          </button>
          <button
            onClick={generateStartupCode}
            className="ml-auto px-8 py-3 rounded-xl font-bold bg-gradient-to-r from-green-400 to-blue-400 text-black hover:scale-105 transition-transform"
          >
            📦 Export to Code
          </button>
        </div>

        {/* Export Code Modal */}
        {showExport && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl p-8 max-w-4xl w-full max-h-[80vh] overflow-auto border-4 border-yellow-400">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold text-yellow-300">📦 Export Code</h2>
                <button
                  onClick={() => setShowExport(false)}
                  className="text-4xl text-pink-300 hover:text-pink-100"
                >
                  ×
                </button>
              </div>
              <p className="text-pink-200 mb-4">
                Copy this code and paste it into <code className="bg-white/10 px-2 py-1 rounded">src/data/startupData.ts</code>
              </p>
              <pre className="bg-black/50 p-6 rounded-xl overflow-auto text-sm border border-white/20 mb-4">
                <code className="text-green-300">{exportCode}</code>
              </pre>
              <div className="flex gap-4">
                <button
                  onClick={copyToClipboard}
                  className="flex-1 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-green-400 to-blue-400 text-black hover:scale-105 transition-transform"
                >
                  📋 Copy to Clipboard
                </button>
                <button
                  onClick={() => setShowExport(false)}
                  className="px-6 py-3 rounded-xl font-semibold bg-white/10 hover:bg-white/20 border border-white/20"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Startup Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStartups.map((startup, index) => (
            <div
              key={startup.id}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:border-yellow-400 transition-all hover:scale-105"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-yellow-300 mb-1">
                    {startup.companyName}
                  </h3>
                  <a
                    href={startup.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-pink-300 hover:text-pink-100 break-all"
                  >
                    {startup.url}
                  </a>
                </div>
                {startup.validated && (
                  <div className="ml-2">
                    <span className="text-2xl">✅</span>
                  </div>
                )}
              </div>

              {/* 5 Points */}
              <div className="space-y-3 mb-4">
                <div>
                  <div className="text-xs text-pink-300 font-semibold mb-1">💎 VALUE PROP</div>
                  <div className="text-sm text-white/90">{startup.fivePoints[0]}</div>
                </div>
                <div>
                  <div className="text-xs text-pink-300 font-semibold mb-1">⚠️ MARKET PROBLEM</div>
                  <div className="text-sm text-white/90">{startup.fivePoints[1]}</div>
                </div>
                <div>
                  <div className="text-xs text-pink-300 font-semibold mb-1">💡 SOLUTION</div>
                  <div className="text-sm text-white/90">{startup.fivePoints[2]}</div>
                </div>
                <div>
                  <div className="text-xs text-pink-300 font-semibold mb-1">👥 TEAM</div>
                  <div className={`text-sm ${startup.fivePoints[3].includes('not available') ? 'text-orange-300 italic' : 'text-white/90'}`}>
                    {startup.fivePoints[3]}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-pink-300 font-semibold mb-1">💰 INVESTMENT</div>
                  <div className={`text-sm ${startup.fivePoints[4].includes('not available') ? 'text-orange-300 italic' : 'text-white/90'}`}>
                    {startup.fivePoints[4]}
                  </div>
                </div>
              </div>

              {/* Meta */}
              <div className="text-xs text-pink-200 pt-3 border-t border-white/10">
                Scraped: {new Date(startup.scrapedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>

        {filteredStartups.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-xl text-pink-200">No startups found with this filter</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StartupReview;
