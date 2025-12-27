require('dotenv').config();
const { addStartup, startupExists } = require('./lib/scraper-db');
const { extractFromHeadline } = require('./lib/funding-patterns');
const Parser = require('rss-parser');

const parser = new Parser({ timeout: 10000 });

const SOURCES = [
  { name: 'AlleyWatch', url: 'https://www.alleywatch.com/feed/' },
  { name: 'FinSMEs', url: 'https://www.finsmes.com/feed' },
  { name: 'EU Startups', url: 'https://www.eu-startups.com/feed/' },
  { name: 'GeekWire', url: 'https://www.geekwire.com/feed/' },
  { name: 'Crunchbase', url: 'https://news.crunchbase.com/feed/' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
];

function detectSectors(text) {
  const t = text.toLowerCase();
  const s = [];
  if (/\bai\b|machine learning|llm/i.test(t)) s.push('AI/ML');
  if (/fintech|payment|banking/i.test(t)) s.push('FinTech');
  if (/health|medical|biotech/i.test(t)) s.push('HealthTech');
  if (/saas|software|cloud/i.test(t)) s.push('SaaS');
  if (/climate|clean|energy/i.test(t)) s.push('CleanTech');
  if (/security|cyber/i.test(t)) s.push('Cybersecurity');
  return s.length > 0 ? s : ['SaaS'];
}

async function run() {
  console.log('Startup Discovery (Pattern Library v2)\n');
  let total = 0, skipped = 0;
  
  for (const src of SOURCES) {
    console.log('Source:', src.name);
    try {
      const feed = await parser.parseURL(src.url);
      for (const item of feed.items.slice(0, 20)) {
        const result = extractFromHeadline(item.title || '');
        if (result) {
          if (await startupExists(result.name)) { skipped++; continue; }
          const sectors = detectSectors(item.title + ' ' + (item.contentSnippet || ''));
          const godScore = result.funding > 50e6 ? 55 : (result.funding > 10e6 ? 48 : 42);
          const startup = await addStartup({
            name: result.name,
            tagline: (item.contentSnippet || '').substring(0, 200),
            source_type: 'rss',
            status: 'discovered',
            total_god_score: godScore,
            sectors,
            extracted_data: { funding: result.funding, source: src.name, article: item.title }
          });
          if (startup) {
            console.log('  +', result.name, '$' + (result.funding/1e6).toFixed(1) + 'M');
            total++;
          }
        }
      }
    } catch (e) {
      console.log('  err:', e.message.substring(0, 30));
    }
  }
  console.log('\nAdded:', total, '| Skipped:', skipped);
}

run().then(() => process.exit(0));
