import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UploadedStartup {
  id: number;
  name: string;
  tagline?: string;
  pitch?: string;
  url?: string;
  [key: string]: any;
}

export default function ProcessUploads() {
  const navigate = useNavigate();
  const [uploads, setUploads] = useState<UploadedStartup[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [generatedCards, setGeneratedCards] = useState<any[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    // Load uploaded startups from localStorage
    const stored = localStorage.getItem('uploadedStartups');
    if (stored) {
      const parsed = JSON.parse(stored);
      setUploads(parsed);
      console.log(`Found ${parsed.length} uploaded startups:`, parsed);
    } else {
      console.log('No uploadedStartups found in localStorage');
      console.log('All localStorage keys:', Object.keys(localStorage));
    }
  }, []);

  const generateFullStartupCard = async (upload: UploadedStartup, index: number) => {
    // Generate a full StartupCard with all required fields
    const card = {
      id: 11 + index, // Start after existing 11 startups
      name: upload.name || `Startup ${index + 1}`,
      tagline: upload.tagline || 'Revolutionary startup',
      pitch: upload.pitch || `${upload.name} is building the future`,
      description: upload.pitch || `${upload.name} is transforming the industry`,
      marketSize: upload.marketSize || '$10B+ market opportunity',
      unique: upload.unique || 'Unique value proposition',
      raise: upload.raise || '$2M Seed',
      stage: 1,
      yesVotes: 0,
      noVotes: 0,
      hotness: 3.5,
      answersCount: 5,
      industries: upload.industries || ['tech', 'saas'],
      
      // Five key points for the card
      fivePoints: upload.fivePoints || [
        upload.pitch || 'Innovative solution',
        upload.marketSize || '$10B+ market',
        'Strong founding team',
        'Early traction',
        upload.raise || 'Raising $2M'
      ],
      
      // Secret fact for honeypot
      secretFact: generateSecretFact(upload),
      
      comments: [],
      url: upload.url || '',
      uploadedAt: upload.uploadedAt
    };

    return card;
  };

  const generateSecretFact = (upload: UploadedStartup): string => {
    const facts = [
      '🤫 Founders met at Y Combinator',
      '🤫 First 100 customers came from Product Hunt',
      '🤫 Started in a coffee shop',
      '🤫 Rejected by 20 VCs before finding product-market fit',
      '🤫 CEO previously built a unicorn',
      '🤫 Early investor from Sequoia',
      '🤫 Built by ex-Google engineers',
      '🤫 Launched during pandemic and 10x\'d revenue',
      '🤫 Turned down acquisition offer from Facebook',
      '🤫 Secretly backed by a Fortune 500 company',
      '🤫 Already profitable with zero marketing spend',
      '🤫 First prototype built in 48 hours'
    ];
    
    return facts[Math.floor(Math.random() * facts.length)];
  };

  const processAll = async () => {
    setProcessing(true);
    const cards = [];
    
    for (let i = 0; i < uploads.length; i++) {
      setCurrentIndex(i);
      const card = await generateFullStartupCard(uploads[i], i);
      cards.push(card);
      
      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    setGeneratedCards(cards);
    setProcessing(false);
    
    console.log('Generated cards:', cards);
  };

  const exportToCode = () => {
    if (generatedCards.length === 0) return;
    
    const code = generatedCards.map(card => {
      return `  {
    id: ${card.id},
    name: '${card.name}',
    tagline: '${card.tagline}',
    pitch: '${card.pitch}',
    description: '${card.description}',
    marketSize: '${card.marketSize}',
    unique: '${card.unique}',
    raise: '${card.raise}',
    stage: ${card.stage},
    yesVotes: ${card.yesVotes},
    noVotes: ${card.noVotes},
    hotness: ${card.hotness},
    answersCount: ${card.answersCount},
    secretFact: '${card.secretFact}',
    comments: [],
    fivePoints: [
      '${card.fivePoints[0]}',
      '${card.fivePoints[1]}',
      '${card.fivePoints[2]}',
      '${card.fivePoints[3]}',
      '${card.fivePoints[4]}'
    ]
  }`;
    }).join(',\n');
    
    // Copy to clipboard
    navigator.clipboard.writeText(code);
    alert(`✅ Copied ${generatedCards.length} startup cards to clipboard!\n\nPaste them into src/data/startupData.ts`);
  };

  const saveToStartupData = () => {
    // This would save to the actual startupData.ts file
    alert('💡 For now, use "Export Code" button and manually paste into startupData.ts\n\nNext iteration: automatic file updates!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-5xl font-black bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
              🍯 Process Uploaded Startups
            </h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition-colors font-bold text-lg"
            >
              ← Back
            </button>
          </div>

          <div className="mb-8 p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg">
            <h2 className="text-3xl font-black text-white mb-4">
              📊 Status
            </h2>
            <div className="space-y-3 text-xl">
              <p className="text-white"><strong className="font-black">Uploaded Startups:</strong> <span className="text-yellow-300 font-bold text-2xl">{uploads.length}</span></p>
              <p className="text-white"><strong className="font-black">Generated Cards:</strong> <span className="text-green-300 font-bold text-2xl">{generatedCards.length}</span></p>
              {processing && (
                <p className="text-yellow-300 font-black animate-pulse text-xl">
                  ⚙️ Processing {currentIndex + 1} of {uploads.length}...
                </p>
              )}
            </div>
            
            {/* Debug Toggle */}
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="mt-4 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors font-bold text-sm"
            >
              {showDebug ? '🔼 Hide Debug Info' : '🔽 Show Debug Info'}
            </button>
            
            {showDebug && (
              <div className="mt-4 p-4 bg-white/10 rounded-lg text-white text-sm">
                <p className="font-bold mb-2">localStorage Keys:</p>
                <ul className="list-disc list-inside space-y-1">
                  {Object.keys(localStorage).map(key => (
                    <li key={key} className="font-mono">
                      {key} {key.includes('upload') && '← 👀'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={processAll}
              disabled={processing || uploads.length === 0}
              className="flex-1 px-8 py-6 bg-gradient-to-r from-orange-600 to-yellow-600 text-white rounded-2xl font-black text-xl hover:from-orange-700 hover:to-yellow-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl hover:scale-105"
            >
              {processing ? '⚙️ Processing...' : '🚀 Generate All StartupCards'}
            </button>
            
            <button
              onClick={exportToCode}
              disabled={generatedCards.length === 0}
              className="px-8 py-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-black text-xl hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl hover:scale-105"
            >
              📋 Export Code
            </button>
          </div>

          {/* Uploaded Startups List */}
          <div className="space-y-4">
            <h2 className="text-3xl font-black text-gray-900 mb-6">📦 Uploaded Startups</h2>
            {uploads.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl">
                <p className="text-2xl font-bold text-gray-800 mb-3">No uploaded startups found in localStorage</p>
                <p className="text-lg text-gray-700 mb-6">Go to Bulk Upload page to upload startups</p>
                <button
                  onClick={() => navigate('/admin/bulk-upload')}
                  className="px-6 py-3 bg-gradient-to-r from-orange-600 to-yellow-600 text-white rounded-xl font-bold hover:from-orange-700 hover:to-yellow-700 transition-all"
                >
                  📊 Go to Bulk Upload
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {uploads.map((startup, index) => (
                  <div
                    key={startup.id}
                    className={`p-6 rounded-2xl border-4 transition-all shadow-lg ${
                      processing && index === currentIndex
                        ? 'border-orange-600 bg-gradient-to-br from-orange-100 to-yellow-100 scale-105 shadow-2xl'
                        : index < currentIndex && processing
                        ? 'border-green-600 bg-gradient-to-br from-green-100 to-emerald-100'
                        : 'border-gray-300 bg-gradient-to-br from-white to-gray-50 hover:border-purple-400 hover:shadow-xl'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-black text-xl text-gray-900">{startup.name}</h3>
                      {generatedCards[index] && (
                        <span className="text-green-600 text-3xl">✓</span>
                      )}
                    </div>
                    <p className="text-base text-gray-800 mb-3 font-semibold">{startup.tagline}</p>
                    {startup.url && (
                      <a
                        href={startup.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-700 hover:text-blue-900 hover:underline font-bold break-all"
                      >
                        🔗 {startup.url.substring(0, 50)}...
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generated Cards Preview */}
          {generatedCards.length > 0 && (
            <div className="mt-12">
              <h2 className="text-3xl font-black text-gray-900 mb-6">✨ Generated StartupCards</h2>
              <div className="bg-gray-900 text-green-400 p-6 rounded-2xl overflow-auto max-h-96 font-mono text-sm shadow-2xl border-4 border-green-500">
                <pre>{JSON.stringify(generatedCards, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
