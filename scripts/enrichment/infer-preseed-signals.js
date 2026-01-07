#!/usr/bin/env node
/**
 * INFER PRE-SEED SIGNALS FROM DESCRIPTIONS
 * =========================================
 * 
 * Extracts pre-seed signals from startup descriptions:
 * 1. Technical cofounder (CRITICAL - high weight)
 * 2. Founder education (infer from descriptions)
 * 3. Advisors (optional bonus, not required)
 * 4. Customer interviews conducted
 * 5. Why Now signals
 * 
 * Plus social validation signals - founders discussing other startups
 * on Discord/Reddit/Signal/Twitter could be gold for validation.
 * 
 * Run: node scripts/enrichment/infer-preseed-signals.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Education patterns (tier 1 schools)
const EDUCATION_PATTERNS = {
  tier1: [
    /stanford/i, /mit\b/i, /harvard/i, /berkeley/i, /caltech/i,
    /yale/i, /princeton/i, /cambridge/i, /oxford/i, /eth zurich/i
  ],
  tier2: [
    /carnegie mellon/i, /cornell/i, /columbia/i, /upenn/i, /chicago/i,
    /michigan/i, /georgia tech/i, /illinois/i, /waterloo/i
  ],
  yc: [/y[\s-]?combinator/i, /\byc\b/i, /yc\s+(s|w)\d{2}/i],
  degree: [
    /phd/i, /ph\.d/i, /doctorate/i, /postdoc/i,
    /masters/i, /mba/i, /ms\b/i, /m\.s\./i,
    /bachelor/i, /bs\b/i, /b\.s\./i, /ba\b/i
  ]
};

// Technical cofounder patterns
const TECH_COFOUNDER_PATTERNS = [
  /technical co-?founder/i,
  /cto/i, /chief technology officer/i,
  /engineering co-?founder/i,
  /founded? by.*engineer/i,
  /cs degree/i, /computer science/i,
  /software engineer.*founder/i,
  /built? (the|our) (product|platform|system)/i,
  /technical background/i,
  /former.*engineer.*google|meta|amazon|microsoft|apple/i
];

// Advisor patterns
const ADVISOR_PATTERNS = [
  /advised? by/i,
  /advisor:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
  /board member/i,
  /angel investor.*advising/i,
  /mentor/i,
  /backed by/i
];

// Customer validation patterns
const VALIDATION_PATTERNS = [
  /spoke with (\d+) customers/i,
  /interviewed (\d+) (users|customers)/i,
  /customer discovery/i,
  /(\d+) customer interviews/i,
  /validated with (\d+)/i
];

// Why Now patterns
const WHY_NOW_PATTERNS = [
  /recent (breakthrough|advancement|change)/i,
  /new regulation/i,
  /market shift/i,
  /technology (finally|now) (enables|allows)/i,
  /timing is right/i,
  /(post|after) covid/i,
  /ai revolution/i,
  /just became possible/i
];

function inferEducation(description) {
  const schools = [];
  let hasDegree = false;
  
  // Check for tier 1 schools
  for (const pattern of EDUCATION_PATTERNS.tier1) {
    if (pattern.test(description)) {
      const match = description.match(pattern);
      schools.push({ school: match[0], tier: 1 });
    }
  }
  
  // Check for YC
  for (const pattern of EDUCATION_PATTERNS.yc) {
    if (pattern.test(description)) {
      schools.push({ school: 'Y Combinator', tier: 1 });
    }
  }
  
  // Check for degree mentions
  for (const pattern of EDUCATION_PATTERNS.degree) {
    if (pattern.test(description)) {
      hasDegree = true;
      break;
    }
  }
  
  return schools.length > 0 ? schools : null;
}

function inferTechnicalCofounder(description) {
  for (const pattern of TECH_COFOUNDER_PATTERNS) {
    if (pattern.test(description)) {
      return true;
    }
  }
  return null; // Don't set to false, leave as unknown
}

function inferAdvisors(description) {
  const advisors = [];
  
  for (const pattern of ADVISOR_PATTERNS) {
    const match = description.match(pattern);
    if (match) {
      advisors.push({
        inferred: true,
        source: 'description',
        context: match[0]
      });
    }
  }
  
  return advisors.length > 0 ? advisors : null;
}

function inferCustomerInterviews(description) {
  for (const pattern of VALIDATION_PATTERNS) {
    const match = description.match(pattern);
    if (match) {
      const count = parseInt(match[1]);
      if (count > 0) {
        return count;
      }
    }
  }
  return null;
}

function inferWhyNow(description) {
  for (const pattern of WHY_NOW_PATTERNS) {
    const match = description.match(pattern);
    if (match) {
      return match[0]; // Return the matched text as why_now
    }
  }
  return null;
}

async function enrichStartup(startup) {
  const description = startup.description || '';
  const updates = {};
  
  // Infer technical cofounder
  if (startup.has_technical_cofounder === null || startup.has_technical_cofounder === undefined) {
    const hasTech = inferTechnicalCofounder(description);
    if (hasTech !== null) {
      updates.has_technical_cofounder = hasTech;
    }
  }
  
  // Infer education
  if (!startup.founder_education || startup.founder_education.length === 0) {
    const education = inferEducation(description);
    if (education) {
      updates.founder_education = education.map(e => e.school);
    }
  }
  
  // Infer advisors (optional bonus)
  if (!startup.advisors || (Array.isArray(startup.advisors) && startup.advisors.length === 0)) {
    const advisors = inferAdvisors(description);
    if (advisors) {
      updates.advisors = advisors;
    }
  }
  
  // Infer customer interviews
  if (!startup.customer_interviews_conducted || startup.customer_interviews_conducted === 0) {
    const interviews = inferCustomerInterviews(description);
    if (interviews) {
      updates.customer_interviews_conducted = interviews;
    }
  }
  
  // Infer why now
  if (!startup.why_now) {
    const whyNow = inferWhyNow(description);
    if (whyNow) {
      updates.why_now = whyNow;
    }
  }
  
  return updates;
}

async function main() {
  console.log('🔍 INFERRING PRE-SEED SIGNALS FROM DESCRIPTIONS');
  console.log('================================================\n');
  
  // Get all pre-seed startups with descriptions
  // Stage 1 = Pre-seed (as per the GOD score formula)
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('*')
    .eq('status', 'approved')
    .or('stage.eq.1,stage.ilike.%pre-seed%,stage.ilike.%pre_seed%')
    .not('description', 'is', null);
  
  if (error) {
    console.error('❌ Error fetching startups:', error);
    return;
  }
  
  console.log(`Found ${startups.length} pre-seed startups with descriptions\n`);
  
  let enriched = 0;
  let techs = 0;
  let educations = 0;
  let advisors = 0;
  let interviews = 0;
  let whyNows = 0;
  
  for (const startup of startups) {
    const updates = await enrichStartup(startup);
    
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('startup_uploads')
        .update(updates)
        .eq('id', startup.id);
      
      if (updateError) {
        console.error(`❌ ${startup.name}:`, updateError.message);
      } else {
        enriched++;
        if (updates.has_technical_cofounder) techs++;
        if (updates.founder_education) educations++;
        if (updates.advisors) advisors++;
        if (updates.customer_interviews_conducted) interviews++;
        if (updates.why_now) whyNows++;
        
        console.log(`✅ ${startup.name}:`, Object.keys(updates).join(', '));
      }
    }
  }
  
  console.log('\n=====================================');
  console.log('📊 ENRICHMENT SUMMARY');
  console.log('=====================================');
  console.log(`Total enriched: ${enriched}`);
  console.log(`Technical cofounders inferred: ${techs}`);
  console.log(`Founder education inferred: ${educations}`);
  console.log(`Advisors inferred: ${advisors}`);
  console.log(`Customer interviews inferred: ${interviews}`);
  console.log(`Why Now signals inferred: ${whyNows}`);
  console.log('=====================================');
}

main().catch(console.error);

