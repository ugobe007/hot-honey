#!/usr/bin/env node
/**
 * Extract Missing Series A/B Startups from RSS Articles (Pattern-Based, NO API)
 * 
 * This script uses pattern matching instead of AI to avoid token costs
 * Extracts funding information using regex patterns and keyword matching
 * 
 * NO API CALLS = $0 COST
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BATCH_SIZE = 50; // Larger batches since no API rate limits

/**
 * Extract company name from article title/content using patterns
 */
function extractCompanyName(title, content) {
  // Pattern 1: "Company Name raises $X in Series A"
  let match = title.match(/^([^:]+?)\s+(?:raises|raised|closes|secured|bags|gets)/i);
  if (match) return match[1].trim();
  
  // Pattern 2: "Company Name: Raises $X"
  match = title.match(/^([^:]+?):/i);
  if (match) return match[1].trim();
  
  // Pattern 3: Look for capitalized words at start
  match = title.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  if (match) return match[1].trim();
  
  return null;
}

/**
 * Extract funding amount using patterns
 */
function extractFundingAmount(text) {
  // Patterns: $10M, $10 million, $10M Series A, $10 million Series A
  const patterns = [
    /\$([\d.]+)\s*([BMKkmbillionmillion]*)/i,
    /([\d.]+)\s*(?:million|billion|M|B|K)\s*(?:in|for|Series|funding)/i,
    /\$([\d.]+)\s*M/i,
    /\$([\d.]+)\s*B/i,
    /raised\s+(?:a|an)?\s*\$?([\d.]+)\s*([BMK])/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let amount = parseFloat(match[1]);
      const unit = (match[2] || 'M').toUpperCase();
      
      if (unit.includes('B') || unit.includes('BILLION')) amount *= 1000;
      if (unit.includes('K') || unit.includes('THOUSAND')) amount /= 1000;
      
      if (amount >= 0.5) { // Only return if >= $500K
        return `$${amount.toFixed(amount < 1 ? 2 : 0)}${unit.includes('B') ? 'B' : 'M'}`;
      }
    }
  }
  
  return null;
}

/**
 * Determine funding stage from text
 */
function extractFundingStage(text) {
  const lower = text.toLowerCase();
  
  if (/series\s+b|series\s*-?\s*b/i.test(lower)) return 'Series B';
  if (/series\s+a|series\s*-?\s*a/i.test(lower)) return 'Series A';
  if (/series\s+c|series\s*-?\s*c/i.test(lower)) return 'Series C';
  if (/series\s+d|series\s*-?\s*d/i.test(lower)) return 'Series D';
  if (/seed\s+round|seed\s+funding/i.test(lower)) return 'Seed';
  
  return null;
}

/**
 * Extract investors from text
 */
function extractInvestors(text) {
  const investors = [];
  
  // Common investor patterns
  const investorPatterns = [
    /led\s+by\s+([A-Z][a-zA-Z\s&,]+?)(?:\s+and|,|\s|$)/g,
    /backed\s+by\s+([A-Z][a-zA-Z\s&,]+?)(?:\s+and|,|\s|$)/g,
    /investors?\s+(?:include|including):\s*([A-Z][a-zA-Z\s&,]+?)(?:\n|$)/g,
    /(?:with|from|by)\s+([A-Z][a-zA-Z\s&,]+?)(?:\s+(?:leading|co-leading|participating))/g
  ];
  
  // Common investor names to look for
  const knownInvestors = [
    'a16z', 'Andreessen Horowitz', 'Sequoia', 'Accel', 'Y Combinator', 'YC',
    'Kleiner Perkins', 'Benchmark', 'First Round', 'GV', 'Google Ventures',
    'NEA', 'General Catalyst', 'Bessemer', 'Index Ventures', 'Redpoint',
    'Insight Partners', 'Tiger Global', 'Lightspeed', 'Coatue', 'SoftBank'
  ];
  
  for (const pattern of investorPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const investor = match[1].trim();
      if (investor && investor.length > 2 && investor.length < 50) {
        investors.push(investor);
      }
    }
  }
  
  // Check for known investors in text
  for (const investor of knownInvestors) {
    if (text.includes(investor)) {
      investors.push(investor);
    }
  }
  
  return investors.length > 0 ? [...new Set(investors)] : null;
}

/**
 * Extract startup information from article (pattern-based, no AI)
 */
