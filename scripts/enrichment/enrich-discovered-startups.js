#!/usr/bin/env node
/**
 * Enrich Discovered Startups
 * 
 * Fills in missing data for startups in discovered_startups table:
 * - Missing websites (try to find from company name)
 * - Missing descriptions (use inference)
 * - Missing sectors (infer from description)
 * 
 * Usage:
 *   node enrich-discovered-startups.js                    # Enrich all
 *   node enrich-discovered-startups.js --limit=50         # Enrich first 50
 *   node enrich-discovered-startups.js --source=Sequoia   # Enrich specific source
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk').default;

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Parse command line args
const args = process.argv.slice(2);
const limit = args.find(a => a.startsWith('--limit='))?.split('=')[1] || null;
const source = args.find(a => a.startsWith('--source='))?.split('=')[1] || null;

/**
 * Try to construct website URL from company name
 */
function guessWebsiteUrl(companyName) {
  if (!companyName) return null;
  
  // Clean company name
  let cleanName = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .trim();
  
  if (cleanName.length < 2) return null;
  
  // Common patterns
  const patterns = [
    `https://${cleanName}.com`,
    `https://www.${cleanName}.com`,
    `https://${cleanName}.io`,
    `https://www.${cleanName}.io`,
    `https://${cleanName}.ai`,
    `https://www.${cleanName}.ai`,
  ];
  
  return patterns[0]; // Return most common pattern
}

/**
 * Use AI to infer missing data
 */
async function inferMissingData(startup) {
  const prompt = `Given this startup information, provide missing data:

Company Name: ${startup.name}
Current Description: ${startup.description || 'Not provided'}
Current Sectors: ${startup.sectors?.join(', ') || 'Not provided'}
Source: ${startup.rss_source}

If description is missing or "Not specified", provide a brief one-line description of what this company likely does based on the name and context.

If sectors are missing or "Not specified", infer the most likely sector(s) from the company name and description.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "description": "One-line description (or keep existing if good)",
  "sectors": ["Sector1", "Sector2"],
  "website_hint": "suggested website domain (e.g., companyname.com) if not provided"
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error(`   ⚠️  AI inference error: ${error.message}`);
  }
  
  return null;
}

/**
 * Check if website exists (simple HTTP check)
 */
async function checkWebsiteExists(url) {
  try {
    const https = require('https');
    const http = require('http');
    const { URL } = require('url');
    
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    
    return new Promise((resolve) => {
      const req = client.get(url, { timeout: 5000 }, (res) => {
        resolve(res.statusCode < 400);
      });
      
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}

async function enrichStartups() {
  console.log('🔧 Enriching Discovered Startups');
  console.log('═'.repeat(70));
  
  // Build query
  let query = supabase
    .from('discovered_startups')
    .select('*')
    .or('website.is.null,description.is.null,description.eq.Not specified,sectors.is.null')
    .order('discovered_at', { ascending: false });
  
  if (source) {
    query = query.eq('rss_source', source);
  }
  
  if (limit) {
    query = query.limit(parseInt(limit));
  }
  
  const { data: startups, error } = await query;
  
  if (error) {
    console.error('❌ Error fetching startups:', error.message);
    return;
  }
  
  if (!startups || startups.length === 0) {
    console.log('✅ No startups need enrichment');
    return;
  }
  
  console.log(`\n📊 Found ${startups.length} startups needing enrichment\n`);
  
  let enriched = 0;
  let errors = 0;
  
  for (const startup of startups) {
    try {
      console.log(`\n🔍 Processing: ${startup.name}`);
      
      const updates = {};
      let needsUpdate = false;
      
      // Check missing website
      if (!startup.website || startup.website.trim() === '') {
        console.log('   🔗 Missing website, trying to find...');
        
        // Try AI inference first
        const inferred = await inferMissingData(startup);
        if (inferred?.website_hint) {
          const guessedUrl = `https://${inferred.website_hint}`;
          console.log(`   💡 AI suggested: ${guessedUrl}`);
          
          // Try to verify it exists
          const exists = await checkWebsiteExists(guessedUrl);
          if (exists) {
            updates.website = guessedUrl;
            needsUpdate = true;
            console.log(`   ✅ Website verified: ${guessedUrl}`);
          } else {
            // Fallback to simple guess
            const simpleGuess = guessWebsiteUrl(startup.name);
            if (simpleGuess) {
              updates.website = simpleGuess;
              needsUpdate = true;
              console.log(`   ⚠️  Using guessed URL: ${simpleGuess} (not verified)`);
            }
          }
        } else {
          // Fallback to simple guess
          const guessedUrl = guessWebsiteUrl(startup.name);
          if (guessedUrl) {
            updates.website = guessedUrl;
            needsUpdate = true;
            console.log(`   ⚠️  Using guessed URL: ${guessedUrl} (not verified)`);
          }
        }
        
        // Rate limiting
        await new Promise(r => setTimeout(r, 1000));
      }
      
      // Check missing/invalid description
      if (!startup.description || startup.description === 'Not specified' || startup.description.trim().length < 10) {
        console.log('   📝 Missing description, inferring...');
        
        const inferred = await inferMissingData(startup);
        if (inferred?.description && inferred.description !== 'Not specified') {
          updates.description = inferred.description;
          needsUpdate = true;
          console.log(`   ✅ Description: ${inferred.description.substring(0, 60)}...`);
        }
        
        await new Promise(r => setTimeout(r, 1000));
      }
      
      // Check missing/invalid sectors
      if (!startup.sectors || startup.sectors.length === 0 || startup.sectors[0] === 'Not specified') {
        console.log('   🏷️  Missing sectors, inferring...');
        
        const inferred = await inferMissingData(startup);
        if (inferred?.sectors && Array.isArray(inferred.sectors) && inferred.sectors.length > 0) {
          updates.sectors = inferred.sectors;
          needsUpdate = true;
          console.log(`   ✅ Sectors: ${inferred.sectors.join(', ')}`);
        }
        
        await new Promise(r => setTimeout(r, 1000));
      }
      
      // Update if needed
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('discovered_startups')
          .update(updates)
          .eq('id', startup.id);
        
        if (updateError) {
          console.error(`   ❌ Update error: ${updateError.message}`);
          errors++;
        } else {
          console.log(`   ✅ Updated successfully`);
          enriched++;
        }
      } else {
        console.log(`   ⏭️  No updates needed`);
      }
      
    } catch (err) {
      console.error(`   ❌ Error processing ${startup.name}: ${err.message}`);
      errors++;
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('📊 ENRICHMENT SUMMARY');
  console.log('═'.repeat(70));
  console.log(`✅ Enriched: ${enriched}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`⏭️  Skipped: ${startups.length - enriched - errors}`);
}

enrichStartups().catch(console.error);

