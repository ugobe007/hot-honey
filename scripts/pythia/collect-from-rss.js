#!/usr/bin/env node
/**
 * Collect Pythia Snippets from RSS Articles
 * Extracts founder/company quotes from RSS articles and saves as Tier 3 snippets
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function hashText(text) {
  return crypto.createHash('md5').update(text.trim().toLowerCase()).digest('hex');
}

/**
 * Extract quotes from article content (balanced pattern matching)
 * Extracts quoted text with attribution and contextual statements
 */
function extractQuotes(content, articleTitle) {
  if (!content || content.length < 50) return [];
  
  const quotes = [];
  const text = content;
  
  // Pattern 1: Direct quotes with attribution (most reliable)
  // "quote text," said/added/noted Founder Name / CEO Name / Company Name
  const directQuotePattern = /"([^"]{60,500})"[^"]{0,300}?(?:said|added|noted|explained|told|stated|according to|quotes?|wrote|commented)\s+(?:the\s+)?(?:CEO|founder|co-founder|president|executive|spokesperson|representative|head|director|\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b)/gi;
  let match;
  while ((match = directQuotePattern.exec(text)) !== null) {
    const quoteText = match[1].trim();
    if (quoteText.length >= 60 && quoteText.length <= 500) {
      quotes.push({
        text: quoteText,
        context: 'press',
        hasAttribution: true,
        confidence: 'high'
      });
    }
  }
  
  // Pattern 2: Blockquotes or structured quotes (if article is formatted)
  const blockQuotePattern = /(?:^|\n)\s*["']([^"']{60,400})["']\s*(?:\n|$)/gm;
  let blockMatch;
  while ((blockMatch = blockQuotePattern.exec(text)) !== null) {
    const quoteText = blockMatch[1].trim();
    // Only include if it looks like a statement (contains first person or company reference)
    if (quoteText.length >= 60 && /(?:we|i|our|the company|our team|we're|we've)/i.test(quoteText)) {
      quotes.push({
        text: quoteText,
        context: 'press',
        hasAttribution: false,
        confidence: 'medium'
      });
    }
  }
  
  // Pattern 3: Founder/CEO statements in articles about them (if title mentions founder/CEO)
  if (articleTitle && /(?:founder|ceo|co-founder|founders|executive|president).*?(?:said|told|explained|stated)/i.test(articleTitle)) {
    // Extract substantial statements with first-person or company references
    const statements = text.match(/(?:^|\.\s+)(?:We|I|Our|The company|Our team)[^.!?]{50,250}[.!?]/g);
    if (statements && statements.length > 0) {
      statements.slice(0, 2).forEach(stmt => {
        const cleanStmt = stmt.trim().replace(/^(\.|\s)+/, '');
        if (cleanStmt.length >= 60 && cleanStmt.length <= 400) {
          quotes.push({
            text: cleanStmt,
            context: 'press',
            hasAttribution: false,
            confidence: 'medium'
          });
        }
      });
    }
  }
  
  // Deduplicate and limit to top 5 quotes
  const uniqueQuotes = [];
  const seen = new Set();
  for (const quote of quotes) {
    const key = quote.text.substring(0, 50).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueQuotes.push(quote);
    }
  }
  
  return uniqueQuotes.slice(0, 5);
}

/**
 * Match RSS article to startup (using companies_mentioned field if available, otherwise name matching)
 */
