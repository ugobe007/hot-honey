import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface StartupFile {
  id: string;
  companyName: string;
  url: string;
  fivePoints: string[];
  additionalData: {
    videos?: string[];
    presentations?: string[];
    socialMedia?: {
      linkedin?: string;
      twitter?: string;
    };
    foundedYear?: string;
    founders?: string[];
    funding?: string;
  };
  scrapedAt: string;
  validated: boolean;
  validationEmailSent: boolean;
  contactEmail?: string;
}

export default function StartupProcessor() {
  const navigate = useNavigate();
  const [urls, setUrls] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'input' | 'processing' | 'review'>('input');
  const [startupFiles, setStartupFiles] = useState<StartupFile[]>([]);
  const [processingIndex, setProcessingIndex] = useState(0);

  const parseUrls = (text: string): string[] => {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('http://') || line.startsWith('https://'));
  };

  const scrapeUrl = async (url: string): Promise<StartupFile> => {
    // Call backend API for real web scraping
    try {
      const response = await fetch('http://localhost:3001/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });

      const result = await response.json();
      
      if (!result.success) {
        console.warn(`⚠️ Scraping encountered issues for ${url}:`, result.error);
      }

      return {
        id: `startup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        companyName: result.data.companyName,
        url: result.data.url,
        fivePoints: result.data.fivePoints,
        additionalData: result.data.additionalData,
        scrapedAt: result.data.scrapedAt,
        validated: false,
        validationEmailSent: false
      };
    } catch (error) {
      console.error(`❌ Failed to scrape ${url}:`, error);
      
      // Fallback: Create a manual entry with placeholders
      const domain = new URL(url).hostname.replace('www.', '').split('.')[0];
      const companyName = domain.charAt(0).toUpperCase() + domain.slice(1);
      
      return {
        id: `startup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        companyName,
        url,
        fivePoints: [
          `${companyName} - VALUE PROP NEEDS MANUAL RESEARCH`,
          'MARKET PROBLEM NEEDS MANUAL RESEARCH',
          'SOLUTION NEEDS MANUAL RESEARCH',
          'TEAM BACKGROUND NEEDS MANUAL RESEARCH',
          'INVESTMENT DETAILS NEED MANUAL RESEARCH'
        ],
        additionalData: {
          videos: [],
          presentations: [],
          socialMedia: {},
          error: 'Backend scraping failed - manual research required'
        },
        scrapedAt: new Date().toISOString(),
        validated: false,
        validationEmailSent: false
      };
    }
  };

  const processUrls = async () => {
    const urlList = parseUrls(urls);
    
    if (urlList.length === 0) {
      alert('❌ Please enter at least one valid URL (must start with http:// or https://)');
      return;
    }

    setProcessing(true);
    setCurrentStep('processing');
    const files: StartupFile[] = [];

    for (let i = 0; i < urlList.length; i++) {
      setProcessingIndex(i);
      try {
        const file = await scrapeUrl(urlList[i]);
        files.push(file);
      } catch (error) {
        console.error(`Error processing ${urlList[i]}:`, error);
      }
    }

    setStartupFiles(files);
    
    // Save to localStorage
    const existing = localStorage.getItem('startupFiles');
    const existingFiles = existing ? JSON.parse(existing) : [];
    localStorage.setItem('startupFiles', JSON.stringify([...existingFiles, ...files]));
    
    setProcessing(false);
    setCurrentStep('review');
  };

  const sendValidationEmail = (startup: StartupFile) => {
    const subject = encodeURIComponent(`Confirm ${startup.companyName} on Hot Money Honey 🍯`);
    const body = encodeURIComponent(`Hi ${startup.companyName} team!

We're featuring your company on Hot Money Honey, our investor voting platform.

📍 Your Profile:
${startup.url}

🔥 Your 5 Key Points:
${startup.fivePoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}

Please reply to confirm these details are accurate, or let us know what changes you'd like.

Looking forward to connecting!

Best,
Hot Money Honey Team
https://hot-honey.fly.dev`);

    // Try to get contact email from common patterns
    const emailGuess = startup.contactEmail || `hello@${new URL(startup.url).hostname}`;
    
    // Open email client with pre-filled message
    window.location.href = `mailto:${emailGuess}?subject=${subject}&body=${body}`;
    
    // Mark as sent
    const updatedFiles = startupFiles.map(f => 
      f.id === startup.id ? { ...f, validationEmailSent: true } : f
    );
    setStartupFiles(updatedFiles);
    localStorage.setItem('startupFiles', JSON.stringify(updatedFiles));
  };

  const markAsValidated = (startupId: string) => {
    const updatedFiles = startupFiles.map(f => 
      f.id === startupId ? { ...f, validated: true } : f
    );
    setStartupFiles(updatedFiles);
    localStorage.setItem('startupFiles', JSON.stringify(updatedFiles));
  };

  const exportToStartupData = () => {
    const code = startupFiles.map((startup, index) => {
      return `  {
    id: ${11 + index},
    name: '${startup.companyName}',
    tagline: '${startup.fivePoints[0]}',
    pitch: '${startup.fivePoints.join('. ')}',
    description: '${startup.fivePoints[0]}',
    marketSize: '${startup.additionalData.funding || 'TBD'}',
    unique: '${startup.fivePoints[3]}',
    raise: '${startup.additionalData.funding || 'TBD'}',
    stage: 1,
    yesVotes: 0,
    noVotes: 0,
    hotness: 3.5,
    answersCount: 5,
    secretFact: '🤫 ${startup.additionalData.foundedYear ? `Founded in ${startup.additionalData.foundedYear}` : 'Stealth mode startup'}',
    comments: [],
    url: '${startup.url}',
    validated: ${startup.validated},
    fivePoints: [
      '${startup.fivePoints[0]}',
      '${startup.fivePoints[1]}',
      '${startup.fivePoints[2]}',
      '${startup.fivePoints[3]}',
      '${startup.fivePoints[4]}'
    ]
  }`;
    }).join(',\n');

    navigator.clipboard.writeText(code);
    alert(`✅ Copied ${startupFiles.length} startup cards to clipboard!\n\nPaste into src/data/startupData.ts`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <img src="/images/logo.png" alt="Hot Honey" className="h-20 w-20" />
              <div>
                <h1 className="text-5xl font-black bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
                  Hot Honey Startup Processor
                </h1>
                <p className="text-xl text-gray-700 mt-2 font-semibold">
                  Load URLs → Scrape Data → Create Files → Validate Startups
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition-colors font-bold text-lg"
            >
              ← Back
            </button>
          </div>

          {/* Step 1: Input URLs */}
          {currentStep === 'input' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
                <h2 className="text-3xl font-black mb-3">📝 Step 1: Load Startup URLs</h2>
                <p className="text-lg">Paste one URL per line. We'll scrape each site for the 5 key points.</p>
              </div>

              <textarea
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder="https://startup1.com&#10;https://startup2.com&#10;https://startup3.com"
                className="w-full h-96 p-6 border-4 border-gray-300 rounded-2xl text-lg font-mono focus:border-orange-500 focus:outline-none"
              />

              <div className="flex gap-4">
                <button
                  onClick={processUrls}
                  disabled={processing || !urls.trim()}
                  className="flex-1 px-8 py-6 bg-gradient-to-r from-orange-600 to-yellow-600 text-white rounded-2xl font-black text-2xl hover:from-orange-700 hover:to-yellow-700 transition-all disabled:opacity-50 shadow-xl hover:scale-105"
                >
                  🚀 Process {parseUrls(urls).length} URLs
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Processing */}
          {currentStep === 'processing' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-orange-600 to-yellow-600 rounded-2xl p-8 text-white text-center">
                <h2 className="text-4xl font-black mb-4">⚙️ Processing Startups...</h2>
                <p className="text-2xl font-bold">
                  {processingIndex + 1} of {parseUrls(urls).length}
                </p>
                <div className="mt-6 w-full bg-white/30 rounded-full h-6">
                  <div 
                    className="bg-white h-6 rounded-full transition-all duration-500"
                    style={{ width: `${((processingIndex + 1) / parseUrls(urls).length) * 100}%` }}
                  />
                </div>
                <p className="mt-4 text-lg">Scraping URL, extracting 5 points, finding additional data...</p>
              </div>
            </div>
          )}

          {/* Step 3: Review & Validate */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              {/* Workflow Guide */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white">
                <h3 className="text-2xl font-black mb-4">🎯 Hot Honey Workflow Decision Points:</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">1️⃣</span>
                    <div>
                      <strong className="text-xl">VALIDATE Each Startup:</strong>
                      <p className="text-lg">Click "📧 Send Validation Email" to reach out to each company and build direct connections. Email will be tracked.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">2️⃣</span>
                    <div>
                      <strong className="text-xl">EXPORT to Code:</strong>
                      <p className="text-lg">Click "📋 Export All to Code" to generate StartupCards code. Then paste into startupData.ts to publish them live!</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">3️⃣</span>
                    <div>
                      <strong className="text-xl">PROCESS More URLs:</strong>
                      <p className="text-lg">Click "➕ Add More URLs" below to upload another batch (these will be saved separately).</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-black mb-2">✅ Review Startup Files</h2>
                  <p className="text-lg">Total Files Created: <span className="text-2xl font-black">{startupFiles.length}</span></p>
                  <p className="text-sm mt-2">5 Points Structure: 1️⃣ Value Prop | 2️⃣ Market Problem | 3️⃣ Solution | 4️⃣ Team | 5️⃣ Investment</p>
                </div>
                <button
                  onClick={exportToStartupData}
                  className="px-6 py-4 bg-white text-green-700 rounded-xl font-black text-lg hover:bg-gray-100 transition-colors shadow-lg"
                >
                  📋 Export All to Code
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {startupFiles.map((startup, index) => (
                  <div
                    key={startup.id}
                    className={`p-6 rounded-2xl border-4 transition-all ${
                      startup.validated
                        ? 'border-green-600 bg-gradient-to-br from-green-50 to-emerald-50'
                        : 'border-orange-400 bg-gradient-to-br from-orange-50 to-yellow-50'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-3xl font-black text-gray-900">{startup.companyName}</h3>
                        <a 
                          href={startup.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-700 hover:underline font-bold text-lg"
                        >
                          🔗 {startup.url}
                        </a>
                      </div>
                      {startup.validated && (
                        <span className="px-4 py-2 bg-green-600 text-white rounded-full font-black text-sm">
                          ✓ VALIDATED
                        </span>
                      )}
                    </div>

                    {/* 5 Points */}
                    <div className="mb-4">
                      <h4 className="text-xl font-black text-gray-900 mb-3">🔥 Hot Honey 5 Points:</h4>
                      <div className="space-y-3">
                        {startup.fivePoints.map((point, i) => {
                          const labels = ['💎 Value Prop', '⚠️ Market Problem', '💡 Solution', '👥 Team', '💰 Investment'];
                          return (
                            <div key={i} className="flex items-start">
                              <span className="font-black text-orange-600 mr-3 text-lg min-w-[140px]">{labels[i]}:</span>
                              <span className="text-gray-800 font-semibold text-lg">{point}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Additional Data */}
                    <div className="mb-4 p-4 bg-white/70 rounded-xl">
                      <h4 className="text-xl font-black text-gray-900 mb-3">📊 Additional Data:</h4>
                      <div className="grid grid-cols-2 gap-4 text-base">
                        <div>
                          <strong className="text-gray-700">Founded:</strong> {startup.additionalData.foundedYear}
                        </div>
                        <div>
                          <strong className="text-gray-700">Funding:</strong> {startup.additionalData.funding}
                        </div>
                        {startup.additionalData.videos && startup.additionalData.videos.length > 0 && (
                          <div className="col-span-2">
                            <strong className="text-gray-700">Videos:</strong> {startup.additionalData.videos.length} found
                          </div>
                        )}
                        {startup.additionalData.presentations && startup.additionalData.presentations.length > 0 && (
                          <div className="col-span-2">
                            <strong className="text-gray-700">Presentations:</strong> {startup.additionalData.presentations.length} found
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => sendValidationEmail(startup)}
                        disabled={startup.validationEmailSent}
                        className={`flex-1 px-6 py-4 rounded-xl font-black text-lg transition-all ${
                          startup.validationEmailSent
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                        }`}
                      >
                        {startup.validationEmailSent ? '✓ Email Sent' : '📧 Send Validation Email'}
                      </button>
                      
                      {!startup.validated && (
                        <button
                          onClick={() => markAsValidated(startup.id)}
                          className="px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-black text-lg hover:from-green-700 hover:to-emerald-700 transition-all"
                        >
                          ✓ Mark Validated
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => navigate('/admin/startup-review')}
                  className="px-8 py-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-black text-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-xl"
                >
                  🎯 Review & Export
                  <p className="text-sm font-normal mt-1">See all StartupCards & export code</p>
                </button>

                <button
                  onClick={() => {
                    setCurrentStep('input');
                    setUrls('');
                    // Don't clear startupFiles - keep them saved
                  }}
                  className="px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-black text-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-xl"
                >
                  ➕ Add More URLs
                  <p className="text-sm font-normal mt-1">Process another batch (previous saves kept)</p>
                </button>
                
                <button
                  onClick={() => navigate('/admin/tracker')}
                  className="px-8 py-6 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-2xl font-black text-xl hover:from-teal-700 hover:to-cyan-700 transition-all shadow-xl"
                >
                  📊 View Activity Tracker
                  <p className="text-sm font-normal mt-1">See all uploads, votes & validations</p>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
