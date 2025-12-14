#!/usr/bin/env node
/**
 * Direct PostgreSQL Enrichment - Bypasses PostgREST cache issue
 * Uses service role key to update directly
 */

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai').default;
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function enrichInvestor(investor) {
  console.log(`\n🔍 Enriching: ${investor.name}`);
  
  const prompt = `Provide detailed information about this VC firm/investor:

Name: ${investor.name}
${investor.firm ? `Firm: ${investor.firm}` : ''}
${investor.bio ? `Bio: ${investor.bio}` : ''}

Return ONLY valid JSON (no markdown):
{
  "notable_investments": ["Company1", "Company2", "Company3"],
  "sector_focus": ["AI/ML", "SaaS"],
  "portfolio_size": 150
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a VC research expert. Return only valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const data = JSON.parse(completion.choices[0].message.content);
    
    // Update using service role (bypasses RLS and PostgREST cache)
    const { error } = await supabase
      .from('investors')
      .update({
        sector_focus: data.sector_focus || null,
        portfolio_size: data.portfolio_size || null,
        notable_investments: data.notable_investments || null
      })
      .eq('id', investor.id);

    if (error) {
      console.log(`   ❌ Error:`, error.message);
      return false;
    }

    console.log(`   ✅ Updated: ${data.notable_investments?.length || 0} investments, ${data.sector_focus?.length || 0} sectors`);
    return true;
  } catch (err) {
    console.log(`   ❌ Failed:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Direct PostgreSQL Enrichment (Bypassing PostgREST Cache)\n');
  console.log('═'.repeat(70));
  
  // Get investors with missing data
  const { data: investors, error } = await supabase
    .from('investors')
    .select('id, name, firm, bio, sector_focus, portfolio_size')
    .or('sector_focus.is.null,portfolio_size.is.null')
    .limit(25);

  if (error || !investors) {
    console.error('❌ Error fetching investors:', error);
    return;
  }

  console.log(`\n📊 Found ${investors.length} investors to enrich\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < investors.length; i++) {
    console.log(`[${i + 1}/${investors.length}]`);
    const result = await enrichInvestor(investors[i]);
    if (result) success++;
    else failed++;
    
    // Rate limiting - wait 1 second between API calls
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '═'.repeat(70));
  console.log(`\n✅ Success: ${success}/${investors.length}`);
  console.log(`❌ Failed: ${failed}/${investors.length}`);
  console.log(`📈 Success rate: ${Math.round(success/investors.length*100)}%\n`);
}

main().catch(console.error);
