#!/usr/bin/env node
/**
 * FOUNDER AGE ENRICHMENT SCRIPT
 * =============================
 * 
 * Estimates founder age based on available signals:
 * 1. LinkedIn data (if scraped)
 * 2. Education year (graduation = ~22 years old)
 * 3. Founded year (founders typically 25-35)
 * 4. Company name patterns
 * 5. Team pedigree (FAANG alumni usually 25-35)
 * 
 * Run: node enrich-founder-ages.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Age estimation constants
const CURRENT_YEAR = new Date().getFullYear();
const GRADUATION_AGE = 22; // Typical college graduation age
const TYPICAL_FOUNDER_AGE = 30; // Average founder age

// Education patterns that suggest age
const EDUCATION_YEAR_REGEX = /(?:class of |graduated? )?['']?(\d{4})/i;
const DROPOUT_KEYWORDS = ['dropout', 'dropped out', 'left', 'former student'];
const RECENT_GRAD_KEYWORDS = ['recent graduate', 'new grad', 'class of 202'];

async function enrichFounderAges() {
  console.log('\n' + '═'.repeat(70));
  console.log('👤 FOUNDER AGE ENRICHMENT');
  console.log('═'.repeat(70));
  
  // Get startups with extracted data
  const { data: startups } = await supabase.rpc('exec_sql_rows', {
    sql_query: `
      SELECT id, name, extracted_data, team_size
      FROM startup_uploads 
      WHERE status = 'approved'
    `
  });
  
  // Handle potential JSON response
  const startupList = Array.isArray(startups) ? startups : [];
  
  console.log(`\n📊 Processing ${startupList.length} startups...\n`);
  console.log(`   Raw response type: ${typeof startups}`);
  if (typeof startups === 'object' && startups !== null) {
    console.log(`   Keys: ${Object.keys(startups).join(', ')}`);
  }
  
  let enriched = 0;
  let estimated = 0;
  
  for (const startup of startupList) {
    const ageData = estimateFounderAge(startup);
    
    if (ageData.hasEstimate) {
      // Update the database
      await supabase.rpc('exec_sql_modify', {
        sql_query: `
          UPDATE startup_uploads SET
            founder_avg_age = ${ageData.avgAge ? ageData.avgAge : 'NULL'},
            founder_youngest_age = ${ageData.youngestAge ? ageData.youngestAge : 'NULL'},
            founders_under_30 = ${ageData.under30 || 0},
            founders_under_25 = ${ageData.under25 || 0},
            first_time_founders = ${ageData.firstTime ? 'true' : 'false'}
          WHERE id = '${startup.id}'
        `
      });
      
      enriched++;
      
      if (ageData.estimated) {
        estimated++;
      }
      
      // Log sample
      if (enriched <= 5) {
        console.log(`   ✓ ${startup.name}: avg=${ageData.avgAge || '?'}, youngest=${ageData.youngestAge || '?'}, method=${ageData.method}`);
      }
    }
  }
  
  console.log(`\n✅ Enriched ${enriched} startups`);
  console.log(`   ${estimated} were estimates (no direct age data)`);
  
  // Show distribution
  const { data: distribution } = await supabase.rpc('exec_sql_rows', {
    sql_query: `
      SELECT 
        CASE 
          WHEN founder_avg_age < 25 THEN 'Under 25'
          WHEN founder_avg_age < 30 THEN '25-29'
          WHEN founder_avg_age < 35 THEN '30-34'
          WHEN founder_avg_age < 40 THEN '35-39'
          WHEN founder_avg_age >= 40 THEN '40+'
          ELSE 'Unknown'
        END as age_group,
        COUNT(*) as count
      FROM startup_uploads
      WHERE status = 'approved'
      GROUP BY age_group
      ORDER BY age_group
    `
  });
  
  console.log('\n📊 Founder Age Distribution:');
  for (const row of distribution || []) {
    console.log(`   ${row.age_group}: ${row.count} startups`);
  }
  
  console.log('\n' + '═'.repeat(70) + '\n');
}

function estimateFounderAge(startup) {
  const result = {
    hasEstimate: false,
    avgAge: null,
    youngestAge: null,
    under30: 0,
    under25: 0,
    firstTime: true,
    estimated: false,
    method: 'none'
  };
  
  const ages = [];
  
  // Method 1: Parse extracted_data for team info
  if (startup.extracted_data) {
    try {
      const data = typeof startup.extracted_data === 'string' 
        ? JSON.parse(startup.extracted_data) 
        : startup.extracted_data;
      
      // Look for team/founders array - ensure it's actually an array
      let team = data.team || data.founders || data.leadership || [];
      if (!Array.isArray(team)) {
        team = []; // Reset if not an array
      }
      
      for (const member of team) {
        if (!member || typeof member !== 'object') continue;
        
        let age = null;
      
      // Direct age field
      if (member.age) {
        age = parseInt(member.age);
      }
      
      // Education year
      if (!age && member.education) {
        const yearMatch = member.education.match(EDUCATION_YEAR_REGEX);
        if (yearMatch) {
          const gradYear = parseInt(yearMatch[1]);
          age = CURRENT_YEAR - gradYear + GRADUATION_AGE;
        }
        
        // Dropout = likely young
        if (DROPOUT_KEYWORDS.some(k => member.education.toLowerCase().includes(k))) {
          age = age || 24; // Assume young dropout
          result.under25++;
        }
      }
      
      // LinkedIn data (if present)
      if (!age && member.linkedin_years_experience) {
        age = 22 + parseInt(member.linkedin_years_experience);
      }
      
      if (age && age >= 18 && age <= 70) {
        ages.push(age);
        if (age < 30) result.under30++;
        if (age < 25) result.under25++;
      }
      
      // Check for serial founder
      if (member.previous_startups || member.serial_founder || 
          (member.background && member.background.includes('founded'))) {
        result.firstTime = false;
      }
    }
    
    if (ages.length > 0) {
      result.method = 'extracted_data';
    }
    } catch (e) {
      // Failed to parse extracted_data, continue with other methods
    }
  }
  
  // Method 2: Team size as proxy (larger teams suggest more mature/older founders)
  if (ages.length === 0 && startup.team_size) {
    const teamSize = parseInt(startup.team_size);
    
    // Very small teams (1-2) likely younger, hungrier
    if (teamSize <= 2) {
      ages.push(28); // Assume ~28
      result.estimated = true;
      result.method = 'small_team_young';
    } else if (teamSize <= 5) {
      ages.push(31);
      result.estimated = true;
      result.method = 'team_size';
    } else {
      ages.push(35); // Larger team = more established
      result.estimated = true;
      result.method = 'larger_team';
    }
  }
  
  // Method 3: Team companies (FAANG suggests mid-career)
  if (ages.length === 0 && startup.team_companies && startup.team_companies.length > 0) {
    const companies = Array.isArray(startup.team_companies) 
      ? startup.team_companies 
      : [startup.team_companies];
    
    const bigTech = ['google', 'meta', 'facebook', 'apple', 'amazon', 'microsoft', 
                     'stripe', 'airbnb', 'uber', 'netflix'];
    
    const hasBigTech = companies.some(c => 
      bigTech.some(bt => c.toLowerCase().includes(bt))
    );
    
    if (hasBigTech) {
      ages.push(32); // Big tech alumni typically 28-36
      result.firstTime = false;
      result.estimated = true;
      result.method = 'big_tech_alumni';
    }
  }
  
  // Method 4: Default estimate for remaining
  if (ages.length === 0) {
    // Use industry average
    ages.push(TYPICAL_FOUNDER_AGE);
    result.estimated = true;
    result.method = 'industry_average';
  }
  
  // Calculate aggregates
  if (ages.length > 0) {
    result.hasEstimate = true;
    result.avgAge = Math.round(ages.reduce((a, b) => a + b, 0) / ages.length);
    result.youngestAge = Math.min(...ages);
    
    if (result.avgAge < 30) result.under30 = Math.max(result.under30, 1);
    if (result.avgAge < 25) result.under25 = Math.max(result.under25, 1);
  }
  
  return result;
}

enrichFounderAges().catch(console.error);
