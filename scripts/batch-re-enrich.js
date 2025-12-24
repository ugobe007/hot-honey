/**
 * Batch Re-Enrichment Script
 * 
 * Processes sparse investors and startups through the dynamic parser
 * to extract richer data from their websites. Uses GOD field mapper
 * to derive scoring-relevant fields.
 * 
 * Usage:
 *   node scripts/batch-re-enrich.js --type investors --limit 10
 *   node scripts/batch-re-enrich.js --type startups --limit 50
 *   node scripts/batch-re-enrich.js --type discovered --limit 100
 *   node scripts/batch-re-enrich.js --all --limit 20
 */

require('dotenv').config();
const { DynamicParser } = require('../lib/dynamic-parser');
const { mapToGodFields, estimateScoreImpact } = require('../lib/god-field-mapper');
const { createClient } = require('@supabase/supabase-js');

// Initialize
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);
const parser = new DynamicParser();

// Metrics tracking
const metrics = {
  startTime: null,
  investors: { processed: 0, enriched: 0, failed: 0, before: {}, after: {} },
  startups: { processed: 0, enriched: 0, failed: 0, before: {}, after: {} },
  discovered: { processed: 0, enriched: 0, failed: 0, before: {}, after: {} }
};

// Field quality scorers
function scoreInvestorData(investor) {
  let score = 0;
  if (investor.bio && investor.bio.length > 50) score += 20;
  if (investor.sectors && investor.sectors.length > 1 && !investor.sectors.includes('technology')) score += 20;
  if (investor.check_size_min) score += 15;
  if (investor.check_size_max) score += 15;
  if (investor.investment_thesis && investor.investment_thesis.length > 50) score += 20;
  if (investor.focus_areas && investor.focus_areas.length > 0) score += 10;
  return score;
}

function scoreStartupData(startup) {
  let score = 0;
  if (startup.description && startup.description.length > 100) score += 15;
  if (startup.tagline && startup.tagline.length > 20) score += 15;
  if ((startup.pitch || startup.value_proposition) && (startup.pitch?.length > 30 || startup.value_proposition?.length > 30)) score += 15;
  if (startup.sectors && startup.sectors.length > 0) score += 15;
  if (startup.contrarian_belief) score += 15;
  if (startup.why_now) score += 15;
  if (startup.team_size) score += 10;
  return score;
}

// Sector normalization (match GOD scoring expectations)
function normalizeSectors(sectors) {
  if (!sectors || !Array.isArray(sectors)) return sectors;
  
  const sectorMap = {
    'ai': 'Artificial Intelligence',
    'artificial intelligence': 'Artificial Intelligence',
    'ml': 'Machine Learning',
    'machine learning': 'Machine Learning',
    'saas': 'SaaS',
    'software as a service': 'SaaS',
    'b2b': 'B2B',
    'b2c': 'B2C',
    'fintech': 'FinTech',
    'healthtech': 'HealthTech',
    'health tech': 'HealthTech',
    'healthcare': 'HealthTech',
    'edtech': 'EdTech',
    'education': 'EdTech',
    'enterprise': 'Enterprise Software',
    'enterprise software': 'Enterprise Software',
    'devtools': 'Developer Tools',
    'developer tools': 'Developer Tools',
    'infrastructure': 'Infrastructure',
    'crypto': 'Crypto/Web3',
    'web3': 'Crypto/Web3',
    'blockchain': 'Crypto/Web3',
    'climate': 'Climate Tech',
    'cleantech': 'Climate Tech',
    'e-commerce': 'E-Commerce',
    'ecommerce': 'E-Commerce',
    'marketplace': 'Marketplace',
    'security': 'Cybersecurity',
    'cybersecurity': 'Cybersecurity'
  };
  
  return sectors.map(s => {
    const lower = s.toLowerCase().trim();
    return sectorMap[lower] || s;
  }).filter((s, i, arr) => arr.indexOf(s) === i); // dedupe
}

// Parse check size from string like "$500K-$5M"
function parseCheckSize(str) {
  if (!str || typeof str !== 'string') return { min: null, max: null };
  
  const multipliers = { 'k': 1000, 'm': 1000000, 'b': 1000000000 };
  const pattern = /\$?([\d.]+)\s*([kmb])?/gi;
  const matches = [...str.matchAll(pattern)];
  
  if (matches.length === 0) return { min: null, max: null };
  
  const values = matches.map(m => {
    const num = parseFloat(m[1]);
    const mult = multipliers[(m[2] || '').toLowerCase()] || 1;
    return num * mult;
  });
  
  return {
    min: Math.min(...values),
    max: values.length > 1 ? Math.max(...values) : null
  };
}

