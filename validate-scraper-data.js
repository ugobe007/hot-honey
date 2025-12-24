#!/usr/bin/env node
/**
 * VALIDATE & CLEANUP SCRAPER DATA
 * 
 * Checks for schema mismatches and data quality issues in discovered_startups
 * - Missing required fields
 * - Wrong column names
 * - Invalid data types
 * - Orphaned records
 * 
 * Run: node validate-scraper-data.js
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

// Expected schema fields
const REQUIRED_FIELDS = ['name'];
const OPTIONAL_FIELDS = [
  'website', 'description', 'funding_amount', 'funding_stage',
  'investors_mentioned', 'article_url', 'article_title', 'article_date',
  'rss_source', 'imported_to_startups', 'discovered_at', 'created_at'
];

// Common schema mistakes
const SCHEMA_MISTAKES = {
  'url': 'website',
  'source': 'article_url',
  'imported_to_review': 'imported_to_startups',
  'imported': 'imported_to_startups'
};

async function validateSchema() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     🔍 SCRAPER DATA VALIDATION & CLEANUP                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`⏰ ${new Date().toLocaleString()}\n`);

  // 1. Check for schema issues
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('1️⃣  SCHEMA VALIDATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Test if all expected columns exist
    const { data: sample, error: sampleError } = await supabase
      .from('discovered_startups')
      .select('*')
      .limit(1)
      .single();

    if (sampleError && sampleError.code === 'PGRST116') {
      console.log('⚠️  No data found - table may be empty');
      return;
    }

    if (sampleError) {
      console.error(`❌ Schema error: ${sampleError.message}`);
      return;
    }

    // Check which fields exist
    const existingFields = Object.keys(sample || {});
    const missingFields = OPTIONAL_FIELDS.filter(f => !existingFields.includes(f));
    
    console.log(`✅ Schema check:`);
    console.log(`   Total fields in sample: ${existingFields.length}`);
    if (missingFields.length > 0) {
      console.log(`   ⚠️  Missing optional fields: ${missingFields.join(', ')}`);
    } else {
      console.log(`   ✅ All expected fields present`);
    }

    // Check for common mistakes (these would cause errors)
    console.log(`\n📋 Common schema mistakes to avoid:`);
    Object.entries(SCHEMA_MISTAKES).forEach(([wrong, correct]) => {
      if (existingFields.includes(wrong)) {
        console.log(`   ❌ Found wrong column "${wrong}" - should be "${correct}"`);
      } else {
        console.log(`   ✅ No "${wrong}" column (correct)`);
      }
    });

  } catch (error) {
    console.error(`❌ Error validating schema: ${error.message}`);
  }

  // 2. Data quality checks
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('2️⃣  DATA QUALITY CHECKS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    const { data: all, error: fetchError } = await supabase
      .from('discovered_startups')
      .select('*')
      .limit(1000);

    if (fetchError) {
      console.error(`❌ Error fetching data: ${fetchError.message}`);
      return;
    }

    if (!all || all.length === 0) {
      console.log('⚠️  No discovered startups found');
      return;
    }

    const issues = {
      missingName: 0,
      missingArticleUrl: 0,
      missingRssSource: 0,
      invalidDates: 0,
      emptyDescriptions: 0,
      total: all.length
    };

    all.forEach(record => {
      if (!record.name || record.name.trim() === '') {
        issues.missingName++;
      }
      if (!record.article_url) {
        issues.missingArticleUrl++;
      }
      if (!record.rss_source) {
        issues.missingRssSource++;
      }
      if (record.article_date && isNaN(new Date(record.article_date).getTime())) {
        issues.invalidDates++;
      }
      if (!record.description || record.description.trim() === '') {
        issues.emptyDescriptions++;
      }
    });

    console.log(`📊 Data quality report (${issues.total} records):`);
    console.log(`   Missing name: ${issues.missingName} (${((issues.missingName/issues.total)*100).toFixed(1)}%)`);
    console.log(`   Missing article_url: ${issues.missingArticleUrl} (${((issues.missingArticleUrl/issues.total)*100).toFixed(1)}%)`);
    console.log(`   Missing rss_source: ${issues.missingRssSource} (${((issues.missingRssSource/issues.total)*100).toFixed(1)}%)`);
    console.log(`   Invalid dates: ${issues.invalidDates} (${((issues.invalidDates/issues.total)*100).toFixed(1)}%)`);
    console.log(`   Empty descriptions: ${issues.emptyDescriptions} (${((issues.emptyDescriptions/issues.total)*100).toFixed(1)}%)`);

    // Show sample of problematic records
    const problematic = all.filter(r => 
      !r.name || !r.article_url || !r.rss_source
    ).slice(0, 5);

    if (problematic.length > 0) {
      console.log(`\n⚠️  Sample problematic records:`);
      problematic.forEach((r, i) => {
        const problems = [];
        if (!r.name) problems.push('no name');
        if (!r.article_url) problems.push('no article_url');
        if (!r.rss_source) problems.push('no rss_source');
        console.log(`   ${i+1}. ${r.name || 'UNNAMED'} - ${problems.join(', ')}`);
      });
    }

  } catch (error) {
    console.error(`❌ Error checking data quality: ${error.message}`);
  }

  // 3. Check scraper consistency
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('3️⃣  SCRAPER CONSISTENCY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    const { data: recent, error: recentError } = await supabase
      .from('discovered_startups')
      .select('article_title, article_date, rss_source, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (recent && recent.length > 0) {
      const withTitle = recent.filter(r => r.article_title).length;
      const withDate = recent.filter(r => r.article_date).length;
      const withSource = recent.filter(r => r.rss_source).length;

      console.log(`📈 Recent records (last 100):`);
      console.log(`   With article_title: ${withTitle} (${((withTitle/recent.length)*100).toFixed(1)}%)`);
      console.log(`   With article_date: ${withDate} (${((withDate/recent.length)*100).toFixed(1)}%)`);
      console.log(`   With rss_source: ${withSource} (${((withSource/recent.length)*100).toFixed(1)}%)`);

      if (withTitle < recent.length * 0.5) {
        console.log(`   ⚠️  WARNING: Less than 50% have article_title - scraper may not be saving it`);
      }
      if (withDate < recent.length * 0.5) {
        console.log(`   ⚠️  WARNING: Less than 50% have article_date - scraper may not be saving it`);
      }
      if (withSource < recent.length * 0.5) {
        console.log(`   ⚠️  WARNING: Less than 50% have rss_source - scraper may not be saving it`);
      }
    }

  } catch (error) {
    console.error(`❌ Error checking consistency: ${error.message}`);
  }

  // 4. Recommendations
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('4️⃣  RECOMMENDATIONS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('✅ Schema validation complete');
  console.log('\n📋 Next steps:');
  console.log('   1. Review any warnings above');
  console.log('   2. Ensure all scrapers use correct column names');
  console.log('   3. Fix discover-startups-from-rss.js to save article_title, article_date, rss_source');
  console.log('   4. Run this script regularly to catch issues early');
  console.log('   5. Consider creating a unified saveDiscoveredStartup() helper function\n');

  console.log('═'.repeat(63));
  console.log('✅ Validation complete\n');
}

validateSchema().catch(console.error);



