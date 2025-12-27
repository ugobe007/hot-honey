require('dotenv').config();
const { addStartup, startupExists } = require('./lib/scraper-db');
const { extractFromHeadline } = require('./lib/funding-patterns');
const { extractInferenceData } = require('./lib/inference-extractor');
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

async function run() {
  console.log('Startup Discovery (Pattern Library v2 + Inference Extractor)\n');
  let total = 0, skipped = 0;
  
  for (const src of SOURCES) {
    console.log('Source:', src.name);
    try {
      const feed = await parser.parseURL(src.url);
      for (const item of feed.items.slice(0, 20)) {
        // First try headline extraction for startup name
        const result = extractFromHeadline(item.title || '');
        if (result) {
          if (await startupExists(result.name)) { skipped++; continue; }
          
          // Use FULL inference extraction on article content (NO AI APIS!)
          const fullText = `${item.title || ''} ${item.contentSnippet || ''} ${item.content || ''}`;
          const inferenceData = extractInferenceData(fullText, item.link || '');
          
          // Merge headline funding with inference-extracted data
          const funding = inferenceData.funding_amount || result.funding;
          const stage = inferenceData.funding_stage || null;
          const sectors = inferenceData.sectors?.length > 0 ? inferenceData.sectors : ['SaaS'];
          
          // Calculate GOD score based on available signals
          let godScore = 42; // Base score
          if (funding > 50e6) godScore += 13;
          else if (funding > 10e6) godScore += 6;
          
          // Boost for team signals
          if (inferenceData.team_signals?.length > 0) godScore += 3;
          if (inferenceData.has_technical_cofounder) godScore += 2;
          if (inferenceData.credential_signals?.length > 0) godScore += 2;
          
          // Boost for execution signals
          if (inferenceData.is_launched) godScore += 2;
          if (inferenceData.has_customers) godScore += 2;
          if (inferenceData.has_revenue) godScore += 3;
          
          // Cap at reasonable max for discovered startups
          godScore = Math.min(godScore, 65);
          
          const startup = await addStartup({
            name: result.name,
            tagline: (item.contentSnippet || '').substring(0, 200),
            source_type: 'rss',
            status: 'discovered',
            total_god_score: godScore,
            sectors,
            funding_stage: stage,
            extracted_data: { 
              funding,
              source: src.name, 
              article: item.title,
              // Inference-extracted fields
              lead_investor: inferenceData.lead_investor,
              investors_mentioned: inferenceData.investors_mentioned || [],
              team_signals: inferenceData.team_signals || [],
              grit_signals: inferenceData.grit_signals?.map(g => g.signal || g) || [],
              credential_signals: inferenceData.credential_signals || [],
              execution_signals: inferenceData.execution_signals || [],
              is_launched: inferenceData.is_launched,
              has_customers: inferenceData.has_customers,
              has_revenue: inferenceData.has_revenue,
              has_technical_cofounder: inferenceData.has_technical_cofounder,
            }
          });
          if (startup) {
            const signals = [];
            if (inferenceData.team_signals?.length) signals.push(`team:${inferenceData.team_signals.length}`);
            if (inferenceData.execution_signals?.length) signals.push(`exec:${inferenceData.execution_signals.length}`);
            console.log('  +', result.name, '$' + (funding/1e6).toFixed(1) + 'M', 
              `GOD:${godScore}`, signals.length ? `[${signals.join(',')}]` : '');
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
