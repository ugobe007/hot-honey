#!/usr/bin/env node
/**
 * INVESTOR CLEANUP SCRIPT
 * =======================
 * Uses service role to bypass RLS and clean garbage/duplicates
 * 
 * Usage: node investor-cleanup.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Use SERVICE KEY to bypass RLS
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  console.log('\n🧹 INVESTOR CLEANUP SCRIPT\n');
  console.log('='.repeat(60));
  
  // Step 1: Count current state
  const { count: totalBefore } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Current investor count: ${totalBefore}\n`);
  
  // Step 2: Delete garbage with parentheses patterns
  // Fetch all investors first, then filter in JavaScript to avoid SQL timeouts
  console.log('🗑️  Deleting garbage entries with parentheses patterns...');
  console.log('   Fetching all investors (this may take a moment)...');
  
  const { data: allInvestorsForCleanup, error: fetchErr } = await supabase
    .from('investors')
    .select('id, name')
    .limit(5000);
  
  if (fetchErr) {
    console.log(`   ⚠️  Error fetching: ${fetchErr.message}`);
  } else {
    const patterns = [
      /\(firstround\)/i, /\(felicis\)/i, /\(greylock\)/i, /\(villageglobal\)/i, /\(accel\)/i,
      /\(boldstart\)/i, /\(lsvp\)/i, /\(dcvc\)/i, /\(bvp\)/i, /\(nea\)/i,
      /\(angelcapitalassociation\)/i, /\(paradigm\)/i, /\(sequoiacap\)/i,
      /\(uncork/i, /\(lightspeed\)/i, /\(playground\)/i, /\(lowercarboncapital\)/i
    ];
    
    const toDelete = [];
    for (const inv of allInvestorsForCleanup || []) {
      for (const pattern of patterns) {
        if (pattern.test(inv.name)) {
          toDelete.push(inv.id);
          break; // Only add once
        }
      }
    }
    
    if (toDelete.length > 0) {
      console.log(`   Found ${toDelete.length} entries to delete`);
      console.log(`   Deleting in small batches (10 at a time) to avoid timeouts...`);
      
      let actuallyDeleted = 0;
      let matchesDeleted = 0;
      
      // Delete in very small batches (10 at a time) with delays
      for (let i = 0; i < toDelete.length; i += 10) {
        const batch = toDelete.slice(i, i + 10);
        
        // First delete related matches for this small batch
        try {
          const { count } = await supabase
            .from('startup_investor_matches')
            .delete()
            .in('investor_id', batch)
            .select('*', { count: 'exact', head: true });
          matchesDeleted += (count || 0);
        } catch (err) {
          // Continue even if match deletion fails
        }
        
        // Then delete investors
        try {
          const { data, error } = await supabase
            .from('investors')
            .delete()
            .in('id', batch)
            .select('id');
          
          if (error) {
            console.log(`   ⚠️  Batch ${Math.floor(i/10) + 1} error: ${error.message.substring(0, 50)}`);
          } else {
            const deleted = data?.length || 0;
            actuallyDeleted += deleted;
            if (deleted > 0) {
              process.stdout.write(`   Batch ${Math.floor(i/10) + 1}: ${deleted} removed... `);
              console.log(`(${actuallyDeleted}/${toDelete.length})`);
            }
          }
        } catch (err) {
          console.log(`   ⚠️  Batch ${Math.floor(i/10) + 1} exception: ${err.message.substring(0, 50)}`);
        }
        
        // Small delay between batches
        await new Promise(r => setTimeout(r, 200));
      }
      console.log(`   ✅ Deleted ${matchesDeleted} matches, ${actuallyDeleted} investors of ${toDelete.length}`);
    } else {
      console.log(`   ✓ No matches found`);
    }
  }
  
  // Step 3: Delete garbage text entries (using same fetched data)
  console.log('\n🗑️  Deleting garbage text entries...');
  
  if (!allInvestorsForCleanup) {
    // Re-fetch if we don't have it
    const { data } = await supabase
      .from('investors')
      .select('id, name')
      .limit(5000);
    allInvestorsForCleanup = data;
  }
  
  const textPatterns = [
    /^article/i, /^webinar/i, /^publications/i, /^newsletter/i, /^subscribe/i,
    /^volunteer/i, /^pathway/i, /^methodology/i, /^administration/i,
    /account management/i, /senior finance/i, /private equity/i,
    /about venture/i, /million equity/i, /cost of capital/i,
    /and joint/i, /backed prometheus/i, /for oversubscribed/i
  ];
  
  const toDeleteText = [];
  for (const inv of allInvestorsForCleanup || []) {
    for (const pattern of textPatterns) {
      if (pattern.test(inv.name)) {
        toDeleteText.push(inv.id);
        break;
      }
    }
  }
  
  if (toDeleteText.length > 0) {
    console.log(`   Found ${toDeleteText.length} entries to delete`);
    let actuallyDeleted = 0;
    // Delete in batches
    for (let i = 0; i < toDeleteText.length; i += 50) {
      const batch = toDeleteText.slice(i, i + 50);
      const { data, error } = await supabase
        .from('investors')
        .delete()
        .in('id', batch)
        .select('id');
      
      if (error) {
        console.log(`   ⚠️  Batch ${Math.floor(i/50) + 1} error: ${error.message}`);
      } else {
        const deleted = data?.length || 0;
        actuallyDeleted += deleted;
        process.stdout.write(`   Batch ${Math.floor(i/50) + 1}... `);
        console.log(`${deleted} removed`);
      }
    }
    console.log(`   ✅ Actually deleted: ${actuallyDeleted} of ${toDeleteText.length}`);
  } else {
    console.log(`   ✓ No matches found`);
  }
  
  // Delete specific garbage names
  const garbageNames = [
    'Venture Capital', 'Private Equity', 'Generalist', 'Account Management',
    'It', 'CI', 'UK', 'States'
  ];
  
  for (const name of garbageNames) {
    try {
      process.stdout.write(`   Checking "${name}"... `);
      const { data, error } = await Promise.race([
        supabase
          .from('investors')
          .delete()
          .eq('name', name)
          .select('id'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 10000)
        )
      ]).catch(err => {
        if (err.message === 'Timeout') {
          return { data: null, error: { message: 'Timeout after 10s' } };
        }
        throw err;
      });
      
      if (error) {
        console.log(`⚠️  Error: ${error.message}`);
      } else if (data?.length > 0) {
        console.log(`✅ Deleted ${data.length}`);
      } else {
        console.log(`✓ 0`);
      }
    } catch (err) {
      console.log(`❌ Failed: ${err.message}`);
    }
  }
  
  // Delete names that are too long (>80 chars)
  console.log('   Checking for long names (>80 chars)...');
  try {
    const { data: longNames, error: longErr } = await Promise.race([
      supabase
        .from('investors')
        .select('id, name')
        .limit(5000), // Limit to avoid timeout
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 30000)
      )
    ]).catch(err => {
      if (err.message === 'Timeout') {
        return { data: null, error: { message: 'Timeout after 30s' } };
      }
      throw err;
    });
    
    if (longErr) {
      console.log(`   ⚠️  Error fetching names: ${longErr.message}`);
    } else {
      const tooLong = longNames?.filter(i => i.name && i.name.length > 80) || [];
      if (tooLong.length > 0) {
        console.log(`   Found ${tooLong.length} entries with names > 80 chars`);
        // Delete in batches
        for (let i = 0; i < tooLong.length; i += 50) {
          const batch = tooLong.slice(i, i + 50);
          const { data } = await supabase
            .from('investors')
            .delete()
            .in('id', batch.map(i => i.id))
            .select('id');
          console.log(`   Deleted batch of ${data?.length || 0}`);
        }
      } else {
        console.log(`   ✓ None found`);
      }
    }
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message}`);
  }
  
  // Step 4: Delete duplicates (keep one with investor_type set, or first one)
  console.log('\n🗑️  Removing duplicate entries...');
  
  const { data: allInvestors } = await supabase
    .from('investors')
    .select('id, name, investor_type')
    .order('name');
  
  // Group by lowercase name
  const groups = {};
  for (const inv of allInvestors || []) {
    const key = inv.name.toLowerCase().trim();
    if (!groups[key]) groups[key] = [];
    groups[key].push(inv);
  }
  
  // Find duplicates and decide which to delete
  const toDelete = [];
  for (const [name, invs] of Object.entries(groups)) {
    if (invs.length > 1) {
      // Sort: prioritize ones with investor_type set
      invs.sort((a, b) => {
        if (a.investor_type && !b.investor_type) return -1;
        if (!a.investor_type && b.investor_type) return 1;
        return 0;
      });
      
      // Keep first, delete rest
      const duplicates = invs.slice(1);
      toDelete.push(...duplicates.map(d => d.id));
      
      // Special case: National Wealth Fund (keep all 3 - different countries)
      if (name === 'national wealth fund') {
        toDelete.pop();
        toDelete.pop();
        continue;
      }
    }
  }
  
  if (toDelete.length > 0) {
    console.log(`   Deleting ${toDelete.length} duplicates in small batches (10 at a time)...`);
    
    let actuallyDeleted = 0;
    let matchesDeleted = 0;
    
    // Delete in very small batches with delays
    for (let i = 0; i < toDelete.length; i += 10) {
      const batch = toDelete.slice(i, i + 10);
      
      // Delete matches first
      try {
        const { count } = await supabase
          .from('startup_investor_matches')
          .delete()
          .in('investor_id', batch)
          .select('*', { count: 'exact', head: true });
        matchesDeleted += (count || 0);
      } catch (err) {
        // Continue
      }
      
      // Delete investors
      try {
        const { data, error } = await supabase
          .from('investors')
          .delete()
          .in('id', batch)
          .select('id');
        
        if (error) {
          console.log(`   ⚠️  Batch ${Math.floor(i/10) + 1} error: ${error.message.substring(0, 50)}`);
        } else {
          const deleted = data?.length || 0;
          actuallyDeleted += deleted;
          if (deleted > 0) {
            process.stdout.write(`   Batch ${Math.floor(i/10) + 1}: ${deleted} removed... `);
            console.log(`(${actuallyDeleted}/${toDelete.length})`);
          }
        }
      } catch (err) {
        console.log(`   ⚠️  Batch ${Math.floor(i/10) + 1} exception: ${err.message.substring(0, 50)}`);
      }
      
      // Small delay
      await new Promise(r => setTimeout(r, 200));
    }
    console.log(`   ✅ Deleted ${matchesDeleted} matches, ${actuallyDeleted} investors of ${toDelete.length}`);
  }
  
  // Step 5: Final count
  const { count: totalAfter } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true });
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 CLEANUP SUMMARY');
  console.log('='.repeat(60));
  console.log(`   Before: ${totalBefore}`);
  console.log(`   After:  ${totalAfter}`);
  console.log(`   Removed: ${totalBefore - totalAfter}`);
  
  // Step 6: Show distribution by investor_type
  const { data: byType } = await supabase
    .from('investors')
    .select('investor_type');
  
  const typeCounts = {};
  for (const inv of byType || []) {
    const type = inv.investor_type || 'null (VC)';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  }
  
  console.log('\n📊 Distribution by investor_type:');
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${type}: ${count}`);
  }
  
  // Step 7: Clean up remaining duplicates (more aggressive)
  console.log('\n🔍 Cleaning up remaining duplicates...');
  
  const { data: remaining } = await supabase
    .from('investors')
    .select('id, name, investor_type, firm, url');
  
  // Group by normalized name (lowercase, trimmed)
  const remainingGroups = {};
  for (const inv of remaining || []) {
    const key = inv.name.toLowerCase().trim();
    if (!remainingGroups[key]) remainingGroups[key] = [];
    remainingGroups[key].push(inv);
  }
  
  const stillDupes = Object.entries(remainingGroups).filter(([_, invs]) => invs.length > 1);
  
  if (stillDupes.length > 0) {
    console.log(`   Found ${stillDupes.length} duplicate groups`);
    
    const toDeleteRound2 = [];
    
    for (const [name, invs] of stillDupes) {
      // Special cases to keep all
      if (name === 'national wealth fund') {
        console.log(`   ⏭️  Keeping all 3 "National Wealth Fund" (different countries)`);
        continue;
      }
      
      // Garbage names - delete all
      if (name.includes('events manager') || name.includes('note to') || name.includes('(felicis)') || name.includes('(vccafe)')) {
        console.log(`   🗑️  Deleting all "${name}" (garbage)`);
        toDeleteRound2.push(...invs.map(i => i.id));
        continue;
      }
      
      // For legitimate duplicates, keep the best one
      // Priority: has investor_type > has url > has firm > first one
      invs.sort((a, b) => {
        if (a.investor_type && !b.investor_type) return -1;
        if (!a.investor_type && b.investor_type) return 1;
        if (a.url && !b.url) return -1;
        if (!a.url && b.url) return 1;
        if (a.firm && !b.firm) return -1;
        if (!a.firm && b.firm) return 1;
        return 0;
      });
      
      // Keep first, delete rest
      const duplicates = invs.slice(1);
      toDeleteRound2.push(...duplicates.map(d => d.id));
      console.log(`   🗑️  "${name}": keeping 1, deleting ${duplicates.length}`);
    }
    
    if (toDeleteRound2.length > 0) {
      // Delete in very small batches (10 at a time)
      let actuallyDeleted = 0;
      let matchesDeleted = 0;
      
      for (let i = 0; i < toDeleteRound2.length; i += 10) {
        const batch = toDeleteRound2.slice(i, i + 10);
        
        // Delete matches first
        try {
          const { count } = await supabase
            .from('startup_investor_matches')
            .delete()
            .in('investor_id', batch)
            .select('*', { count: 'exact', head: true });
          matchesDeleted += (count || 0);
        } catch (err) {
          // Continue
        }
        
        // Delete investors
        try {
          const { data, error } = await supabase
            .from('investors')
            .delete()
            .in('id', batch)
            .select('id');
          
          if (error) {
            console.log(`   ⚠️  Batch ${Math.floor(i/10) + 1} error: ${error.message.substring(0, 50)}`);
          } else {
            const deleted = data?.length || 0;
            actuallyDeleted += deleted;
            if (deleted > 0) {
              process.stdout.write(`   Batch ${Math.floor(i/10) + 1}: ${deleted} removed... `);
              console.log(`(${actuallyDeleted}/${toDeleteRound2.length})`);
            }
          }
        } catch (err) {
          console.log(`   ⚠️  Batch ${Math.floor(i/10) + 1} exception: ${err.message.substring(0, 50)}`);
        }
        
        // Small delay
        await new Promise(r => setTimeout(r, 200));
      }
      console.log(`   ✅ Deleted ${matchesDeleted} matches, ${actuallyDeleted} investors of ${toDeleteRound2.length}`);
    }
    
    // Final check
    const { data: finalCheck } = await supabase
      .from('investors')
      .select('name');
    
    const finalGroups = {};
    for (const inv of finalCheck || []) {
      const key = inv.name.toLowerCase().trim();
      finalGroups[key] = (finalGroups[key] || 0) + 1;
    }
    
    const finalDupes = Object.entries(finalGroups).filter(([_, c]) => c > 1);
    if (finalDupes.length > 0) {
      console.log('\n⚠️  Still remaining duplicates:');
      finalDupes.forEach(([name, count]) => console.log(`   ${name}: ${count}x`));
    } else {
      console.log('\n✅ No remaining duplicates!');
    }
  } else {
    console.log('\n✅ No remaining duplicates!');
  }
  
  console.log('\n🎉 Cleanup complete!\n');
}

main().catch(console.error);
