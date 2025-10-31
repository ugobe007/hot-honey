import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store';
import StartupCardOfficial from '../components/StartupCardOfficial';

interface UploadedURL {
  url: string;
  uploadedAt: string;
  processed: boolean;
}

interface StartupFile {
  id: string;
  companyName: string;
  url: string;
  fivePoints: string[];
  validated: boolean;
  validationEmailSent: boolean;
  scrapedAt: string;
}

export default function ActivityTracker() {
  const navigate = useNavigate();
  const portfolio = useStore((state) => state.portfolio);
  
  const [uploadedURLs, setUploadedURLs] = useState<UploadedURL[]>([]);
  const [startupFiles, setStartupFiles] = useState<StartupFile[]>([]);
  const [activeTab, setActiveTab] = useState<'voted' | 'urls' | 'pending'>('voted');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Load uploaded URLs
    const urls = localStorage.getItem('uploadedURLs');
    if (urls) {
      setUploadedURLs(JSON.parse(urls));
    }

    // Load startup files
    const files = localStorage.getItem('startupFiles');
    if (files) {
      setStartupFiles(JSON.parse(files));
    }
  };

  const pendingValidations = startupFiles.filter(f => !f.validated);
  const validatedStartups = startupFiles.filter(f => f.validated);

  const sendValidationEmail = (startup: StartupFile) => {
    const subject = encodeURIComponent(`Confirm ${startup.companyName} on Hot Money Honey`);
    const body = encodeURIComponent(`Hi ${startup.companyName} team!

We're featuring your company on Hot Money Honey, our investor voting platform.

📍 Your Profile: ${startup.url}

🔥 Your 5 Key Points:
${startup.fivePoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}

Please reply to confirm these details are accurate.

Best,
Hot Money Honey Team`);

    const emailGuess = `hello@${new URL(startup.url).hostname}`;
    window.location.href = `mailto:${emailGuess}?subject=${subject}&body=${body}`;
    
    // Mark as sent
    const updatedFiles = startupFiles.map(f => 
      f.id === startup.id ? { ...f, validationEmailSent: true } : f
    );
    setStartupFiles(updatedFiles);
    localStorage.setItem('startupFiles', JSON.stringify(updatedFiles));
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
                  Activity Tracker
                </h1>
                <p className="text-xl text-gray-700 mt-2 font-semibold">
                  Track your votes, uploads, and validations
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

          {/* Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl text-white shadow-lg">
              <h3 className="text-2xl font-black mb-2">✓ Voted YES</h3>
              <p className="text-5xl font-black">{portfolio.length}</p>
              <p className="text-lg mt-2">StartupCards in portfolio</p>
            </div>
            
            <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white shadow-lg">
              <h3 className="text-2xl font-black mb-2">📎 Uploaded URLs</h3>
              <p className="text-5xl font-black">{uploadedURLs.length}</p>
              <p className="text-lg mt-2">Manual URL uploads</p>
            </div>
            
            <div className="p-6 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-2xl text-white shadow-lg">
              <h3 className="text-2xl font-black mb-2">⏳ Pending</h3>
              <p className="text-5xl font-black">{pendingValidations.length}</p>
              <p className="text-lg mt-2">Awaiting validation</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-3 mb-6 border-b-4 border-gray-200">
            <button
              onClick={() => setActiveTab('voted')}
              className={`px-6 py-3 font-black text-lg transition-all ${
                activeTab === 'voted'
                  ? 'border-b-4 border-green-600 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ✓ My Voted Startups ({portfolio.length})
            </button>
            <button
              onClick={() => setActiveTab('urls')}
              className={`px-6 py-3 font-black text-lg transition-all ${
                activeTab === 'urls'
                  ? 'border-b-4 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📎 Uploaded URLs ({uploadedURLs.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-3 font-black text-lg transition-all ${
                activeTab === 'pending'
                  ? 'border-b-4 border-orange-600 text-orange-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ⏳ Pending Validations ({pendingValidations.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {/* Voted Startups Tab */}
            {activeTab === 'voted' && (
              <div>
                {portfolio.length === 0 ? (
                  <div className="text-center py-16 bg-gray-100 rounded-2xl">
                    <p className="text-2xl font-bold text-gray-600 mb-4">No votes yet</p>
                    <Link
                      to="/vote"
                      className="px-6 py-3 bg-gradient-to-r from-orange-600 to-yellow-600 text-white rounded-xl font-bold hover:from-orange-700 hover:to-yellow-700"
                    >
                      Start Voting
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {portfolio.map((startup) => (
                      <div key={startup.id} className="transform scale-95">
                        <StartupCardOfficial
                          startup={startup}
                          onVote={(voteType) => console.log('Voted', voteType)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Uploaded URLs Tab */}
            {activeTab === 'urls' && (
              <div>
                {uploadedURLs.length === 0 ? (
                  <div className="text-center py-16 bg-gray-100 rounded-2xl">
                    <p className="text-2xl font-bold text-gray-600 mb-4">No uploaded URLs</p>
                    <Link
                      to="/admin/startup-processor"
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-purple-700"
                    >
                      Upload URLs
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {uploadedURLs.map((upload, index) => (
                      <div
                        key={index}
                        className="p-6 border-4 border-blue-300 rounded-2xl bg-blue-50 hover:border-blue-500 transition-all"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <a
                              href={upload.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xl font-bold text-blue-700 hover:underline"
                            >
                              🔗 {upload.url}
                            </a>
                            <p className="text-sm text-gray-600 mt-1">
                              Uploaded: {new Date(upload.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                          {upload.processed ? (
                            <span className="px-4 py-2 bg-green-600 text-white rounded-full font-bold text-sm">
                              ✓ Processed
                            </span>
                          ) : (
                            <span className="px-4 py-2 bg-orange-500 text-white rounded-full font-bold text-sm">
                              ⏳ Pending
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pending Validations Tab */}
            {activeTab === 'pending' && (
              <div>
                {pendingValidations.length === 0 ? (
                  <div className="text-center py-16 bg-gray-100 rounded-2xl">
                    <p className="text-2xl font-bold text-gray-600 mb-4">
                      {validatedStartups.length > 0 
                        ? '🎉 All startups validated!' 
                        : 'No pending validations'}
                    </p>
                    {validatedStartups.length > 0 && (
                      <p className="text-lg text-gray-500">
                        {validatedStartups.length} startup{validatedStartups.length !== 1 ? 's' : ''} validated
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {pendingValidations.map((startup) => (
                      <div
                        key={startup.id}
                        className="p-6 border-4 border-orange-400 rounded-2xl bg-gradient-to-br from-orange-50 to-yellow-50"
                      >
                        <div className="mb-4">
                          <h3 className="text-3xl font-black text-gray-900">{startup.companyName}</h3>
                          <a
                            href={startup.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 hover:underline font-bold"
                          >
                            🔗 {startup.url}
                          </a>
                          <p className="text-sm text-gray-600 mt-1">
                            Created: {new Date(startup.scrapedAt).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="mb-4">
                          <h4 className="text-xl font-black text-gray-900 mb-2">🔥 5 Key Points:</h4>
                          <ol className="space-y-2">
                            {startup.fivePoints.map((point, i) => (
                              <li key={i} className="flex items-start">
                                <span className="font-black text-orange-600 mr-2">{i + 1}.</span>
                                <span className="text-gray-800 font-semibold">{point}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
