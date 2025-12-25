const fs = require('fs');
const path = '/Users/leguplabs/Desktop/hot-honey/src/components/MatchingEngine.tsx';

let content = fs.readFileSync(path, 'utf8');

// Find the Match interface and add tier fields
const oldInterface = `interface Match {
  startup: any;
  investor: any;
  matchScore: number;
}`;

const newInterface = `interface Match {
  startup: any;
  investor: any;
  matchScore: number;
  investorTier?: number;
  tierName?: string;
  reachabilityScore?: number;
  meetsThreshold?: boolean;
}`;

if (content.includes(oldInterface)) {
  content = content.replace(oldInterface, newInterface);
  console.log('Updated Match interface');
} else {
  console.log('Match interface not found or already updated');
}

// Add tier classification function after imports
const tierFunction = `
// VC Tier Classification
const TIER_FIRMS: Record<number, string[]> = {
  1: ['sequoia', 'a16z', 'andreessen', 'benchmark', 'founders fund', 'general catalyst', 'greylock', 'accel', 'lightspeed', 'index', 'bessemer'],
  2: ['first round', 'initialized', 'felicis', 'boldstart', 'spark', 'nea', 'khosla', 'craft', 'lux', 'dcvc'],
  3: ['pear', 'haystack', 'precursor', 'nextview', 'notation', 'homebrew', 'compound'],
  4: []
};
const TIER_INFO: Record<number, { name: string; minGOD: number; reachBase: number }> = {
  1: { name: 'Elite', minGOD: 55, reachBase: 5 },
  2: { name: 'Strong', minGOD: 45, reachBase: 15 },
  3: { name: 'Emerging', minGOD: 38, reachBase: 25 },
  4: { name: 'Angels', minGOD: 30, reachBase: 40 }
};
function classifyInvestorTier(investor: any): number {
  const name = (investor.name || '').toLowerCase();
  const firm = (investor.firm || '').toLowerCase();
  for (const [tier, firms] of Object.entries(TIER_FIRMS)) {
    if (firms.some(f => name.includes(f) || firm.includes(f))) return parseInt(tier);
  }
  const checkSize = investor.check_size_max || 0;
  if (checkSize >= 10000000) return 1;
  if (checkSize >= 2000000) return 2;
  if (checkSize >= 500000) return 3;
  return 4;
}
`;

// Add after the imports section
const importMarker = "import { supabase } from '../lib/supabase';";
if (content.includes(importMarker) && !content.includes('TIER_FIRMS')) {
  content = content.replace(importMarker, importMarker + tierFunction);
  console.log('Added tier classification functions');
}

fs.writeFileSync(path, content);
console.log('File updated successfully');
