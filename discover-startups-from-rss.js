/**
 * Startup Discovery from RSS - NO AI VERSION
 * Uses regex patterns and the scraper-db abstraction layer
 */
require('dotenv').config();
const { addStartup, startupExists } = require('./lib/scraper-db');
const Parser = require('rss-parser');

const parser = new Parser({ timeout: 10000 });

const PATTERNS = [
  /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+[Rr]aises?\s+\$?([\d\.]+)\s*([MmBb]|Million|Billion)/i,
  /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+[Ss]ecures?\s+\$?([\d\.]+)\s*([MmBb]|Million|Billion)/i,
  /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+[Cc]loses?\s+\$?([\d\.]+)\s*([MmBb]|Million|Billion)/i,
];

const BEST_SOURCES = [
  { name: 'AlleyWatch', url: 'https://www.alleywatch.com/feed/' },
  { name: 'FinSMEs', url: 'https://www.finsmes.com/feed' },
  { name: 'EU Startups', url: 'https://www.eu-startups.com/feed/' },
  { name: 'GeekWire', url: 'https://www.geekwire.com/feed/' },
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

function isValidName(name) {
  if (!name || name.length < 2 || name.length > 50) return false;
  if (/^(the|a|an|this|how|why)\s/i.test(name)) return false;
  if (/funding|raises|million|report|daily/i.test(name)) return false;
  return true;
}

async function run() {
  console.log('Startup Discovery (No AI)\n');
  console.log('Using', BEST_SOURCES.length, 'high-quality sources\n');
  
  let total = 0;
  
  for (const src of BEST_SOURCES) {
    console.log('Source:', src.name);
    try {
      const feed = await parser.parseURL(src.url);
      
      for (const item of feed.items.slice(0, 20)) {
        for (const p of PATTERNS) {
          const m = (item.title || '').match(p);
          if (m && isValidName(m[1])) {
            const name = m[1].trim();
            
            if (await startupExists(name)) {
              console.log('  skip:', name);
              continue;
            }
            
            const unit = (m[3] || 'm').toLowerCase();
            const funding = parseFloat(m[2]) * (unit.startsWith('b') ? 1e9 : 1e6);
            const sectors = detectSectors(item.title + ' ' + (item.contentSnippet || ''));
            
            const result = await addStartup({
              name,
              tagline: (item.contentSnippet || '').substring(0, 200),
              source_type: 'rss',
              status: 'discovered',
              total_god_score: funding > 50e6 ? 55 : (funding > 10e6 ? 48 : 42),
              sectors,
              extracted_data: { funding, source: src.name, article: item.title }
            });
            
            if (result) {
              console.log('  +', name, '$' + (funding/1e6).toFixed(1) + 'M');
              total++;
            }
            break;
          }
        }
      }
    } catch (e) {
      console.log('  err:', e.message.substring(0, 30));
    }
  }
  
  console.log('\nTotal added:', total);
}

run().then(() => process.exit(0));
