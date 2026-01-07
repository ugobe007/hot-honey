#!/usr/bin/env node
/**
 * HOT MATCH CLEANUP SCRIPT
 * ========================
 * Identifies and fixes data quality issues in the Hot Match database.
 * 
 * Usage:
 *   node hot-match-cleanup.mjs audit          # Show all issues (no changes)
 *   node hot-match-cleanup.mjs fix-investors  # Fix investor data issues
 *   node hot-match-cleanup.mjs fix-startups   # Fix startup data issues
 *   node hot-match-cleanup.mjs fix-matches    # Regenerate bad matches
 *   node hot-match-cleanup.mjs dedupe         # Remove duplicates
 *   node hot-match-cleanup.mjs all            # Run all fixes
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function auditInvestors() {
  console.log('\n📊 INVESTOR DATA AUDIT');
  console.log('─'.repeat(50));
  
  const { data: investors, error } = await supabase
    .from('investors')
    .select('*');
  
  if (error) {
    console.error('Error fetching investors:', error.message);
    return { issues: [], total: 0 };
  }
  
  const issues = [];
  
  for (const inv of investors) {
    const problems = [];
    
    // Check for garbage names
    if (inv.name && (
      inv.name.includes('undefined') ||
      inv.name.includes('null') ||
      inv.name.length < 2 ||
      inv.name.length > 100 ||
      /^[^a-zA-Z]*$/.test(inv.name) // No letters
    )) {
      problems.push('invalid_name');
    }
    
    // Check for concatenated/corrupt names like "BoardContactACA PartnershipsPathway Partners"
    if (inv.name && (
      inv.name.includes('ACA ') ||
      inv.name.includes('Partnerships') && inv.name.includes('Partners') ||
      (inv.name.match(/[A-Z]/g) || []).length > 10 // Too many capitals = concatenated
    )) {
      problems.push('corrupted_name');
    }
    
    // Missing critical fields
    if (!inv.sectors || inv.sectors.length === 0) problems.push('no_sectors');
    if (!inv.stage || inv.stage.length === 0) problems.push('no_stage');
    if (!inv.check_size_min && !inv.check_size_max) problems.push('no_check_size');
    
    // Invalid check sizes
    if (inv.check_size_min && inv.check_size_max && inv.check_size_min > inv.check_size_max) {
      problems.push('invalid_check_size_range');
    }
    
    // Empty portfolio when it shouldn't be
    if (inv.portfolio_companies && inv.portfolio_companies.length === 0 && 
        inv.check_size_max >= 1000000) {
      problems.push('missing_portfolio');
    }
    
    // Garbage location
    if (inv.location && (
      inv.location.includes('undefined') ||
      inv.location.length < 2 ||
      inv.location.toLowerCase().includes('as empowering')
    )) {
      problems.push('invalid_location');
    }
    
    if (problems.length > 0) {
      issues.push({ id: inv.id, name: inv.name, problems });
    }
  }
  
  console.log(`Total investors: ${investors.length}`);
  console.log(`Investors with issues: ${issues.length}`);
  
  // Group by problem type
  const problemCounts = {};
  issues.forEach(i => {
    i.problems.forEach(p => {
      problemCounts[p] = (problemCounts[p] || 0) + 1;
    });
  });
  
  console.log('\nIssue breakdown:');
  Object.entries(problemCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([problem, count]) => {
      console.log(`  ${problem}: ${count}`);
    });
  
  // Show sample bad records
  console.log('\nSample problematic investors:');
  issues.slice(0, 5).forEach(i => {
    console.log(`  • ${i.name?.slice(0, 40) || 'NO NAME'} - ${i.problems.join(', ')}`);
  });
  
  return { issues, total: investors.length };
}

async function auditStartups() {
  console.log('\n📊 STARTUP DATA AUDIT');
  console.log('─'.repeat(50));
  
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('*')
    .eq('status', 'approved');
  
  if (error) {
    console.error('Error fetching startups:', error.message);
    return { issues: [], total: 0 };
  }
  
  const issues = [];
  
  for (const s of startups) {
    const problems = [];
    
    // Invalid names
    if (!s.name || s.name.length < 2 || s.name.includes('undefined')) {
      problems.push('invalid_name');
    }
    
    // Garbage descriptions
    if (s.description && (
      s.description.includes('technology company that appears') ||
      s.description.includes('appears to have') ||
      s.description.includes('significant milestone') ||
      s.description.includes('discovered from')
    )) {
      problems.push('garbage_description');
    }
    
    // Garbage location
    if (s.location && (
      s.location.includes('As empowering') ||
      s.location.includes('undefined') ||
      s.location.length > 100
    )) {
      problems.push('invalid_location');
    }
    
    // Missing GOD score components
    if (!s.total_god_score || s.total_god_score < 20) {
      problems.push('low_god_score');
    }
    
    // Missing sectors
    if (!s.sectors || s.sectors.length === 0) {
      problems.push('no_sectors');
    }
    
    // Invalid team size
    if (s.team_size && (s.team_size < 1 || s.team_size > 10000)) {
      problems.push('invalid_team_size');
    }
    
    // No tagline
    if (!s.tagline || s.tagline.length < 5) {
      problems.push('no_tagline');
    }
    
    if (problems.length > 0) {
      issues.push({ id: s.id, name: s.name, problems });
    }
  }
  
  console.log(`Total approved startups: ${startups.length}`);
  console.log(`Startups with issues: ${issues.length}`);
  
  // Group by problem type
  const problemCounts = {};
  issues.forEach(i => {
    i.problems.forEach(p => {
      problemCounts[p] = (problemCounts[p] || 0) + 1;
    });
  });
  
  console.log('\nIssue breakdown:');
  Object.entries(problemCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([problem, count]) => {
      console.log(`  ${problem}: ${count}`);
    });
  
  console.log('\nSample problematic startups:');
  issues.slice(0, 5).forEach(i => {
    console.log(`  • ${i.name?.slice(0, 40) || 'NO NAME'} - ${i.problems.join(', ')}`);
  });
  
  return { issues, total: startups.length };
}

async function auditMatches() {
  console.log('\n📊 MATCH QUALITY AUDIT');
  console.log('─'.repeat(50));
  
  // Sample matches
  const { data: matches, error } = await supabase
    .from('startup_investor_matches')
    .select('match_score, confidence_level, startup_id, investor_id')
    .limit(1000);
  
  if (error) {
    console.error('Error fetching matches:', error.message);
    return;
  }
  
  // Score distribution
  const buckets = { '0-20': 0, '21-35': 0, '36-50': 0, '51-65': 0, '66-80': 0, '81-100': 0 };
  let sum = 0;
  
  matches.forEach(m => {
    sum += m.match_score || 0;
    const score = m.match_score || 0;
    if (score <= 20) buckets['0-20']++;
    else if (score <= 35) buckets['21-35']++;
    else if (score <= 50) buckets['36-50']++;
    else if (score <= 65) buckets['51-65']++;
    else if (score <= 80) buckets['66-80']++;
    else buckets['81-100']++;
  });
  
  console.log(`Sample size: ${matches.length} matches`);
  console.log(`Average score: ${(sum / matches.length).toFixed(1)}`);
  console.log('\nScore distribution:');
  Object.entries(buckets).forEach(([range, count]) => {
    const pct = ((count / matches.length) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(pct / 2));
    console.log(`  ${range}: ${count} (${pct}%) ${bar}`);
  });
  
  // Low confidence matches
  const lowConfidence = matches.filter(m => 
    m.confidence_level === 'low' || m.match_score < 35
  ).length;
  console.log(`\nLow quality matches: ${lowConfidence} (${((lowConfidence/matches.length)*100).toFixed(1)}%)`);
}

// ═══════════════════════════════════════════════════════════════════════════
// FIX FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function fixInvestors() {
  console.log('\n🔧 FIXING INVESTOR DATA');
  console.log('─'.repeat(50));
  
  const { issues } = await auditInvestors();
  
  let fixed = 0;
  let deleted = 0;
  
  for (const issue of issues) {
    // Delete completely corrupt records
    if (issue.problems.includes('invalid_name') || issue.problems.includes('corrupted_name')) {
      const { error } = await supabase
        .from('investors')
        .delete()
        .eq('id', issue.id);
      
      if (!error) {
        deleted++;
        console.log(`  🗑️ Deleted: ${issue.name?.slice(0, 30)}`);
      }
      continue;
    }
    
    // Fix specific issues
    const updates = {};
    
    if (issue.problems.includes('invalid_location')) {
      updates.location = null;
    }
    
    if (issue.problems.includes('no_sectors')) {
      updates.sectors = ['Technology']; // Default
    }
    
    if (issue.problems.includes('no_stage')) {
      updates.stage = ['Seed', 'Series A']; // Default for most VCs
    }
    
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('investors')
        .update(updates)
        .eq('id', issue.id);
      
      if (!error) {
        fixed++;
        console.log(`  ✅ Fixed: ${issue.name?.slice(0, 30)}`);
      }
    }
  }
  
  console.log(`\n📊 Results: ${fixed} fixed, ${deleted} deleted`);
}

async function fixStartups() {
  console.log('\n🔧 FIXING STARTUP DATA');
  console.log('─'.repeat(50));
  
  const { issues } = await auditStartups();
  
  let fixed = 0;
  
  for (const issue of issues) {
    const updates = {};
    
    if (issue.problems.includes('garbage_description')) {
      updates.description = null; // Clear garbage, keep tagline
    }
    
    if (issue.problems.includes('invalid_location')) {
      updates.location = null;
    }
    
    if (issue.problems.includes('no_sectors')) {
      updates.sectors = ['Technology'];
    }
    
    if (issue.problems.includes('invalid_team_size')) {
      updates.team_size = 5; // Reasonable default
    }
    
    if (issue.problems.includes('low_god_score')) {
      updates.total_god_score = 40; // Baseline
    }
    
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('startup_uploads')
        .update(updates)
        .eq('id', issue.id);
      
      if (!error) {
        fixed++;
        console.log(`  ✅ Fixed: ${issue.name?.slice(0, 30)}`);
      }
    }
  }
  
  console.log(`\n📊 Results: ${fixed} fixed`);
}

async function findDuplicates() {
  console.log('\n🔍 FINDING DUPLICATES');
  console.log('─'.repeat(50));
  
  // Startup duplicates
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name')
    .eq('status', 'approved');
  
  const startupNames = {};
  const startupDupes = [];
  
  startups?.forEach(s => {
    const normalized = s.name?.toLowerCase().trim();
    if (startupNames[normalized]) {
      startupDupes.push({ original: startupNames[normalized], duplicate: s.id, name: s.name });
    } else {
      startupNames[normalized] = s.id;
    }
  });
  
  console.log(`Startup duplicates: ${startupDupes.length}`);
  startupDupes.slice(0, 5).forEach(d => console.log(`  • ${d.name}`));
  
  // Investor duplicates
  const { data: investors } = await supabase
    .from('investors')
    .select('id, name');
  
  const investorNames = {};
  const investorDupes = [];
  
  investors?.forEach(i => {
    const normalized = i.name?.toLowerCase().trim();
    if (investorNames[normalized]) {
      investorDupes.push({ original: investorNames[normalized], duplicate: i.id, name: i.name });
    } else {
      investorNames[normalized] = i.id;
    }
  });
  
  console.log(`Investor duplicates: ${investorDupes.length}`);
  investorDupes.slice(0, 5).forEach(d => console.log(`  • ${d.name}`));
  
  return { startupDupes, investorDupes };
}

async function removeDuplicates() {
  console.log('\n🗑️ REMOVING DUPLICATES');
  console.log('─'.repeat(50));
  
  const { startupDupes, investorDupes } = await findDuplicates();
  
  let removed = 0;
  
  // Remove duplicate startups (keep original)
  for (const dupe of startupDupes) {
    const { error } = await supabase
      .from('startup_uploads')
      .delete()
      .eq('id', dupe.duplicate);
    
    if (!error) {
      removed++;
      console.log(`  ✅ Removed startup: ${dupe.name}`);
    }
  }
  
  // Remove duplicate investors
  for (const dupe of investorDupes) {
    const { error } = await supabase
      .from('investors')
      .delete()
      .eq('id', dupe.duplicate);
    
    if (!error) {
      removed++;
      console.log(`  ✅ Removed investor: ${dupe.name}`);
    }
  }
  
  console.log(`\n📊 Removed ${removed} duplicates`);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CLI
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const cmd = process.argv[2];
  
  console.log('\n' + '═'.repeat(60));
  console.log('  🧹 HOT MATCH CLEANUP TOOL');
  console.log('  Identifies and fixes data quality issues');
  console.log('═'.repeat(60));
  
  switch (cmd) {
    case 'audit':
      await auditInvestors();
      await auditStartups();
      await auditMatches();
      await findDuplicates();
      break;
      
    case 'fix-investors':
      await fixInvestors();
      break;
      
    case 'fix-startups':
      await fixStartups();
      break;
      
    case 'dedupe':
      await removeDuplicates();
      break;
      
    case 'all':
      console.log('\n🔄 Running all cleanup tasks...\n');
      await fixInvestors();
      await fixStartups();
      await removeDuplicates();
      console.log('\n✅ All cleanup tasks complete!');
      break;
      
    default:
      console.log(`
Usage:
  node hot-match-cleanup.mjs audit           Audit all data (no changes)
  node hot-match-cleanup.mjs fix-investors   Fix investor data issues
  node hot-match-cleanup.mjs fix-startups    Fix startup data issues
  node hot-match-cleanup.mjs dedupe          Remove duplicate records
  node hot-match-cleanup.mjs all             Run all fixes

Issues detected and fixed:
  • Invalid/corrupted names
  • Garbage descriptions from bad inference
  • Invalid locations ("As empowering, no")
  • Missing sectors/stages
  • Low GOD scores
  • Duplicate records
`);
  }
}

main().catch(console.error);