/**
 * Re-enrich sparse investors
 */
async function enrichInvestors(limit = 10) {
  console.log(`\n📊 Re-enriching sparse investors (limit: ${limit})...`);
  
  // Find sparse investors with URLs
  // Find sparse investors with URLs (website URLs stored in linkedin_url field)
  // Filter to those with sparse data: empty bio, generic sectors, no check_size, no thesis
  const { data: allInvestors, error } = await supabase
    .from('investors')
    .select('id, name, firm, linkedin_url, crunchbase_url, blog_url, bio, sectors, check_size_min, check_size_max, investment_thesis, focus_areas')
    .eq('status', 'active')
    .not('linkedin_url', 'is', null)
    .limit(100);
  
  if (error) {
    console.error('Error fetching investors:', error);
    return;
  }
  
  // Filter to sparse investors with scrapable URLs (not linkedin.com)
  const sparseInvestors = allInvestors.filter(i => {
    const url = i.crunchbase_url || i.blog_url || i.linkedin_url;
    if (!url || url.includes('linkedin.com')) return false;
    
    // Check if sparse
    const hasSparseData = 
      !i.bio || i.bio.length < 50 ||
      !i.sectors || i.sectors.length === 0 || i.sectors.includes('technology') ||
      !i.check_size_min ||
      !i.investment_thesis || i.investment_thesis.length < 20;
    
    return hasSparseData;
  }).slice(0, limit);
  
  if (sparseInvestors.length === 0) {
    console.log('No sparse investors with scrapable URLs found');
    return;
  }
  
  console.log(`Found ${sparseInvestors.length} sparse investors to enrich`);
  
  // Track before scores
  metrics.investors.before.avgScore = sparseInvestors.reduce((sum, i) => sum + scoreInvestorData(i), 0) / sparseInvestors.length;
  metrics.investors.before.count = sparseInvestors.length;
  
  for (const investor of sparseInvestors) {
    metrics.investors.processed++;
    
    // Get URL to scrape (prefer crunchbase, then blog, then linkedin_url which might be website)
    const url = investor.crunchbase_url || investor.blog_url || investor.linkedin_url;
    if (!url || url.includes('linkedin.com')) {
      console.log(`⏭️  Skipping ${investor.name} - no scrapable URL`);
      continue;
    }
    
    try {
      console.log(`\n🔄 Enriching: ${investor.name} (${investor.firm})`);
      console.log(`   URL: ${url}`);
      console.log(`   Before score: ${scoreInvestorData(investor)}`);
      
      // Parse using dynamic parser
      const result = await parser.parseAs(url, 'investor');
      
      if (!result || result.error) {
        console.log(`   ❌ Parse failed: ${result?.error || 'Unknown error'}`);
        metrics.investors.failed++;
        continue;
      }
      
      // Build update object with only improved fields
      const update = {};
      
      // Bio: only update if we got better data
      if (result.description && result.description.length > (investor.bio?.length || 0)) {
        update.bio = result.description.substring(0, 2000);
      }
      
      // Investment thesis
      if (result.investment_thesis && (!investor.investment_thesis || result.investment_thesis.length > investor.investment_thesis.length)) {
        update.investment_thesis = result.investment_thesis;
      }
      
      // Sectors: merge and normalize
      if (result.sectors && Array.isArray(result.sectors) && result.sectors.length > 0) {
        const existingSectors = investor.sectors || [];
        const newSectors = normalizeSectors([...existingSectors, ...result.sectors]);
        if (newSectors.length > existingSectors.length || !existingSectors.includes('technology')) {
          update.sectors = newSectors.filter(s => s !== 'technology' && s !== 'Generalist');
        }
      }
      
      // Check size
      if (result.check_size && !investor.check_size_min) {
        const { min, max } = parseCheckSize(result.check_size);
        if (min) update.check_size_min = min;
        if (max) update.check_size_max = max;
      }
      
      // Focus areas
      if (result.focus_areas && result.focus_areas.length > (investor.focus_areas?.length || 0)) {
        update.focus_areas = result.focus_areas;
      }
      
      // Partners
      if (result.partners && result.partners.length > 0) {
        update.partners = result.partners;
      }
      
      // Total investments / AUM
      if (result.total_investments || result.aum) {
        if (result.aum) {
          // Parse AUM like "$46B" -> 46000000000
          const aumStr = result.aum.replace(/[^0-9.]/g, '');
          const aumNum = parseFloat(aumStr);
          if (result.aum.toLowerCase().includes('b')) {
            update.active_fund_size = aumNum * 1000000000;
          } else if (result.aum.toLowerCase().includes('m')) {
            update.active_fund_size = aumNum * 1000000;
          }
        }
        if (result.total_investments) {
          update.total_investments = result.total_investments;
        }
      }
      
      // Mark enrichment date
      update.last_enrichment_date = new Date().toISOString();
      
      console.log(`   📝 Update object:`, JSON.stringify(update, null, 2).substring(0, 500));
      
      if (Object.keys(update).length > 1) { // More than just the date
        const { data: updateData, error: updateError } = await supabase
          .from('investors')
          .update(update)
          .eq('id', investor.id)
          .select();
        
        if (updateError) {
          console.log(`   ❌ Update failed: ${updateError.message}`);
          metrics.investors.failed++;
        } else {
          console.log(`   📌 Update returned:`, updateData?.length || 0, 'rows');
          const afterScore = scoreInvestorData({ ...investor, ...update });
          console.log(`   ✅ Enriched! Score: ${scoreInvestorData(investor)} → ${afterScore}`);
          console.log(`   Updated fields: ${Object.keys(update).filter(k => k !== 'last_enrichment_date').join(', ')}`);
          metrics.investors.enriched++;
        }
      } else {
        console.log(`   ⏭️  No new data to update`);
      }
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 2000));
      
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      metrics.investors.failed++;
    }
  }
  
  // Calculate after scores
  if (metrics.investors.enriched > 0) {
    const { data: updatedInvestors } = await supabase
      .from('investors')
      .select('bio, sectors, check_size_min, check_size_max, investment_thesis, focus_areas')
      .in('id', sparseInvestors.map(i => i.id));
    
    if (updatedInvestors) {
      metrics.investors.after.avgScore = updatedInvestors.reduce((sum, i) => sum + scoreInvestorData(i), 0) / updatedInvestors.length;
    }
  }
}

