require('dotenv').config();
const Parser = require('rss-parser');

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  }
});

// Better sources for funding news
const FUNDING_SOURCES = [
  { name: 'Crunchbase News', url: 'https://news.crunchbase.com/feed/' },
  { name: 'FinSMEs', url: 'https://www.finsmes.com/feed' },
  { name: 'PE Hub', url: 'https://www.pehub.com/feed/' },
  { name: 'AlleyWatch', url: 'https://www.alleywatch.com/feed/' },
  { name: 'VC News Daily', url: 'https://vcnewsdaily.com/feed/' },
];

async function debug() {
  for (const source of FUNDING_SOURCES) {
    console.log('\n📰', source.name);
    console.log('   ', source.url);
    
    try {
      const feed = await parser.parseURL(source.url);
      console.log('   Found', feed.items.length, 'items\n');
      
      // Show first 5 headlines and check for funding patterns
      let matches = 0;
      feed.items.slice(0, 8).forEach((item, i) => {
        const title = item.title || '';
        console.log(`   ${i+1}. ${title.substring(0, 80)}`);
        
        // Check if it looks like funding news
        if (/raises?|secures?|closes?|funding|series [a-z]|million|billion|\$\d/i.test(title)) {
          console.log('      ✅ Looks like funding news');
          matches++;
        }
      });
      
      console.log(`\n   Potential funding headlines: ${matches}/8`);
    } catch (e) {
      console.log('   ❌ Error:', e.message.substring(0, 50));
    }
  }
}

debug();
