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

  useEffect(() => {
    // Load uploaded startups from localStorage
    const stored = localStorage.getItem('uploadedStartups');
    if (stored) {
      const parsed = JSON.parse(stored);
      setUploads(parsed);
      console.log(`Found ${parsed.length} uploaded startups:`, parsed);
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
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
              🍯 Process Uploaded Startups
            </h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← Back
            </button>
          </div>

          <div className="mb-8 p-6 bg-blue-50 rounded-xl border-2 border-blue-200">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">
              📊 Status
            </h2>
            <div className="space-y-2 text-lg">
              <p><strong>Uploaded Startups:</strong> {uploads.length}</p>
              <p><strong>Generated Cards:</strong> {generatedCards.length}</p>
              {processing && (
                <p className="text-orange-600 font-semibold animate-pulse">
                  Processing {currentIndex + 1} of {uploads.length}...
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={processAll}
              disabled={processing || uploads.length === 0}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-bold text-lg hover:from-orange-600 hover:to-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? '⚙️ Processing...' : '🚀 Generate All StartupCards'}
            </button>
            
            <button
              onClick={exportToCode}
              disabled={generatedCards.length === 0}
              className="px-6 py-4 bg-green-500 text-white rounded-xl font-bold text-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📋 Export Code
            </button>
          </div>

          {/* Uploaded Startups List */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Uploaded Startups</h2>
            {uploads.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-xl">No uploaded startups found in localStorage</p>
                <p className="mt-2">Go to Bulk Upload page to upload startups</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {uploads.map((startup, index) => (
                  <div
                    key={startup.id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      processing && index === currentIndex
                        ? 'border-orange-500 bg-orange-50 scale-105'
                        : index < currentIndex && processing
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-lg">{startup.name}</h3>
                      {generatedCards[index] && (
                        <span className="text-green-500 text-2xl">✓</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{startup.tagline}</p>
                    {startup.url && (
                      <a
                        href={startup.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline"
                      >
                        🔗 {startup.url.substring(0, 40)}...
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
              <h2 className="text-2xl font-bold mb-4">✨ Generated StartupCards</h2>
              <div className="bg-gray-900 text-green-400 p-6 rounded-xl overflow-auto max-h-96 font-mono text-sm">
                <pre>{JSON.stringify(generatedCards, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
