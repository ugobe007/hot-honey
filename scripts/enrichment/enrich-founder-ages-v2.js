#!/usr/bin/env node
/**
 * FOUNDER AGE ENRICHMENT v2 - NEWS & EDUCATION SIGNALS
 * ====================================================
 * 
 * Extracts founder age from multiple signals:
 * 1. News articles mentioning college graduation years
 * 2. "Class of 20XX" patterns
 * 3. PhD/MBA completion dates
 * 4. "X years of experience" mentions
 * 5. Previous company founding dates
 * 6. LinkedIn years patterns
 * 
 * Run: node enrich-founder-ages-v2.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CURRENT_YEAR = new Date().getFullYear();

// Regex patterns for age extraction
const PATTERNS = {
  // "Class of 2020" or "graduated in 2018"
  graduationYear: /(?:class of|graduated? (?:in|from)?|batch of|')\s*['']?(\d{4})\b/gi,
  
  // "Stanford '15" or "MIT '08"
  shortYear: /(?:stanford|mit|harvard|yale|berkeley|princeton|cornell|columbia|penn|brown|dartmouth|caltech)\s*[''](\d{2})\b/gi,
  
  // "received his PhD in 2019" or "completed MBA in 2020"
  advancedDegree: /(?:phd|mba|masters?|ms|ma)\s+(?:in|from)?\s*(\d{4})/gi,
  
  // "X years of experience"
  yearsExperience: /(\d{1,2})\+?\s*years?\s+(?:of\s+)?(?:experience|in\s+(?:tech|software|engineering|ai|ml))/gi,
  
  // "founded his first company in 2015"
  previousFounding: /(?:founded|started|launched|co-?founded)\s+(?:his|her|their)?\s*(?:first|previous)?\s*(?:company|startup|venture)\s+(?:in\s+)?(\d{4})/gi,
  
  // "dropped out of Stanford in 2019"
  dropOut: /(?:dropped?\s+out|left)\s+(?:of\s+)?(?:\w+\s+)?(?:in\s+)?(\d{4})/gi,
  
  // "at age 25" or "25-year-old founder"
  directAge: /(?:at\s+)?(?:age\s+)?(\d{2})[\s-]year[\s-]old|at\s+age\s+(\d{2})/gi,
  
  // "born in 1995"
  birthYear: /born\s+(?:in\s+)?(\d{4})/gi,
  
  // Forbes 30 under 30, etc.
  under30: /(?:forbes\s+)?(\d{2})\s+under\s+(\d{2})/gi,
  
  // "since 2015" suggesting career start
  careerStart: /(?:working|career|professional)\s+(?:in\s+tech\s+)?since\s+(\d{4})/gi
};

// Degree completion ages
const DEGREE_AGES = {
  bachelors: 22,
  masters: 24,
  mba: 27,
  phd: 28,
  dropout: 20
};

async function enrichFounderAgesV2() {
  console.log('\n' + '═'.repeat(70));
  console.log('👤 FOUNDER AGE ENRICHMENT v2 - NEWS & EDUCATION SIGNALS');
  console.log('═'.repeat(70));
  
  // Get startups with extracted data
  const { data: startups } = await supabase.rpc('exec_sql_rows', {
    sql_query: `
      SELECT id, name, extracted_data, team_size, pitch, description
      FROM startup_uploads 
      WHERE status = 'approved'
    `
  });
  
  const startupList = Array.isArray(startups) ? startups : Object.values(startups || {});
  console.log(`\n📊 Processing ${startupList.length} startups...\n`);
  
  let enriched = 0;
  let fromEducation = 0;
  let fromExperience = 0;
  let fromDirectAge = 0;
  let estimated = 0;
  
  const ageResults = [];
  
  for (const startup of startupList) {
    const ageData = extractFounderAge(startup);
    
    if (ageData.hasEstimate) {
      // Update the database
      const graduationYears = ageData.graduationYears.length > 0 
        ? `ARRAY[${ageData.graduationYears.join(',')}]` 
        : 'NULL';
      
      await supabase.rpc('exec_sql_modify', {
        sql_query: `
          UPDATE startup_uploads SET
            founder_avg_age = ${ageData.avgAge || 'NULL'},
            founder_youngest_age = ${ageData.youngestAge || 'NULL'},
            founders_under_30 = ${ageData.under30 || 0},
            founders_under_25 = ${ageData.under25 || 0},
            first_time_founders = ${ageData.firstTime ? 'true' : 'false'},
            founder_graduation_years = ${graduationYears}
          WHERE id = '${startup.id}'
        `
      });
      
      enriched++;
      
      if (ageData.method.includes('education') || ageData.method.includes('graduation')) fromEducation++;
      if (ageData.method.includes('experience')) fromExperience++;
      if (ageData.method.includes('direct')) fromDirectAge++;
      if (ageData.estimated) estimated++;
      
      // Track for display
      if (enriched <= 10 || ageData.avgAge < 28) {
        ageResults.push({
          name: startup.name,
          avgAge: ageData.avgAge,
          method: ageData.method,
          signals: ageData.signals
        });
      }
    }
  }
  
  // Display sample results
  console.log('📋 Sample Age Extractions:\n');
  for (const r of ageResults.slice(0, 15)) {
    const signals = r.signals.length > 0 ? ` [${r.signals.join(', ')}]` : '';
    console.log(`   ${r.name.padEnd(25)} Age: ${r.avgAge || '?'} (${r.method})${signals}`);
  }
  
  console.log(`\n✅ Enriched ${enriched} startups`);
  console.log(`   📚 From education data: ${fromEducation}`);
  console.log(`   💼 From experience: ${fromExperience}`);
  console.log(`   🎂 From direct age: ${fromDirectAge}`);
  console.log(`   📊 Estimated: ${estimated}`);
  
  // Show age distribution
  const { data: distribution } = await supabase.rpc('exec_sql_rows', {
    sql_query: `
      SELECT 
        CASE 
          WHEN founder_avg_age < 25 THEN '1_Under 25 🔥'
          WHEN founder_avg_age < 30 THEN '2_25-29 ⚡'
          WHEN founder_avg_age < 35 THEN '3_30-34'
          WHEN founder_avg_age < 40 THEN '4_35-39'
          WHEN founder_avg_age >= 40 THEN '5_40+'
          ELSE '6_Unknown'
        END as age_group,
        COUNT(*) as count
      FROM startup_uploads
      WHERE status = 'approved'
      GROUP BY age_group
      ORDER BY age_group
    `
  });
  
  console.log('\n📊 Founder Age Distribution:');
  const distList = Array.isArray(distribution) ? distribution : Object.values(distribution || {});
  for (const row of distList) {
    const bar = '█'.repeat(Math.min(Math.floor(row.count / 20), 30));
    console.log(`   ${row.age_group.substring(2).padEnd(15)} ${String(row.count).padStart(4)} ${bar}`);
  }
  
  console.log('\n' + '═'.repeat(70) + '\n');
}

function extractFounderAge(startup) {
  const result = {
    hasEstimate: false,
    avgAge: null,
    youngestAge: null,
    under30: 0,
    under25: 0,
    firstTime: true,
    estimated: false,
    method: 'none',
    signals: [],
    graduationYears: []
  };
  
  const ages = [];
  const signals = [];
  
  // Collect all text to search
  const textSources = [];
  
  // Add extracted_data content
  if (startup.extracted_data) {
    try {
      const data = typeof startup.extracted_data === 'string' 
        ? JSON.parse(startup.extracted_data) 
        : startup.extracted_data;
      
      // Add all text fields
      if (data.team) textSources.push(JSON.stringify(data.team));
      if (data.founders) textSources.push(JSON.stringify(data.founders));
      if (data.fivePoints) textSources.push(data.fivePoints.join(' '));
      if (data.description) textSources.push(data.description);
      if (data.background) textSources.push(data.background);
      if (data.leadership) textSources.push(JSON.stringify(data.leadership));
      if (data.news) textSources.push(JSON.stringify(data.news));
      if (data.articles) textSources.push(JSON.stringify(data.articles));
      
      // Check for direct team data
      const team = data.team || data.founders || data.leadership || [];
      if (Array.isArray(team)) {
        for (const member of team) {
          if (!member || typeof member !== 'object') continue;
          
          // Direct age
          if (member.age) {
            ages.push(parseInt(member.age));
            signals.push(`direct_age:${member.age}`);
          }
          
          // Years of experience
          if (member.experience_years) {
            const age = 22 + parseInt(member.experience_years);
            ages.push(age);
            signals.push(`exp_years:${member.experience_years}`);
          }
          
          // Check for serial founder
          if (member.previous_startups || member.serial_founder) {
            result.firstTime = false;
          }
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }
  
  // Add pitch and description
  if (startup.pitch) textSources.push(startup.pitch);
  if (startup.description) textSources.push(startup.description);
  
  const fullText = textSources.join(' ').toLowerCase();
  
  // Method 1: Direct age mentions ("25-year-old founder")
  let match;
  const directAgeRegex = /(?:at\s+)?(?:age\s+)?(\d{2})[\s-]year[\s-]old|at\s+age\s+(\d{2})/gi;
  while ((match = directAgeRegex.exec(fullText)) !== null) {
    const age = parseInt(match[1] || match[2]);
    if (age >= 18 && age <= 60) {
      ages.push(age);
      signals.push(`direct:${age}`);
      result.method = 'direct_age';
    }
  }
  
  // Method 2: Birth year
  const birthRegex = /born\s+(?:in\s+)?(\d{4})/gi;
  while ((match = birthRegex.exec(fullText)) !== null) {
    const birthYear = parseInt(match[1]);
    if (birthYear >= 1960 && birthYear <= 2005) {
      const age = CURRENT_YEAR - birthYear;
      ages.push(age);
      signals.push(`birth:${birthYear}`);
      result.method = 'birth_year';
    }
  }
  
  // Method 3: Graduation year ("Class of 2020")
  const gradRegex = /(?:class of|graduated? (?:in|from)?|batch of|')\s*['']?(\d{4})\b/gi;
  while ((match = gradRegex.exec(fullText)) !== null) {
    const gradYear = parseInt(match[1]);
    if (gradYear >= 1980 && gradYear <= CURRENT_YEAR) {
      const age = CURRENT_YEAR - gradYear + DEGREE_AGES.bachelors;
      ages.push(age);
      signals.push(`grad:${gradYear}`);
      result.graduationYears.push(gradYear);
      result.method = 'graduation_year';
    }
  }
  
  // Method 4: Short year format ("Stanford '15")
  const shortYearRegex = /(?:stanford|mit|harvard|yale|berkeley|princeton|cornell|columbia|penn|brown|dartmouth|caltech|georgia tech|carnegie)\s*[''](\d{2})\b/gi;
  while ((match = shortYearRegex.exec(fullText)) !== null) {
    let gradYear = parseInt(match[1]);
    gradYear = gradYear < 50 ? 2000 + gradYear : 1900 + gradYear;
    if (gradYear >= 1980 && gradYear <= CURRENT_YEAR) {
      const age = CURRENT_YEAR - gradYear + DEGREE_AGES.bachelors;
      ages.push(age);
      signals.push(`short:${gradYear}`);
      result.graduationYears.push(gradYear);
      result.method = 'education_short';
    }
  }
  
  // Method 5: Advanced degree completion ("PhD in 2019")
  const advancedRegex = /(?:phd|mba|masters?|ms|ma)\s+(?:in|from)?\s*(\d{4})/gi;
  while ((match = advancedRegex.exec(fullText)) !== null) {
    const degreeYear = parseInt(match[1]);
    if (degreeYear >= 1990 && degreeYear <= CURRENT_YEAR) {
      const degreeType = fullText.includes('phd') ? 'phd' : 'mba';
      const age = CURRENT_YEAR - degreeYear + DEGREE_AGES[degreeType];
      ages.push(age);
      signals.push(`${degreeType}:${degreeYear}`);
      result.method = 'advanced_degree';
    }
  }
  
  // Method 6: Years of experience
  const expRegex = /(\d{1,2})\+?\s*years?\s+(?:of\s+)?(?:experience|in\s+(?:tech|software|engineering|ai|ml|startup|industry))/gi;
  while ((match = expRegex.exec(fullText)) !== null) {
    const years = parseInt(match[1]);
    if (years >= 1 && years <= 40) {
      const age = 22 + years;
      ages.push(age);
      signals.push(`exp:${years}y`);
      result.method = 'experience_years';
    }
  }
  
  // Method 7: Forbes 30 under 30
  if (fullText.includes('30 under 30') || fullText.includes('forbes 30')) {
    ages.push(28); // Average for 30 under 30
    signals.push('forbes30');
    result.method = 'forbes_30';
  }
  
  // Method 8: Thiel Fellowship (under 22)
  if (fullText.includes('thiel fellow')) {
    ages.push(21);
    signals.push('thiel');
    result.method = 'thiel_fellow';
  }
  
  // Method 9: Dropout mentions (young)
  if (fullText.includes('dropout') || fullText.includes('dropped out')) {
    if (ages.length === 0) {
      ages.push(23);
      signals.push('dropout');
      result.method = 'dropout_young';
    }
    result.under25++;
  }
  
  // Method 10: Keyword hints
  if (fullText.includes('gen z') || fullText.includes('generation z')) {
    if (ages.length === 0) {
      ages.push(24);
      signals.push('genz');
      result.method = 'gen_z';
    }
  }
  
  // Fallback: Use team size heuristic
  if (ages.length === 0 && startup.team_size) {
    const teamSize = parseInt(startup.team_size);
    if (teamSize <= 2) {
      ages.push(28);
      result.method = 'small_team';
      result.estimated = true;
    } else if (teamSize <= 5) {
      ages.push(31);
      result.method = 'team_size';
      result.estimated = true;
    } else {
      ages.push(35);
      result.method = 'larger_team';
      result.estimated = true;
    }
  }
  
  // Final fallback: Industry average
  if (ages.length === 0) {
    ages.push(30);
    result.method = 'industry_avg';
    result.estimated = true;
  }
  
  // Calculate aggregates
  if (ages.length > 0) {
    result.hasEstimate = true;
    result.avgAge = Math.round(ages.reduce((a, b) => a + b, 0) / ages.length);
    result.youngestAge = Math.min(...ages);
    result.signals = signals;
    
    // Count young founders
    result.under30 = ages.filter(a => a < 30).length;
    result.under25 = ages.filter(a => a < 25).length;
    
    // If any signal shows multiple companies, not first-time
    if (fullText.includes('serial') || fullText.includes('second company') || 
        fullText.includes('previous startup') || fullText.includes('exited')) {
      result.firstTime = false;
    }
  }
  
  return result;
}

enrichFounderAgesV2().catch(console.error);
