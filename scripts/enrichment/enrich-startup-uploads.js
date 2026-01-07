#!/usr/bin/env node
/**
 * Enrich Startup Uploads
 * 
 * Fills in missing data for startups in startup_uploads table:
 * - Missing websites (try to find from company name)
 * - Missing descriptions (use inference)
 * - Missing sectors (infer from description)
 * - Missing locations (infer from context)
 * 
 * Usage:
 *   node enrich-startup-uploads.js                    # Enrich all
 *   node enrich-startup-uploads.js --limit=50        # Enrich first 50
 *   node enrich-startup-uploads.js --missing=website  # Only fix websites
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
const missingField = args.find(a => a.startsWith('--missing='))?.split('=')[1] || null;

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
  return `https://${cleanName}.com`;
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

/**
 * Use AI to infer missing data
 */
async function inferMissingData(startup) {
  const prompt = `Given this startup information, provide missing data:

Company Name: ${startup.name}
Tagline: ${startup.tagline || 'Not provided'}
Current Description: ${startup.description || 'Not provided'}
Current Sectors: ${startup.sectors?.join(', ') || 'Not provided'}
Current Location: ${startup.location || 'Not provided'}
Current Website: ${startup.website || 'Not provided'}

Fill in missing fields:
1. If description is missing or empty, provide a brief one-line description based on name and tagline
2. If sectors are missing or empty, infer the most likely sector(s)
3. If location is missing, suggest a likely location (city, country) based on company name and context
4. If website is missing, suggest the most likely website domain (e.g., companyname.com)

Return ONLY valid JSON (no markdown, no code blocks):
{
  "description": "One-line description (keep existing if good, otherwise provide new)",
  "sectors": ["Sector1", "Sector2"],
  "location": "City, Country (or just keep existing if good)",
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

async function enrichStartups() {
  console.log('🔧 Enriching Startup Uploads');
  console.log('═'.repeat(70));
  
  // Build query - find startups with missing data
  let query = supabase
    .from('startup_uploads')
    .select('id, name, tagline, description, sectors, website, location')
    .or('description.is.null,description.eq.,sectors.is.null,website.is.null,website.eq.,location.is.null,location.eq.')
    .order('created_at', { ascending: false });
  
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
  const stats = {
    websites: 0,
    descriptions: 0,
    sectors: 0,
    locations: 0
  };
  
  for (const startup of startups) {
    try {
      console.log(`\n🔍 Processing: ${startup.name}`);
      
      const updates = {};
      let needsUpdate = false;
      
      // Check missing website
      if ((!missingField || missingField === 'website') && (!startup.website || startup.website.trim() === '')) {
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
            stats.websites++;
            console.log(`   ✅ Website verified: ${guessedUrl}`);
          } else {
            // Fallback to simple guess
            const simpleGuess = guessWebsiteUrl(startup.name);
            if (simpleGuess) {
              updates.website = simpleGuess;
              needsUpdate = true;
              stats.websites++;
              console.log(`   ⚠️  Using guessed URL: ${simpleGuess} (not verified)`);
            }
          }
        } else {
          // Fallback to simple guess
          const guessedUrl = guessWebsiteUrl(startup.name);
          if (guessedUrl) {
            updates.website = guessedUrl;
            needsUpdate = true;
            stats.websites++;
            console.log(`   ⚠️  Using guessed URL: ${guessedUrl} (not verified)`);
          }
        }
        
        await new Promise(r => setTimeout(r, 1000));
      }
      
      // Check missing/invalid description
      if ((!missingField || missingField === 'description') && (!startup.description || startup.description.trim() === '')) {
        console.log('   📝 Missing description, inferring...');
        
        const inferred = await inferMissingData(startup);
        if (inferred?.description && inferred.description.trim().length > 10) {
          updates.description = inferred.description;
          needsUpdate = true;
          stats.descriptions++;
          console.log(`   ✅ Description: ${inferred.description.substring(0, 60)}...`);
        }
        
        await new Promise(r => setTimeout(r, 1000));
      }
      
      // Check missing/invalid sectors
      if ((!missingField || missingField === 'sectors') && (!startup.sectors || startup.sectors.length === 0)) {
        console.log('   🏷️  Missing sectors, inferring...');
        
        const inferred = await inferMissingData(startup);
        if (inferred?.sectors && Array.isArray(inferred.sectors) && inferred.sectors.length > 0) {
          updates.sectors = inferred.sectors;
          needsUpdate = true;
          stats.sectors++;
          console.log(`   ✅ Sectors: ${inferred.sectors.join(', ')}`);
        }
        
        await new Promise(r => setTimeout(r, 1000));
      }
      
      // Check missing location
      if ((!missingField || missingField === 'location') && (!startup.location || startup.location.trim() === '')) {
        console.log('   📍 Missing location, inferring...');
        
        const inferred = await inferMissingData(startup);
        if (inferred?.location && inferred.location.trim().length > 2) {
          updates.location = inferred.location;
          needsUpdate = true;
          stats.locations++;
          console.log(`   ✅ Location: ${inferred.location}`);
        }
        
        await new Promise(r => setTimeout(r, 1000));
      }
      
      // Update if needed
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('startup_uploads')
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
  console.log(`✅ Enriched: ${enriched} startups`);
  console.log(`   - Websites added: ${stats.websites}`);
  console.log(`   - Descriptions added: ${stats.descriptions}`);
  console.log(`   - Sectors added: ${stats.sectors}`);
  console.log(`   - Locations added: ${stats.locations}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`⏭️  Skipped: ${startups.length - enriched - errors}`);
}

enrichStartups().catch(console.error);