/**
 * Re-enrich sparse approved startups (startup_uploads)
 */
async function enrichStartups(limit = 20) {
  console.log(`\n🚀 Re-enriching sparse approved startups (limit: ${limit})...`);
  
  // Find sparse startups with websites
  // Note: startup_uploads uses 'pitch' instead of 'value_proposition'
  const { data: sparseStartups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, website, description, tagline, pitch, sectors, contrarian_belief, why_now, team_size')
    .eq('status', 'approved')
    .not('website', 'is', null)
    .or('description.is.null,tagline.is.null,contrarian_belief.is.null,why_now.is.null,sectors.is.null')
    .limit(limit);
  
  if (error) {
    console.error('Error fetching startups:', error);
    return;
  }
  
  console.log(`Found ${sparseStartups.length} sparse startups to enrich`);
  
  // Track before scores
  metrics.startups.before.avgScore = sparseStartups.reduce((sum, s) => sum + scoreStartupData(s), 0) / sparseStartups.length;
  metrics.startups.before.count = sparseStartups.length;
  
  for (const startup of sparseStartups) {
    metrics.startups.processed++;
    
    if (!startup.website) continue;
    
    // Ensure URL has protocol
    let url = startup.website;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    try {
      console.log(`\n🔄 Enriching: ${startup.name}`);
      console.log(`   URL: ${url}`);
      console.log(`   Before score: ${scoreStartupData(startup)}`);
      
      // Parse using dynamic parser
      const result = await parser.parseAs(url, 'startup');
      
      if (!result || result.error) {
        console.log(`   ❌ Parse failed: ${result?.error || 'Unknown error'}`);
        metrics.startups.failed++;
        continue;
      }
      
      // Build update object
      const update = {};
      
      // Description
      if (result.description && result.description.length > (startup.description?.length || 0)) {
        update.description = result.description.substring(0, 5000);
      }
      
      // Tagline
      if (result.tagline && (!startup.tagline || result.tagline.length > startup.tagline.length)) {
        update.tagline = result.tagline.substring(0, 200);
      }
      
      // Pitch (value proposition) - can derive from tagline if missing
      if (!startup.pitch) {
        const pitch = result.value_proposition || result.tagline;
        if (pitch) update.pitch = pitch;
      }
      
      // Sectors
      if (result.sectors && Array.isArray(result.sectors) && result.sectors.length > 0) {
        const existingSectors = startup.sectors || [];
        const newSectors = normalizeSectors([...existingSectors, ...result.sectors]);
        if (newSectors.length > existingSectors.length) {
          update.sectors = newSectors;
        }
      }
      
      // GOD-relevant fields from parser
      // Contrarian belief - look for unique angles
      if (!startup.contrarian_belief && (result.tagline || result.description)) {
        // Try to extract a contrarian belief from the messaging
        const text = `${result.tagline || ''} ${result.description || ''}`;
        const contrarianPatterns = [
          /(?:we believe|our belief|contrary to|unlike others|most people think|while others)\s+(.{20,150})/i,
          /(?:the future of|reimagining|rethinking)\s+(.{20,100})/i
        ];
        for (const pattern of contrarianPatterns) {
          const match = text.match(pattern);
          if (match) {
            update.contrarian_belief = match[1].trim();
            break;
          }
        }
      }
      
      // Why now - timing signals
      if (!startup.why_now && result.description) {
        const whyNowPatterns = [
          /(?:now is the time|the time is right|today's|this moment|recent advances|new regulations|AI enables|GPT|LLM)\s*(.{20,150})/i
        ];
        for (const pattern of whyNowPatterns) {
          const match = result.description.match(pattern);
          if (match) {
            update.why_now = match[0].trim();
            break;
          }
        }
      }
      
      // Team size
      if (result.team_size && !startup.team_size) {
        update.team_size = result.team_size;
      }
      
      // Founders
      if (result.founders && result.founders.length > 0) {
        update.founders = result.founders;
      }
      
      if (Object.keys(update).length > 0) {
        const { error: updateError } = await supabase
          .from('startup_uploads')
          .update(update)
          .eq('id', startup.id);
        
        if (updateError) {
          console.log(`   ❌ Update failed: ${updateError.message}`);
          metrics.startups.failed++;
        } else {
          const afterScore = scoreStartupData({ ...startup, ...update });
          console.log(`   ✅ Enriched! Score: ${scoreStartupData(startup)} → ${afterScore}`);
          console.log(`   Updated fields: ${Object.keys(update).join(', ')}`);
          metrics.startups.enriched++;
        }
      } else {
        console.log(`   ⏭️  No new data to update`);
      }
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 2000));
      
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      metrics.startups.failed++;
    }
  }
  
  // Calculate after scores
  if (metrics.startups.enriched > 0) {
    const { data: updatedStartups } = await supabase
      .from('startup_uploads')
      .select('description, tagline, value_proposition, sectors, contrarian_belief, why_now, team_size')
      .in('id', sparseStartups.map(s => s.id));
    
    if (updatedStartups) {
      metrics.startups.after.avgScore = updatedStartups.reduce((sum, s) => sum + scoreStartupData(s), 0) / updatedStartups.length;
    }
  }
}

