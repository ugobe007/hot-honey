const fs = require('fs');
const path = '/Users/leguplabs/Desktop/hot-honey/src/components/MatchingEngine.tsx';

let content = fs.readFileSync(path, 'utf8');

// Find the match object and add tier fields after matchScore
const oldMatchEnd = `return Math.max(35, Math.min(rawScore, 95)); })(),
        });`;

const newMatchEnd = `return Math.max(35, Math.min(rawScore, 95)); })(),
          investorTier: classifyInvestorTier(investor),
          tierName: TIER_INFO[classifyInvestorTier(investor)]?.name || 'Unknown',
          reachabilityScore: (() => {
            const tier = classifyInvestorTier(investor);
            const god = startup.total_god_score || 40;
            const base = TIER_INFO[tier]?.reachBase || 20;
            const sectorMatch = (startup.sectors || []).some((s: string) => 
              (investor.sectors || []).some((is: string) => s.toLowerCase().includes(is.toLowerCase()))
            ) ? 10 : 0;
            return Math.min(base + (god - 40) + sectorMatch, 60);
          })(),
          meetsThreshold: (startup.total_god_score || 40) >= (TIER_INFO[classifyInvestorTier(investor)]?.minGOD || 30),
        });`;

if (content.includes(oldMatchEnd)) {
  content = content.replace(oldMatchEnd, newMatchEnd);
  fs.writeFileSync(path, content);
  console.log('SUCCESS: Added tier fields to match object');
} else {
  console.log('Could not find match end pattern');
  console.log('Searching for similar patterns...');
  if (content.includes('return Math.max(35, Math.min(rawScore, 95))')) {
    console.log('Found rawScore pattern - needs manual update');
  }
}
