import { useState } from 'react';
import { Link } from 'react-router-dom';
import AdminNav from '../components/AdminNav';
import { seedInitialInvestors } from '../lib/investorService';

export default function SetupPage() {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const runSetup = async () => {
    setLoading(true);
    setStatus('🚀 Starting setup...\n');

    try {
      setStatus(prev => prev + '\n⚠️  Make sure you ran all 5 SQL files first!');
      setStatus(prev => prev + '\n\n🌱 Seeding investor data...');
      
      const results = await seedInitialInvestors();
      
      const successCount = results.filter(r => !r.error).length;
      const errorCount = results.filter(r => r.error).length;

      if (successCount > 0) {
        setStatus(prev => prev + `\n✅ Successfully seeded ${successCount} investors!`);
      }
      
      if (errorCount > 0) {
        setStatus(prev => prev + `\n\n⚠️  ${errorCount} errors occurred:`);
        results.forEach((result, i) => {
          if (result.error) {
            setStatus(prev => prev + `\n   - Investor ${i + 1}: ${result.error.message}`);
          }
        });
        setStatus(prev => prev + '\n\n💡 Common errors:');
        setStatus(prev => prev + '\n   - "relation does not exist" → Run the SQL migrations first');
        setStatus(prev => prev + '\n   - "duplicate key" → Data already seeded (this is OK)');
        setStatus(prev => prev + '\n   - "permission denied" → Check your Supabase anon key');
      }

      if (successCount > 0) {
        setStatus(prev => prev + '\n\n✨ Setup complete! Visit /investors to see your data.');
      }

    } catch (error: any) {
      setStatus(prev => prev + `\n\n❌ Error: ${error.message || error}`);
      setStatus(prev => prev + '\n\n🔍 Troubleshooting:');
      setStatus(prev => prev + '\n   1. Check your .env file has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
      setStatus(prev => prev + '\n   2. Verify you ran all SQL migration files in order');
      setStatus(prev => prev + '\n   3. Check Supabase dashboard for any errors');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-8xl mb-4">🔧</div>
          <h1 className="text-6xl font-bold text-white mb-4">
            Database Setup
          </h1>
          <p className="text-2xl text-purple-200">
            Seed investor data
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 mb-8 border-2 border-purple-400/50">
          <div className="text-center">
            <p className="text-xl text-purple-100 mb-6">
              Click the button below to add initial investor data to your database:
            </p>
            
            <button
              onClick={runSetup}
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-xl rounded-xl shadow-xl hover:from-yellow-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-6"
            >
              {loading ? '⏳ Seeding Data...' : '🚀 Seed Investor Data'}
            </button>

            {status && (
              <div className="bg-black/50 p-4 rounded-xl text-left">
                <h3 className="text-xl font-bold mb-2 text-white">Status:</h3>
                <pre className="text-sm text-green-300 whitespace-pre-wrap font-mono">
                  {status}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="text-center">
          <Link
            to="/investors"
            className="inline-block px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl shadow-xl hover:from-cyan-600 hover:to-blue-600 transition-all"
          >
            💼 View Investors
          </Link>
        </div>
      </div>
      
      {/* Admin Navigation */}
      <AdminNav currentPage="setup" />
    </div>
  );
}
