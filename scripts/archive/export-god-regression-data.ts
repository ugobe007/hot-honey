#!/usr/bin/env tsx
// scripts/export-god-regression-data.ts
// Export startup data for regression analysis

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
  console.log('🔄 Exporting startup data for regression...');
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select(`id, name, description, sectors, team_score, traction_score, market_score, product_score, vision_score, total_god_score, status, extracted_data`)
    .eq('status', 'approved');

  if (error) {
    console.error('❌ Error fetching startups:', error.message);
    process.exit(1);
  }

  // Prepare CSV header
  const header = [
    'id','name','desc_length','sector_count','team_score','traction_score','market_score','product_score','vision_score','total_god_score','sectors','status','has_extracted_data'
  ];
  const rows = [header.join(',')];

  for (const s of startups) {
    const desc = s.description || '';
    const sectors = Array.isArray(s.sectors) ? s.sectors : [];
    const hasExtracted = s.extracted_data ? 1 : 0;
    rows.push([
      s.id,
      JSON.stringify(s.name),
      desc.length,
      sectors.length,
      s.team_score ?? '',
      s.traction_score ?? '',
      s.market_score ?? '',
      s.product_score ?? '',
      s.vision_score ?? '',
      s.total_god_score ?? '',
      JSON.stringify(sectors.join('|')),
      s.status,
      hasExtracted
    ].join(','));
  }

  fs.writeFileSync('god_regression_data.csv', rows.join('\n'));
  console.log('✅ Exported god_regression_data.csv');
}

run();