/**
 * Re-enrich discovered_startups (pending review)
 */
async function enrichDiscovered(limit = 50) {
  console.log(`\n🔍 Re-enriching discovered_startups (limit: ${limit})...`);
  
  const { data: sparseDiscovered, error } = await supabase
    .from('discovered_startups')
    .select('id, name, website, description, sectors, value_proposition')
    .not('website', 'is', null)
    .or('description.is.null,sectors.is.null,value_proposition.is.null')
    .limit(limit);
  
  if (error) {
    console.error('Error fetching discovered startups:', error);
    return;
  }
  
  console.log(`Found ${sparseDiscovered.length} sparse discovered startups to enrich`);
  
  metrics.discovered.before.count = sparseDiscovered.length;
  
  for (const startup of sparseDiscovered) {
    metrics.discovered.processed++;
    
    if (!startup.website) continue;
    
    try {
      console.log(`\n🔄 Enriching: ${startup.name}`);
      console.log(`   URL: ${startup.website}`);
      
      const result = await parser.parseAs(startup.website, 'startup');
      
      if (!result || result.error) {
        console.log(`   ❌ Parse failed: ${result?.error || 'Unknown error'}`);
        metrics.discovered.failed++;
        continue;
      }
      
      const update = {};
      
      if (result.description && result.description.length > (startup.description?.length || 0)) {
        update.description = result.description.substring(0, 5000);
      }
      
      if (result.value_proposition && !startup.value_proposition) {
        update.value_proposition = result.value_proposition;
      }
      
      if (result.sectors && result.sectors.length > 0 && !startup.sectors) {
        update.sectors = normalizeSectors(result.sectors);
      }
      
      if (result.founders) {
        update.founders = result.founders;
      }
      
      if (result.team_size) {
        update.team_signals = { ...(startup.team_signals || {}), estimated_size: result.team_size };
      }
      
      if (Object.keys(update).length > 0) {
        const { error: updateError } = await supabase
          .from('discovered_startups')
          .update(update)
          .eq('id', startup.id);
        
        if (updateError) {
          console.log(`   ❌ Update failed: ${updateError.message}`);
          metrics.discovered.failed++;
        } else {
          console.log(`   ✅ Enriched! Updated: ${Object.keys(update).join(', ')}`);
          metrics.discovered.enriched++;
        }
      } else {
        console.log(`   ⏭️  No new data`);
      }
      
      await new Promise(r => setTimeout(r, 2000));
      
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      metrics.discovered.failed++;
    }
  }
}

