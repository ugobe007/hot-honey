#!/usr/bin/env node
/**
 * Raw SQL Enrichment - Direct PostgreSQL connection
 * Completely bypasses PostgREST and schema cache
 */

const { Client } = require('pg');
const OpenAI = require('openai').default;
require('dotenv').config();

const POSTGRES_URL = process.env.POSTGRES_URL || 'postgresql://postgres.unkpogyhhjbvxxjvmxlt:IamN0tAr0b0t!@db.unkpogyhhjbvxxjvmxlt.supabase.co:5432/postgres';
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function enrichInvestor(client, investor) {
  console.log(`\n🔍 [${investor.name}]`);
  
  const prompt = `Provide detailed information about this VC firm/investor:

Name: ${investor.name}
${investor.firm ? `Firm: ${investor.firm}` : ''}
${investor.bio ? `Bio: ${investor.bio}` : ''}

Return ONLY valid JSON (no markdown):
{
  "notable_investments": ["Company1", "Company2", "Company3"],
  "sector_focus": ["AI/ML", "SaaS", "Fintech"],
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
    
    // Direct PostgreSQL UPDATE - bypasses PostgREST completely
    await client.query(
      `UPDATE investors 
       SET sectors = $1, 
           total_investments = $2, 
           notable_investments = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [
        data.sector_focus || null,
        data.portfolio_size || null,
        JSON.stringify(data.notable_investments || []),
        investor.id
      ]
    );

    console.log(`   ✅ ${data.notable_investments?.length || 0} investments, ${data.sector_focus?.length || 0} sectors, portfolio: ${data.portfolio_size || 0}`);
    return true;
  } catch (err) {
    console.log(`   ❌ ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Raw SQL Enrichment (Direct PostgreSQL)\n');
  console.log('═'.repeat(70));
  
  const client = new Client({ connectionString: POSTGRES_URL });
  
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL directly\n');
    
    // Get investors with missing data
    const result = await client.query(`
      SELECT id, name, firm, bio
      FROM investors
      WHERE sectors IS NULL OR total_investments IS NULL
      LIMIT 50
    `);

    const investors = result.rows;
    console.log(`📊 Found ${investors.length} investors to enrich\n`);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < investors.length; i++) {
      console.log(`[${i + 1}/${investors.length}]`);
      const result = await enrichInvestor(client, investors[i]);
      if (result) success++;
      else failed++;
      
      // Rate limiting - wait 1 second between API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n' + '═'.repeat(70));
    console.log(`\n✅ Success: ${success}/${investors.length}`);
    console.log(`❌ Failed: ${failed}/${investors.length}`);
    console.log(`📈 Success rate: ${Math.round(success/investors.length*100)}%\n`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
