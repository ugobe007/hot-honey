#!/usr/bin/env node
/**
 * Test Investor Enrichment - Quick check
 */

require('dotenv').config();
const { Pool } = require('pg');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY });
const pool = new Pool({ connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:Q9PM1qv1xwf0jFf@db.unkpogyhhjbvxxjvmxlt.supabase.co:5432/postgres' });

async function enrichInvestor(investorName) {
  console.log(`\n🔍 Enriching: ${investorName}\n`);
  
  const prompt = `Research ${investorName} VC firm. Return JSON with:
{
  "partners": [{"name": "Name", "title": "Title"}],  // Max 5 key partners
  "investment_thesis": "Brief 1-2 sentence focus",
  "notable_investments": [{"company": "Name", "stage": "Seed/A/B"}],  // Max 5
  "sectors": ["AI", "SaaS"],  // Max 3 sectors
  "stages": ["Seed", "Series A"],
  "check_size_min": 1000000,
  "check_size_max": 10000000,
  "portfolio_count": 50
}
Be concise. Real data only.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a venture capital research expert. Provide accurate, well-researched data about VCs and investors. Always return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    const data = JSON.parse(response.choices[0].message.content);
    
    console.log('\n📊 Enrichment Results:\n');
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function main() {
  // Test with one investor
  const { rows } = await pool.query(`
    SELECT id, name, firm 
    FROM investors 
    WHERE last_enrichment_date IS NULL 
    ORDER BY created_at DESC 
    LIMIT 1
  `);
  
  if (rows.length === 0) {
    console.log('No investors found to enrich');
    await pool.end();
    return;
  }
  
  const investor = rows[0];
  console.log(`\n🎯 Testing enrichment for: ${investor.name}\n`);
  
  const enrichment = await enrichInvestor(investor.name);
  
  if (enrichment) {
    console.log('\n✅ Enrichment successful!');
    console.log('\n💾 Would update database with this data...');
  }
  
  await pool.end();
}

main();