/**
 * Print summary report
 */
function printReport() {
  const elapsed = ((Date.now() - metrics.startTime) / 1000).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 BATCH RE-ENRICHMENT REPORT');
  console.log('='.repeat(60));
  console.log(`Duration: ${elapsed}s`);
  console.log('');
  
  if (metrics.investors.processed > 0) {
    console.log('👔 INVESTORS:');
    console.log(`   Processed: ${metrics.investors.processed}`);
    console.log(`   Enriched:  ${metrics.investors.enriched}`);
    console.log(`   Failed:    ${metrics.investors.failed}`);
    if (metrics.investors.before.avgScore && metrics.investors.after.avgScore) {
      console.log(`   Quality Score: ${metrics.investors.before.avgScore.toFixed(1)} → ${metrics.investors.after.avgScore.toFixed(1)}`);
    }
    console.log('');
  }
  
  if (metrics.startups.processed > 0) {
    console.log('🚀 APPROVED STARTUPS:');
    console.log(`   Processed: ${metrics.startups.processed}`);
    console.log(`   Enriched:  ${metrics.startups.enriched}`);
    console.log(`   Failed:    ${metrics.startups.failed}`);
    if (metrics.startups.before.avgScore && metrics.startups.after.avgScore) {
      console.log(`   Quality Score: ${metrics.startups.before.avgScore.toFixed(1)} → ${metrics.startups.after.avgScore.toFixed(1)}`);
    }
    console.log('');
  }
  
  if (metrics.discovered.processed > 0) {
    console.log('🔍 DISCOVERED STARTUPS:');
    console.log(`   Processed: ${metrics.discovered.processed}`);
    console.log(`   Enriched:  ${metrics.discovered.enriched}`);
    console.log(`   Failed:    ${metrics.discovered.failed}`);
    console.log('');
  }
  
  console.log('='.repeat(60));
}

/**
 * Log to ai_logs table
 */
async function logToAiLogs() {
  try {
    await supabase.from('ai_logs').insert({
      type: 'batch_enrichment',
      action: 'batch_re_enrich',
      status: 'success',
      output: {
        investors: metrics.investors,
        startups: metrics.startups,
        discovered: metrics.discovered,
        duration_seconds: (Date.now() - metrics.startTime) / 1000
      }
    });
  } catch (err) {
    console.error('Failed to log to ai_logs:', err.message);
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const typeArg = args.find(a => a.startsWith('--type='))?.split('=')[1];
  const limitArg = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '10');
  const runAll = args.includes('--all');
  
  console.log('🔄 Batch Re-Enrichment Script');
  console.log('============================');
  console.log(`Type: ${runAll ? 'ALL' : typeArg || 'investors'}`);
  console.log(`Limit: ${limitArg} per type`);
  console.log('');
  
  metrics.startTime = Date.now();
  
  if (runAll || typeArg === 'investors') {
    await enrichInvestors(limitArg);
  }
  
  if (runAll || typeArg === 'startups') {
    await enrichStartups(limitArg);
  }
  
  if (runAll || typeArg === 'discovered') {
    await enrichDiscovered(limitArg);
  }
  
  printReport();
  await logToAiLogs();
}

main().catch(console.error);
