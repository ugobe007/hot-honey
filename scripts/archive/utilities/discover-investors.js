require('dotenv').config();
const { supabase, investorExists } = require('./lib/scraper-db');
const { extractInvestors } = require('./lib/investor-patterns');
const Parser = require('rss-parser');

const parser = new Parser({ timeout: 10000 });

const SOURCES = [
  { name: 'FinSMEs', url: 'https://www.finsmes.com/feed' },
  { name: 'PE Hub', url: 'https://www.pehub.com/feed/' },
  { name: 'AlleyWatch', url: 'https://www.alleywatch.com/feed/' },
  { name: 'Crunchbase', url: 'https://news.crunchbase.com/feed/' },
];

function detectSectors(text) {
  const t = text.toLowerCase();
  const s = [];
  if (/\bai\b|machine learning|llm/i.test(t)) s.push('AI/ML');
  if (/fintech|payment|banking/i.test(t)) s.push('FinTech');
  if (/health|medical|biotech/i.test(t)) s.push('HealthTech');
  if (/saas|software|cloud/i.test(t)) s.push('SaaS');
  if (/climate|clean|energy/i.test(t)) s.push('CleanTech');
  if (/crypto|blockchain|web3/i.test(t)) s.push('Crypto');
  return s.length > 0 ? s : ['SaaS'];
}

async function addInvestor(data) {
  const { data: result, error } = await supabase.from('investors').insert(data).select();
  if (error) return null;
  return result[0];
}

async function run() {
  console.log('Investor Discovery v2\n');
  let total = 0, skipped = 0;
  
  for (const src of SOURCES) {
    console.log('Source:', src.name);
    try {
      const feed = await parser.parseURL(src.url);
      for (const item of feed.items.slice(0, 25)) {
        const fullText = (item.title || '') + ' ' + (item.contentSnippet || '');
        const investors = extractInvestors(fullText);
        for (const name of investors) {
          if (await investorExists(name)) { skipped++; continue; }
          const sectors = detectSectors(fullText);
          const result = await addInvestor({
            name,
            firm: name,
            sectors,
            stage: ['Seed', 'Series A'],
            bio: 'Discovered from: ' + src.name,
            photo_url: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&size=200&background=6366f1&color=fff',
          });
          if (result) {
            console.log('  +', name);
            total++;
          }
        }
      }
    } catch (e) {
      console.log('  err:', e.message.substring(0, 40));
    }
  }
  console.log('\nAdded:', total, '| Skipped:', skipped);
}

run().then(() => process.exit(0));
