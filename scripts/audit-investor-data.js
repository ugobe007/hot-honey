#!/usr/bin/env node
/**
 * INVESTOR DATA AUDIT
 * ===================
 * Identifies investors with missing or sparse data for manual enrichment.
 * 
 * Usage: node scripts/audit-investor-data.js [--limit=N] [--export-csv]
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Key fields that should be populated for a complete investor profile
const REQUIRED_FIELDS = {
  // Identity
  name: 'Investor Name',
  firm: 'Firm Name',
  
  // Core Information
  bio: 'Bio/Description',
  investment_thesis: 'Investment Thesis',
  firm_description_normalized: 'Firm Description (Normalized)',
  
  // Investment Criteria
  sectors: 'Investment Sectors',
  stage: 'Investment Stage',
  check_size_min: 'Check Size Min',
  check_size_max: 'Check Size Max',
  geography_focus: 'Geography Focus',
  
  // Portfolio & Credibility
  notable_investments: 'Notable Investments',
  total_investments: 'Total Investments',
  active_fund_size: 'Active Fund Size',
  
  // Contact & Links
  url: 'Website URL',
  linkedin_url: 'LinkedIn URL',
  blog_url: 'Blog URL',
  photo_url: 'Photo URL',
};

// Calculate completeness score (0-100)
function calculateCompleteness(investor) {
  let score = 0;
  let maxScore = 0;
  
  // Identity (required - 20 points)
  maxScore += 20;
  if (investor.name) score += 10;
  if (investor.firm) score += 10;
  
  // Core Information (30 points)
  maxScore += 30;
  if (investor.bio && investor.bio.length > 50) score += 10;
  if (investor.investment_thesis && investor.investment_thesis.length > 50) score += 10;
  if (investor.firm_description_normalized && investor.firm_description_normalized.length > 50) score += 10;
  
  // Investment Criteria (25 points)
  maxScore += 25;
  if (investor.sectors && Array.isArray(investor.sectors) && investor.sectors.length > 0) score += 5;
  if (investor.stage && Array.isArray(investor.stage) && investor.stage.length > 0) score += 5;
  if (investor.check_size_min || investor.check_size_max) score += 5;
  if (investor.geography_focus && (Array.isArray(investor.geography_focus) ? investor.geography_focus.length > 0 : investor.geography_focus)) score += 5;
  if (investor.sectors && investor.stage && (investor.check_size_min || investor.check_size_max)) score += 5; // Bonus for having all three
  
  // Portfolio & Credibility (15 points)
  maxScore += 15;
  if (investor.notable_investments && Array.isArray(investor.notable_investments) && investor.notable_investments.length > 0) score += 8;
  if (investor.total_investments) score += 3;
  if (investor.active_fund_size) score += 4;
  
  // Contact & Links (10 points)
  maxScore += 10;
  if (investor.url) score += 4;
  if (investor.linkedin_url) score += 3;
  if (investor.blog_url) score += 2;
  if (investor.photo_url) score += 1;
  
  return Math.round((score / maxScore) * 100);
}

// Get missing fields for an investor
function getMissingFields(investor) {
  const missing = [];
  
  if (!investor.bio || investor.bio.length < 50) missing.push('bio');
  if (!investor.investment_thesis || investor.investment_thesis.length < 50) missing.push('investment_thesis');
  if (!investor.firm_description_normalized || investor.firm_description_normalized.length < 50) missing.push('firm_description_normalized');
  if (!investor.sectors || !Array.isArray(investor.sectors) || investor.sectors.length === 0) missing.push('sectors');
  if (!investor.stage || !Array.isArray(investor.stage) || investor.stage.length === 0) missing.push('stage');
  if (!investor.check_size_min && !investor.check_size_max) missing.push('check_size');
  if (!investor.geography_focus || (Array.isArray(investor.geography_focus) && investor.geography_focus.length === 0)) missing.push('geography_focus');
  if (!investor.notable_investments || !Array.isArray(investor.notable_investments) || investor.notable_investments.length === 0) missing.push('notable_investments');
  if (!investor.url) missing.push('url');
  if (!investor.linkedin_url) missing.push('linkedin_url');
  
  return missing;
}

async function auditInvestors() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 INVESTOR DATA AUDIT');
  console.log('='.repeat(80) + '\n');
  
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
  const exportCsv = args.includes('--export-csv');
  
  console.log('🔍 Fetching all investors...\n');
  
  // Fetch all investors with all relevant fields
  let query = supabase
    .from('investors')
    .select('id, name, firm, bio, investment_thesis, firm_description_normalized, sectors, stage, check_size_min, check_size_max, geography_focus, notable_investments, url, linkedin_url, blog_url, photo_url, total_investments, active_fund_size')
    .order('name', { ascending: true });
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data: investors, error } = await query;
  
  if (error) {
    console.error('❌ Error fetching investors:', error);
    process.exit(1);
  }
  
  if (!investors || investors.length === 0) {
    console.log('⚠️ No investors found');
    return;
  }
  
  console.log(`✅ Found ${investors.length} investors\n`);
  
  // Calculate completeness for each investor
  const investorsWithScores = investors.map(investor => ({
    ...investor,
    completeness: calculateCompleteness(investor),
    missingFields: getMissingFields(investor),
    missingCount: getMissingFields(investor).length,
  }));
  
  // Sort by completeness (lowest first) and missing count (highest first)
  investorsWithScores.sort((a, b) => {
    if (a.completeness !== b.completeness) {
      return a.completeness - b.completeness; // Lower completeness first
    }
    return b.missingCount - a.missingCount; // More missing fields first
  });
  
  // Filter to investors with < 60% completeness or > 3 missing fields
  const needsEnrichment = investorsWithScores.filter(inv => 
    inv.completeness < 60 || inv.missingCount > 3
  );
  
  console.log('📈 COMPLETENESS STATISTICS');
  console.log('─'.repeat(80));
  const avgCompleteness = investorsWithScores.reduce((sum, inv) => sum + inv.completeness, 0) / investorsWithScores.length;
  const minCompleteness = Math.min(...investorsWithScores.map(inv => inv.completeness));
  const maxCompleteness = Math.max(...investorsWithScores.map(inv => inv.completeness));
  
  console.log(`   Total Investors: ${investors.length}`);
  console.log(`   Average Completeness: ${avgCompleteness.toFixed(1)}%`);
  console.log(`   Min Completeness: ${minCompleteness}%`);
  console.log(`   Max Completeness: ${maxCompleteness}%`);
  console.log(`   Needs Enrichment (<60% or >3 missing): ${needsEnrichment.length} (${(needsEnrichment.length / investors.length * 100).toFixed(1)}%)`);
  
  // Group by completeness ranges
  const ranges = {
    '0-20%': investorsWithScores.filter(inv => inv.completeness <= 20).length,
    '21-40%': investorsWithScores.filter(inv => inv.completeness > 20 && inv.completeness <= 40).length,
    '41-60%': investorsWithScores.filter(inv => inv.completeness > 40 && inv.completeness <= 60).length,
    '61-80%': investorsWithScores.filter(inv => inv.completeness > 60 && inv.completeness <= 80).length,
    '81-100%': investorsWithScores.filter(inv => inv.completeness > 80).length,
  };
  
  console.log('\n📊 COMPLETENESS DISTRIBUTION');
  console.log('─'.repeat(80));
  for (const [range, count] of Object.entries(ranges)) {
    const bar = '█'.repeat(Math.round(count / investors.length * 50));
    console.log(`   ${range.padEnd(10)} ${count.toString().padStart(4)} ${bar}`);
  }
  
  console.log('\n🔴 INVESTORS NEEDING ENRICHMENT');
  console.log('─'.repeat(80));
  console.log(`   Showing top ${Math.min(50, needsEnrichment.length)} investors with lowest completeness:\n`);
  
  needsEnrichment.slice(0, 50).forEach((investor, idx) => {
    console.log(`${(idx + 1).toString().padStart(3)}. ${investor.name}${investor.firm ? ` @ ${investor.firm}` : ''}`);
    console.log(`     Completeness: ${investor.completeness}% | Missing: ${investor.missingCount} fields`);
    console.log(`     Missing: ${investor.missingFields.join(', ') || 'none'}`);
    console.log(`     ID: ${investor.id}`);
    
    // Show what we do have
    const has = [];
    if (investor.bio && investor.bio.length > 50) has.push('bio');
    if (investor.sectors && investor.sectors.length > 0) has.push('sectors');
    if (investor.stage && investor.stage.length > 0) has.push('stage');
    if (investor.url) has.push('url');
    if (investor.linkedin_url) has.push('linkedin');
    if (has.length > 0) {
      console.log(`     Has: ${has.join(', ')}`);
    }
    console.log('');
  });
  
  // Export to CSV if requested
  if (exportCsv) {
    const csvPath = path.join(process.cwd(), 'investor-enrichment-list.csv');
    const csvRows = [
      ['Name', 'Firm', 'Completeness %', 'Missing Count', 'Missing Fields', 'ID', 'Has Bio', 'Has Sectors', 'Has Stage', 'Has URL', 'Has LinkedIn', 'LinkedIn URL', 'Website URL'].join(',')
    ];
    
    needsEnrichment.forEach(investor => {
      const row = [
        `"${(investor.name || '').replace(/"/g, '""')}"`,
        `"${(investor.firm || '').replace(/"/g, '""')}"`,
        investor.completeness,
        investor.missingCount,
        `"${investor.missingFields.join('; ')}"`,
        investor.id,
        investor.bio && investor.bio.length > 50 ? 'Yes' : 'No',
        investor.sectors && investor.sectors.length > 0 ? 'Yes' : 'No',
        investor.stage && investor.stage.length > 0 ? 'Yes' : 'No',
        investor.url ? 'Yes' : 'No',
        investor.linkedin_url ? 'Yes' : 'No',
        `"${investor.linkedin_url || ''}"`,
        `"${investor.url || ''}"`,
      ];
      csvRows.push(row.join(','));
    });
    
    fs.writeFileSync(csvPath, csvRows.join('\n'));
    console.log(`\n✅ Exported ${needsEnrichment.length} investors to: ${csvPath}\n`);
  }
  
  // Summary by missing field type
  console.log('\n📋 MISSING FIELD SUMMARY');
  console.log('─'.repeat(80));
  const fieldCounts = {};
  needsEnrichment.forEach(inv => {
    inv.missingFields.forEach(field => {
      fieldCounts[field] = (fieldCounts[field] || 0) + 1;
    });
  });
  
  const sortedFields = Object.entries(fieldCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  sortedFields.forEach(([field, count]) => {
    const fieldName = REQUIRED_FIELDS[field] || field;
    const bar = '█'.repeat(Math.round(count / needsEnrichment.length * 50));
    console.log(`   ${fieldName.padEnd(35)} ${count.toString().padStart(4)} ${bar}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Audit complete!');
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review the top ${Math.min(50, needsEnrichment.length)} investors listed above`);
  console.log(`   2. Use their LinkedIn URLs or websites to find missing information`);
  console.log(`   3. Run: node scripts/enrichment/enrich-investor-websites.js --investor=ID`);
  if (!exportCsv) {
    console.log(`   4. Export CSV: node scripts/audit-investor-data.js --export-csv`);
  }
  console.log('');
}

auditInvestors().catch(console.error);

