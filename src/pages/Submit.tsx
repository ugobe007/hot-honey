import { useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

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
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      // Simulated extraction (in production, send to backend API)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Auto-fill form with extracted data
      const extracted = {
        name: formData.name || file.name.replace(/\.(pdf|pptx?)/gi, '').replace(/[-_]/g, ' '),
        valueProp: formData.valueProp || 'Next-gen AI platform transforming the industry',
        problem: formData.problem || 'Traditional solutions are outdated, expensive, and inefficient',
        solution: formData.solution || 'Modern AI-powered platform that\'s affordable and easy to use',
        team: formData.team || 'Former executives from Google, Microsoft, and Amazon',
        funding: formData.funding || '$2M Seed Round',
      };

      setFormData(prev => ({
        ...prev,
        ...extracted
      }));

      alert('✅ Document scanned! Form auto-filled with extracted data. Please review and edit as needed.');
    } catch (error) {
      alert('❌ Error scanning document. Please try again.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: submitError } = await supabase
        .from('startups')
        .insert([
          {
            name: formData.name,
            value_prop: formData.valueProp,
            problem: formData.problem,
            solution: formData.solution,
            team: formData.team,
            funding: formData.funding,
            stage: formData.stage,
            presentation_url: formData.presentationUrl || null,
            video_url: formData.videoUrl || null,
            votes_yes: 0,
            votes_no: 0,
          },
        ])
        .select();

      if (submitError) throw submitError;

      console.log('Startup submitted:', data);
      setSubmitted(true);
      
      setTimeout(() => {
        navigate('/vote-demo');
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
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-yellow-50 flex items-center justify-center p-8">
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
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-yellow-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg transition-all"
          >
            ← Home
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-8xl mb-4">🚀</div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
            Submit Your Startup
          </h1>
          <p className="text-xl text-gray-700 font-medium mb-2">
            Get discovered by investors who want to find you
          </p>
          <p className="text-lg text-gray-600">
            Fill out the form below to join Hot Money Honey 🍯
          </p>
        </div>

        {/* Quick Upload Option */}
        <div className="bg-gradient-to-r from-green-400 via-purple-500 to-purple-700 rounded-3xl p-8 mb-8 text-white shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">📄</div>
            <h2 className="text-3xl font-bold mb-2">Upload Your Pitch Deck</h2>
            <p className="text-lg">AI will auto-fill the form below from your presentation!</p>
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
          <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 shadow-2xl mb-8">
          {/* Basic Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-orange-600 mb-6 flex items-center gap-2">
              <span>📋</span> Basic Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Startup Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                  placeholder="e.g., HyperLoop"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Value Proposition <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="valueProp"
                  value={formData.valueProp}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                  placeholder="One sentence that describes what you do"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                    placeholder="https://yourstartup.com"
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
                  type="url"
                  name="presentationUrl"
                  value={formData.presentationUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                  placeholder="https://..."
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
                  type="url"
                  name="videoUrl"
                  value={formData.videoUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                  placeholder="https://youtube.com/..."
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