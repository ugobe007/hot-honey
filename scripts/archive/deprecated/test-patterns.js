require('dotenv').config();
const { extractFromHeadline } = require('./lib/funding-patterns');
const Parser = require('rss-parser');
const parser = new Parser({ timeout: 10000 });

const TEST_HEADLINES = [
  "Crisp Raises $26M to Power Real-Time Retail Data",
  "Ciphero Raises $2.5M to Build AI-Native Security",
  "$50M funding for HealthTech startup MedFlow",
  "Startup XYZ valued at $1B after latest round",
  "Investors pour $30M into CleanTech firm SolarMax",
  "TechCo announces $15M Series A",
  "FinanceApp bags $8M in seed funding",
  "Series B for DataCorp closes at $45M",
  "AI startup NeuralNet snags $12M",
  "How to Build a Startup",
  "The Future of VC Funding",
  "Breaking: Market Update",
];

async function test() {
  console.log("=== PATTERN MATCHING TEST ===\n");
  
  console.log("1. TEST HEADLINES:\n");
  let matches = 0;
  for (const h of TEST_HEADLINES) {
    const result = extractFromHeadline(h);
    if (result) {
      console.log("  ✅", h.substring(0, 50));
      console.log("     →", result.name, "$" + (result.funding/1e6) + "M", "(" + result.confidence + ")");
      matches++;
    } else {
      console.log("  ❌", h.substring(0, 50));
    }
  }
  console.log("\n  Match rate:", matches + "/" + TEST_HEADLINES.length, "(" + Math.round(matches/TEST_HEADLINES.length*100) + "%)\n");
  
  console.log("2. LIVE RSS TEST:\n");
  const feeds = [
    { name: 'AlleyWatch', url: 'https://www.alleywatch.com/feed/' },
    { name: 'FinSMEs', url: 'https://www.finsmes.com/feed' },
  ];
  
  for (const f of feeds) {
    console.log("  " + f.name + ":");
    try {
      const feed = await parser.parseURL(f.url);
      let found = 0;
      for (const item of feed.items.slice(0, 15)) {
        const result = extractFromHeadline(item.title);
        if (result) {
          console.log("    ✅", result.name, "$" + (result.funding/1e6) + "M");
          found++;
        }
      }
      console.log("    Found:", found + "/15\n");
    } catch (e) {
      console.log("    Error:", e.message.substring(0, 30) + "\n");
    }
  }
}

test();
