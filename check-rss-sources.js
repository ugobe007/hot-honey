const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

(async () => {
  console.log('🔍 Checking RSS Sources...\n');

  // Check RSS sources
  const { data: sources, error: sourcesError } = await supabase
    .from('rss_sources')
    .select('*')
    .order('created_at', { ascending: false });

  if (sourcesError) {
    console.log('❌ Error loading RSS sources:', sourcesError.message);
    return;
  }

  console.log(`📊 Total RSS sources in database: ${sources?.length || 0}\n`);

  if (sources && sources.length > 0) {
    console.log('📰 RSS Sources:\n');
    sources.forEach((source, i) => {
      const enabled = source.enabled ?? source.active ?? true;
      const status = enabled ? '✅' : '❌';
      console.log(`${i + 1}. ${status} ${source.name}`);
      console.log(`   URL: ${source.url}`);
      console.log(`   Category: ${source.category}`);
      console.log(`   Last Scraped: ${source.last_scraped || 'Never'}`);
      console.log(`   Requires Auth: ${source.requires_auth ? 'Yes' : 'No'}`);
      console.log('');
    });

    // Check for scraped articles
    const { count: articlesCount } = await supabase
      .from('rss_articles')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📄 Total articles scraped: ${articlesCount || 0}`);

    // Check recent articles
    const { data: recentArticles } = await supabase
      .from('rss_articles')
      .select('title, source, published_at')
      .order('published_at', { ascending: false })
      .limit(5);

    if (recentArticles && recentArticles.length > 0) {
      console.log('\n📰 Recent articles:');
      recentArticles.forEach((article, i) => {
        console.log(`${i + 1}. ${article.title}`);
        console.log(`   Source: ${article.source}`);
        console.log(`   Published: ${article.published_at}`);
        console.log('');
      });
    } else {
      console.log('\n⚠️  No articles found in database yet!');
    }

    // Check if RSS scheduler is running
    console.log('\n🔧 To manually trigger RSS scraping:');
    console.log('   1. Go to http://localhost:5174/admin/operations');
    console.log('   2. Click "Run RSS Feed" button');
    console.log('   OR');
    console.log('   3. Start the backend server: cd server && npm run dev');
  } else {
    console.log('⚠️  No RSS sources found in database!');
    console.log('\nTo add RSS sources:');
    console.log('   1. Go to http://localhost:5174/admin/rss-manager');
    console.log('   2. Click "+ Add RSS Source"');
    console.log('   3. Enter source details and save');
  }
})();
