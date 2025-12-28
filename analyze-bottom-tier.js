require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function analyzeBottomTier() {
  // Get startups below 44
  const { data } = await s.from('startup_uploads')
    .select('name, total_god_score, traction_score, product_score, market_score, team_score, vision_score, sectors, tagline, description, mrr, has_revenue, is_launched, team_size, funding_amount')
    .eq('status', 'approved')
    .lt('total_god_score', 44)
    .order('total_god_score', { ascending: false })
    .limit(50);

  console.log('BOTTOM TIER ANALYSIS (GOD < 44)');
  console.log('='.repeat(70));
  console.log('Total in this tier:', data?.length || 0);
  console.log('');

  // Categorize why they're low
  const categories = {
    noData: [],        // Missing most data
    noTraction: [],    // Has data but no traction signals
    coolingSector: [], // In a cooling sector
    earlyStage: [],    // Just very early
    redFlags: []       // Has red flags
  };

  data?.forEach(startup => {
    const hasDescription = (startup.tagline || '').length > 10 || (startup.description || '').length > 20;
    const hasTraction = startup.traction_score > 5 || startup.has_revenue || startup.mrr > 0;
    const hasProduct = startup.product_score > 10 || startup.is_launched;
    const sectors = (startup.sectors || []).join(' ').toLowerCase();
    const isCoolingSector = /nft|metaverse|social media|consumer app/.test(sectors);
    
    if (!hasDescription && !hasTraction && !hasProduct) {
      categories.noData.push(startup);
    } else if (isCoolingSector) {
      categories.coolingSector.push(startup);
    } else if (!hasTraction && hasProduct) {
      categories.earlyStage.push(startup);
    } else if (!hasTraction) {
      categories.noTraction.push(startup);
    } else {
      categories.redFlags.push(startup);
    }
  });

  console.log('CATEGORIZATION:');
  console.log('-'.repeat(50));
  console.log('1. NO DATA (sparse profiles):', categories.noData.length);
  console.log('2. NO TRACTION (has data, no signals):', categories.noTraction.length);
  console.log('3. COOLING SECTOR (NFT, metaverse, etc):', categories.coolingSector.length);
  console.log('4. EARLY STAGE (product but no traction):', categories.earlyStage.length);
  console.log('5. RED FLAGS (other issues):', categories.redFlags.length);
  console.log('');

  // Show examples from each category
  console.log('EXAMPLES BY CATEGORY:');
  console.log('='.repeat(70));

  if (categories.noData.length > 0) {
    console.log('\n📭 NO DATA (need enrichment):');
    categories.noData.slice(0, 3).forEach(s => {
      console.log(`   - ${s.name} (GOD: ${s.total_god_score}) - "${(s.tagline || 'No tagline').slice(0, 40)}"`);
    });
  }

  if (categories.noTraction.length > 0) {
    console.log('\n📉 NO TRACTION:');
    categories.noTraction.slice(0, 3).forEach(s => {
      console.log(`   - ${s.name} (GOD: ${s.total_god_score}) - Traction: ${s.traction_score}, Product: ${s.product_score}`);
    });
  }

  if (categories.coolingSector.length > 0) {
    console.log('\n❄️ COOLING SECTOR:');
    categories.coolingSector.slice(0, 3).forEach(s => {
      console.log(`   - ${s.name} (GOD: ${s.total_god_score}) - Sectors: ${(s.sectors || []).join(', ')}`);
    });
  }

  if (categories.earlyStage.length > 0) {
    console.log('\n🌱 EARLY STAGE (product, no traction):');
    categories.earlyStage.slice(0, 3).forEach(s => {
      console.log(`   - ${s.name} (GOD: ${s.total_god_score}) - Product: ${s.product_score}, Traction: ${s.traction_score}`);
    });
  }

  // Recommendations
  console.log('\n');
  console.log('RECOMMENDATIONS:');
  console.log('='.repeat(70));
  console.log('');
  console.log('For startups below 44, consider:');
  console.log('');
  console.log('1. ANGEL TIER (35-43): Early-stage, need development');
  console.log('   → Match with: Angel investors, pre-seed funds, accelerators');
  console.log('');
  console.log('2. INCUBATOR TIER (25-34): Very early, need significant work');
  console.log('   → Match with: Incubators, grants, competitions');
  console.log('');
  console.log('3. NOT READY (<25): Missing fundamentals');
  console.log('   → Action: Enrich data or exclude from matching');
}

analyzeBottomTier().catch(console.error);
