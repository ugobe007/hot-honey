require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { extractInferenceData } = require('./lib/inference-extractor');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Stage mapping (stage column is integer)
const stageMap = {
  'pre-seed': 1, 'preseed': 1, 
  'seed': 2, 
  'series a': 3, 'series-a': 3, 'seriesa': 3,
  'series b': 4, 'series-b': 4, 'seriesb': 4,
  'growth': 5, 'series c': 5, 'late': 5
};

function parseStage(stage) {
  if (!stage) return 2; // Default to Seed
  const key = String(stage).toLowerCase().trim();
  return stageMap[key] || 2;
}

async function main() {
  console.log('🚀 Importing discovered startups to main database...\n');
  
  // Get recent discovered startups
  const { data: discovered, error } = await supabase
    .from('discovered_startups')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (error) { console.error('Error:', error); return; }
  console.log(`Found ${discovered.length} recent discovered startups\n`);
  
  let imported = 0;
  let skipped = 0;
  
  for (const startup of discovered) {
    // Skip if already exists
    const { data: existing } = await supabase
      .from('startup_uploads')
      .select('id')
      .ilike('name', startup.name)
      .limit(1);
    
    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }
    
    // Extract data from discovered_startups
    const discoveredData = startup.extracted_data || {};
    
    // Run inference extraction on description/tagline/pitch to populate extracted_data
    const textToAnalyze = [
      startup.name,
      startup.description,
      startup.tagline,
      startup.pitch
    ].filter(Boolean).join('. ');
    
    // Use existing inference extractor (pattern-based, no AI cost)
    const inferenceData = textToAnalyze.length > 50 
      ? extractInferenceData(textToAnalyze, startup.article_url || startup.source_url || '')
      : null;
    
    // Merge discovered data with inference data
    const extractedData = {
      ...discoveredData,
      ...(inferenceData || {}),
      // Preserve original source
      source: 'discovered_startups',
      imported_at: new Date().toISOString()
    };
    
    // Calculate basic GOD score (50-65 range for new imports)
    const baseScore = 50 + Math.floor(Math.random() * 15);
    
    // Insert into startup_uploads WITH extracted_data populated
    const { error: insertError } = await supabase
      .from('startup_uploads')
      .insert({
        name: startup.name,
        tagline: discoveredData.tagline || (startup.description ? startup.description.substring(0, 200) : ''),
        pitch: discoveredData.pitch || startup.description || '',
        sectors: extractedData.sectors || discoveredData.sectors || ['Technology'],
        stage: parseStage(extractedData.funding_stage || discoveredData.stage),
        source_type: 'rss_discovery',
        source_url: startup.source_url || startup.article_url || '',
        status: 'approved',
        // CRITICAL: Populate extracted_data with inference results
        extracted_data: extractedData,
        total_god_score: baseScore,
        team_score: Math.floor(baseScore * 0.9),
        traction_score: Math.floor(baseScore * 0.85),
        market_score: Math.floor(baseScore * 0.95),
        product_score: Math.floor(baseScore * 0.9),
        vision_score: Math.floor(baseScore * 0.88)
      });
    
    if (insertError) {
      console.log(`  ❌ ${startup.name} - ${insertError.message}`);
    } else {
      console.log(`  ✅ ${startup.name}`);
      imported++;
    }
  }
  
  console.log('\n════════════════════════════════');
  console.log(`✅ Imported: ${imported}`);
  console.log(`⏭️  Skipped (duplicates): ${skipped}`);
  console.log('════════════════════════════════');
}

main().catch(console.error);
