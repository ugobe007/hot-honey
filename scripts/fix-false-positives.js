#!/usr/bin/env node
/**
 * FIX FALSE POSITIVES
 * ===================
 * Removes false positive company names from discovered_startups table.
 * 
 * Usage:
 *   node scripts/fix-false-positives.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Known false positives to remove
const FALSE_POSITIVES = [
  // Countries/Regions
  'Kids', 'Congress', 'Texas', 'China', 'Maryland', 'American', 'Austrian',
  'South Korea', 'North America', 'Mumbai', 'Norway', 'Finland', 'London',
  'Cologne', 'Vienna', 'Here',
  
  // Generic words
  'Raise', 'Business', 'Can', 'Job', 'Ask', 'Banking', 'Predictions',
  'Crisis', 'Risk', 'Role', 'Report', 'Weight Loss', 'Medicaid',
  'Crypto', 'Bitcoin', 'XRP ETFs', 'Spot XRP', 'actors scaled onchain',
  
  // Currency/Amounts
  '$800M', '$405bn', '$20M', '$15',
  
  // Common phrases
  'LLMs', 'Former Bolt', 'AI-driven', 'Former Bolt', 'Illicit', 'Protege',
  'Roll-up Craze', 'Nuclear Rivalries', 'Won Over', 'Brewery', 'Japanese Restaurant',
  'Quadrupling-Down', 'DevSecOps Attend', 'OWASP Top', 'Taming',
  'Japanese GitLab', 'Billion-Dollar', 'Teams and', 'Vertical', 'exits',
  'OneStream Goes', 'Interesting Learnings', 'Co-Founder', 'Right Now',
  'Exclusive Luxury', 'Deals And', 'Approve Nvidia', 'Claude Code',
  'Ralph Wiggum', 'Artificial Analysis', 'Test-Time Training',
  'Lux Capital', 'World Cup', 'Insight',
  
  // Partial/Incomplete names
  'Israel', 'Gemini files', "Telegram's", 'Lobbies', 'CES', 'CES 2026',
  'GameStop says', 'NYC-based Pomelo', 'Former Bolt',
  'South Korea\'s', 'emerging markets plummeted by', "'angel",
  'Dawn Capital\'s', '(and', 'Eric Slesinger', 'Norway\'s Spoor',
  '€30M+ Series', 'Nordic Salt', 'Finland\'s Aisti', 'accelerate',
  'Rulebase wants to', 'Profitable Nigerian', 'Moroccan founder',
  'Sabi lays', "Stripe's", 'Profitable African', 'Silicon Valley\'s',
  'Félix Pago', 'large', 'called Bono', "Amazon's Alexa",
  'Intel spinout Articul8', 'AI is', 'accelerate growth and',
  'agentic commerce startup', 'Seattle\'s Alpenglow', 'China\'s Hesai',
  'Shopify competitor Swap', 'kingmaking', 'Ventures Platform', 'Final',
  "Statista", "London's Engitix", 'French BioTech', "Cologne's United",
  'ShanX Medtech', "Vienna's Vitrealab",
  
  // Person names (not companies)
  'Andrew Bennett', 'Andrew Kreitz', 'Sean Pitt', 'Bryon Hargis',
  'Ben Hylak', 'Alexis Gauba', 'Zubin Singh', 'Dennis Whyte\'s',
  'Walter GAM', 'Valsoft buys Florida', 'ECP',
  
  // Generic tech terms
  'Hackers', 'MiniMax', 'SGNL', 'Cyberette', 'Tucuvi', 'BrightHeart',
  'Lookiero Outfittery Group', '2025s', 'Legaltech Alice',
  'United Manufacturing Hub', 'CertHub', 'LemFi', 'KPay', 'General Catalyst',
  'Faropoint', 'Arxis Buys', 'Vauban Infrastructure', 'Lux $15',
  'Manus', 'CNBC Daily', 'China\'s', 'Mentee Robotics', 'China\'s Hesai',
  'ServiceNow', 'Warner Bros', 'ZhipuAI\'s Open-Source', "Bosch's €29",
  'Agentic', 'Optimism', 'Pluto', 'Blink Payment', 'Acer', 'L3Harris',
  'Neobank Revolut', 'Litehaus', 'Zhipu AI', 'Spiro', 'Munify',
  'Better Auth', 'Moove', 'Mendel', 'DevSecOps Attend', 'OWASP Top',
  'Japanese GitLab', 'TNW', 'Tekpon', 'Spectorai Raises', 'Merger Talks',
  'Amagi IPO', 'Statista', 'Engitix', '4Founders Capital', 'Biographica',
  'Vitrealab', 'Nous Research', 'Maryland',
];

async function removeFalsePositives() {
  console.log('🧹 Removing False Positive Company Names...\n');
  
  let removed = 0;
  let notFound = 0;
  
  for (const falsePositive of FALSE_POSITIVES) {
    try {
      // Delete from discovered_startups
      const { data: deleted, error } = await supabase
        .from('discovered_startups')
        .delete()
        .ilike('name', falsePositive)
        .select();
      
      if (error) {
        console.error(`   ❌ Error removing "${falsePositive}": ${error.message}`);
      } else if (deleted && deleted.length > 0) {
        console.log(`   ✅ Removed: "${falsePositive}" (${deleted.length} record(s))`);
        removed += deleted.length;
      } else {
        notFound++;
      }
    } catch (error) {
      console.error(`   ❌ Error processing "${falsePositive}": ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`   ✅ Removed: ${removed} false positive record(s)`);
  console.log(`   ⏭️  Not found: ${notFound} (already cleaned or don't exist)`);
  console.log();
}

removeFalsePositives()
  .then(() => {
    console.log('✅ Cleanup complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

