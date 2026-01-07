#!/usr/bin/env node
/**
 * CREATE VC FIRMS INPUT FILE
 * ==========================
 * Helper script to create input file from the list you provided.
 * 
 * Paste the firm list here and run to create vc-firms-list.json
 */

const fs = require('fs');
const path = require('path');

// Paste your firm list here in this format:
// Each line: "Firm Name|https://website.com"
// Or: "Firm Name,https://website.com"

const FIRM_LIST = `
Andreessen Horowitz|https://www.a16z.com
Sequoia Capital|https://www.sequoiacap.com
Accel|https://www.accel.com
General Catalyst|https://www.generalcatalyst.com
Kleiner Perkins|https://www.kleinerperkins.com
Lightspeed Venture Partners|https://www.lsvp.com
Benchmark|https://www.benchmark.com
Insight Partners|https://www.insightpartners.com
New Enterprise Associates (NEA)|https://www.nea.com
Mayfield Fund|https://www.mayfield.com
500 Global|https://www.500.co
Accel-KKR|https://www.accel-kkr.com
BAM Ventures|https://www.bam.vc
Craft Ventures|https://www.craftventures.com
DeepWork Capital|https://www.deepworkcapital.com
FirstMark|https://www.firstmark.com
Human Capital|https://www.humancapital.com
Innovation Endeavors|https://www.innovationendeavors.com
Third Sphere|https://www.thirdsphere.com
Trinity Ventures|https://www.trinityventures.com
Wing Venture Capital|https://www.wing.vc
Y Combinator|https://www.ycombinator.com
Zeta Venture Partners|https://www.zetavp.com
`.trim();

function parseFirmList(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const firms = [];
  
  for (const line of lines) {
    // Handle pipe or comma separated
    const parts = line.split(/[|,]/).map(p => p.trim());
    if (parts.length >= 2) {
      firms.push({
        name: parts[0],
        url: parts[1],
      });
    }
  }
  
  return firms;
}

const firms = parseFirmList(FIRM_LIST);
const outputPath = path.join(process.cwd(), 'data', 'vc-firms-list.json');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(firms, null, 2));

console.log(`✅ Created ${firms.length} firms in: ${outputPath}`);
console.log(`\nNow run: node scripts/add-vc-firms-from-list.js --file ${outputPath}`);


