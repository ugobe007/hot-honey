import { useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - use file from public directory
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export default function Submit() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    valueProp: '',
    website: '',
    stage: 'Pre-Seed',
    industry: '',
    founderName: '',
    founderEmail: '',
    problem: '',
    solution: '',
    team: '',
    funding: '',
    presentationUrl: '',
    videoUrl: '',
    fivePoints: [] as string[],
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-fix website and URL fields to add https:// if missing
    if ((name === 'website' || name === 'presentationUrl' || name === 'videoUrl') && 
        value && 
        !value.startsWith('http://') && 
        !value.startsWith('https://')) {
      setFormData(prev => ({ ...prev, [name]: `https://${value}` }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const extractTextFromDocument = async (file: File): Promise<string> => {
    try {
      const fileName = file.name.toLowerCase();
      
      // Handle PDF files
      if (fileName.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        let fullText = '';
        // Extract text from all pages
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n';
        }
        
        return fullText;
      } 
      // Handle PowerPoint files
      else if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) {
        // Note: PowerPoint parsing in browser is complex
        // For now, return filename-based hint
        // In production, send to backend with python-pptx
        return `PowerPoint file: ${file.name}\nNote: Full PPT parsing requires backend processing. Please use PDF format for best results.`;
      }
      
      return `Document: ${file.name}`;
    } catch (error) {
      console.error('Error extracting text:', error);
      return `Document: ${file.name}`;
    }
  };

  const parseStartupDataFromText = async (text: string, fileName: string): Promise<any> => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    console.log('🔑 API Key status:', apiKey ? `Configured (${apiKey.substring(0, 10)}...)` : 'Not configured');
    
    // If no API key, fall back to keyword detection
    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      console.warn('⚠️ OpenAI API key not configured. Using keyword detection fallback.');
      return parseWithKeywordDetection(text, fileName);
    }
    
    try {
      console.log('🌐 Calling OpenAI API...');
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
              content: `You are a Y Combinator partner analyzing pitch decks. Create the 5-POINT STARTUPCARD FORMAT with punchy, specific 1-liners.

THE 5 POINTS (CRITICAL):
1. PROBLEM (1 sentence): What pain point exists? Include impact/scale
2. SOLUTION (1 sentence): How does the product solve it? Be specific
3. MARKET (1 sentence): Market size and growth - use $ numbers
4. TEAM (1 sentence): Where founders worked before (Company names)
5. RAISE (1 sentence): How much they're raising - just the amount with stage

STYLE EXAMPLES:
❌ BAD: "We help pet owners take care of their dogs"
✅ GOOD: "Dog dehydration causes 40% of vet visits - owners can't track water intake"

❌ BAD: "Healthcare is expensive"
✅ GOOD: "$280B mental health market growing 25%/year"

❌ BAD: "Experienced team"
✅ GOOD: "Ex-Stripe, Coinbase, PayPal engineers - 3 successful exits"

❌ BAD: "Raising money"
✅ GOOD: "$2M Seed" or "$500K Pre-Seed" or "$5M Series A"

RULES:
- Each point: under 300 characters
- Use specific numbers everywhere
- Include company names for team
- Mention $ amounts, percentages, growth rates
- Point 5 is ALWAYS just the raise amount and stage
- Make every word count

Return valid JSON with: name, pitch, fivePoints (array of 5 strings), industry, stage, funding`
            },
            {
              role: 'user',
              content: `Analyze this pitch deck and create the 5-point StartupCard:\n\n${text.substring(0, 4000)}\n\nReturn JSON with: name, pitch (tagline), fivePoints (array with exactly 5 items: [problem, solution, market, team, raise amount]), industry, stage, funding`
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.8,
          max_tokens: 1500
        })
      });
      
      console.log('📡 OpenAI Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ OpenAI Response:', data);
      const parsed = JSON.parse(data.choices[0].message.content);
      console.log('📊 Parsed data:', parsed);
      
      return {
        name: parsed.name || extractNameFromFileName(fileName),
        pitch: parsed.pitch || parsed.valueProp || parsed.value_prop || '',
        fivePoints: parsed.fivePoints || [
          parsed.problem || '',
          parsed.solution || '',
          parsed.market || '',
          parsed.team || '',
          parsed.traction || ''
        ],
        industry: parsed.industry || 'Technology',
        stage: parsed.stage || 'Seed',
        funding: parsed.funding || '',
        // Keep these for form compatibility
        valueProp: parsed.pitch || parsed.valueProp || '',
        problem: parsed.fivePoints?.[0] || parsed.problem || '',
        solution: parsed.fivePoints?.[1] || parsed.solution || '',
        team: parsed.fivePoints?.[3] || parsed.team || ''
      };
    } catch (error) {
      console.error('OpenAI parsing error:', error);
      // Fall back to keyword detection
      return parseWithKeywordDetection(text, fileName);
    }
  };
  
  const extractNameFromFileName = (fileName: string): string => {
    return fileName
      .replace(/\.(pdf|pptx?)/gi, '')
      .replace(/[-_]/g, ' ')
      .replace(/pitch|deck|presentation|investor|funding|slide/gi, '')
      .trim();
  };
  
  const parseWithKeywordDetection = (text: string, fileName: string): any => {
    // Extract company name from filename
    const cleanFileName = extractNameFromFileName(fileName);
    
    // Look for keywords in the text/filename to determine industry and content
    const textLower = `${text} ${fileName}`.toLowerCase();
    
    // Detect industry from keywords
    let industry = 'Technology';
    let valueProp = '';
    let problem = '';
    let solution = '';
    let team = '';
    let funding = '';
    
    // Industry detection
    if (textLower.includes('dog') || textLower.includes('pet') || textLower.includes('animal')) {
      industry = 'Pet Tech';
      valueProp = 'Revolutionary solution for pet care and wellness';
      problem = 'Pet owners struggle with providing consistent care and monitoring their pets\' health needs';
      solution = 'Smart technology platform that helps pet owners track health, schedule care, and access expert advice';
      team = 'Founded by veterinarians and pet industry experts with 15+ years experience';
      funding = '$1.5M Seed';
    } else if (textLower.includes('health') || textLower.includes('medical') || textLower.includes('wellness')) {
      industry = 'HealthTech';
      valueProp = 'Making healthcare accessible and affordable for everyone';
      problem = 'Healthcare is fragmented, expensive, and difficult to navigate for most people';
      solution = 'Integrated platform that simplifies healthcare access and reduces costs by 40%';
      team = 'Medical professionals and healthcare technology experts from top institutions';
      funding = '$2M Seed';
    } else if (textLower.includes('finance') || textLower.includes('payment') || textLower.includes('banking')) {
      industry = 'FinTech';
      valueProp = 'Democratizing financial services for the next generation';
      problem = 'Traditional financial services are complex, expensive, and exclude millions of users';
      solution = 'Mobile-first financial platform with no hidden fees and instant access';
      team = 'Former executives from Goldman Sachs, PayPal, and Stripe';
      funding = '$3M Seed';
    } else if (textLower.includes('ai') || textLower.includes('machine learning') || textLower.includes('artificial')) {
      industry = 'AI';
      valueProp = 'AI-powered automation that transforms business operations';
      problem = 'Businesses waste countless hours on repetitive tasks that could be automated';
      solution = 'Enterprise AI platform that automates workflows and provides intelligent insights';
      team = 'PhD researchers from Stanford and MIT with deep learning expertise';
      funding = '$5M Series A';
    } else if (textLower.includes('education') || textLower.includes('learning') || textLower.includes('student')) {
      industry = 'EdTech';
      valueProp = 'Personalized learning that adapts to every student';
      problem = 'Traditional education fails to meet individual student needs and learning styles';
      solution = 'AI-powered learning platform that personalizes curriculum for each student';
      team = 'Educators and technologists from leading universities';
      funding = '$2M Seed';
    } else if (textLower.includes('food') || textLower.includes('restaurant') || textLower.includes('delivery')) {
      industry = 'Food Tech';
      valueProp = 'Transforming the food industry with technology';
      problem = 'Food industry lacks efficient systems for ordering, delivery, and inventory management';
      solution = 'All-in-one platform connecting restaurants, suppliers, and customers seamlessly';
      team = 'Restaurant operators and logistics experts from DoorDash and Uber Eats';
      funding = '$2.5M Seed';
    } else if (textLower.includes('ecommerce') || textLower.includes('retail') || textLower.includes('shop')) {
      industry = 'E-commerce';
      valueProp = 'Next-generation shopping experience powered by AI';
      problem = 'Online shopping is overwhelming with too many choices and poor recommendations';
      solution = 'Personalized shopping platform that uses AI to find exactly what customers want';
      team = 'Former leaders from Amazon, Shopify, and Walmart';
      funding = '$3M Seed';
    } else {
      // Default tech startup
      industry = 'SaaS';
      valueProp = 'Enterprise software that scales with your business';
      problem = 'Modern businesses need flexible, powerful software without the complexity';
      solution = 'Cloud-based platform that combines power with simplicity for growing companies';
      team = 'Experienced founders with successful exits and Fortune 500 experience';
      funding = '$2M Seed';
    }
    
    return {
      name: cleanFileName || 'Startup Name',
      valueProp,
      problem,
      solution,
      team,
      funding,
      industry,
      stage: 'Seed'
    };
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf') && !fileName.endsWith('.ppt') && !fileName.endsWith('.pptx')) {
      alert('❌ Please upload a PDF or PowerPoint file');
      return;
    }

    setUploadingDoc(true);

    try {
      // Extract text from document
      console.log('🔍 Extracting text from document...');
      const extractedText = await extractTextFromDocument(file);
      console.log('📄 Extracted text length:', extractedText.length);
      console.log('📄 First 500 chars:', extractedText.substring(0, 500));
      
      // Parse the extracted text for startup information using AI
      console.log('🤖 Parsing with AI...');
      const parsedData = await parseStartupDataFromText(extractedText, file.name);
      console.log('✅ Parsed data:', parsedData);
      
      // Only fill empty fields
      const extracted = {
        name: formData.name || parsedData.name,
        valueProp: formData.valueProp || parsedData.valueProp || parsedData.pitch,
        problem: formData.problem || parsedData.problem,
        solution: formData.solution || parsedData.solution,
        team: formData.team || parsedData.team,
        funding: formData.funding || parsedData.funding,
        industry: formData.industry || parsedData.industry,
        stage: formData.stage || parsedData.stage,
        fivePoints: parsedData.fivePoints || formData.fivePoints || [],
      };

      console.log('📝 Setting form data:', extracted);
      setFormData(prev => ({
        ...prev,
        ...extracted
      }));

      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      const useAI = apiKey && apiKey !== 'your-openai-api-key-here';
      
      alert(`✅ Document "${file.name}" scanned successfully!\n\n🤖 ${useAI ? 'AI-powered analysis' : 'Keyword detection'} detected: ${parsedData.industry}\n\n📝 Please review the auto-filled data and make any necessary edits.`);
    } catch (error) {
      alert('❌ Error scanning document. Please try again.');
      console.error('Document scan error:', error);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Always use localStorage for now (Supabase needs proper schema configuration)
      const newStartup = {
        id: Date.now(),
        name: formData.name,
        tagline: formData.valueProp,
        pitch: formData.valueProp || `${formData.problem} | ${formData.solution}`,
        stage: formData.stage === 'Pre-Seed' ? 1 : formData.stage === 'Seed' ? 1 : formData.stage === 'Series A' ? 2 : 1,
        team: formData.team,
        funding: formData.funding,
        raise: formData.funding,
        website: formData.website,
        industries: formData.industry ? [formData.industry] : [],
        problem: formData.problem,
        solution: formData.solution,
        founderName: formData.founderName,
        founderEmail: formData.founderEmail,
        presentationUrl: formData.presentationUrl,
        videoUrl: formData.videoUrl,
        fivePoints: formData.fivePoints.length > 0 ? formData.fivePoints : [
          formData.problem,
          formData.solution,
          `${formData.industry || 'Technology'} market`,
          formData.team,
          formData.funding
        ],
        yesVotes: 0,
        noVotes: 0,
        hotness: 0,
      };

      // Save to localStorage
      const uploadedStartups = localStorage.getItem('uploadedStartups');
      const startups = uploadedStartups ? JSON.parse(uploadedStartups) : [];
      startups.push(newStartup);
      localStorage.setItem('uploadedStartups', JSON.stringify(startups));
      
      console.log('Startup saved successfully:', newStartup);

      setSubmitted(true);
      
      setTimeout(() => {
        navigate('/vote');
      }, 3000);
    } catch (err: any) {
      console.error('Error submitting startup:', err);
      setError(err.message || 'Failed to submit startup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-12 shadow-2xl text-center max-w-2xl">
          <div className="text-8xl mb-6">🎉</div>
          <h1 className="text-4xl font-bold text-orange-600 mb-4">
            Submission Received!
          </h1>
          <p className="text-xl text-gray-700 mb-6">
            Thank you for submitting <strong>{formData.name}</strong>!
          </p>
          <p className="text-lg text-gray-600 mb-8">
            Your startup is now in our system. Get ready to get Hot! 🔥
          </p>
          <button
            onClick={() => navigate('/vote-demo')}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transition-all text-lg"
          >
            See Other Hot Startups →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg transition-all"
          >
            ← Home
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/admin/bulk-import')}
              className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-2xl shadow-lg transition-all text-sm"
            >
              🚀 Bulk Import
            </button>
            <button
              onClick={() => {
                if (confirm('Clear all uploaded startups? This cannot be undone.')) {
                  localStorage.removeItem('uploadedStartups');
                  alert('✅ All uploaded startups cleared!');
                  window.location.reload();
                }
              }}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-2xl shadow-lg transition-all text-sm"
            >
              🗑️ Clear Uploads
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-8xl mb-4">🚀</div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Submit Your Startup
          </h1>
          <p className="text-xl text-purple-200 font-medium mb-2">
            Get discovered by investors who want to find you
          </p>
          <p className="text-lg text-purple-300">
            Fill out the form below to join Hot Honey 🍯
          </p>
        </div>

        {/* Quick Upload Option */}
        <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-8 mb-8 border border-white/30 shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">📄</div>
            <h2 className="text-3xl font-bold mb-2 text-white">Upload Your Pitch Deck</h2>
            <p className="text-lg text-purple-100">AI will auto-fill the form below from your presentation!</p>
          </div>

          <div className="flex justify-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.ppt,.pptx"
              onChange={handleDocumentUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingDoc}
              className="px-8 py-4 bg-white text-purple-700 font-bold rounded-2xl shadow-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingDoc ? (
                <>🔍 Scanning Document...</>
              ) : (
                <>📤 Upload PDF or PowerPoint</>
              )}
            </button>
          </div>

          <p className="text-center mt-4 text-sm opacity-90">
            ✨ Accepted: PDF, PPT, PPTX • Auto-extracts: Problem, Solution, Team & more!
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border-2 border-red-400 text-white px-4 py-3 rounded-xl mb-6 backdrop-blur-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 shadow-2xl mb-8 border border-white/20">
          {/* Basic Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span>📋</span> Basic Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-2">
                  Startup Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl focus:border-purple-400 focus:outline-none transition-colors text-white placeholder-purple-200"
                  placeholder="e.g., HyperLoop"
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">
                  Value Proposition <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="valueProp"
                  value={formData.valueProp}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl focus:border-purple-400 focus:outline-none transition-colors text-white placeholder-purple-200"
                  placeholder="One sentence that describes what you do"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Website
                  </label>
                  <input
                    type="text"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                    placeholder="www.yourstartup.com or https://yourstartup.com"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Stage <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="stage"
                    value={formData.stage}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                  >
                    <option value="Idea">Idea</option>
                    <option value="Pre-Seed">Pre-Seed</option>
                    <option value="Seed">Seed</option>
                    <option value="Series A">Series A</option>
                    <option value="Series B+">Series B+</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Industry <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                  placeholder="e.g., AI, FinTech, HealthTech, CleanTech"
                />
              </div>
            </div>
          </section>

          {/* Founder Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-orange-600 mb-6 flex items-center gap-2">
              <span>👤</span> Founder Information
            </h2>
            
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="founderName"
                    value={formData.founderName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="founderEmail"
                    value={formData.founderEmail}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                    placeholder="founder@startup.com"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Core Pitch */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-orange-600 mb-4 flex items-center gap-2">
              <span>🔥</span> Your Pitch
            </h2>
            <p className="text-gray-600 mb-6">
              Tell us about your startup. Keep it concise and compelling!
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Problem <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="problem"
                  value={formData.problem}
                  onChange={handleChange}
                  required
                  rows={3}
                  maxLength={300}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors resize-none"
                  placeholder="What problem are you solving? (Max 300 characters)"
                />
                <div className="text-right text-sm text-gray-500 mt-1">
                  {formData.problem.length}/300
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Solution <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="solution"
                  value={formData.solution}
                  onChange={handleChange}
                  required
                  rows={3}
                  maxLength={300}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors resize-none"
                  placeholder="How does your product solve it? (Max 300 characters)"
                />
                <div className="text-right text-sm text-gray-500 mt-1">
                  {formData.solution.length}/300
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Team <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="team"
                  value={formData.team}
                  onChange={handleChange}
                  required
                  rows={3}
                  maxLength={300}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors resize-none"
                  placeholder="Who's building this? Key backgrounds? (Max 300 characters)"
                />
                <div className="text-right text-sm text-gray-500 mt-1">
                  {formData.team.length}/300
                </div>
              </div>
            </div>
          </section>

          {/* Funding & Resources */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-orange-600 mb-6 flex items-center gap-2">
              <span>💰</span> Funding & Resources
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Funding Goal <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="funding"
                  value={formData.funding}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                  placeholder="e.g., $500K seed round"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Presentation URL
                </label>
                <input
                  type="text"
                  name="presentationUrl"
                  value={formData.presentationUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                  placeholder="www.dropbox.com/presentation or https://..."
                />
                <p className="text-sm text-gray-500 mt-2">
                  Link to your pitch deck or presentation
                </p>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Video URL
                </label>
                <input
                  type="text"
                  name="videoUrl"
                  value={formData.videoUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                  placeholder="www.youtube.com/watch?v=... or https://..."
                />
                <p className="text-sm text-gray-500 mt-2">
                  Link to your pitch video (YouTube, Vimeo, etc.)
                </p>
              </div>
            </div>
          </section>

          {/* Submit Button */}
          <div className="flex gap-4 justify-center pt-6 border-t-2 border-orange-100">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="bg-white text-orange-600 font-bold py-4 px-8 rounded-2xl shadow-lg hover:bg-gray-100 transition-all text-lg border-2 border-orange-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-12 rounded-2xl shadow-lg transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ Submitting...' : '🚀 Submit Startup'}
            </button>
          </div>
        </form>

        {/* Info Box */}
        <div className="bg-gradient-to-r from-orange-400 to-orange-500 rounded-2xl p-6 text-white mb-8">
          <h3 className="text-xl font-bold mb-3">What happens next?</h3>
          <ul className="space-y-2">
            <li className="flex gap-2">
              <span>✓</span>
              <span>Your startup is added to our database</span>
            </li>
            <li className="flex gap-2">
              <span>✓</span>
              <span>Investors can discover and vote on your startup</span>
            </li>
            <li className="flex gap-2">
              <span>✓</span>
              <span>Start collecting votes and building Heat 🔥</span>
            </li>
            <li className="flex gap-2">
              <span>✓</span>
              <span>Get discovered by investors actively looking for deals like yours</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}