#!/usr/bin/env node
/**
 * LOCATION ENRICHMENT PIPELINE
 * 
 * Enriches missing locations for startups by:
 * 1. Extracting from descriptions using NLP patterns
 * 2. Inferring from investor geography
 * 3. Using AI to extract location from context
 * 4. Checking discovered_startups for location hints
 * 
 * Run: node enrich-locations.js
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

// Common location patterns
const LOCATION_PATTERNS = [
  /(?:based in|located in|headquartered in|from|in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s+([A-Z]{2})?/gi,
  /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s+([A-Z]{2}|USA|US|UK|U\.K\.)/gi,
  /(San Francisco|New York|London|Boston|Austin|Seattle|Los Angeles|Chicago|Miami|Denver|Portland|Berlin|Paris|Tel Aviv|Bangalore|Mumbai|Singapore|Tokyo|Sydney)/gi,
  /(Silicon Valley|Bay Area|NYC|SF|LA)/gi
];

// Extract location from text
function extractLocationFromText(text) {
  if (!text) return null;

  const locations = [];
  
  // Try patterns
  for (const pattern of LOCATION_PATTERNS) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      if (match[1] && match[1].length > 2) {
        let location = match[1].trim();
        if (match[2]) {
          location += `, ${match[2]}`;
        }
        locations.push(location);
      }
    }
  }

  // Return first valid location
  if (locations.length > 0) {
    // Normalize common variations
    const normalized = locations[0]
      .replace(/^based in\s+/i, '')
      .replace(/^located in\s+/i, '')
      .replace(/^headquartered in\s+/i, '')
      .replace(/^from\s+/i, '')
      .trim();
    
    if (normalized.length > 2 && normalized.length < 100) {
      return normalized;
    }
  }

  return null;
}

// Use AI to extract location
async function extractLocationWithAI(companyName, description) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return null;
  }

  try {
    const { Anthropic } = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const prompt = `Extract the location/city for this company. Return ONLY the city name (e.g., "San Francisco" or "New York, NY" or "London, UK") or "unknown" if not found.

Company: ${companyName}
Description: ${description || 'No description available'}

Location:`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const result = message.content[0]?.text?.trim() || '';
    if (result && result !== 'unknown' && !result.includes('cannot') && result.length < 100) {
      return result;
    }
  } catch (error) {
    // Silently fail - AI extraction is optional
  }

  return null;
}

// Infer location from investor geography
async function inferLocationFromInvestors(startupId) {
  try {
    // Get matches for this startup
    const { data: matches } = await supabase
      .from('startup_investor_matches')
      .select('investor_id')
      .eq('startup_id', startupId)
      .order('match_score', { ascending: false })
      .limit(10);

    if (!matches || matches.length === 0) return null;

    const investorIds = matches.map(m => m.investor_id);
    
    // Get investor geographies
    const { data: investors } = await supabase
      .from('investors')
      .select('geography_focus, location')
      .in('id', investorIds)
      .not('geography_focus', 'is', null);

    if (!investors || investors.length === 0) return null;

    // Find most common geography
    const geographies = {};
    investors.forEach(inv => {
      if (Array.isArray(inv.geography_focus)) {
        inv.geography_focus.forEach(geo => {
          geographies[geo] = (geographies[geo] || 0) + 1;
        });
      } else if (inv.geography_focus) {
        geographies[inv.geography_focus] = (geographies[inv.geography_focus] || 0) + 1;
      }
      if (inv.location) {
        geographies[inv.location] = (geographies[inv.location] || 0) + 1;
      }
    });

    // Return most common (excluding 'global')
    const sorted = Object.entries(geographies)
      .filter(([geo]) => geo.toLowerCase() !== 'global')
      .sort((a, b) => b[1] - a[1]);

    if (sorted.length > 0) {
      return sorted[0][0];
    }
  } catch (error) {
    // Silently fail
  }

  return null;
}

async function enrichLocations() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        📍 LOCATION ENRICHMENT PIPELINE                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`⏰ ${new Date().toLocaleString()}\n`);

  // 1. Find startups missing locations
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('1️⃣  FINDING STARTUPS MISSING LOCATIONS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { data: missingLocations, error: fetchError } = await supabase
    .from('startup_uploads')
    .select('id, name, description, location')
    .eq('status', 'approved')
    .or('location.is.null,location.eq.')
    .limit(500);

  if (fetchError) {
    console.error(`❌ Error fetching startups: ${fetchError.message}`);
    return;
  }

  if (!missingLocations || missingLocations.length === 0) {
    console.log('✅ No startups missing locations!');
    return;
  }

  console.log(`📊 Found ${missingLocations.length} startups missing locations\n`);

  // 2. Enrich locations
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('2️⃣  ENRICHING LOCATIONS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let enriched = 0;
  let skipped = 0;
  let errors = 0;

  for (const startup of missingLocations) {
    try {
      let location = null;

      // Method 1: Extract from description
      if (startup.description) {
        location = extractLocationFromText(startup.description);
        if (location) {
          console.log(`   📝 Extracted from description: ${startup.name} → ${location}`);
        }
      }

      // Method 2: Check discovered_startups
      if (!location) {
        const { data: discovered } = await supabase
          .from('discovered_startups')
          .select('description')
          .ilike('name', startup.name)
          .limit(1)
          .maybeSingle();

        if (discovered && discovered.description) {
          location = extractLocationFromText(discovered.description);
          if (location) {
            console.log(`   📋 Extracted from discovered: ${startup.name} → ${location}`);
          }
        }
      }

      // Method 3: Infer from investor geography
      if (!location) {
        location = await inferLocationFromInvestors(startup.id);
        if (location) {
          console.log(`   💼 Inferred from investors: ${startup.name} → ${location}`);
        }
      }

      // Method 4: Use AI extraction
      if (!location && startup.description) {
        location = await extractLocationWithAI(startup.name, startup.description);
        if (location) {
          console.log(`   🤖 AI extracted: ${startup.name} → ${location}`);
        }
      }

      // Update the startup
      if (location) {
        const { error: updateError } = await supabase
          .from('startup_uploads')
          .update({ location: location })
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
      } else {
        skipped++;
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
  console.log(`⏭️  Skipped (no location found): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);

  // Check remaining
  const { count: stillMissing } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .or('location.is.null,location.eq.');

  console.log(`\n📊 Remaining missing locations: ${stillMissing || 0}`);

  console.log('\n' + '═'.repeat(63));
  console.log('✅ Location enrichment complete\n');
}

enrichLocations().catch(console.error);





