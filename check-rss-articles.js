#!/usr/bin/env node
/**
 * Quick check of scraped RSS articles
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function checkArticles() {
  console.log('\n📰 RSS Articles Summary\n' + '='.repeat(60));

  // Get total count
  const { count } = await supabase
    .from('rss_articles')
    .select('*', { count: 'exact', head: true });

  console.log(`\n✅ Total articles in database: ${count}\n`);

  // Get articles by source
  const { data: sources } = await supabase
    .from('rss_articles')
    .select('source')
    .order('source');

  if (sources) {
    const sourceCounts = {};
    sources.forEach(row => {
      sourceCounts[row.source] = (sourceCounts[row.source] || 0) + 1;
    });

    console.log('📊 Articles by source:');
    console.log('─'.repeat(60));
    Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([source, count]) => {
        console.log(`   ${source.padEnd(30)} ${count} articles`);
      });
  }

  // Get recent articles
  console.log('\n📅 Most recent articles:');
  console.log('─'.repeat(60));
  const { data: recent } = await supabase
    .from('rss_articles')
    .select('title, source, published_at, scraped_at')
    .order('scraped_at', { ascending: false })
    .limit(10);

  if (recent) {
    recent.forEach((article, idx) => {
      const scrapedDate = new Date(article.scraped_at).toLocaleString();
      console.log(`\n${idx + 1}. [${article.source}]`);
      console.log(`   ${article.title}`);
      console.log(`   Scraped: ${scrapedDate}`);
    });
  }

  console.log('\n');
}

checkArticles();
