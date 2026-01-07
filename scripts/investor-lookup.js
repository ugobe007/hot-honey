#!/usr/bin/env node

/**
 * Investor Web Lookup Script
 * 
 * Generates search queries and lookup commands for enriching investor data.
 * 
 * Usage:
 *   node scripts/investor-lookup.js --batch <number>     # Process a batch
 *   node scripts/investor-lookup.js --single <id>        # Lookup single investor
 *   node scripts/investor-lookup.js --generate-queries   # Generate search queries
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// SEARCH QUERY GENERATORS
// ============================================================================

function generateSearchQueries(investor) {
  const queries = [];
  const name = investor.name;
  const firm = investor.firm;

  // LinkedIn search
  if (!investor.linkedin_url) {
    if (firm) {
      queries.push({
        type: 'linkedin',
        query: `site:linkedin.com/in "${name}" "${firm}"`,
        url: `https://www.google.com/search?q=site%3Alinkedin.com%2Fin+%22${encodeURIComponent(name)}%22+%22${encodeURIComponent(firm)}%22`
      });
    } else {
      queries.push({
        type: 'linkedin',
        query: `site:linkedin.com/in "${name}" investor OR VC OR venture`,
        url: `https://www.google.com/search?q=site%3Alinkedin.com%2Fin+%22${encodeURIComponent(name)}%22+investor+OR+VC`
      });
    }
  }

  // Crunchbase search
  queries.push({
    type: 'crunchbase',
    query: `site:crunchbase.com "${name}" ${firm || 'investor'}`,
    url: `https://www.google.com/search?q=site%3Acrunchbase.com+%22${encodeURIComponent(name)}%22+${encodeURIComponent(firm || 'investor')}`
  });

  // General investor info
  queries.push({
    type: 'general',
    query: `"${name}" ${firm || ''} investor portfolio investments`,
    url: `https://www.google.com/search?q=%22${encodeURIComponent(name)}%22+${encodeURIComponent(firm || '')}+investor+portfolio`
  });

  // AngelList / Signal
  queries.push({
    type: 'angellist',
    query: `site:angel.co OR site:signal.nfx.com "${name}"`,
    url: `https://www.google.com/search?q=site%3Aangel.co+OR+site%3Asignal.nfx.com+%22${encodeURIComponent(name)}%22`
  });

  return queries;
}

function generateAIPrompt(investor) {
  return `Research this investor and provide structured data:

Name: ${investor.name}
Firm: ${investor.firm || 'Unknown'}
LinkedIn: ${investor.linkedin_url || 'Not found'}
Current Bio: ${investor.bio || 'None'}

Please find and return:
1. A 2-3 sentence bio describing their investment focus
2. Their investment thesis (what they look for)
3. Sectors they invest in (as array)
4. Stages they invest in (as array, e.g., Pre-Seed, Seed, Series A)
5. Check size range (min and max in USD)
6. Geographic focus (as array)
7. Notable portfolio companies (as array)

Return as JSON:
{
  "id": "${investor.id}",
  "name": "${investor.name}",
  "bio": "...",
  "investment_thesis": "...",
  "sectors": [...],
  "stage": [...],
  "check_size_min": number,
  "check_size_max": number,
  "geography_focus": [...],
  "notable_investments": [...]
}`;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

async function processBatch(batchNum) {
  const batchFile = path.join(
    process.cwd(),
    'data',
    'enrichment-batches',
    `batch-${String(batchNum).padStart(3, '0')}.json`
  );

  if (!fs.existsSync(batchFile)) {
    console.error(`❌ Batch file not found: ${batchFile}`);
    console.log('\nRun this first: node scripts/investor-cleanup.js --export-for-enrichment');
    process.exit(1);
  }

  const investors = JSON.parse(fs.readFileSync(batchFile, 'utf-8'));

  console.log(`\n📦 BATCH ${batchNum} - ${investors.length} investors\n`);
  console.log('='.repeat(70));

  for (let i = 0; i < investors.length; i++) {
    const inv = investors[i];
    console.log(`\n[${i + 1}/${investors.length}] ${inv.name}`);
    console.log(`    Firm: ${inv.firm || 'Unknown'}`);
    console.log(`    Missing: ${inv.missing_fields.join(', ')}`);
    
    const queries = generateSearchQueries(inv);
    console.log(`\n    Search queries:`);
    queries.forEach(q => {
      console.log(`    - ${q.type}: ${q.query}`);
    });
    console.log('-'.repeat(70));
  }

  // Generate combined AI prompt
  const promptFile = path.join(
    process.cwd(),
    'data',
    'enrichment-batches',
    `batch-${String(batchNum).padStart(3, '0')}-prompt.txt`
  );

  const combinedPrompt = `You are enriching investor data for a startup matching platform.

For each investor below, research and provide the requested information.
Return a JSON array with one object per investor.

INVESTORS TO ENRICH:

${investors.map((inv, idx) => `
--- Investor ${idx + 1} ---
${generateAIPrompt(inv)}
`).join('\n')}

Return the complete JSON array with all investors enriched.`;

  fs.writeFileSync(promptFile, combinedPrompt);
  console.log(`\n✅ Generated AI prompt: ${promptFile}`);
  console.log('\nNext steps:');
  console.log('1. Copy the prompt to Claude/ChatGPT');
  console.log('2. Save the JSON response to: data/enrichment-results/batch-XXX-results.json');
  console.log('3. Run: node scripts/apply-enrichment.js ' + batchNum);
}

async function lookupSingle(investorId) {
  const { data: investor, error } = await supabase
    .from('investors')
    .select('*')
    .eq('id', investorId)
    .single();

  if (error || !investor) {
    console.error(`❌ Investor not found: ${investorId}`);
    process.exit(1);
  }

  console.log(`\n📋 INVESTOR LOOKUP: ${investor.name}\n`);
  console.log('='.repeat(70));
  console.log(`ID: ${investor.id}`);
  console.log(`Name: ${investor.name}`);
  console.log(`Firm: ${investor.firm || 'Unknown'}`);
  console.log(`LinkedIn: ${investor.linkedin_url || 'Not found'}`);
  console.log(`Bio: ${investor.bio || 'None'}`);
  console.log(`Sectors: ${investor.sectors?.join(', ') || 'None'}`);
  console.log(`Stage: ${investor.stage?.join(', ') || 'None'}`);

  console.log('\n📍 SEARCH QUERIES:\n');
  const queries = generateSearchQueries(investor);
  queries.forEach(q => {
    console.log(`${q.type.toUpperCase()}:`);
    console.log(`  ${q.query}`);
    console.log(`  ${q.url}\n`);
  });

  console.log('\n🤖 AI PROMPT:\n');
  console.log(generateAIPrompt(investor));
}

async function generateAllQueries() {
  console.log('\n📊 GENERATING SEARCH QUERIES FOR ALL INCOMPLETE INVESTORS\n');

  const { data: investors, error } = await supabase
    .from('investors')
    .select('id, name, firm, linkedin_url, bio, sectors, stage')
    .or('bio.is.null,sectors.is.null,linkedin_url.is.null');

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  // Filter out unknown/gibberish
  const valid = investors.filter(inv => {
    if (!inv.name || inv.name.length < 2) return false;
    if (/^(unknown|test|demo|n\/a|tbd)/i.test(inv.name)) return false;
    return true;
  });

  console.log(`Found ${valid.length} investors needing enrichment\n`);

  // Generate queries file
  const queriesOutput = [];
  for (const inv of valid) {
    const queries = generateSearchQueries(inv);
    queriesOutput.push({
      id: inv.id,
      name: inv.name,
      firm: inv.firm,
      queries: queries.map(q => ({ type: q.type, url: q.url }))
    });
  }

  const outputPath = path.join(process.cwd(), 'data', 'search-queries.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(queriesOutput, null, 2));

  console.log(`✅ Generated search queries for ${valid.length} investors`);
  console.log(`   ${outputPath}`);

  // Also generate a simple text file with just LinkedIn searches
  const linkedinQueries = valid
    .filter(inv => !inv.linkedin_url)
    .map(inv => {
      const q = inv.firm 
        ? `"${inv.name}" "${inv.firm}" site:linkedin.com/in`
        : `"${inv.name}" investor site:linkedin.com/in`;
      return `${inv.name}: ${q}`;
    });

  const linkedinPath = path.join(process.cwd(), 'data', 'linkedin-searches.txt');
  fs.writeFileSync(linkedinPath, linkedinQueries.join('\n'));

  console.log(`✅ Generated LinkedIn search queries`);
  console.log(`   ${linkedinPath}`);
}

// ============================================================================
// CLI
// ============================================================================

const args = process.argv.slice(2);

if (args.includes('--batch') || args.includes('-b')) {
  const idx = args.indexOf('--batch') !== -1 ? args.indexOf('--batch') : args.indexOf('-b');
  const batchNum = parseInt(args[idx + 1]);
  if (isNaN(batchNum)) {
    console.error('❌ Please provide a valid batch number');
    process.exit(1);
  }
  processBatch(batchNum).catch(console.error);
} else if (args.includes('--single') || args.includes('-s')) {
  const idx = args.indexOf('--single') !== -1 ? args.indexOf('--single') : args.indexOf('-s');
  const investorId = args[idx + 1];
  if (!investorId) {
    console.error('❌ Please provide an investor ID');
    process.exit(1);
  }
  lookupSingle(investorId).catch(console.error);
} else if (args.includes('--generate-queries') || args.includes('-g')) {
  generateAllQueries().catch(console.error);
} else {
  console.log(`
Investor Web Lookup Script

Usage:
  node scripts/investor-lookup.js --batch <number>
    Process a batch and generate search queries + AI prompt

  node scripts/investor-lookup.js --single <investor-id>
    Lookup a single investor by ID

  node scripts/investor-lookup.js --generate-queries
    Generate search queries for all incomplete investors

Workflow:
  1. Run --export-for-enrichment (in investor-cleanup.js) to create batches
  2. Run --batch <number> to get search queries and AI prompt
  3. Use queries to find information OR paste prompt to AI
  4. Save results and run apply-enrichment.js
`);
}