function extractStartupInfo(article) {
  const title = article.title || '';
  const content = article.content || title;
  const fullText = `${title} ${content}`;
  
  // Check if this article mentions Series A/B
  const fundingStage = extractFundingStage(fullText);
  if (!fundingStage || (fundingStage !== 'Series A' && fundingStage !== 'Series B')) {
    return null; // Skip if not Series A/B
  }
  
  // Extract company name
  const companyName = extractCompanyName(title, content);
  if (!companyName || companyName.length < 2) {
    return null; // Skip if can't extract company name
  }
  
  // Extract funding amount
  const fundingAmount = extractFundingAmount(fullText);
  
  // Extract investors
  const investors = extractInvestors(fullText);
  
  // Extract description (first sentence from content)
  let description = null;
  if (content) {
    const sentences = content.split(/[.!?]\s+/);
    if (sentences.length > 0 && sentences[0].length > 20) {
      description = sentences[0].substring(0, 300).trim();
    }
  }
  
  return {
    name: companyName,
    website: null, // Can't extract reliably without AI
    description: description || `${companyName} raised ${fundingAmount || 'funding'} in ${fundingStage}`,
    funding_amount: fundingAmount,
    funding_stage: fundingStage,
    investors: investors || []
  };
}

async function extractMissingSeriesAB() {
  console.log('🔍 Finding RSS articles with Series A/B (Pattern-Based, NO API)...\n');

  try {
    // Step 1: Find unimported RSS articles with Series A/B mentions
    console.log('📰 Searching RSS articles...');
    const { data: articles, error: articlesError } = await supabase
      .from('rss_articles')
      .select('id, title, url, content, published_at, created_at')
      .or('title.ilike.%Series A%,content.ilike.%Series A%,title.ilike.%Series B%,content.ilike.%Series B%')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('published_at', { ascending: false })
      .limit(500);

    if (articlesError) {
      console.error('❌ Error fetching RSS articles:', articlesError);
      return;
    }

    if (!articles || articles.length === 0) {
      console.log('⚠️  No RSS articles with Series A/B mentions found');
      return;
    }

    console.log(`✅ Found ${articles.length} RSS articles with Series A/B mentions\n`);

    // Step 2: Filter out articles that are already imported
    console.log('🔍 Checking which articles are already imported...');
    const { data: allDiscovered } = await supabase
      .from('discovered_startups')
      .select('article_url');

    const importedUrls = new Set(
      (allDiscovered || []).map(ds => {
        try {
          const url = new URL(ds.article_url);
          return url.hostname + url.pathname;
        } catch {
          return ds.article_url;
        }
      })
    );

    const unimportedArticles = articles.filter(article => {
      try {
        const url = new URL(article.url);
        const urlKey = url.hostname + url.pathname;
        return !importedUrls.has(urlKey);
      } catch {
        return !importedUrls.has(article.url);
      }
    });

    console.log(`✅ Found ${unimportedArticles.length} unimported articles (${articles.length - unimportedArticles.length} already imported)\n`);

    if (unimportedArticles.length === 0) {
      console.log('✅ All Series A/B articles have been imported!');
      return;
    }

    // Step 3: Extract startups from unimported articles using patterns (NO API)
    console.log(`🎯 Extracting startups from ${unimportedArticles.length} articles using pattern matching...\n`);

    let totalExtracted = 0;
    let totalSaved = 0;
    let errors = 0;
    const startupsToSave = [];

    for (const article of unimportedArticles) {
      try {
        const startupInfo = extractStartupInfo(article);
        
        if (!startupInfo) {
          continue; // Skip if extraction failed
        }

        startupsToSave.push({
          startup: startupInfo,
          article: article
        });
        
        totalExtracted++;
        console.log(`  ✅ Extracted: "${startupInfo.name}" - ${startupInfo.funding_stage} (${startupInfo.funding_amount || 'amount unknown'})`);

      } catch (articleError) {
        console.error(`  ❌ Error processing article "${article.title?.substring(0, 50)}...":`, articleError.message);
        errors++;
      }
    }

    console.log(`\n📊 Pattern Extraction Summary:`);
    console.log(`  ✅ Articles processed: ${unimportedArticles.length}`);
    console.log(`  ✅ Startups extracted: ${totalExtracted}`);
    console.log(`  ❌ Errors: ${errors}\n`);

    if (startupsToSave.length === 0) {
      console.log('⚠️  No startups extracted from articles');
      return;
    }

    // Step 4: Deduplicate startups by name (keep first occurrence with most info)
    console.log(`🔍 Deduplicating ${startupsToSave.length} extracted startups...`);
    const uniqueStartups = new Map();
    
    for (const { startup, article } of startupsToSave) {
      const nameKey = startup.name.toLowerCase().trim();
      
      if (!uniqueStartups.has(nameKey)) {
        uniqueStartups.set(nameKey, { startup, article });
      } else {
        // Keep the one with more information (funding amount, investors, etc.)
        const existing = uniqueStartups.get(nameKey);
        const existingHasMore = (existing.startup.funding_amount && !startup.funding_amount) ||
                                (existing.startup.investors.length > startup.investors.length) ||
                                (existing.startup.description && existing.startup.description.length > (startup.description?.length || 0));
        
        if (!existingHasMore) {
          uniqueStartups.set(nameKey, { startup, article });
        }
      }
    }
    
    const deduplicatedStartups = Array.from(uniqueStartups.values());
    console.log(`✅ Deduplicated to ${deduplicatedStartups.length} unique startups\n`);

    // Step 5: Check which startups already exist in database (by name + website)
    console.log('🔍 Checking which startups already exist in database...');
    const { data: existingStartups } = await supabase
      .from('discovered_startups')
      .select('name, website');
    
    const existingKeys = new Set(
      (existingStartups || []).map(s => {
        const nameKey = (s.name || '').toLowerCase().trim();
        const websiteKey = (s.website || '').toLowerCase().trim();
        return `${nameKey}|||${websiteKey}`;
      })
    );
    
    const newStartups = deduplicatedStartups.filter(({ startup }) => {
      const nameKey = (startup.name || '').toLowerCase().trim();
      const websiteKey = (startup.website || '').toLowerCase().trim();
      const key = `${nameKey}|||${websiteKey}`;
      return !existingKeys.has(key);
    });
    
    console.log(`✅ Found ${newStartups.length} new startups to save (${deduplicatedStartups.length - newStartups.length} already exist)\n`);

    if (newStartups.length === 0) {
      console.log('✅ All extracted startups already exist in database!');
      return;
    }

    // Step 6: Save to discovered_startups (batch insert with upsert for safety)
    console.log(`💾 Saving ${newStartups.length} new startups to discovered_startups...\n`);

    for (let i = 0; i < newStartups.length; i += BATCH_SIZE) {
      const batch = newStartups.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(newStartups.length / BATCH_SIZE);

      console.log(`📦 Saving batch ${batchNum}/${totalBatches} (${batch.length} startups)...`);

      const records = batch.map(({ startup, article }) => ({
        name: startup.name.trim(),
        website: startup.website,
        description: startup.description,
        funding_amount: startup.funding_amount,
        funding_stage: startup.funding_stage,
        investors_mentioned: startup.investors.length > 0 ? startup.investors : null,
        article_url: article.url,
        article_title: article.title,
        article_date: article.published_at || article.created_at,
        rss_source: 'pattern_based_extraction',
        imported_to_startups: false,
        discovered_at: new Date().toISOString()
      }));

      // Insert new records (duplicates already filtered)
      const { data: inserted, error: insertError } = await supabase
        .from('discovered_startups')
        .insert(records)
        .select();

      if (insertError) {
        console.error(`  ❌ Error saving batch ${batchNum}:`, insertError.message);
        errors += batch.length;
      } else {
        const savedCount = inserted ? inserted.length : batch.length;
        totalSaved += savedCount;
        console.log(`  ✅ Saved ${savedCount} startups from batch ${batchNum}`);
      }
    }

    // Final summary
    console.log('\n📊 Final Summary:');
    console.log(`  ✅ Articles processed: ${unimportedArticles.length}`);
    console.log(`  ✅ Startups extracted: ${totalExtracted}`);
    console.log(`  ✅ Unique startups (after deduplication): ${deduplicatedStartups ? deduplicatedStartups.length : 0}`);
    console.log(`  ✅ New startups saved: ${totalSaved}`);
    console.log(`  ⏭️  Skipped (already exist): ${deduplicatedStartups && newStartups ? deduplicatedStartups.length - newStartups.length : 0}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`  💰 Cost: $0 (No API calls!)\n`);

    if (totalSaved > 0) {
      console.log('🎉 Successfully extracted missing Series A/B startups!');
      console.log('\n📝 Next steps:');
      console.log('  1. Review discovered_startups to verify quality');
      console.log('  2. Run: node scripts/approve-all-discovered-startups.js');
      console.log('  3. The approve script will correctly map funding_stage to numeric stage\n');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

extractMissingSeriesAB();
