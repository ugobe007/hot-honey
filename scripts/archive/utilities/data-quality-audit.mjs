#!/usr/bin/env node
/**
 * DATA QUALITY AUDIT
 * ==================
 * 
 * Comprehensive audit and fix tool for Hot Match database.
 * 
 * Identifies and fixes:
 * - Corrupted investor names ("BoardContactACA Partnerships...")
 * - Garbage descriptions from bad inference
 * - Invalid locations ("As empowering, no")
 * - Missing sectors/stages
 * - Duplicate records
 * - Low GOD scores
 * - Invalid data types
 * 
 * Usage:
 *   node data-quality-audit.mjs          # Audit only (no changes)
 *   node data-quality-audit.mjs --fix    # Audit and fix issues
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const FIX_MODE = process.argv.includes('--fix');

// ═══════════════════════════════════════════════════════════════════════════
// PATTERNS FOR CORRUPTED DATA
// ═══════════════════════════════════════════════════════════════════════════

const CORRUPTED_NAME_PATTERNS = [
  /^BoardContact/i,
  /^ACA\s+Partnerships/i,
  /^[A-Z]{3,}\s+[A-Z]{3,}/, // All caps words (likely concatenated)
  /^[^a-zA-Z]*$/, // No letters
  /^\d+$/, // Just numbers
  /^[^\w\s]+$/, // Just symbols
  /undefined/i,
  /null/i,
  /^[A-Z]{10,}$/, // Too many consecutive capitals
];

const GARBAGE_DESCRIPTION_PATTERNS = [
  /technology company that appears/i,
  /appears to have/i,
  /significant milestone/i,
  /discovered from/i,
  /^[^\w\s]{10,}$/, // Too many symbols
  /^(.)\1{20,}$/, // Repeated characters
  /^[A-Z]{50,}$/, // All caps long text
  /^null$|^undefined$|^NaN$/i,
];

const INVALID_LOCATIONS = [
  'null', 'undefined', 'NaN', '', 'N/A', 'n/a', 'TBD', 'tbd',
  'Unknown', 'unknown', 'None', 'none', 'As empowering', 'as empowering',
  'As empowering, no', 'as empowering, no'
];

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function auditInvestors() {
  console.log('\n📊 INVESTOR DATA AUDIT');
  console.log('─'.repeat(60));
  
  const { data: investors, error } = await supabase
    .from('investors')
    .select('*');
  
  if (error) {
    console.error('❌ Error fetching investors:', error.message);
    return { issues: [], total: 0 };
  }
  
  const issues = [];
  
  for (const inv of investors || []) {
    const problems = [];
    
    // Check for garbage names
    if (inv.name && (
      CORRUPTED_NAME_PATTERNS.some(p => p.test(inv.name)) ||
      inv.name.length < 2 ||
      inv.name.length > 100
    )) {
      problems.push('invalid_name');
    }
    
    // Check for concatenated/corrupt names
    if (inv.name && (
      inv.name.includes('ACA ') ||
      (inv.name.includes('Partnerships') && inv.name.includes('Partners')) ||
      (inv.name.match(/[A-Z]/g) || []).length > 10 // Too many capitals
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
    
    // Garbage location
    if (inv.location && (
      INVALID_LOCATIONS.includes(inv.location.toLowerCase()) ||
      inv.location.includes('undefined') ||
      inv.location.length < 2
    )) {
      problems.push('invalid_location');
    }
    
    // Empty portfolio when it shouldn't be
    if (inv.portfolio_companies && inv.portfolio_companies.length === 0 && 
        inv.check_size_max >= 1000000) {
      problems.push('missing_portfolio');
    }
    
    if (problems.length > 0) {
      issues.push({ id: inv.id, name: inv.name, problems });
    }
  }
  
  console.log(`Total investors: ${investors?.length || 0}`);
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
      console.log(`  ${problem.padEnd(25)}: ${count.toString().padStart(4)}`);
    });
  
  // Show sample bad records
  if (issues.length > 0) {
    console.log('\nSample problematic investors:');
    issues.slice(0, 10).forEach(i => {
      console.log(`  • ${(i.name || 'NO NAME').slice(0, 40).padEnd(40)} - ${i.problems.join(', ')}`);
    });
  }
  
  return { issues, total: investors?.length || 0 };
}

async function auditStartups() {
  console.log('\n📊 STARTUP DATA AUDIT');
  console.log('─'.repeat(60));
  
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('*')
    .eq('status', 'approved');
  
  if (error) {
    console.error('❌ Error fetching startups:', error.message);
    return { issues: [], total: 0 };
  }
  
  const issues = [];
  
  for (const s of startups || []) {
    const problems = [];
    
    // Invalid names
    if (!s.name || s.name.length < 2 || s.name.includes('undefined')) {
      problems.push('invalid_name');
    }
    
    // Garbage descriptions
    if (s.description && GARBAGE_DESCRIPTION_PATTERNS.some(p => p.test(s.description))) {
      problems.push('garbage_description');
    }
    
    // Garbage location
    if (s.location && (
      INVALID_LOCATIONS.includes(s.location.toLowerCase()) ||
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
    
    // Missing source_type (required)
    if (!s.source_type) {
      problems.push('missing_source_type');
    }
    
    if (problems.length > 0) {
      issues.push({ id: s.id, name: s.name, problems });
    }
  }
  
  console.log(`Total approved startups: ${startups?.length || 0}`);
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
      console.log(`  ${problem.padEnd(25)}: ${count.toString().padStart(4)}`);
    });
  
  if (issues.length > 0) {
    console.log('\nSample problematic startups:');
    issues.slice(0, 10).forEach(i => {
      console.log(`  • ${(i.name || 'NO NAME').slice(0, 40).padEnd(40)} - ${i.problems.join(', ')}`);
    });
  }
  
  return { issues, total: startups?.length || 0 };
}

async function auditDuplicates() {
  console.log('\n📊 DUPLICATE RECORDS AUDIT');
  console.log('─'.repeat(60));
  
  // Startup duplicates
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name')
    .eq('status', 'approved');
  
  const startupNames = {};
  const startupDupes = [];
  
  startups?.forEach(s => {
    const normalized = (s.name || '').toLowerCase().trim();
    if (startupNames[normalized]) {
      startupDupes.push({ 
        original: startupNames[normalized], 
        duplicate: s.id, 
        name: s.name 
      });
    } else {
      startupNames[normalized] = s.id;
    }
  });
  
  console.log(`Startup duplicates: ${startupDupes.length}`);
  if (startupDupes.length > 0) {
    console.log('Sample duplicates:');
    startupDupes.slice(0, 5).forEach(d => console.log(`  • ${d.name}`));
  }
  
  // Investor duplicates
  const { data: investors } = await supabase
    .from('investors')
    .select('id, name');
  
  const investorNames = {};
  const investorDupes = [];
  
  investors?.forEach(i => {
    const normalized = (i.name || '').toLowerCase().trim();
    if (investorNames[normalized]) {
      investorDupes.push({ 
        original: investorNames[normalized], 
        duplicate: i.id, 
        name: i.name 
      });
    } else {
      investorNames[normalized] = i.id;
    }
  });
  
  console.log(`Investor duplicates: ${investorDupes.length}`);
  if (investorDupes.length > 0) {
    console.log('Sample duplicates:');
    investorDupes.slice(0, 5).forEach(d => console.log(`  • ${d.name}`));
  }
  
  return { startupDupes, investorDupes };
}

async function auditMatches() {
  console.log('\n📊 MATCH QUALITY AUDIT');
  console.log('─'.repeat(60));
  
  // Sample matches
  const { data: matches, error } = await supabase
    .from('startup_investor_matches')
    .select('match_score, confidence_level')
    .limit(1000);
  
  if (error) {
    console.error('❌ Error fetching matches:', error.message);
    return;
  }
  
  if (!matches || matches.length === 0) {
    console.log('No matches found');
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
    console.log(`  ${range.padEnd(6)}: ${count.toString().padStart(4)} (${pct}%) ${bar}`);
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

async function fixInvestors(issues) {
  console.log('\n🔧 FIXING INVESTOR DATA');
  console.log('─'.repeat(60));
  
  let fixed = 0;
  let deleted = 0;
  
  for (const issue of issues) {
    // Delete completely corrupt records
    if (issue.problems.includes('invalid_name') || issue.problems.includes('corrupted_name')) {
      if (FIX_MODE) {
        const { error } = await supabase
          .from('investors')
          .delete()
          .eq('id', issue.id);
        
        if (!error) {
          deleted++;
          console.log(`  🗑️  Deleted: ${issue.name?.slice(0, 30)}`);
        }
      } else {
        deleted++;
        console.log(`  [WOULD DELETE] ${issue.name?.slice(0, 30)}`);
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
    
    if (issue.problems.includes('invalid_check_size_range')) {
      // Swap if min > max
      const { data: inv } = await supabase
        .from('investors')
        .select('check_size_min, check_size_max')
        .eq('id', issue.id)
        .single();
      
      if (inv && inv.check_size_min > inv.check_size_max) {
        updates.check_size_min = inv.check_size_max;
        updates.check_size_max = inv.check_size_min;
      }
    }
    
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      
      if (FIX_MODE) {
        const { error } = await supabase
          .from('investors')
          .update(updates)
          .eq('id', issue.id);
        
        if (!error) {
          fixed++;
          console.log(`  ✅ Fixed: ${issue.name?.slice(0, 30)}`);
        }
      } else {
        fixed++;
        console.log(`  [WOULD FIX] ${issue.name?.slice(0, 30)} - ${Object.keys(updates).join(', ')}`);
      }
    }
  }
  
  console.log(`\n📊 Results: ${fixed} fixed, ${deleted} deleted`);
  return { fixed, deleted };
}

async function fixStartups(issues) {
  console.log('\n🔧 FIXING STARTUP DATA');
  console.log('─'.repeat(60));
  
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
    
    if (issue.problems.includes('no_tagline') && issue.problems.includes('garbage_description')) {
      // If both are bad, try to salvage from description
      const { data: s } = await supabase
        .from('startup_uploads')
        .select('description')
        .eq('id', issue.id)
        .single();
      
      if (s?.description && !GARBAGE_DESCRIPTION_PATTERNS.some(p => p.test(s.description))) {
        updates.tagline = s.description.slice(0, 200);
      } else {
        updates.tagline = 'Innovative startup';
      }
    }
    
    if (issue.problems.includes('missing_source_type')) {
      updates.source_type = 'manual'; // Default for existing records
    }
    
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      
      if (FIX_MODE) {
        const { error } = await supabase
          .from('startup_uploads')
          .update(updates)
          .eq('id', issue.id);
        
        if (!error) {
          fixed++;
          console.log(`  ✅ Fixed: ${issue.name?.slice(0, 30)}`);
        }
      } else {
        fixed++;
        console.log(`  [WOULD FIX] ${issue.name?.slice(0, 30)} - ${Object.keys(updates).join(', ')}`);
      }
    }
  }
  
  console.log(`\n📊 Results: ${fixed} fixed`);
  return { fixed };
}

async function removeDuplicates(duplicates) {
  console.log('\n🗑️  REMOVING DUPLICATES');
  console.log('─'.repeat(60));
  
  let removed = 0;
  
  // Remove duplicate startups (keep original)
  for (const dupe of duplicates.startupDupes) {
    if (FIX_MODE) {
      const { error } = await supabase
        .from('startup_uploads')
        .delete()
        .eq('id', dupe.duplicate);
      
      if (!error) {
        removed++;
        console.log(`  ✅ Removed startup: ${dupe.name}`);
      }
    } else {
      removed++;
      console.log(`  [WOULD REMOVE] Startup: ${dupe.name}`);
    }
  }
  
  // Remove duplicate investors
  for (const dupe of duplicates.investorDupes) {
    if (FIX_MODE) {
      const { error } = await supabase
        .from('investors')
        .delete()
        .eq('id', dupe.duplicate);
      
      if (!error) {
        removed++;
        console.log(`  ✅ Removed investor: ${dupe.name}`);
      }
    } else {
      removed++;
      console.log(`  [WOULD REMOVE] Investor: ${dupe.name}`);
    }
  }
  
  console.log(`\n📊 Removed ${removed} duplicates`);
  return { removed };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('  🧹 DATA QUALITY AUDIT');
  console.log(`  Mode: ${FIX_MODE ? '🔧 FIX MODE' : '👀 AUDIT ONLY'}`);
  console.log('═'.repeat(60));
  
  // Run audits
  const investorAudit = await auditInvestors();
  const startupAudit = await auditStartups();
  const duplicates = await auditDuplicates();
  await auditMatches();
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('  📊 SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Investors with issues: ${investorAudit.issues.length}`);
  console.log(`Startups with issues: ${startupAudit.issues.length}`);
  console.log(`Startup duplicates: ${duplicates.startupDupes.length}`);
  console.log(`Investor duplicates: ${duplicates.investorDupes.length}`);
  
  // Fix if requested
  if (FIX_MODE) {
    console.log('\n' + '═'.repeat(60));
    console.log('  🔧 APPLYING FIXES');
    console.log('═'.repeat(60));
    
    await fixInvestors(investorAudit.issues);
    await fixStartups(startupAudit.issues);
    await removeDuplicates(duplicates);
    
    console.log('\n✅ All fixes applied!');
  } else {
    console.log('\n💡 Run with --fix to apply fixes');
    console.log('   Example: node data-quality-audit.mjs --fix');
  }
  
  console.log('\n');
}

main().catch(console.error);

