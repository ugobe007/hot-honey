import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { calculateHotScore } from './server/services/startupScoringService.js';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

async function debug() {
  const { data: startup } = await supabase.from('startup_uploads')
    .select('*')
    .eq('name', 'Octane Lending')
    .single();
    
  const extracted = startup?.extracted_data || {};
  
  const profile = {
    tagline: startup?.tagline || extracted.tagline,
    pitch: startup?.description || startup?.pitch || extracted.pitch || extracted.description,
    problem: startup?.problem || extracted.problem,
    solution: startup?.solution || extracted.solution,
    value_proposition: startup?.value_proposition || startup?.tagline || extracted.value_proposition,
    industries: startup?.industries || startup?.sectors || extracted.industries || extracted.sectors || [],
    ...startup,
    ...extracted
  };
  
  console.log('Profile being scored:');
  console.log('  name:', profile.name);
  console.log('  tagline:', profile.tagline);
  console.log('  pitch:', profile.pitch);
  console.log('  industries:', profile.industries);
  
  const result = calculateHotScore(profile);
  
  console.log('\nFull breakdown:', JSON.stringify(result.breakdown, null, 2));
  console.log('\nTraction raw (0-3):', result.breakdown.traction);
  console.log('Traction score calc:', Math.round(((result.breakdown.traction || 0) / 3) * 100));
}

debug().catch(console.error);
