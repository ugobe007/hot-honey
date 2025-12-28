#!/usr/bin/env node
/**
 * UPDATE INVESTOR PORTFOLIO PERFORMANCE
 * 
 * Updates investor profiles with exit data:
 * - Total exits
 * - Exit values
 * - Exit types breakdown
 * - Portfolio performance metrics
 * 
 * Run: node update-investor-portfolio-performance.js
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

async function updateInvestorPortfolioPerformance() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     📊 UPDATE INVESTOR PORTFOLIO PERFORMANCE               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`⏰ ${new Date().toLocaleString()}\n`);

  // 1. Get all investors
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('1️⃣  FETCHING INVESTORS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { data: investors, error: investorsError } = await supabase
    .from('investors')
    .select('id, name')
    .limit(1000);

  if (investorsError) {
    console.error(`❌ Error fetching investors: ${investorsError.message}`);
    return;
  }

  if (!investors || investors.length === 0) {
    console.log('⚠️  No investors found');
    return;
  }

  console.log(`📊 Processing ${investors.length} investors...\n`);

  // 2. Calculate portfolio performance for each investor
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('2️⃣  CALCULATING PORTFOLIO PERFORMANCE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let updated = 0;
  let errors = 0;

  for (const investor of investors) {
    try {
      // Get exits for this investor
      const { data: exits } = await supabase
        .from('startup_exits')
        .select('*')
        .or(`investors_involved.cs.{${investor.id}},lead_investor_id.eq.${investor.id}`);

      if (!exits || exits.length === 0) {
        continue; // No exits for this investor
      }

      // Calculate metrics
      const totalExits = exits.length;
      const acquisitions = exits.filter(e => e.exit_type === 'acquisition').length;
      const mergers = exits.filter(e => e.exit_type === 'merger').length;
      const ipos = exits.filter(e => e.exit_type === 'ipo').length;
      
      const totalExitValue = exits
        .filter(e => e.exit_value_numeric)
        .reduce((sum, e) => sum + parseFloat(e.exit_value_numeric || 0), 0);

      const verifiedExits = exits.filter(e => e.verified).length;
      const mostRecentExit = exits
        .filter(e => e.exit_date)
        .sort((a, b) => new Date(b.exit_date) - new Date(a.exit_date))[0]?.exit_date;

      // Update investor record (if portfolio_performance column exists)
      // Otherwise, we'll use a separate table or JSON field
      const performanceData = {
        total_exits: totalExits,
        acquisitions: acquisitions,
        mergers: mergers,
        ipos: ipos,
        total_exit_value: totalExitValue,
        verified_exits: verifiedExits,
        most_recent_exit: mostRecentExit,
        updated_at: new Date().toISOString()
      };

      // Try to update investor record
      // Note: You may need to add a portfolio_performance JSONB column to investors table
      const { error: updateError } = await supabase
        .from('investors')
        .update({ 
          portfolio_performance: performanceData,
          updated_at: new Date().toISOString()
        })
        .eq('id', investor.id);

      if (updateError) {
        // If column doesn't exist, just log the data
        console.log(`   📊 ${investor.name}: ${totalExits} exits, $${(totalExitValue / 1000000000).toFixed(2)}B total value`);
      } else {
        console.log(`   ✅ ${investor.name}: ${totalExits} exits, $${(totalExitValue / 1000000000).toFixed(2)}B total value`);
        updated++;
      }

    } catch (error) {
      console.error(`   ❌ Error processing ${investor.name}: ${error.message}`);
      errors++;
    }
  }

  // 3. Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('3️⃣  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`✅ Updated: ${updated}`);
  console.log(`❌ Errors: ${errors}`);

  // Get top performers
  const { data: topPerformers } = await supabase
    .from('investors')
    .select('name, portfolio_performance')
    .not('portfolio_performance', 'is', null)
    .order('portfolio_performance->total_exit_value', { ascending: false })
    .limit(10);

  if (topPerformers && topPerformers.length > 0) {
    console.log(`\n🏆 Top Performers by Exit Value:`);
    topPerformers.forEach((inv, i) => {
      const perf = inv.portfolio_performance;
      if (perf && perf.total_exit_value) {
        console.log(`   ${i+1}. ${inv.name}: $${(perf.total_exit_value / 1000000000).toFixed(2)}B (${perf.total_exits} exits)`);
      }
    });
  }

  console.log('\n' + '═'.repeat(63));
  console.log('✅ Portfolio performance update complete\n');
}

updateInvestorPortfolioPerformance().catch(console.error);





