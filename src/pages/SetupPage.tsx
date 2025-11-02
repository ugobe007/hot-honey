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
      setStatus(prev => prev + '\n📝 Creating tables in Supabase...');
      setStatus(prev => prev + '\n⚠️  Please run the SQL migration manually in Supabase SQL Editor:');
      setStatus(prev => prev + '\n   supabase/migrations/create_investors_and_uploads.sql\n');

      setStatus(prev => prev + '\n🌱 Seeding investor data...');
      const results = await seedInitialInvestors();
      
      const successCount = results.filter(r => !r.error).length;
      const errorCount = results.filter(r => r.error).length;

      setStatus(prev => prev + `\n✅ Seeded ${successCount} investors`);
      if (errorCount > 0) {
        setStatus(prev => prev + `\n⚠️  ${errorCount} errors (possibly duplicates)`);
      }

      setStatus(prev => prev + '\n\n✨ Setup complete! You can now visit /investors');

    } catch (error) {
      setStatus(prev => prev + `\n\n❌ Error: ${error}`);
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
            Initialize investors and upload tables
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 mb-8 border-2 border-purple-400/50">
          <h2 className="text-3xl font-bold text-white mb-6">Setup Instructions</h2>
          
          <div className="space-y-4 text-purple-100">
            <div className="bg-purple-900/50 p-4 rounded-xl">
              <h3 className="text-xl font-bold mb-2">Step 1: Create Tables</h3>
              <p className="mb-2">Go to your Supabase Dashboard → SQL Editor and run:</p>
              <code className="block bg-black/50 p-3 rounded text-sm overflow-x-auto">
                supabase/migrations/create_investors_and_uploads.sql
              </code>
            </div>

            <div className="bg-purple-900/50 p-4 rounded-xl">
              <h3 className="text-xl font-bold mb-2">Step 2: Seed Data</h3>
              <p className="mb-4">Click the button below to seed initial investor data:</p>
              <button
                onClick={runSetup}
                disabled={loading}
                className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-xl shadow-xl hover:from-yellow-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '⏳ Running Setup...' : '🚀 Seed Investor Data'}
              </button>
            </div>

            {status && (
              <div className="bg-black/50 p-4 rounded-xl">
                <h3 className="text-xl font-bold mb-2">Status:</h3>
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
