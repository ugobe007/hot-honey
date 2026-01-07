#!/bin/bash
# 🎣 Hot Match Scraper Execution Plan
# Run scrapers in priority order to find new startups

echo "════════════════════════════════════════════════════════════"
echo "  🚀 HOT MATCH STARTUP SCRAPERS"
echo "════════════════════════════════════════════════════════════"
echo ""

cd ~/Desktop/hot-honey

# Step 1: Clean up garbage entries from previous runs
echo "🧹 Step 1: Cleaning up garbage entries..."
node -e "
require('dotenv').config();
const {createClient} = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const garbage = ['New', 'Legacy', 'Why', 'Four', 'Six', 'Three', 'Gentle', 'Jakub', 'Reflections', 'GPT-4o', 'November', 'October', 'Talking', 'I\'ve', 'Empire', 'Open', 'How', 'Dear', 'Big', 'Rules', 'Quirky', 'Nvidia\'s', 'Even', 'College', 'Every', 'Our', 'Obsidian\'s', 'Millions', 'Competing', 'Almost', 'VCs', 'India', 'Investors', 'What\'s', 'Equity\'s', 'HLTH', 'Partnerships', 'Abundance', 'Demo', 'Congratulations', 'BillionToOne', 'Meet', 'Ankit', 'Dalton', 'Welcoming', 'Tyler', 'Abundant', 'Rapidly', 'Turning', 'Race', 'Highlights', 'Electroflow', 'We\'re', 'Lithuanian Repsense', 'Estonian MyDello', 'Danish EvodiaBio', 'Sweden\'s', 'Estonian'];
console.log('Deleting', garbage.length, 'garbage entries...');
supabase.from('discovered_startups').delete().in('name', garbage).then(r => {
  console.log('✅ Cleaned up garbage entries');
  process.exit(0);
}).catch(e => {
  console.log('⚠️  Cleanup error:', e.message);
  process.exit(0);
});
"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Step 2: RSS Scraper (Fast, No AI)"
echo "════════════════════════════════════════════════════════════"
node simple-rss-scraper.js

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Step 3: Wellfound Scraper (Best Source - 23 startups!)"
echo "════════════════════════════════════════════════════════════"
node intelligent-scraper.js "https://wellfound.com/discover/startups?stage=seed" startups

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Step 4: Speedrun Scraper (High Quality)"
echo "════════════════════════════════════════════════════════════"
node speedrun-full.mjs --save

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ ALL SCRAPERS COMPLETE"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 Check results:"
echo "   node -e \"require('dotenv').config(); const {createClient} = require('@supabase/supabase-js'); const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY); Promise.all([supabase.from('discovered_startups').select('id', {count: 'exact', head: true}), supabase.from('startup_uploads').select('id', {count: 'exact', head: true}).eq('status', 'approved')]).then(([discovered, approved]) => console.log('Discovered (pending):', discovered.count, '| Approved:', approved.count));\""


