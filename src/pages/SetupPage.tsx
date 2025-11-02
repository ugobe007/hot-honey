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
            Initialize investors and upload tables
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 mb-8 border-2 border-purple-400/50">
          <h2 className="text-3xl font-bold text-white mb-6">Setup Instructions</h2>
          
          <div className="space-y-4 text-purple-100">
            <div className="bg-purple-900/50 p-4 rounded-xl">
              <h3 className="text-xl font-bold mb-2">Step 0: Test Connection</h3>
              <p className="mb-2">First, verify Supabase is working. Go to Supabase Dashboard → SQL Editor and run:</p>
              <code className="block bg-black/50 p-3 rounded text-sm overflow-x-auto">
                supabase/test_connection.sql
              </code>
              <p className="text-sm text-purple-300 mt-2">✅ If you see a success message, proceed to Step 1</p>
            </div>

            <div className="bg-purple-900/50 p-4 rounded-xl">
              <h3 className="text-xl font-bold mb-2">Step 1: Create Tables</h3>
              <p className="mb-2">Run these files ONE AT A TIME in Supabase SQL Editor:</p>
              <div className="space-y-2">
                <code className="block bg-black/50 p-2 rounded text-sm">1️⃣ supabase/migrations/step1_create_investors.sql</code>
                <code className="block bg-black/50 p-2 rounded text-sm">2️⃣ supabase/migrations/step2_create_uploads.sql</code>
                <code className="block bg-black/50 p-2 rounded text-sm">3️⃣ supabase/migrations/step3_create_indexes.sql</code>
                <code className="block bg-black/50 p-2 rounded text-sm">4️⃣ supabase/migrations/step4_triggers_rls.sql</code>
                <code className="block bg-black/50 p-2 rounded text-sm">5️⃣ supabase/migrations/step5_policies.sql</code>
              </div>
              <p className="text-sm text-purple-300 mt-2">⚠️ Wait for each to complete before running the next</p>
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
