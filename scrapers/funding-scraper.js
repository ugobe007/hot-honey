require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Parser = require('rss-parser');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const parser = new Parser({ timeout: 15000 });

const SOURCES = [
  { name: 'AlleyWatch', url: 'https://www.alleywatch.com/feed/' },
  { name: 'FinSMEs', url: 'https://www.finsmes.com/feed' },
  { name: 'Crunchbase', url: 'https://news.crunchbase.com/feed/' },
  { name: 'EU-Startups', url: 'https://www.eu-startups.com/feed/' },
];

const PATTERNS = [
  /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+[Rr]aises?\s+\$?([\d\.]+)\s*([MmBb]|Million|Billion)/i,
  /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+[Ss]ecures?\s+\$?([\d\.]+)\s*([MmBb]|Million|Billion)/i,
  /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+[Cc]loses?\s+\$?([\d\.]+)\s*([MmBb]|Million|Billion)/i,
  /^([A-Z][A-Za-z0-9\-\.]+)\s+Raises\s+\$?([\d\.]+)([MmBb])\s+/i,
  /^([A-Z][A-Za-z0-9\-\.]+)\s+Gets\s+\$?([\d\.]+)([MmBb])\s+/i,
];

function isValid(name) {
  if (!name || name.length < 2 || name.length > 40) return false;
  if (/^(the|a|an|this|how|why|what)\s/i.test(name)) return false;
  if (/funding|raises|million|report|daily|weekly|exclusive/i.test(name)) return false;
  return true;
}

async function exists(name) {
  const { data } = await supabase.from('startup_uploads').select('id').ilike('name', name).limit(1);
  return data && data.length > 0;
}

async function scrape() {
  console.log('Funding Scraper v2\n');
  let total = 0;
  
  for (const src of SOURCES) {
    console.log('Source:', src.name);
    try {
      const feed = await parser.parseURL(src.url);
      let added = 0;
      
      for (const item of feed.items.slice(0, 30)) {
        const title = item.title || '';
        
        for (const p of PATTERNS) {
          const m = title.match(p);
          if (m && isValid(m[1])) {
            const name = m[1].trim();
            if (await exists(name)) {
              console.log('  Skip:', name, '(exists)');
              continue;
            }
            
            const unit = (m[3] || 'm').toLowerCase();
            const funding = parseFloat(m[2]) * (unit.startsWith('b') ? 1e9 : 1e6);
            
            await supabase.from('startup_uploads').insert({
              name,
              tagline: (item.contentSnippet || '').substring(0, 200),
              status: 'discovered',
              stage: 2,
              total_god_score: funding > 50e6 ? 55 : 45,
              extracted_data: { funding, source: src.name }
            });
            console.log('  Added:', name, '$' + (funding/1e6).toFixed(1) + 'M');
            added++;
            total++;
            break;
          }
        }
      }
      console.log('  Subtotal:', added, '\n');
    } catch (e) {
      console.log('  Error:', e.message.substring(0, 50), '\n');
    }
  }
  
  console.log('TOTAL ADDED:', total);
}

scrape();
