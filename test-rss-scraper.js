#!/usr/bin/env node
/**
 * Automated RSS Scraper Test
 * Runs scraper and validates results without manual intervention
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('\n🧪 RSS Scraper Automated Test\n' + '='.repeat(50));

// Validate environment
if (!supabaseUrl || !serviceKey) {
  console.error('\n❌ Test Failed: Missing environment variables');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function runTest() {
  try {
    // Step 1: Get initial article count
    console.log('\n📊 Step 1: Checking initial article count...');
    const { count: initialCount, error: countError } = await supabase
      .from('rss_articles')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to count articles: ${countError.message}`);
    }

    console.log(`   ✓ Initial count: ${initialCount} articles`);

    // Step 2: Run the scraper
    console.log('\n🔄 Step 2: Running RSS scraper...');
    console.log('   (This may take 30-60 seconds for 14 sources)\n');
    
    const { stdout, stderr } = await execAsync('node run-rss-scraper.js');
    
    if (stderr) {
      console.log('   ⚠️ Warnings:', stderr);
    }

    // Show last 10 lines of output
    const lines = stdout.trim().split('\n');
    const relevantLines = lines.slice(-10);
    console.log('\n   Last lines from scraper:');
    relevantLines.forEach(line => console.log('   ' + line));

    // Step 3: Check final article count
    console.log('\n📊 Step 3: Checking final article count...');
    const { count: finalCount, error: finalError } = await supabase
      .from('rss_articles')
      .select('*', { count: 'exact', head: true });

    if (finalError) {
      throw new Error(`Failed to count articles: ${finalError.message}`);
    }

    console.log(`   ✓ Final count: ${finalCount} articles`);

    // Step 4: Analyze results
    const newArticles = finalCount - initialCount;
    console.log('\n📈 Test Results:');
    console.log('   ' + '─'.repeat(40));
    console.log(`   Articles before: ${initialCount}`);
    console.log(`   Articles after:  ${finalCount}`);
    console.log(`   New articles:    ${newArticles}`);
    console.log('   ' + '─'.repeat(40));

    if (newArticles > 0) {
      // Step 5: Show sample of new articles
      console.log('\n📰 Sample of new articles:');
      const { data: recentArticles } = await supabase
        .from('rss_articles')
        .select('title, source, published_at')
        .order('scraped_at', { ascending: false })
        .limit(5);

      if (recentArticles) {
        recentArticles.forEach((article, idx) => {
          console.log(`   ${idx + 1}. [${article.source}] ${article.title}`);
        });
      }

      console.log('\n✅ Test PASSED: Scraper is working!');
      console.log(`   ${newArticles} articles successfully scraped\n`);
      process.exit(0);
    } else if (initialCount > 0) {
      console.log('\n⚠️ Test PASSED (No New Articles)');
      console.log('   Scraper ran successfully but no new articles found.');
      console.log('   This is normal if feeds were recently scraped.\n');
      process.exit(0);
    } else {
      console.log('\n❌ Test FAILED: No articles scraped');
      console.log('   Check scraper logs above for errors.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test FAILED with error:');
    console.error('   ' + error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   - Check .env has SUPABASE_SERVICE_KEY');
    console.error('   - Verify rss_articles table exists');
    console.error('   - Review scraper error messages above\n');
    process.exit(1);
  }
}

runTest();
