#!/usr/bin/env node
/**
 * EXITS DASHBOARD
 * 
 * Visualizes startup exits data:
 * - Exit types breakdown
 * - Top exits by value
 * - Investor portfolio performance
 * - Recent exits
 * 
 * Run: node view-exits-dashboard.js
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

function formatCurrency(value) {
  if (!value) return 'Undisclosed';
  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(2)}B`;
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

async function viewExitsDashboard() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        🚪 STARTUP EXITS DASHBOARD                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`⏰ ${new Date().toLocaleString()}\n`);

  // 1. Overall Statistics
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 OVERALL STATISTICS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { count: totalExits, error: countError } = await supabase
    .from('startup_exits')
    .select('*', { count: 'exact', head: true });

  const { data: allExits, error: exitsError } = await supabase
    .from('startup_exits')
    .select('*')
    .order('exit_date', { ascending: false });

  if (exitsError) {
    console.error(`❌ Error fetching exits: ${exitsError.message}`);
    return;
  }

  if (!allExits || allExits.length === 0) {
    console.log('⚠️  No exits found yet');
    return;
  }

  // Calculate totals
  const totalValue = allExits
    .filter(e => e.exit_value_numeric)
    .reduce((sum, e) => sum + parseFloat(e.exit_value_numeric || 0), 0);

  const byType = {
    acquisition: allExits.filter(e => e.exit_type === 'acquisition').length,
    merger: allExits.filter(e => e.exit_type === 'merger').length,
    ipo: allExits.filter(e => e.exit_type === 'ipo').length,
    spac: allExits.filter(e => e.exit_type === 'spac').length,
    direct_listing: allExits.filter(e => e.exit_type === 'direct_listing').length
  };

  console.log(`📊 Total Exits: ${totalExits || 0}`);
  console.log(`💰 Total Exit Value: ${formatCurrency(totalValue)}`);
  console.log(`\n📋 Exit Types:`);
  console.log(`   Acquisitions: ${byType.acquisition}`);
  console.log(`   Mergers: ${byType.merger}`);
  console.log(`   IPOs: ${byType.ipo}`);
  console.log(`   SPACs: ${byType.spac || 0}`);
  console.log(`   Direct Listings: ${byType.direct_listing || 0}`);

  // 2. Top Exits by Value
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🏆 TOP EXITS BY VALUE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const topExits = allExits
    .filter(e => e.exit_value_numeric)
    .sort((a, b) => parseFloat(b.exit_value_numeric) - parseFloat(a.exit_value_numeric))
    .slice(0, 10);

  if (topExits.length > 0) {
    topExits.forEach((exit, i) => {
      const value = formatCurrency(exit.exit_value_numeric);
      const date = exit.exit_date || 'Unknown';
      const acquirer = exit.acquirer_name ? ` → ${exit.acquirer_name}` : '';
      console.log(`   ${i+1}. ${exit.startup_name} - ${exit.exit_type}${acquirer}`);
      console.log(`      Value: ${value} | Date: ${date}`);
      if (exit.key_factors && exit.key_factors.length > 0) {
        console.log(`      Factors: ${exit.key_factors.slice(0, 3).join(', ')}`);
      }
    });
  } else {
    console.log('   ⚠️  No exits with disclosed values');
  }

  // 3. Recent Exits
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🕐 RECENT EXITS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const recentExits = allExits
    .filter(e => e.exit_date)
    .sort((a, b) => new Date(b.exit_date) - new Date(a.exit_date))
    .slice(0, 10);

  if (recentExits.length > 0) {
    recentExits.forEach((exit, i) => {
      const value = exit.exit_value ? exit.exit_value : 'Undisclosed';
      console.log(`   ${i+1}. ${exit.startup_name} - ${exit.exit_type} (${exit.exit_date})`);
      console.log(`      Value: ${value}`);
    });
  } else {
    console.log('   ⚠️  No exits with dates');
  }

  // 4. Investor Portfolio Performance
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('💼 TOP INVESTOR PORTFOLIOS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    const { data: topInvestors, error: invError } = await supabase
      .from('investor_portfolio_performance')
      .select('*')
      .gt('total_exits', 0)
      .order('total_exit_value', { ascending: false })
      .limit(15);

    if (!invError && topInvestors && topInvestors.length > 0) {
      topInvestors.forEach((inv, i) => {
        const value = formatCurrency(inv.total_exit_value);
        console.log(`   ${i+1}. ${inv.investor_name}`);
        console.log(`      Exits: ${inv.total_exits} | Value: ${value}`);
        console.log(`      Breakdown: ${inv.acquisitions || 0} acquisitions, ${inv.mergers || 0} mergers, ${inv.ipos || 0} IPOs`);
      });
    } else {
      // Fallback: query investors with portfolio_performance
      const { data: investors, error: investorsError } = await supabase
        .from('investors')
        .select('name, portfolio_performance')
        .not('portfolio_performance', 'is', null)
        .limit(15);

      if (!investorsError && investors && investors.length > 0) {
        const sorted = investors
          .map(inv => ({
            name: inv.name,
            perf: inv.portfolio_performance
          }))
          .filter(inv => inv.perf && inv.perf.total_exits > 0)
          .sort((a, b) => (b.perf.total_exit_value || 0) - (a.perf.total_exit_value || 0))
          .slice(0, 15);

        sorted.forEach((inv, i) => {
          const value = formatCurrency(inv.perf.total_exit_value);
          console.log(`   ${i+1}. ${inv.name}`);
          console.log(`      Exits: ${inv.perf.total_exits} | Value: ${value}`);
          console.log(`      Breakdown: ${inv.perf.acquisitions || 0} acquisitions, ${inv.perf.mergers || 0} mergers, ${inv.perf.ipos || 0} IPOs`);
        });
      }
    }
  } catch (error) {
    console.log(`   ⚠️  Could not fetch investor performance: ${error.message}`);
  }

  // 5. Exit Insights
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('💡 EXIT INSIGHTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const exitsWithNotes = allExits.filter(e => e.exit_notes);
  if (exitsWithNotes.length > 0) {
    console.log(`📝 ${exitsWithNotes.length} exits have AI-generated insights:\n`);
    exitsWithNotes.slice(0, 5).forEach((exit, i) => {
      console.log(`   ${i+1}. ${exit.startup_name}:`);
      console.log(`      ${exit.exit_notes?.substring(0, 150)}...`);
      console.log('');
    });
  } else {
    console.log('   ⚠️  No exit insights yet (will be generated by AI)');
  }

  console.log('\n' + '═'.repeat(63));
  console.log('✅ Dashboard complete\n');
}

viewExitsDashboard().catch(console.error);



