// scripts/normalize-sectors.ts
// Normalize sector tags for all startups in Supabase
// Ensures each startup has 2–3 normalized sector tags using the taxonomy

import { createClient } from '@supabase/supabase-js';

// Inline sector taxonomy mapping (expand as needed)
const SECTOR_TAXONOMY: Record<string, string> = {
  fintech: 'fintech',
  'fin tech': 'fintech',
  ai: 'ai',
  'artificial intelligence': 'ai',
  saas: 'saas',
  'software as a service': 'saas',
  deeptech: 'deeptech',
  'deep tech': 'deeptech',
  robotics: 'robotics',
  healthtech: 'healthtech',
  'health tech': 'healthtech',
  edtech: 'edtech',
  'ed tech': 'edtech',
  cleantech: 'cleantech',
  'clean tech': 'cleantech',
  ecommerce: 'ecommerce',
  'e-commerce': 'ecommerce',
  crypto: 'crypto',
  blockchain: 'crypto',
  consumer: 'consumer',
  enterprise: 'enterprise',
  marketplace: 'marketplace',
  'marketplaces': 'marketplace',
  biotech: 'biotech',
  'bio tech': 'biotech',
  proptech: 'proptech',
  'prop tech': 'proptech',
  insuretech: 'insuretech',
  'insure tech': 'insuretech',
  mobility: 'mobility',
  logistics: 'logistics',
  gaming: 'gaming',
  cybersecurity: 'cybersecurity',
  'cyber security': 'cybersecurity',
  devtools: 'devtools',
  'dev tools': 'devtools',
  agtech: 'agtech',
  'ag tech': 'agtech',
  foodtech: 'foodtech',
  'food tech': 'foodtech',
  medtech: 'medtech',
  'med tech': 'medtech',
  travel: 'travel',
  legaltech: 'legaltech',
  'legal tech': 'legaltech',
};

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function normalizeSectors(rawSectors: string[]): string[] {
  if (!rawSectors || !Array.isArray(rawSectors)) return [];
  // Lowercase, trim, deduplicate, map to taxonomy
  const norm = rawSectors
    .map(s => s.toLowerCase().trim())
    .map(s => SECTOR_TAXONOMY[s] || s)
    .filter(Boolean);
  // Deduplicate and limit to 3
  return Array.from(new Set(norm)).slice(0, 3);
}

async function run() {
  console.log('🔄 Normalizing sectors for all startups...');
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, sectors')
    .neq('status', 'archived');

  if (error) {
    console.error('❌ Error fetching startups:', error.message);
    process.exit(1);
  }

  let updated = 0;
  for (const startup of startups) {
    const orig = startup.sectors || [];
    const norm = normalizeSectors(orig);
    if (JSON.stringify(orig) !== JSON.stringify(norm) && norm.length > 0) {
      const { error: upErr } = await supabase
        .from('startup_uploads')
        .update({ sectors: norm })
        .eq('id', startup.id);
      if (upErr) {
        console.error(`❌ Failed to update ${startup.id}:`, upErr.message);
      } else {
        updated++;
        console.log(`✅ Updated ${startup.id}:`, norm);
      }
    }
  }
  console.log(`🎉 Sector normalization complete. Updated ${updated} startups.`);
}

run();
