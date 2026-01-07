// Quick test to see what's happening with .env
require('dotenv').config();

console.log('Testing .env file loading...\n');

const vars = [
  'VITE_SUPABASE_URL',
  'SUPABASE_URL', 
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'VITE_OPENAI_API_KEY'
];

console.log('Environment variables:');
vars.forEach(v => {
  const value = process.env[v];
  if (value) {
    console.log(`  ✓ ${v}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`  ✗ ${v}: Missing`);
  }
});

console.log('\nTotal env vars loaded:', Object.keys(process.env).length);
console.log('Supabase vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', ') || 'none');
console.log('OpenAI vars:', Object.keys(process.env).filter(k => k.includes('OPENAI')).join(', ') || 'none');





