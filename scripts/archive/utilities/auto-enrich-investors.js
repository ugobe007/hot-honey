#!/usr/bin/env node

/**
 * Automated Investor Enrichment Service
 * Runs continuously to enrich investors with missing data
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://igjvqhvepxdqhctfvbpo.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnanZxaHZlcHhkcWhjdGZ2YnBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2ODAzMjIsImV4cCI6MjA1MTI1NjMyMn0.QZA-TXvx8tZUh5yFnxKgPP0DNJZ8K9czv7kW25OIBx4'
);

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
});

const BATCH_SIZE = 5; // Process 5 investors at a time
const DELAY_BETWEEN_BATCHES = 5000; // 5 seconds between batches
const CHECK_INTERVAL = 60000; // Check for new investors every 60 seconds

async function enrichInvestor(investor) {
  console.log(`\n🔍 Enriching: ${investor.name}`);
  
  try {
    const prompt = `Research ${investor.name} venture capital firm and provide:
1. Key partners/team members (3-5 names)
2. Notable investments (3-5 portfolio companies)
3. Fund size or AUM
4. Number of exits
5. Number of unicorn investments
6. Primary investment thesis (1-2 sentences)

Format as JSON:
{
  "partners": ["Name1", "Name2"],
  "notable_investments": ["Company1", "Company2"],
  "fund_size": "$XXM" or "$XXB",
  "aum": "$XXM" or "$XXB",
  "exits": number,
  "unicorns": number,
  "investment_thesis": "text"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.log('  ⚠️  No JSON found in response');
      return false;
    }

    const data = JSON.parse(jsonMatch[0]);
    
    // Update investor in database
    const { error } = await supabase
      .from('investors')
      .update({
        partners: data.partners || null,
        notable_investments: data.notable_investments || null,
        fund_size: data.fund_size || null,
        aum: data.aum || null,
        exits: data.exits || null,
        unicorns: data.unicorns || null,
        investment_thesis: data.investment_thesis || null,
        last_enrichment_date: new Date().toISOString(),
      })
      .eq('id', investor.id);

    if (error) {
      console.log('  ❌ Update failed:', error.message);
      return false;
    }

    console.log(`  ✅ Enriched successfully`);
    console.log(`     Partners: ${data.partners?.length || 0}`);
    console.log(`     Investments: ${data.notable_investments?.length || 0}`);
    console.log(`     Fund: ${data.fund_size || 'N/A'}`);
    
    return true;
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function getUnenrichedInvestors(limit = BATCH_SIZE) {
  const { data, error } = await supabase
    .from('investors')
    .select('id, name')
    .is('last_enrichment_date', null)
    .limit(limit);

  if (error) {
    console.error('❌ Error fetching investors:', error);
    return [];
  }

  return data || [];
}

async function processBatch() {
  const investors = await getUnenrichedInvestors(BATCH_SIZE);
  
  if (investors.length === 0) {
    console.log('✨ All investors are enriched!');
    return false;
  }

  console.log(`\n📦 Processing batch of ${investors.length} investors...`);
  
  let successCount = 0;
  for (const investor of investors) {
    const success = await enrichInvestor(investor);
    if (success) successCount++;
    
    // Small delay between individual enrichments
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n✅ Batch complete: ${successCount}/${investors.length} successful`);
  return true; // More investors remain
}

async function runContinuously() {
  console.log('🚀 Automated Investor Enrichment Service Started');
  console.log(`⚙️  Batch size: ${BATCH_SIZE} investors`);
  console.log(`⏱️  Check interval: ${CHECK_INTERVAL / 1000}s\n`);

  while (true) {
    try {
      // Check total stats
      const { data: stats } = await supabase
        .from('investors')
        .select('id, last_enrichment_date');

      const total = stats?.length || 0;
      const enriched = stats?.filter(i => i.last_enrichment_date).length || 0;
      const remaining = total - enriched;

      console.log(`\n📊 Status: ${enriched}/${total} enriched (${remaining} remaining)`);

      if (remaining > 0) {
        // Process one batch
        await processBatch();
        
        // Wait before next batch
        console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      } else {
        // All done, wait longer before checking again
        console.log(`✨ All enriched! Checking for new investors in ${CHECK_INTERVAL / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
      }
    } catch (error) {
      console.error('❌ Error in main loop:', error);
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s on error
    }
  }
}

// Start the service
runContinuously().catch(console.error);
