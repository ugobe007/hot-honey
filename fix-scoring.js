const fs = require('fs');
const path = '/Users/leguplabs/Desktop/hot-honey/src/components/MatchingEngine.tsx';

let content = fs.readFileSync(path, 'utf8');

// Find and replace the scoring logic on line 388
const oldLogic = `matchScore: (() => { const godScore = startup.total_god_score || 50; const startupSectors = startup.sectors || startup.industries || []; const investorSectors = investor.sectors || []; const sNorm = startupSectors.map((s: string) => s.toLowerCase()); const iNorm = investorSectors.map((s: string) => s.toLowerCase()); const overlap = sNorm.filter((s: string) => iNorm.some((i: string) => s.includes(i) || i.includes(s))).length; const sectorWeights: Record<string, number> = { "saas": 2.0, "ai/ml": 2.0, "ai": 2.0, "ml": 2.0, "fintech": 2.0, "healthtech": 2.0, "healthcare": 2.0, "consumer": 2.0, "robotics": 2.0, "crypto": 1.0, "web3": 1.0, "cleantech": 0.5, "climate": 0.5, "gaming": 0.5, "edtech": 0.5, "education": 0.5 }; const weightedOverlap = sNorm.reduce((sum: number, s: string) => { const match = iNorm.some((i: string) => s.includes(i) || i.includes(s)); if (match) { const weight = sectorWeights[s] || sectorWeights[Object.keys(sectorWeights).find(k => s.includes(k)) || ""] || 1.0; return sum + (8 * weight); } return sum; }, 0); const sectorBonus = Math.min(weightedOverlap, 32); const investorStages = investor.stage || []; const startupStage = startup.stage || 2; const stageNames = ["idea", "pre-seed", "seed", "series a", "series b", "series c"]; const startupStageName = stageNames[startupStage] || "seed"; const stageMatch = investorStages.some((s: string) => s.toLowerCase().includes(startupStageName)) ? 10 : 0; return Math.min(godScore + sectorBonus + stageMatch, 99); })()`;

const newLogic = `matchScore: (() => { const godScore = startup.total_god_score || 40; const startupSectors = startup.sectors || startup.industries || []; const investorSectors = investor.sectors || []; const sNorm = startupSectors.map((s: string) => s.toLowerCase()); const iNorm = investorSectors.map((s: string) => s.toLowerCase()); const sectorWeights: Record<string, number> = { "saas": 1.5, "ai/ml": 1.5, "ai": 1.5, "ml": 1.5, "fintech": 1.5, "healthtech": 1.5, "consumer": 1.3, "robotics": 1.5, "spacetech": 1.5, "defense": 1.5, "deeptech": 1.3, "materials": 1.3, "energy": 1.2, "bess": 1.2, "climate": 1.2, "crypto": 1.0, "cleantech": 1.0, "gaming": 0.8, "edtech": 0.8 }; let sectorBonus = 0; sNorm.forEach((s: string) => { const match = iNorm.some((i: string) => s.includes(i) || i.includes(s)); if (match) { const weight = sectorWeights[s] || sectorWeights[Object.keys(sectorWeights).find(k => s.includes(k)) || ""] || 1.0; sectorBonus += 4 * weight; } }); sectorBonus = Math.min(sectorBonus, 16); const investorStages = investor.stage || []; const startupStage = startup.stage || 2; const stageNames = ["idea", "pre-seed", "seed", "series a", "series b", "series c"]; const startupStageName = stageNames[startupStage] || "seed"; const stageMatch = investorStages.some((s: string) => s.toLowerCase().includes(startupStageName)) ? 8 : -5; const rawScore = godScore + sectorBonus + stageMatch; return Math.max(35, Math.min(rawScore, 95)); })()`;

if (content.includes(oldLogic)) {
  content = content.replace(oldLogic, newLogic);
  fs.writeFileSync(path, content);
  console.log('SUCCESS: Scoring logic updated');
  console.log('');
  console.log('Changes:');
  console.log('  - Sector multiplier: 8 -> 4');
  console.log('  - Max sector bonus: 32 -> 16');
  console.log('  - Stage match: +10 -> +8');
  console.log('  - Stage mismatch: 0 -> -5 (penalty)');
  console.log('  - Added SpaceTech, Defense, DeepTech, Materials, Energy, BESS');
  console.log('  - Score range: 35-95');
} else {
  console.log('Could not find exact match. Checking file...');
  console.log('Line 388 content:', content.substring(content.indexOf('matchScore: (() =>'), content.indexOf('matchScore: (() =>') + 200));
}
