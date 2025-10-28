import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface ParsedStartup {
  id?: string;
  name: string;
  tagline?: string;
  pitch?: string;
  problem?: string;
  solution?: string;
  marketSize?: string;
  teamCompanies?: string;
  investmentAmount?: string;
  industries?: string[];
  status?: 'pending' | 'approved' | 'rejected';
  aiGenerated?: string[]; // Fields that were AI-generated
  originalData?: any;
}

export default function BulkUpload() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsedStartups, setParsedStartups] = useState<ParsedStartup[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'complete'>('upload');
  const [processingCount, setProcessingCount] = useState(0);

  // Check admin access
  const isAdmin = () => {
    const userProfile = localStorage.getItem('userProfile');
    if (userProfile) {
      const profile = JSON.parse(userProfile);
      return profile.email === 'admin@hotmoneyhoney.com' || profile.isAdmin;
    }
    return false;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header.toLowerCase().replace(/\s+/g, '_')] = values[index] || '';
      });
      data.push(row);
    }

    return data;
  };

  const generateMissingData = async (startup: any): Promise<ParsedStartup> => {
    const aiGenerated: string[] = [];
    
    // Simulate AI generation (in real app, this would call OpenAI API)
    const result: ParsedStartup = {
      name: startup.name || startup.startup_name || 'Unnamed Startup',
      tagline: startup.tagline || startup.tag_line || '',
      pitch: startup.pitch || startup.description || '',
      problem: startup.problem || '',
      solution: startup.solution || '',
      marketSize: startup.market_size || startup.market || '',
      teamCompanies: startup.team_companies || startup.team || '',
      investmentAmount: startup.investment_amount || startup.raise || startup.raising || '',
      industries: startup.industries ? startup.industries.split(',').map((i: string) => i.trim().toLowerCase()) : [],
      status: 'pending',
      aiGenerated: [],
      originalData: startup
    };

    // AI generation for missing fields (simulated)
    if (!result.problem && result.name) {
      result.problem = `Addresses key challenges in ${result.industries?.[0] || 'the industry'}`;
      aiGenerated.push('problem');
    }

    if (!result.solution && result.name) {
      result.solution = `Innovative ${result.industries?.[0] || 'technology'} solution for modern businesses`;
      aiGenerated.push('solution');
    }

    if (!result.marketSize) {
      result.marketSize = '$1B+ market opportunity';
      aiGenerated.push('marketSize');
    }

    if (!result.tagline && result.name) {
      result.tagline = `Next-gen ${result.industries?.[0] || 'platform'}`;
      aiGenerated.push('tagline');
    }

    if (!result.pitch) {
      result.pitch = `${result.name} is transforming the ${result.industries?.[0] || 'industry'}`;
      aiGenerated.push('pitch');
    }

    result.aiGenerated = aiGenerated;
    return result;
  };

  const handleFile = async (file: File) => {
    const fileName = file.name.toLowerCase();
    
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx')) {
      alert('❌ Please upload a CSV or Excel file');
      return;
    }

    setUploading(true);
    setProcessingCount(0);

    try {
      const text = await file.text();
      const rawData = parseCSV(text);
      
      console.log('Parsed rows:', rawData.length);
      
      // Process each startup with AI completion
      const processed: ParsedStartup[] = [];
      for (let i = 0; i < rawData.length; i++) {
        setProcessingCount(i + 1);
        const startup = await generateMissingData(rawData[i]);
        processed.push(startup);
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setParsedStartups(processed);
      setCurrentStep('preview');
      setUploading(false);
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('❌ Error parsing file. Please check the format.');
      setUploading(false);
    }
  };

  const toggleApproval = (index: number) => {
    setParsedStartups(prev => prev.map((s, i) => 
      i === index 
        ? { ...s, status: s.status === 'approved' ? 'pending' : 'approved' }
        : s
    ));
  };

  const approveAll = () => {
    setParsedStartups(prev => prev.map(s => ({ ...s, status: 'approved' as const })));
  };

  const saveAllApproved = () => {
    const approved = parsedStartups.filter(s => s.status === 'approved');
    
    if (approved.length === 0) {
      alert('⚠️ No startups approved. Please approve at least one startup.');
      return;
    }

    // Get existing startups
    const existing = localStorage.getItem('uploadedStartups');
    const existingStartups = existing ? JSON.parse(existing) : [];
    
    // Convert to full startup format
    const newStartups = approved.map((s, index) => ({
      id: Date.now() + index,
      name: s.name,
      tagline: s.tagline,
      pitch: s.pitch,
      description: s.pitch,
      marketSize: s.marketSize || 'TBD',
      unique: s.solution || 'TBD',
      raise: s.investmentAmount || 'TBD',
      stage: 1,
      yesVotes: 0,
      noVotes: 0,
      hotness: 0,
      answersCount: 0,
      industries: s.industries,
      fivePoints: [
        s.problem || 'Problem statement',
        s.solution || 'Solution description',
        s.marketSize || 'Market size',
        s.teamCompanies || 'Team background',
        s.investmentAmount || 'Investment amount'
      ],
      aiGenerated: s.aiGenerated,
      uploadedAt: new Date().toISOString()
    }));

    // Save to localStorage
    const allStartups = [...existingStartups, ...newStartups];
    localStorage.setItem('uploadedStartups', JSON.stringify(allStartups));
    
    alert(`✅ Successfully uploaded ${approved.length} startups!`);
    setCurrentStep('complete');
  };

  const downloadTemplate = () => {
    const template = `Startup Name,Tagline,Pitch,Problem,Solution,Market Size,Team Companies,Investment Amount,Industries
Example Startup,AI for Everyone,Making AI accessible,"AI is too complex","Simple AI platform","$50B market","Google, Microsoft","$2M Seed","ai,saas"
Another Company,FinTech Revolution,Democratizing finance,"Finance is broken","Modern banking app","$100B TAM","Goldman Sachs","$5M Series A","fintech"`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hot-money-honey-template.csv';
    a.click();
  };

  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-12 text-center max-w-2xl">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Admin Access Required</h1>
          <p className="text-lg text-gray-600 mb-6">
            This page is only accessible to administrators.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-2xl transition-all"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950 p-8 relative">
      {/* Radial green accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-96 h-96 bg-green-400 rounded-full blur-3xl opacity-40" style={{left: '20%', top: '40%'}}></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg transition-all"
          >
            ← Back to Dashboard
          </button>
          <div className="flex gap-4 items-center">
            {(() => {
              const uploaded = localStorage.getItem('uploadedStartups');
              const count = uploaded ? JSON.parse(uploaded).length : 0;
              return count > 0 ? (
                <div className="bg-green-500 text-white font-bold py-3 px-6 rounded-2xl shadow-lg">
                  ✅ {count} Startups in Database
                </div>
              ) : null;
            })()}
            <button
              onClick={() => navigate('/admin/document-upload')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg transition-all"
            >
              📄 Scan Documents
            </button>
            <button
              onClick={downloadTemplate}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg transition-all"
            >
              📥 Download Template
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-3xl shadow-2xl p-12">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">📊</div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 bg-clip-text text-transparent mb-2">
              Bulk Upload Startups
            </h1>
            <p className="text-lg text-gray-700">
              Upload Excel/CSV files • AI auto-completes missing data
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-full font-semibold ${currentStep === 'upload' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                1. Upload
              </div>
              <div className="w-12 h-0.5 bg-gray-300"></div>
              <div className={`px-4 py-2 rounded-full font-semibold ${currentStep === 'preview' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                2. Preview
              </div>
              <div className="w-12 h-0.5 bg-gray-300"></div>
              <div className={`px-4 py-2 rounded-full font-semibold ${currentStep === 'complete' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                3. Complete
              </div>
            </div>
          </div>

          {/* Upload Step */}
          {currentStep === 'upload' && (
            <div>
              <div
                className={`border-4 border-dashed rounded-2xl p-16 text-center transition-all ${
                  dragActive ? 'border-orange-500 bg-orange-50' : 'border-gray-300 bg-gray-50'
                } ${uploading ? 'opacity-50' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {uploading ? (
                  <div>
                    <div className="text-6xl mb-4 animate-bounce">⏳</div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Processing...</h3>
                    <p className="text-gray-600">
                      Parsing file and generating missing data with AI
                    </p>
                    {processingCount > 0 && (
                      <p className="text-orange-600 font-semibold mt-4">
                        Processed {processingCount} startups
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="text-6xl mb-4">📤</div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      Drag & Drop CSV or Excel File
                    </h3>
                    <p className="text-gray-600 mb-6">
                      or click to browse
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-2xl transition-all"
                    >
                      Choose File
                    </button>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="mt-8 bg-blue-50 border-2 border-blue-300 rounded-xl p-6">
                <h4 className="font-bold text-blue-700 mb-3">📋 How it works:</h4>
                <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                  <li>Download the CSV template above</li>
                  <li>Fill in startup data (name, tagline, problem, solution, etc.)</li>
                  <li>Leave fields blank if you don't have the data - AI will generate it!</li>
                  <li>Upload your file and review the parsed data</li>
                  <li>Approve startups and save to database</li>
                </ol>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {currentStep === 'preview' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    Review {parsedStartups.length} Startups
                  </h3>
                  <p className="text-gray-600">
                    {parsedStartups.filter(s => s.status === 'approved').length} approved
                  </p>
                </div>
                <button
                  onClick={approveAll}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors"
                >
                  ✅ Approve All
                </button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
                {parsedStartups.map((startup, index) => (
                  <div 
                    key={index}
                    className={`border-2 rounded-xl p-4 transition-all ${
                      startup.status === 'approved' 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-800">{startup.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">{startup.tagline}</p>
                        {startup.aiGenerated && startup.aiGenerated.length > 0 && (
                          <div className="flex gap-2 flex-wrap mb-2">
                            {startup.aiGenerated.map(field => (
                              <span key={field} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                🤖 AI: {field}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          Industries: {startup.industries?.join(', ') || 'None'}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleApproval(index)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                          startup.status === 'approved'
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                        }`}
                      >
                        {startup.status === 'approved' ? '✓ Approved' : 'Approve'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setCurrentStep('upload');
                    setParsedStartups([]);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 font-bold py-3 px-6 rounded-2xl hover:bg-gray-400 transition-all"
                >
                  ← Upload Different File
                </button>
                <button
                  onClick={saveAllApproved}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-2xl transition-all"
                >
                  💾 Save {parsedStartups.filter(s => s.status === 'approved').length} Startups
                </button>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {currentStep === 'complete' && (
            <div className="text-center py-12">
              <div className="text-8xl mb-6">🎉</div>
              <h3 className="text-3xl font-bold text-gray-800 mb-4">
                Upload Complete!
              </h3>
              <p className="text-lg text-gray-600 mb-8">
                Your startups have been added to the database
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setCurrentStep('upload');
                    setParsedStartups([]);
                  }}
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-2xl transition-all"
                >
                  Upload More
                </button>
                <button
                  onClick={() => navigate('/vote')}
                  className="px-8 py-3 bg-white border-2 border-orange-500 text-orange-600 font-bold rounded-2xl hover:bg-orange-50 transition-all"
                >
                  View Startups
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
