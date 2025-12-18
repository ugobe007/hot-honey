#!/usr/bin/env node
/**
 * AI Startup Enrichment Script
 * Fills in missing data (description, sectors, location) for startups
 * Uses tagline + name to generate descriptions and infer sectors
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://unkpogyhhjbvxxjvmxlt.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

// Sector keywords mapping
const SECTOR_KEYWORDS = {
  'AI/ML': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'neural', 'gpt', 'llm', 'generative'],
  'FinTech': ['fintech', 'banking', 'payment', 'finance', 'credit', 'lending', 'insurance', 'insurtech', 'defi', 'crypto', 'blockchain'],
  'HealthTech': ['health', 'healthcare', 'medical', 'biotech', 'pharma', 'clinical', 'patient', 'diagnostic', 'therapeutics', 'drug'],
  'SaaS': ['saas', 'software', 'platform', 'cloud', 'enterprise', 'b2b', 'automation', 'workflow'],
  'E-Commerce': ['ecommerce', 'e-commerce', 'marketplace', 'retail', 'shopping', 'commerce', 'shop'],
  'EdTech': ['education', 'edtech', 'learning', 'school', 'student', 'teaching', 'course', 'training'],
  'CleanTech': ['climate', 'clean', 'green', 'carbon', 'sustainability', 'renewable', 'energy', 'solar', 'ev', 'electric vehicle'],
  'PropTech': ['real estate', 'proptech', 'property', 'housing', 'mortgage', 'home'],
  'FoodTech': ['food', 'restaurant', 'delivery', 'meal', 'grocery', 'agriculture', 'agtech', 'farming'],
  'Cybersecurity': ['security', 'cyber', 'encryption', 'privacy', 'compliance', 'fraud'],
  'Robotics': ['robot', 'robotics', 'autonomous', 'drone', 'automation', 'humanoid', 'quadruped'],
  'SpaceTech': ['space', 'satellite', 'rocket', 'aerospace', 'orbit'],
  'Gaming': ['gaming', 'game', 'esports', 'metaverse', 'vr', 'ar', 'virtual reality'],
  'HR Tech': ['hr', 'hiring', 'recruitment', 'talent', 'workforce', 'employee', 'payroll'],
  'Legal Tech': ['legal', 'law', 'contract', 'compliance', 'attorney', 'lawyer'],
  'Logistics': ['logistics', 'shipping', 'supply chain', 'freight', 'warehouse', 'delivery'],
  'Consumer': ['consumer', 'social', 'dating', 'lifestyle', 'entertainment', 'media', 'content'],
  'Developer Tools': ['developer', 'api', 'devops', 'infrastructure', 'code', 'programming', 'sdk'],
  'IoT': ['iot', 'connected', 'sensor', 'smart device', 'wearable', 'hardware'],
  'Marketplace': ['marketplace', 'two-sided', 'platform', 'peer-to-peer', 'p2p']
};

// Location inference from common patterns
const LOCATION_PATTERNS = [
  { pattern: /san francisco|sf|bay area/i, location: 'San Francisco, CA' },
  { pattern: /new york|nyc|manhattan/i, location: 'New York, NY' },
  { pattern: /los angeles|la|santa monica/i, location: 'Los Angeles, CA' },
  { pattern: /boston/i, location: 'Boston, MA' },
  { pattern: /seattle/i, location: 'Seattle, WA' },
  { pattern: /austin/i, location: 'Austin, TX' },
  { pattern: /chicago/i, location: 'Chicago, IL' },
  { pattern: /london/i, location: 'London, UK' },
  { pattern: /berlin/i, location: 'Berlin, Germany' },
  { pattern: /singapore/i, location: 'Singapore' },
  { pattern: /india|bangalore|mumbai|delhi/i, location: 'India' },
  { pattern: /china|beijing|shanghai|shenzhen/i, location: 'China' },
  { pattern: /israel|tel aviv/i, location: 'Israel' },
];

function inferSectors(name, tagline) {
  const text = `${name} ${tagline}`.toLowerCase();
  const matchedSectors = [];

  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        if (!matchedSectors.includes(sector)) {
          matchedSectors.push(sector);
        }
        break;
      }
    }
  }

  // Default to SaaS if nothing matched but looks like B2B
  if (matchedSectors.length === 0) {
    if (text.includes('platform') || text.includes('solution') || text.includes('enterprise')) {
      matchedSectors.push('SaaS');
    } else {
      matchedSectors.push('Technology');
    }
  }

  return matchedSectors.slice(0, 3); // Max 3 sectors
}

function generateDescription(name, tagline) {
  if (!tagline) return null;
  
  // Expand the tagline into a proper description
  const descriptions = [
    `${name} is ${tagline.toLowerCase().startsWith('a') || tagline.toLowerCase().startsWith('an') ? '' : 'a '}${tagline}. The company is focused on delivering innovative solutions in this space, helping customers achieve better outcomes through technology-driven approaches.`,
    `${name} provides ${tagline.toLowerCase()}. By leveraging cutting-edge technology and deep domain expertise, the company aims to transform how businesses and consumers interact with this market.`,
    `As ${tagline.toLowerCase()}, ${name} is positioned to capture significant market opportunity. The platform combines advanced technology with user-centric design to deliver measurable value.`
  ];

  // Pick based on hash of name for consistency
  const index = name.length % descriptions.length;
  return descriptions[index];
}

function inferLocation(name, tagline, website) {
  const text = `${name} ${tagline} ${website || ''}`.toLowerCase();
  
  for (const { pattern, location } of LOCATION_PATTERNS) {
    if (pattern.test(text)) {
      return location;
    }
  }
  
  return null; // Can't infer
}

async function enrichStartups(options = {}) {
  const { limit = 50, dryRun = false, missingOnly = true } = options;

  console.log('🚀 Starting AI Startup Enrichment');
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
  console.log(`   Limit: ${limit} startups\n`);

  // Get startups missing data
  let query = supabase
    .from('startup_uploads')
    .select('id, name, tagline, description, sectors, location, website')
    .order('created_at', { ascending: false });

  if (missingOnly) {
    query = query.or('description.is.null,sectors.is.null,location.is.null,description.eq.,location.eq.');
  }

  const { data: startups, error } = await query.limit(limit);

  if (error) {
    console.error('❌ Error fetching startups:', error);
    return;
  }

  console.log(`📊 Found ${startups.length} startups to process\n`);

  let enriched = 0;
  let skipped = 0;
  const updates = [];

  for (const startup of startups) {
    const update = { id: startup.id };
    let needsUpdate = false;

    // Enrich description
    if (!startup.description || startup.description === '') {
      const desc = generateDescription(startup.name, startup.tagline);
      if (desc) {
        update.description = desc;
        needsUpdate = true;
      }
    }

    // Enrich sectors
    if (!startup.sectors || startup.sectors.length === 0) {
      const sectors = inferSectors(startup.name, startup.tagline);
      if (sectors.length > 0) {
        update.sectors = sectors;
        needsUpdate = true;
      }
    }

    // Enrich location
    if (!startup.location || startup.location === '') {
      const location = inferLocation(startup.name, startup.tagline, startup.website);
      if (location) {
        update.location = location;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      updates.push(update);
      enriched++;

      console.log(`✅ ${startup.name}`);
      if (update.description) console.log(`   📝 Description: ${update.description.slice(0, 60)}...`);
      if (update.sectors) console.log(`   🏷️  Sectors: ${update.sectors.join(', ')}`);
      if (update.location) console.log(`   📍 Location: ${update.location}`);
      console.log('');
    } else {
      skipped++;
    }
  }

  console.log('─'.repeat(50));
  console.log(`📊 Summary:`);
  console.log(`   Enriched: ${enriched}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${startups.length}`);

  if (!dryRun && updates.length > 0) {
    console.log(`\n💾 Saving ${updates.length} updates to database...`);

    for (const update of updates) {
      const { id, ...fields } = update;
      const { error: updateError } = await supabase
        .from('startup_uploads')
        .update(fields)
        .eq('id', id);

      if (updateError) {
        console.error(`   ❌ Failed to update ${id}:`, updateError.message);
      }
    }

    console.log('✅ Updates saved!');
  } else if (dryRun) {
    console.log('\n⚠️  DRY RUN - No changes saved. Run without --dry-run to apply.');
  }

  return { enriched, skipped, total: startups.length };
}

// CLI
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 100;

enrichStartups({ limit, dryRun, missingOnly: true })
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
