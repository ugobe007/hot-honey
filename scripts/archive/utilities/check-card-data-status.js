#!/usr/bin/env node
/**
 * CHECK CARD DATA STATUS
 * 
 * Compares what fields the cards need vs what's in the database
 * and what MatchingEngine queries.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  console.log('\n📊 CARD DATA FIELD STATUS REPORT\n');
  console.log('═'.repeat(70));
  
  // ============================================================================
  // STARTUP CARD ANALYSIS
  // ============================================================================
  console.log('\n🚀 STARTUP CARD (EnhancedStartupCard.tsx)\n');
  console.log('─'.repeat(70));
  
  // What the card needs
  const startupCardNeeds = {
    'name': '✅ Required',
    'tagline': '✅ Required',
    'description': '✅ Required',
    'sectors': '✅ Required',
    'stage': '✅ Required',
    'total_god_score': '✅ Required',
    'has_revenue': '⚠️  Used for signals',
    'has_customers': '⚠️  Used for signals',
    'is_launched': '⚠️  Used for signals',
    'team_size': '⚠️  Used for display',
    'growth_rate_monthly': '⚠️  Used for signals',
    'deployment_frequency': '⚠️  Used for signals',
    'mrr': '⚠️  Used for metrics',
    'arr': '⚠️  Used for metrics',
    'raise_amount': '⚠️  Used for metrics',
    'extracted_data.fivePoints': '⚠️  Used for highlights',
  };
  
  // What MatchingEngine queries (line 332)
  const matchingEngineQueries = {
    startup: ['id', 'name', 'tagline', 'description', 'sectors', 'stage', 'total_god_score', 'raise_amount', 'extracted_data', 'location', 'website'],
    investor: ['id', 'name', 'firm', 'bio', 'sectors', 'stage', 'check_size_min', 'check_size_max', 'geography_focus', 'notable_investments', 'investment_thesis', 'investment_firm_description', 'firm_description_normalized']
  };
  
  console.log('Fields Card Needs:');
  Object.entries(startupCardNeeds).forEach(([field, status]) => {
    const isQueried = matchingEngineQueries.startup.includes(field.split('.')[0]);
    const icon = isQueried ? '✅' : '❌';
    console.log(`  ${icon} ${field.padEnd(30)} ${status} ${isQueried ? '(queried)' : '(NOT queried)'}`);
  });
  
  // Check database completion
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name, tagline, description, sectors, stage, total_god_score, has_revenue, has_customers, is_launched, team_size, growth_rate_monthly, deployment_frequency, mrr, arr, raise_amount, extracted_data')
    .eq('status', 'approved')
    .limit(100);
  
  if (startups && startups.length > 0) {
    const stats = {
      total: startups.length,
      has_revenue: 0,
      has_customers: 0,
      is_launched: 0,
      team_size: 0,
      growth_rate_monthly: 0,
      deployment_frequency: 0,
      mrr: 0,
      arr: 0,
      fivePoints: 0
    };
    
    startups.forEach(s => {
      if (s.has_revenue) stats.has_revenue++;
      if (s.has_customers) stats.has_customers++;
      if (s.is_launched) stats.is_launched++;
      if (s.team_size) stats.team_size++;
      if (s.growth_rate_monthly) stats.growth_rate_monthly++;
      if (s.deployment_frequency) stats.deployment_frequency++;
      if (s.mrr) stats.mrr++;
      if (s.arr) stats.arr++;
      if (s.extracted_data?.fivePoints && Array.isArray(s.extracted_data.fivePoints) && s.extracted_data.fivePoints.length > 0) stats.fivePoints++;
    });
    
    console.log('\nDatabase Completion (sample of 100):');
    Object.entries(stats).forEach(([field, count]) => {
      if (field === 'total') return;
      const pct = ((count / stats.total) * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(count / stats.total * 20));
      console.log(`  ${field.padEnd(25)} ${pct.padStart(5)}% ${bar}`);
    });
  }
  
  // ============================================================================
  // INVESTOR CARD ANALYSIS
  // ============================================================================
  console.log('\n\n💼 INVESTOR CARD (EnhancedInvestorCard.tsx)\n');
  console.log('─'.repeat(70));
  
  // What the card needs
  const investorCardNeeds = {
    'name': '✅ Required',
    'firm': '⚠️  Used for display',
    'bio': '⚠️  Used for description',
    'type': '⚠️  Used for badge',
    'sectors': '⚠️  Used for tags',
    'stage': '⚠️  Used for tags',
    'check_size_min': '⚠️  Used for metrics',
    'check_size_max': '⚠️  Used for metrics',
    'geography_focus': '⚠️  Used for metrics',
    'notable_investments': '⚠️  Used for highlights',
    'investment_thesis': '⚠️  Used for highlights',
    'photo_url': '⚠️  Used for avatar',
    'linkedin_url': '⚠️  Used for links',
    'investment_firm_description': '⚠️  Used for description',
    'firm_description_normalized': '⚠️  Used for description (preferred)',
    'portfolio_size': '⚠️  Used for metrics',
    'total_investments': '⚠️  Used for metrics',
    'active_fund_size': '⚠️  Used for metrics',
  };
  
  console.log('Fields Card Needs:');
  Object.entries(investorCardNeeds).forEach(([field, status]) => {
    const isQueried = matchingEngineQueries.investor.includes(field);
    const icon = isQueried ? '✅' : '❌';
    console.log(`  ${icon} ${field.padEnd(30)} ${status} ${isQueried ? '(queried)' : '(NOT queried)'}`);
  });
  
  // Check database completion
  const { data: investors } = await supabase
    .from('investors')
    .select('id, name, firm, bio, type, sectors, stage, check_size_min, check_size_max, geography_focus, notable_investments, investment_thesis, photo_url, linkedin_url, investment_firm_description, firm_description_normalized, total_investments, portfolio_size, active_fund_size')
    .limit(100);
  
  if (investors && investors.length > 0) {
    const stats = {
      total: investors.length,
      firm: 0,
      bio: 0,
      type: 0,
      sectors: 0,
      stage: 0,
      check_size_min: 0,
      check_size_max: 0,
      geography_focus: 0,
      notable_investments: 0,
      investment_thesis: 0,
      photo_url: 0,
      linkedin_url: 0,
      investment_firm_description: 0,
      firm_description_normalized: 0,
      total_investments: 0,
      portfolio_size: 0,
      active_fund_size: 0
    };
    
    investors.forEach(i => {
      if (i.firm) stats.firm++;
      if (i.bio) stats.bio++;
      if (i.type) stats.type++;
      if (i.sectors && Array.isArray(i.sectors) && i.sectors.length > 0) stats.sectors++;
      if (i.stage && Array.isArray(i.stage) && i.stage.length > 0) stats.stage++;
      if (i.check_size_min) stats.check_size_min++;
      if (i.check_size_max) stats.check_size_max++;
      if (i.geography_focus && Array.isArray(i.geography_focus) && i.geography_focus.length > 0) stats.geography_focus++;
      if (i.notable_investments && Array.isArray(i.notable_investments) && i.notable_investments.length > 0) stats.notable_investments++;
      if (i.investment_thesis) stats.investment_thesis++;
      if (i.photo_url) stats.photo_url++;
      if (i.linkedin_url) stats.linkedin_url++;
      if (i.investment_firm_description) stats.investment_firm_description++;
      if (i.firm_description_normalized) stats.firm_description_normalized++;
      if (i.total_investments) stats.total_investments++;
      if (i.portfolio_size) stats.portfolio_size++;
      if (i.active_fund_size) stats.active_fund_size++;
    });
    
    console.log('\nDatabase Completion (sample of 100):');
    Object.entries(stats).forEach(([field, count]) => {
      if (field === 'total') return;
      const pct = ((count / stats.total) * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(count / stats.total * 20));
      console.log(`  ${field.padEnd(30)} ${pct.padStart(5)}% ${bar}`);
    });
  } else {
    console.log('\n⚠️  No investors found in database');
  }
  
  // ============================================================================
  // RECOMMENDATIONS
  // ============================================================================
  console.log('\n\n💡 RECOMMENDATIONS\n');
  console.log('─'.repeat(70));
  
  console.log('1. MatchingEngine.tsx needs to query more fields:');
  console.log('   ❌ Missing from startup query: has_revenue, has_customers, is_launched, team_size, growth_rate_monthly, deployment_frequency, mrr, arr');
  console.log('   ❌ Missing from investor query: photo_url, linkedin_url, type, total_investments, portfolio_size, active_fund_size');
  
  console.log('\n2. Database completion issues:');
  console.log('   ⚠️  Some fields may be missing or incomplete');
  console.log('   ⚠️  Consider running enrichment scripts to fill gaps');
  
  console.log('\n3. Field name mismatches:');
  console.log('   ⚠️  Cards use different field names than database in some cases');
  console.log('   ⚠️  Need to ensure consistent mapping');
  
  console.log('\n');
}

main().catch(console.error);

