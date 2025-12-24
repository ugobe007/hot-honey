#!/usr/bin/env node
/**
 * WEBSITE ENRICHMENT PIPELINE
 * 
 * Enriches missing websites for startups by:
 * 1. Searching company name + domain patterns
 * 2. Checking discovered_startups for website hints
 * 3. Using AI to infer likely website from company name
 * 4. Cross-referencing with common TLDs
 * 
 * Run: node enrich-websites.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Common TLDs to try
const COMMON_TLDS = ['.com', '.io', '.ai', '.co', '.app', '.tech', '.dev', '.net', '.org'];

// Generate potential website URLs from company name
function generateWebsiteCandidates(companyName) {
  if (!companyName) return [];
  
  // Clean company name
  const clean = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '');
  
  const candidates = [];
  
  // Direct name variations
  candidates.push(`${clean}.com`);
  candidates.push(`${clean}.io`);
  candidates.push(`${clean}.ai`);
  candidates.push(`${clean}.co`);
  
  // With hyphens
  const hyphenated = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  candidates.push(`${hyphenated}.com`);
  candidates.push(`${hyphenated}.io`);
  
  // Remove common words and try again
  const withoutCommon = clean.replace(/\b(inc|llc|corp|tech|technologies|solutions|systems|group|labs|studio)\b/g, '').trim();
  if (withoutCommon && withoutCommon !== clean) {
    candidates.push(`${withoutCommon}.com`);
    candidates.push(`${withoutCommon}.io`);
  }
  
  return [...new Set(candidates)]; // Remove duplicates
}

// Check if website exists (simple validation)
async function validateWebsite(url) {
  try {
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    
    // Basic URL validation
    const urlObj = new URL(url);
    if (!urlObj.hostname || urlObj.hostname.length < 3) {
      return false;
    }
    
    // Check for valid domain pattern
    const domainPattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    if (!domainPattern.test(urlObj.hostname)) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// Use AI to infer website (if Anthropic key available)
async function inferWebsiteWithAI(companyName, description) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return null;
  }

  try {
    const { Anthropic } = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const prompt = `Given this company name and description, what is the most likely website URL?

Company: ${companyName}
Description: ${description || 'No description available'}

Return ONLY the website URL (e.g., https://example.com) or "unknown" if you cannot determine it.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const result = message.content[0]?.text?.trim() || '';
    if (result && result !== 'unknown' && !result.includes('cannot')) {
      // Clean up the result
      let url = result.replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (await validateWebsite(url)) {
        return url;
      }
    }
  } catch (error) {
    // Silently fail - AI inference is optional
  }

  return null;
}

async function enrichWebsites() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        🌐 WEBSITE ENRICHMENT PIPELINE                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`⏰ ${new Date().toLocaleString()}\n`);

  // 1. Find startups missing websites
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('1️⃣  FINDING STARTUPS MISSING WEBSITES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { data: missingWebsites, error: fetchError } = await supabase
    .from('startup_uploads')
    .select('id, name, description, website')
    .eq('status', 'approved')
    .or('website.is.null,website.eq.')
    .limit(500);

  if (fetchError) {
    console.error(`❌ Error fetching startups: ${fetchError.message}`);
    return;
  }

  if (!missingWebsites || missingWebsites.length === 0) {
    console.log('✅ No startups missing websites!');
    return;
  }

  console.log(`📊 Found ${missingWebsites.length} startups missing websites\n`);

  // 2. Check discovered_startups for website hints
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('2️⃣  CHECKING DISCOVERED_STARTUPS FOR WEBSITE HINTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let enriched = 0;
  let skipped = 0;
  let errors = 0;

  for (const startup of missingWebsites) {
    try {
      // First, check if discovered_startups has a website for this company
      const { data: discovered } = await supabase
        .from('discovered_startups')
        .select('website, name')
        .ilike('name', startup.name)
        .not('website', 'is', null)
        .limit(1)
        .maybeSingle();

      let website = null;

      if (discovered && discovered.website) {
        // Use website from discovered_startups
        website = discovered.website.trim();
        if (await validateWebsite(website)) {
          console.log(`   ✅ Found in discovered_startups: ${startup.name} → ${website}`);
        } else {
          website = null;
        }
      }

      // If not found, try AI inference
      if (!website && startup.description) {
        website = await inferWebsiteWithAI(startup.name, startup.description);
        if (website) {
          console.log(`   🤖 AI inferred: ${startup.name} → ${website}`);
        }
      }

      // If still not found, try generating candidates (but don't auto-validate - too risky)
      // We'll just log potential candidates for manual review
      if (!website) {
        const candidates = generateWebsiteCandidates(startup.name);
        // Don't auto-assign generated candidates - too risky
        // Just log for manual review
        skipped++;
        continue;
      }

      // Update the startup
      if (website) {
        const { error: updateError } = await supabase
          .from('startup_uploads')
          .update({ website: website })
          .eq('id', startup.id);

        if (updateError) {
          console.error(`   ❌ Error updating ${startup.name}: ${updateError.message}`);
          errors++;
        } else {
          enriched++;
          if (enriched % 10 === 0) {
            console.log(`   📊 Progress: ${enriched} enriched...`);
          }
        }
      }

    } catch (error) {
      console.error(`   ❌ Error processing ${startup.name}: ${error.message}`);
      errors++;
    }
  }

  // 3. Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('3️⃣  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`✅ Enriched: ${enriched}`);
  console.log(`⏭️  Skipped (no website found): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);

  // Check remaining
  const { count: stillMissing } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .or('website.is.null,website.eq.');

  console.log(`\n📊 Remaining missing websites: ${stillMissing || 0}`);

  console.log('\n' + '═'.repeat(63));
  console.log('✅ Website enrichment complete\n');
}

enrichWebsites().catch(console.error);



