import { useState } from 'react';
import { submitStartup } from '../lib/investorService';

interface StartupData {
  name: string;
  website?: string;
  linkedin?: string;
  description?: string;
  pitch?: string;
  tagline?: string;
  deckUrl?: string;
  videoUrl?: string;
  teamSize?: number;
  founded?: number;
  raise?: string;
  stage?: number;
}

export default function StartupUploader() {
  const [uploadMethod, setUploadMethod] = useState<'url' | 'manual' | 'deck'>('url');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [deckFile, setDeckFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [researchingWithAI, setResearchingWithAI] = useState(false);
  const [extractedData, setExtractedData] = useState<StartupData | null>(null);
  const [manualData, setManualData] = useState<StartupData>({
    name: '',
    description: '',
    pitch: '',
    website: '',
    raise: '',
    stage: 0,
  });

  const handleUrlExtract = async () => {
    setLoading(true);
    try {
      // TODO: Implement web scraping/parsing
      // For now, mock data extraction
      const mockData: StartupData = {
        name: 'Example Startup',
        website: websiteUrl,
        linkedin: linkedinUrl,
        description: 'AI-powered platform for X',
        pitch: 'We help companies do Y by using Z',
        teamSize: 15,
        founded: 2023,
        raise: '$2M Seed',
        stage: 1,
      };
      
      setExtractedData(mockData);
      alert('✅ Data extracted! Review and edit below.');
    } catch (error) {
      alert('❌ Error extracting data. Please try manual entry.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeckUpload = async (file: File) => {
    setLoading(true);
    try {
      // TODO: Implement PDF parsing
      // Use libraries like pdf-parse or pdfjs-dist
      alert('📄 Deck uploaded! Parsing...');
      
      const mockData: StartupData = {
        name: 'Startup from Deck',
        description: 'Extracted from pitch deck',
        deckUrl: URL.createObjectURL(file),
      };
      
      setExtractedData(mockData);
    } catch (error) {
      alert('❌ Error parsing deck.');
    } finally {
      setLoading(false);
    }
  };

  const handleAIResearch = async () => {
    if (!websiteUrl) {
      alert('Please enter a website URL first!');
      return;
    }

    setResearchingWithAI(true);
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!apiKey || apiKey === 'your-openai-api-key-here') {
        alert('⚠️ OpenAI API key not configured. Please add it to your .env file.');
        setResearchingWithAI(false);
        return;
      }

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
              content: `You are a startup research assistant. Given a company website, provide comprehensive information in this exact JSON format:
{
  "name": "Company Name",
  "tagline": "One sentence value proposition",
  "description": "Company description (max 300 chars)",
  "pitch": "What they do and their unique value (max 300 chars)",
  "website": "Company website URL",
  "raise": "Funding amount if known (e.g. '$2M Seed' or 'Seeking $2M')",
  "stage": 0-2 (0=Pre-Seed, 1=Seed, 2=Series A),
  "teamSize": number,
  "founded": year
}

Fill ALL fields with best available information from the website and public sources.`
            },
            {
              role: 'user',
              content: `Research this startup: ${websiteUrl}

Provide comprehensive information about this company in the JSON format specified.`
            }
          ],
          response_format: { type: 'json_object' }
        })
      });

      const data = await response.json();
      const aiData = JSON.parse(data.choices[0].message.content);

      // Set extracted data from AI research
      setExtractedData({
        name: aiData.name || '',
        website: aiData.website || websiteUrl,
        description: aiData.description || '',
        pitch: aiData.pitch || '',
        tagline: aiData.tagline || '',
        raise: aiData.raise || '',
        stage: aiData.stage || 0,
        teamSize: aiData.teamSize,
        founded: aiData.founded,
      });

      alert('✅ AI research complete! Please review and edit the information below.');
    } catch (error: any) {
      console.error('AI research error:', error);
      alert(`❌ AI research failed: ${error.message}`);
    } finally {
      setResearchingWithAI(false);
    }
  };

  const handleSubmit = async () => {
    const dataToSubmit = uploadMethod === 'manual' ? manualData : extractedData;
    
    if (!dataToSubmit?.name) {
      alert('❌ Please provide at least a company name');
      return;
    }

    setLoading(true);
    try {
      // Submit to Supabase
      const { data, error } = await submitStartup({
        name: dataToSubmit.name,
        pitch: dataToSubmit.pitch,
        description: dataToSubmit.description,
        tagline: dataToSubmit.tagline,
        website: dataToSubmit.website || websiteUrl,
        linkedin: linkedinUrl,
        raise_amount: dataToSubmit.raise,
        stage: dataToSubmit.stage,
        source_type: uploadMethod,
        source_url: uploadMethod === 'url' ? websiteUrl : undefined,
        deck_filename: deckFile?.name,
        extracted_data: dataToSubmit,
        submitted_email: '', // TODO: Get from user input if needed
      });

      if (error) {
        console.error('Submission error:', error);
        alert('❌ Error submitting startup. Please try again.');
      } else {
        alert('🎉 Startup submitted successfully! Our team will review it soon.');
        // Reset form
        setExtractedData(null);
        setManualData({
          name: '',
          description: '',
          pitch: '',
          website: '',
          raise: '',
          stage: 0,
        });
        setWebsiteUrl('');
        setLinkedinUrl('');
        setDeckFile(null);
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('❌ Error submitting startup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border-2 border-purple-400/50">
          <h1 className="text-5xl font-bold text-white mb-2">🚀 Add Startup</h1>
          <p className="text-purple-200 mb-8">Upload startup data from URL, pitch deck, or manual entry</p>

          {/* Upload Method Selection */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setUploadMethod('url')}
              className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all ${
                uploadMethod === 'url'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-xl scale-105'
                  : 'bg-white/20 text-purple-200 hover:bg-white/30'
              }`}
            >
              🔗 From URL
            </button>
            <button
              onClick={() => setUploadMethod('deck')}
              className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all ${
                uploadMethod === 'deck'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-xl scale-105'
                  : 'bg-white/20 text-purple-200 hover:bg-white/30'
              }`}
            >
              📄 Upload Deck
            </button>
            <button
              onClick={() => setUploadMethod('manual')}
              className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all ${
                uploadMethod === 'manual'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-xl scale-105'
                  : 'bg-white/20 text-purple-200 hover:bg-white/30'
              }`}
            >
              ✍️ Manual Entry
            </button>
          </div>

          {/* URL Upload */}
          {uploadMethod === 'url' && (
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-white font-bold mb-2">Company Website</label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://company.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-purple-300 border-2 border-purple-400/50 focus:border-orange-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-white font-bold mb-2">LinkedIn (optional)</label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/company/..."
                  className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-purple-300 border-2 border-purple-400/50 focus:border-orange-400 outline-none"
                />
              </div>
              <button
                onClick={handleUrlExtract}
                disabled={!websiteUrl || loading}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '🔄 Extracting Data...' : '✨ Extract Data'}
              </button>
              
              <button
                onClick={handleAIResearch}
                disabled={researchingWithAI}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-3"
              >
                {researchingWithAI ? '🤖 AI Researching...' : '🤖 Fill with AI Research'}
              </button>
            </div>
          )}

          {/* Deck Upload */}
          {uploadMethod === 'deck' && (
            <div className="space-y-4 mb-8">
              <div className="border-4 border-dashed border-purple-400/50 rounded-xl p-8 text-center">
                <input
                  type="file"
                  accept=".pdf,.pptx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setDeckFile(file);
                      handleDeckUpload(file);
                    }
                  }}
                  className="hidden"
                  id="deck-upload"
                />
                <label htmlFor="deck-upload" className="cursor-pointer">
                  <div className="text-6xl mb-4">📄</div>
                  <p className="text-white font-bold text-lg mb-2">
                    {deckFile ? deckFile.name : 'Click to upload pitch deck'}
                  </p>
                  <p className="text-purple-300">PDF or PPTX format</p>
                </label>
              </div>
            </div>
          )}

          {/* Manual Entry */}
          {uploadMethod === 'manual' && (
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-white font-bold mb-2">Company Name *</label>
                <input
                  type="text"
                  value={manualData.name}
                  onChange={(e) => setManualData({...manualData, name: e.target.value})}
                  placeholder="Awesome Startup Inc"
                  className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-purple-300 border-2 border-purple-400/50 focus:border-orange-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-white font-bold mb-2">One-line Pitch *</label>
                <input
                  type="text"
                  value={manualData.pitch}
                  onChange={(e) => setManualData({...manualData, pitch: e.target.value})}
                  placeholder="AI-powered platform for X"
                  className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-purple-300 border-2 border-purple-400/50 focus:border-orange-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-white font-bold mb-2">Description</label>
                <textarea
                  value={manualData.description}
                  onChange={(e) => setManualData({...manualData, description: e.target.value})}
                  placeholder="Tell us more about your company..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-purple-300 border-2 border-purple-400/50 focus:border-orange-400 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-bold mb-2">Website</label>
                  <input
                    type="url"
                    value={manualData.website}
                    onChange={(e) => setManualData({...manualData, website: e.target.value})}
                    placeholder="https://..."
                    className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-purple-300 border-2 border-purple-400/50 focus:border-orange-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-white font-bold mb-2">Raise</label>
                  <input
                    type="text"
                    value={manualData.raise}
                    onChange={(e) => setManualData({...manualData, raise: e.target.value})}
                    placeholder="$2M Seed"
                    className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-purple-300 border-2 border-purple-400/50 focus:border-orange-400 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Extracted Data Preview */}
          {extractedData && uploadMethod !== 'manual' && (
            <div className="bg-green-500/20 border-2 border-green-400 rounded-xl p-6 mb-8">
              <h3 className="text-2xl font-bold text-green-400 mb-4">✅ Extracted Data</h3>
              <div className="space-y-2 text-white">
                <p><strong>Name:</strong> {extractedData.name}</p>
                <p><strong>Description:</strong> {extractedData.description}</p>
                <p><strong>Pitch:</strong> {extractedData.pitch}</p>
                <p><strong>Website:</strong> {extractedData.website}</p>
                {extractedData.raise && <p><strong>Raise:</strong> {extractedData.raise}</p>}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-lg rounded-xl shadow-xl transition-all"
          >
            🚀 Submit Startup
          </button>
        </div>
      </div>
    </div>
  );
}
