#!/usr/bin/env node
/**
 * SCHEMA DIAGNOSTIC & FIX SCRIPT
 * ==============================
 * Validates scraped data against database schema and fixes mismatches.
 * 
 * Run: node schema-diagnostic.js
 * Run with fixes: node schema-diagnostic.js --fix
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const APPLY_FIXES = process.argv.includes('--fix');

// ============================================
// SCHEMA DEFINITIONS
// ============================================

// What the scoring service EXPECTS
const STARTUP_SCORING_FIELDS = {
  // Team scoring expects these
  team: { type: 'array', contains: { name: 'string', role: 'string', background: 'string', previousCompanies: 'array', education: 'string' } },
  founders_count: { type: 'integer' },
  technical_cofounders: { type: 'integer' },
  
  // Traction scoring expects these
  revenue: { type: 'integer', aliases: ['revenue_annual'] },
  mrr: { type: 'integer' },
  active_users: { type: 'integer' },
  growth_rate: { type: 'integer', aliases: ['growth_rate_monthly'] },
  customers: { type: 'integer' },
  
  // Product scoring expects these
  demo_available: { type: 'boolean', aliases: ['has_demo'] },
  launched: { type: 'boolean', aliases: ['is_launched'] },
  unique_ip: { type: 'boolean' },
  defensibility: { type: 'text', enum: ['high', 'medium', 'low'] },
  
  // Market scoring expects these
  market_size: { type: 'integer' },
  industries: { type: 'array', aliases: ['sectors'] },
  problem: { type: 'text' },
  solution: { type: 'text' },
  
  // Vision scoring expects these
  contrarian_insight: { type: 'text' },
  creative_strategy: { type: 'text' },
  vision_statement: { type: 'text' },
  
  // Ecosystem scoring expects these
  strategic_partners: { type: 'jsonb' },
  advisors: { type: 'jsonb' },
  platform_dependencies: { type: 'array' },
  
  // Grit scoring expects these
  pivots_made: { type: 'integer' },
  pivot_history: { type: 'jsonb' },
  customer_feedback_frequency: { type: 'text', enum: ['daily', 'weekly', 'monthly', 'rarely'] },
  time_to_iterate_days: { type: 'integer' },
  
  // Problem validation scoring expects these
  customer_interviews_conducted: { type: 'integer' },
  customer_pain_data: { type: 'jsonb' },
  icp_clarity: { type: 'text', enum: ['vague', 'moderate', 'crystal_clear'] },
  problem_discovery_depth: { type: 'text', enum: ['surface', 'moderate', 'deep'] },
  
  // Basic fields
  stage: { type: 'integer' },
  previous_funding: { type: 'integer' },
  tagline: { type: 'text' },
  pitch: { type: 'text' }
};

const INVESTOR_SCORING_FIELDS = {
  // Track record scoring
  total_investments: { type: 'integer' },
  successful_exits: { type: 'integer' },
  portfolio_companies: { type: 'array' },
  notable_investments: { type: 'jsonb' },
  
  // Fund health scoring
  active_fund_size: { type: 'bigint' },
  dry_powder_estimate: { type: 'bigint' },
  investment_pace_per_year: { type: 'integer' },
  last_investment_date: { type: 'timestamp' },
  
  // Expertise scoring
  stage: { type: 'array' },
  sectors: { type: 'array' },
  geography_focus: { type: 'array' },
  investment_thesis: { type: 'text' },
  
  // Responsiveness scoring
  avg_response_time_days: { type: 'integer' },
  decision_maker: { type: 'boolean' },
  leads_rounds: { type: 'boolean' },
  
  // Basic
  name: { type: 'text' },
  firm: { type: 'text' }
};

// ============================================
// DIAGNOSTIC FUNCTIONS
// ============================================

async function getDbSchema(tableName) {
  const { data } = await supabase.rpc('exec_sql_rows', {
    sql_query: `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = '${tableName}'
      ORDER BY ordinal_position
    `
  });
  return data || [];
}

async function getSampleData(tableName, limit = 10) {
  const { data } = await supabase.rpc('exec_sql_rows', {
    sql_query: `SELECT * FROM ${tableName} LIMIT ${limit}`
  });
  return data || [];
}

async function getFieldStats(tableName, field) {
  const { data } = await supabase.rpc('exec_sql_rows', {
    sql_query: `
      SELECT 
        COUNT(*) as total,
        COUNT(${field}) as non_null,
        COUNT(*) - COUNT(${field}) as null_count
      FROM ${tableName}
    `
  });
  return data?.[0] || { total: 0, non_null: 0, null_count: 0 };
}

function analyzeFieldMismatches(expectedFields, actualSchema) {
  const issues = [];
  const actualColumns = new Map(actualSchema.map(c => [c.column_name, c]));
  
  for (const [field, spec] of Object.entries(expectedFields)) {
    // Check if field exists
    if (!actualColumns.has(field)) {
      // Check aliases
      const aliasMatch = spec.aliases?.find(a => actualColumns.has(a));
      if (aliasMatch) {
        issues.push({
          field,
          type: 'alias_used',
          message: `Field "${field}" uses alias "${aliasMatch}" in DB`,
          severity: 'info',
          fix: `Map ${aliasMatch} → ${field} in scoring`
        });
      } else {
        issues.push({
          field,
          type: 'missing_column',
          message: `Expected column "${field}" not in database`,
          severity: 'warning',
          fix: `Add column or populate via extracted_data`
        });
      }
    } else {
      // Check type compatibility
      const actualCol = actualColumns.get(field);
      const typeMatch = checkTypeCompatibility(spec.type, actualCol.data_type);
      if (!typeMatch) {
        issues.push({
          field,
          type: 'type_mismatch',
          message: `Field "${field}": expected ${spec.type}, got ${actualCol.data_type}`,
          severity: 'error',
          fix: `Cast data or update column type`
        });
      }
    }
  }
  
  return issues;
}

function checkTypeCompatibility(expected, actual) {
  const typeMap = {
    'integer': ['integer', 'bigint', 'numeric', 'smallint'],
    'bigint': ['bigint', 'numeric'],
    'text': ['text', 'character varying', 'varchar'],
    'boolean': ['boolean'],
    'array': ['ARRAY'],
    'jsonb': ['jsonb', 'json'],
    'timestamp': ['timestamp without time zone', 'timestamp with time zone']
  };
  
  return typeMap[expected]?.some(t => actual.toLowerCase().includes(t.toLowerCase())) || false;
}

async function checkDataPopulation(tableName, expectedFields) {
  const stats = [];
  
  for (const field of Object.keys(expectedFields)) {
    try {
      const fieldStats = await getFieldStats(tableName, field);
      stats.push({
        field,
        ...fieldStats,
        populatedPct: ((fieldStats.non_null / fieldStats.total) * 100).toFixed(1) + '%'
      });
    } catch (e) {
      stats.push({
        field,
        total: 0,
        non_null: 0,
        null_count: 0,
        populatedPct: 'N/A (column missing)'
      });
    }
  }
  
  return stats;
}

// ============================================
// FIX FUNCTIONS
// ============================================

async function fixStartupData() {
  console.log('\n🔧 Applying startup data fixes...\n');
  
  // 1. Extract nested data from extracted_data JSONB
  const extractionFixes = [
    {
      name: 'Extract team data',
      sql: `
        UPDATE startup_uploads 
        SET team_size = COALESCE(
          (extracted_data->>'team_size')::int,
          jsonb_array_length(extracted_data->'team')
        )
        WHERE team_size IS NULL 
        AND extracted_data IS NOT NULL
        AND (extracted_data->>'team_size' IS NOT NULL OR extracted_data->'team' IS NOT NULL)
      `
    },
    {
      name: 'Extract revenue data',
      sql: `
        UPDATE startup_uploads 
        SET revenue_annual = COALESCE(
          (extracted_data->>'revenue')::int,
          (extracted_data->>'arr')::int,
          (extracted_data->>'annual_revenue')::int
        )
        WHERE revenue_annual IS NULL 
        AND extracted_data IS NOT NULL
      `
    },
    {
      name: 'Extract MRR data',
      sql: `
        UPDATE startup_uploads 
        SET mrr = COALESCE(
          (extracted_data->>'mrr')::int,
          (extracted_data->>'monthly_revenue')::int
        )
        WHERE mrr IS NULL 
        AND extracted_data IS NOT NULL
      `
    },
    {
      name: 'Extract growth rate',
      sql: `
        UPDATE startup_uploads 
        SET growth_rate_monthly = COALESCE(
          (extracted_data->>'growth_rate')::int,
          (extracted_data->>'mom_growth')::int
        )
        WHERE growth_rate_monthly IS NULL 
        AND extracted_data IS NOT NULL
      `
    },
    {
      name: 'Extract sectors',
      sql: `
        UPDATE startup_uploads 
        SET sectors = COALESCE(
          sectors,
          CASE 
            WHEN extracted_data->'sectors' IS NOT NULL 
            THEN ARRAY(SELECT jsonb_array_elements_text(extracted_data->'sectors'))
            WHEN extracted_data->'industries' IS NOT NULL 
            THEN ARRAY(SELECT jsonb_array_elements_text(extracted_data->'industries'))
            ELSE NULL
          END
        )
        WHERE sectors IS NULL 
        AND extracted_data IS NOT NULL
      `
    },
    {
      name: 'Extract launched status',
      sql: `
        UPDATE startup_uploads 
        SET is_launched = COALESCE(
          (extracted_data->>'launched')::boolean,
          (extracted_data->>'is_live')::boolean,
          TRUE
        )
        WHERE is_launched IS NULL
      `
    },
    {
      name: 'Extract demo status',
      sql: `
        UPDATE startup_uploads 
        SET has_demo = COALESCE(
          (extracted_data->>'demo_available')::boolean,
          (extracted_data->>'has_demo')::boolean,
          website IS NOT NULL
        )
        WHERE has_demo IS NULL
      `
    },
    {
      name: 'Extract tech cofounder',
      sql: `
        UPDATE startup_uploads 
        SET has_technical_cofounder = COALESCE(
          (extracted_data->>'has_technical_cofounder')::boolean,
          (extracted_data->>'technical_cofounders')::int > 0,
          FALSE
        )
        WHERE has_technical_cofounder IS NULL
      `
    }
  ];
  
  for (const fix of extractionFixes) {
    try {
      const { data, error } = await supabase.rpc('exec_sql_modify', { sql_query: fix.sql });
      if (error) {
        console.log(`   ❌ ${fix.name}: ${error.message}`);
      } else {
        console.log(`   ✅ ${fix.name}: ${data?.affected_rows || 0} rows updated`);
      }
    } catch (e) {
      console.log(`   ⚠️ ${fix.name}: ${e.message}`);
    }
  }
}

async function fixInvestorData() {
  console.log('\n🔧 Applying investor data fixes...\n');
  
  const fixes = [
    {
      name: 'Ensure sectors array populated',
      sql: `
        UPDATE investors 
        SET sectors = ARRAY['technology']
        WHERE sectors IS NULL OR array_length(sectors, 1) IS NULL
      `
    },
    {
      name: 'Ensure stage array populated',
      sql: `
        UPDATE investors 
        SET stage = ARRAY['seed', 'series_a']
        WHERE stage IS NULL OR array_length(stage, 1) IS NULL
      `
    },
    {
      name: 'Estimate total investments from portfolio',
      sql: `
        UPDATE investors 
        SET total_investments = COALESCE(
          total_investments,
          array_length(portfolio_companies, 1),
          10
        )
        WHERE total_investments IS NULL OR total_investments = 0
      `
    },
    {
      name: 'Set default leads_rounds',
      sql: `
        UPDATE investors 
        SET leads_rounds = TRUE
        WHERE leads_rounds IS NULL
      `
    }
  ];
  
  for (const fix of fixes) {
    try {
      const { data, error } = await supabase.rpc('exec_sql_modify', { sql_query: fix.sql });
      if (error) {
        console.log(`   ❌ ${fix.name}: ${error.message}`);
      } else {
        console.log(`   ✅ ${fix.name}: ${data?.affected_rows || 0} rows updated`);
      }
    } catch (e) {
      console.log(`   ⚠️ ${fix.name}: ${e.message}`);
    }
  }
}

// ============================================
// MAIN DIAGNOSTIC
// ============================================

async function runDiagnostic() {
  console.log('\n' + '═'.repeat(80));
  console.log('📊 SCHEMA DIAGNOSTIC REPORT');
  console.log('═'.repeat(80));
  
  // ---- STARTUP UPLOADS ----
  console.log('\n\n📋 STARTUP_UPLOADS TABLE\n');
  
  const startupSchema = await getDbSchema('startup_uploads');
  console.log(`   Total columns: ${startupSchema.length}`);
  
  const startupIssues = analyzeFieldMismatches(STARTUP_SCORING_FIELDS, startupSchema);
  
  if (startupIssues.length > 0) {
    console.log('\n   Schema Issues:');
    startupIssues.forEach(issue => {
      const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`   ${icon} ${issue.message}`);
      if (issue.fix) console.log(`      Fix: ${issue.fix}`);
    });
  } else {
    console.log('   ✅ All expected fields present');
  }
  
  // Check data population for key scoring fields
  console.log('\n   Data Population for Scoring Fields:');
  const criticalStartupFields = ['sectors', 'team_size', 'revenue_annual', 'mrr', 'is_launched', 'has_demo'];
  for (const field of criticalStartupFields) {
    try {
      const stats = await getFieldStats('startup_uploads', field);
      const pct = ((stats.non_null / Math.max(stats.total, 1)) * 100).toFixed(1);
      const icon = parseFloat(pct) > 50 ? '✅' : parseFloat(pct) > 10 ? '⚠️' : '❌';
      console.log(`   ${icon} ${field}: ${pct}% populated (${stats.non_null}/${stats.total})`);
    } catch (e) {
      console.log(`   ❌ ${field}: Column not found`);
    }
  }
  
  // ---- INVESTORS ----
  console.log('\n\n📋 INVESTORS TABLE\n');
  
  const investorSchema = await getDbSchema('investors');
  console.log(`   Total columns: ${investorSchema.length}`);
  
  const investorIssues = analyzeFieldMismatches(INVESTOR_SCORING_FIELDS, investorSchema);
  
  if (investorIssues.length > 0) {
    console.log('\n   Schema Issues:');
    investorIssues.forEach(issue => {
      const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`   ${icon} ${issue.message}`);
    });
  } else {
    console.log('   ✅ All expected fields present');
  }
  
  // Check investor data population
  console.log('\n   Data Population for Scoring Fields:');
  const criticalInvestorFields = ['sectors', 'stage', 'total_investments', 'active_fund_size', 'investor_score'];
  for (const field of criticalInvestorFields) {
    try {
      const stats = await getFieldStats('investors', field);
      const pct = ((stats.non_null / Math.max(stats.total, 1)) * 100).toFixed(1);
      const icon = parseFloat(pct) > 50 ? '✅' : parseFloat(pct) > 10 ? '⚠️' : '❌';
      console.log(`   ${icon} ${field}: ${pct}% populated (${stats.non_null}/${stats.total})`);
    } catch (e) {
      console.log(`   ❌ ${field}: Column not found`);
    }
  }
  
  // ---- SCORING LOGIC SUMMARY ----
  console.log('\n\n' + '═'.repeat(80));
  console.log('🧮 SCORING LOGIC SUMMARY');
  console.log('═'.repeat(80));
  
  console.log(`
  STARTUP GOD ALGORITHM (0-10 scale):
  ═══════════════════════════════════
  Component             Max Points    Key Fields Used
  ─────────────────────────────────────────────────
  Team                  3.0           team[], technical_cofounders, founders_count
  Traction              3.0           revenue, mrr, active_users, growth_rate
  Market                2.0           market_size, industries[], problem, solution
  Product               2.0           demo_available, launched, unique_ip, defensibility
  Vision                2.0           contrarian_insight, creative_strategy
  Ecosystem             1.5           strategic_partners, advisors, platform_dependencies
  Grit                  1.5           pivots_made, customer_feedback_frequency
  Problem Validation    2.0           customer_interviews, customer_pain_data, icp_clarity
  Base Boost            5.0+          Basic content presence
  ─────────────────────────────────────────────────
  TOTAL MAX             ~19 pts       Normalized to 0-10

  TIERS:
  • Hot   (7-10): Match with 15-20 investors
  • Warm  (4-7):  Match with 10 investors
  • Cold  (0-4):  Match with 5 investors

  INVESTOR GOD ALGORITHM (0-10 scale):
  ═══════════════════════════════════
  Component             Max Points    Key Fields Used
  ─────────────────────────────────────────────────
  Track Record          3.0           total_investments, successful_exits, exit_rate
  Activity Level        2.0           investment_pace_per_year, last_investment_date
  Fund Health           2.0           active_fund_size, dry_powder_estimate
  Sector Expertise      1.5           sectors[], investment_thesis
  Responsiveness        1.5           avg_response_time_days, decision_maker, leads_rounds
  ─────────────────────────────────────────────────
  TOTAL MAX             10 pts

  TIERS:
  • Elite    (8-10): 1.2x match boost
  • Strong   (6-8):  1.1x match boost
  • Solid    (4-6):  1.0x match boost
  • Emerging (0-4):  0.9x match boost
`);

  // ---- APPLY FIXES ----
  if (APPLY_FIXES) {
    console.log('\n' + '═'.repeat(80));
    console.log('🔧 APPLYING FIXES');
    console.log('═'.repeat(80));
    
    await fixStartupData();
    await fixInvestorData();
    
    console.log('\n✅ Fixes applied! Re-run without --fix to verify.');
  } else {
    console.log('\n💡 Run with --fix flag to apply automatic fixes:');
    console.log('   node schema-diagnostic.js --fix');
  }
  
  console.log('\n' + '═'.repeat(80) + '\n');
}

runDiagnostic().catch(console.error);