async function findMatchingStartup(article, articleText, articleTitle) {
  const combinedText = (articleTitle + ' ' + articleText).toLowerCase();
  
  // First, try using companies_mentioned field if available (more reliable)
  if (article.companies_mentioned && Array.isArray(article.companies_mentioned) && article.companies_mentioned.length > 0) {
    const { data: startups, error } = await supabase
      .from('startup_uploads')
      .select('id, name')
      .eq('status', 'approved')
      .in('name', article.companies_mentioned);
    
    if (!error && startups && startups.length > 0) {
      // Return first match
      return startups[0];
    }
  }
  
  // Fallback: Name matching (but more conservative)
  // Common words to exclude from matching
  const commonWords = new Set([
    'are', 'the', 'and', 'for', 'with', 'from', 'this', 'that', 'they', 'have',
    'will', 'can', 'not', 'all', 'but', 'was', 'one', 'out', 'see', 'her',
    'his', 'has', 'had', 'its', 'who', 'how', 'may', 'say', 'way', 'day',
    'get', 'use', 'new', 'now', 'man', 'old', 'way', 'two', 'may', 'any',
    'look', 'time', 'very', 'what', 'know', 'take', 'come', 'than', 'into',
    'just', 'like', 'long', 'make', 'many', 'over', 'such', 'them', 'well',
    'were', 'when', 'your', 'said', 'each', 'which', 'their', 'these', 'want',
    'been', 'good', 'much', 'some', 'would', 'there', 'could', 'other', 'after',
    'first', 'never', 'these', 'think', 'where', 'being', 'those', 'under',
    'while', 'years', 'three', 'doing', 'might', 'every', 'great', 'still',
    'those', 'before', 'during', 'through', 'again', 'about', 'around', 'along',
    'against', 'within', 'without', 'across', 'among', 'below', 'beyond'
  ]);
  
  // Get all startup names for matching
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name')
    .eq('status', 'approved')
    .limit(5000);
  
  if (error || !startups) return null;
  
  // Try to match startup name in article (with word boundaries)
  for (const startup of startups) {
    const nameLower = startup.name.toLowerCase().trim();
    
    // Skip if name is too short or is a common word
    if (nameLower.length < 3 || commonWords.has(nameLower)) {
      continue;
    }
    
    // Match with word boundaries to avoid partial matches
    // e.g., "Apple" should match "Apple" but not "Pineapple"
    const nameRegex = new RegExp(`\\b${nameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    
    if (nameRegex.test(combinedText)) {
      // Additional validation: name should appear in a meaningful context
      // Check if it appears near startup-related keywords OR if name is substantial
      const contextKeywords = ['startup', 'company', 'raised', 'funding', 'investors', 'ceo', 'founder', 'series', 'venture', 'capital', 'round', 'million', 'billion', 'launched', 'acquired', 'partnership'];
      const nameIndex = combinedText.indexOf(nameLower);
      
      // For shorter names (3-5 chars), require context; for longer names (6+), allow without strict context
      if (nameLower.length >= 6) {
        return startup; // Substantial names are less likely to be false positives
      }
      
      // For shorter names, check context window
      const contextWindow = combinedText.substring(Math.max(0, nameIndex - 250), Math.min(combinedText.length, nameIndex + 250));
      const hasContext = contextKeywords.some(keyword => contextWindow.includes(keyword));
      
      if (hasContext) {
        return startup;
      }
    }
  }
  
  return null;
}

/**
 * Save snippet to database
 */
async function saveSnippet(snippetData) {
  const {
    entity_id,
    text,
    source_url,
    date_published,
    source_type = 'press_quote',
    context_label = 'press',
    tier = 3
  } = snippetData;
  
  if (!entity_id || !text || text.length < 50) return null;
  
  const textHash = hashText(text);
  
  // Check for duplicates
  const { data: existing } = await supabase
    .from('pythia_speech_snippets')
    .select('id')
    .eq('text_hash', textHash)
    .eq('entity_id', entity_id)
    .limit(1)
    .single();
  
  if (existing) return existing;
  
  // Insert snippet
  const { data, error } = await supabase
    .from('pythia_speech_snippets')
    .insert({
      entity_id,
      entity_type: 'startup',
      text: text.trim(),
      source_url,
      date_published: date_published || new Date().toISOString(),
      source_type,
      tier,
      context_label,
      text_hash: textHash
    })
    .select()
    .single();
  
  if (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
  
  return data;
}

/**
 * Collect snippets from RSS articles
 */
async function collectFromRSS(limit = 500) {
  console.log('\n📰 Collecting snippets from RSS articles...\n');
  
  // Get recent RSS articles (include companies_mentioned if available)
  const { data: articles, error } = await supabase
    .from('rss_articles')
    .select('id, title, content, url, published_at, companies_mentioned')
    .not('content', 'is', null)
    .order('published_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('❌ Error fetching RSS articles:', error.message);
    return;
  }
  
  if (!articles || articles.length === 0) {
    console.log('⚠️  No RSS articles found.');
    return;
  }
  
  console.log(`Found ${articles.length} RSS articles to process\n`);
  
  let saved = 0;
  let skipped = 0;
  let noMatch = 0;
  
  for (const article of articles) {
    // Extract quotes from article
    const quotes = extractQuotes(article.content, article.title);
    
    if (quotes.length === 0) {
      skipped++;
      continue;
    }
    
    // Try to match article to a startup
    const startup = await findMatchingStartup(article, article.content, article.title);
    
    if (!startup) {
      noMatch++;
      continue;
    }
    
    // Save each quote as a snippet
    for (const quote of quotes) {
      const result = await saveSnippet({
        entity_id: startup.id,
        text: quote.text,
        source_url: article.url,
        date_published: article.published_at,
        source_type: 'press_quote',
        context_label: quote.context,
        tier: 3
      });
      
      if (result) {
        saved++;
        console.log(`   ✅ Saved quote from "${startup.name}" (${quote.text.substring(0, 50)}...)`);
      } else {
        skipped++;
      }
    }
    
    // Small delay
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`\n✅ Done: ${saved} snippets saved, ${skipped} skipped, ${noMatch} articles with no startup match\n`);
}

// CLI
const limit = process.argv[2] ? parseInt(process.argv[2]) : 500;

collectFromRSS(limit).catch(console.error);
