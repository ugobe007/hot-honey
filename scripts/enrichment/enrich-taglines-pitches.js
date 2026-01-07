#!/usr/bin/env node
/**
 * TAGLINE & PITCH ENRICHMENT PIPELINE
 * 
 * Enriches missing taglines and pitches by:
 * 1. Extracting from descriptions (first sentence for tagline)
 * 2. Using value_proposition from discovered_startups
 * 3. Generating with AI from descriptions
 * 4. Creating summaries from available data
 * 
 * Run: node enrich-taglines-pitches.js
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

// Extract tagline from description (first sentence or first 100 chars)
function extractTaglineFromDescription(description) {
  if (!description) return null;

  // Try to get first sentence
  const firstSentence = description.split(/[.!?]/)[0].trim();
  if (firstSentence && firstSentence.length > 10 && firstSentence.length < 150) {
    return firstSentence;
  }

  // Fallback to first 100 characters
  const short = description.substring(0, 100).trim();
  if (short.length > 10) {
    // Remove trailing incomplete words
    const lastSpace = short.lastIndexOf(' ');
    if (lastSpace > 50) {
      return short.substring(0, lastSpace) + '...';
    }
    return short + '...';
  }

  return null;
}

// Generate tagline with AI
async function generateTaglineWithAI(companyName, description) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return null;
  }

  try {
    const { Anthropic } = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const prompt = `Create a compelling one-line tagline for this startup (max 120 characters). Make it catchy and descriptive.

Company: ${companyName}
Description: ${description || 'No description available'}

Tagline:`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const result = message.content[0]?.text?.trim() || '';
    if (result && result.length > 10 && result.length < 150) {
      return result;
    }
  } catch (error) {
    // Silently fail
  }

  return null;
}

// Generate pitch with AI
async function generatePitchWithAI(companyName, description, tagline) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return null;
  }

  try {
    const { Anthropic } = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const prompt = `Create a compelling 2-3 sentence pitch for this startup (max 300 characters). Focus on the problem, solution, and value proposition.

Company: ${companyName}
Tagline: ${tagline || 'N/A'}
Description: ${description || 'No description available'}

Pitch:`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const result = message.content[0]?.text?.trim() || '';
    if (result && result.length > 20 && result.length < 500) {
      return result;
    }
  } catch (error) {
    // Silently fail
  }

  return null;
}

async function enrichTaglinesAndPitches() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     ✨ TAGLINE & PITCH ENRICHMENT PIPELINE                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`⏰ ${new Date().toLocaleString()}\n`);

  // 1. Find startups missing taglines or pitches
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('1️⃣  FINDING STARTUPS MISSING TAGLINES/PITCHES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { data: missing, error: fetchError } = await supabase
    .from('startup_uploads')
    .select('id, name, description, tagline, pitch')
    .eq('status', 'approved')
    .or('tagline.is.null,tagline.eq.,pitch.is.null,pitch.eq.')
    .limit(500);

  if (fetchError) {
    console.error(`❌ Error fetching startups: ${fetchError.message}`);
    return;
  }

  if (!missing || missing.length === 0) {
    console.log('✅ No startups missing taglines or pitches!');
    return;
  }

  const missingTagline = missing.filter(s => !s.tagline || s.tagline.trim() === '');
  const missingPitch = missing.filter(s => !s.pitch || s.pitch.trim() === '');

  console.log(`📊 Found ${missing.length} startups needing enrichment:`);
  console.log(`   Missing tagline: ${missingTagline.length}`);
  console.log(`   Missing pitch: ${missingPitch.length}\n`);

  // 2. Enrich taglines
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('2️⃣  ENRICHING TAGLINES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let taglinesEnriched = 0;
  let taglinesSkipped = 0;
  let taglinesErrors = 0;

  for (const startup of missingTagline) {
    try {
      let tagline = null;

      // Method 1: Check discovered_startups for value_proposition
      const { data: discovered } = await supabase
        .from('discovered_startups')
        .select('value_proposition')
        .ilike('name', startup.name)
        .not('value_proposition', 'is', null)
        .limit(1)
        .maybeSingle();

      if (discovered && discovered.value_proposition) {
        tagline = discovered.value_proposition.trim();
        if (tagline.length > 10 && tagline.length < 150) {
          console.log(`   📋 From value_proposition: ${startup.name} → ${tagline.substring(0, 60)}...`);
        } else {
          tagline = null;
        }
      }

      // Method 2: Extract from description
      if (!tagline && startup.description) {
        tagline = extractTaglineFromDescription(startup.description);
        if (tagline) {
          console.log(`   📝 Extracted from description: ${startup.name} → ${tagline.substring(0, 60)}...`);
        }
      }

      // Method 3: Generate with AI
      if (!tagline && startup.description) {
        tagline = await generateTaglineWithAI(startup.name, startup.description);
        if (tagline) {
          console.log(`   🤖 AI generated: ${startup.name} → ${tagline.substring(0, 60)}...`);
        }
      }

      // Update
      if (tagline) {
        const { error: updateError } = await supabase
          .from('startup_uploads')
          .update({ tagline: tagline })
          .eq('id', startup.id);

        if (updateError) {
          console.error(`   ❌ Error updating ${startup.name}: ${updateError.message}`);
          taglinesErrors++;
        } else {
          taglinesEnriched++;
          if (taglinesEnriched % 10 === 0) {
            console.log(`   📊 Progress: ${taglinesEnriched} taglines enriched...`);
          }
        }
      } else {
        taglinesSkipped++;
      }

    } catch (error) {
      console.error(`   ❌ Error processing ${startup.name}: ${error.message}`);
      taglinesErrors++;
    }
  }

  // 3. Enrich pitches
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('3️⃣  ENRICHING PITCHES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let pitchesEnriched = 0;
  let pitchesSkipped = 0;
  let pitchesErrors = 0;

  for (const startup of missingPitch) {
    try {
      let pitch = null;

      // Get updated tagline if available
      const { data: updated } = await supabase
        .from('startup_uploads')
        .select('tagline, description')
        .eq('id', startup.id)
        .single();

      const currentTagline = updated?.tagline || startup.tagline;
      const currentDescription = updated?.description || startup.description;

      // Method 1: Use description as pitch (if short enough)
      if (currentDescription && currentDescription.length > 20 && currentDescription.length < 500) {
        pitch = currentDescription;
        console.log(`   📝 Using description: ${startup.name} → ${pitch.substring(0, 60)}...`);
      }

      // Method 2: Generate with AI
      if (!pitch && currentDescription) {
        pitch = await generatePitchWithAI(startup.name, currentDescription, currentTagline);
        if (pitch) {
          console.log(`   🤖 AI generated: ${startup.name} → ${pitch.substring(0, 60)}...`);
        }
      }

      // Update
      if (pitch) {
        const { error: updateError } = await supabase
          .from('startup_uploads')
          .update({ pitch: pitch })
          .eq('id', startup.id);

        if (updateError) {
          console.error(`   ❌ Error updating ${startup.name}: ${updateError.message}`);
          pitchesErrors++;
        } else {
          pitchesEnriched++;
          if (pitchesEnriched % 10 === 0) {
            console.log(`   📊 Progress: ${pitchesEnriched} pitches enriched...`);
          }
        }
      } else {
        pitchesSkipped++;
      }

    } catch (error) {
      console.error(`   ❌ Error processing ${startup.name}: ${error.message}`);
      pitchesErrors++;
    }
  }

  // 4. Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('4️⃣  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`✅ Taglines enriched: ${taglinesEnriched}`);
  console.log(`⏭️  Taglines skipped: ${taglinesSkipped}`);
  console.log(`❌ Tagline errors: ${taglinesErrors}`);

  console.log(`\n✅ Pitches enriched: ${pitchesEnriched}`);
  console.log(`⏭️  Pitches skipped: ${pitchesSkipped}`);
  console.log(`❌ Pitch errors: ${pitchesErrors}`);

  // Check remaining
  const { count: stillMissingTagline } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .or('tagline.is.null,tagline.eq.');

  const { count: stillMissingPitch } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .or('pitch.is.null,pitch.eq.');

  console.log(`\n📊 Remaining missing:`);
  console.log(`   Taglines: ${stillMissingTagline || 0}`);
  console.log(`   Pitches: ${stillMissingPitch || 0}`);

  console.log('\n' + '═'.repeat(63));
  console.log('✅ Tagline & pitch enrichment complete\n');
}

enrichTaglinesAndPitches().catch(console.error);





