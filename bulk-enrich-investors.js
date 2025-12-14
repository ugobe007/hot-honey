#!/usr/bin/env node
/**
 * Bulk Investor Enrichment
 * Enriches all investors with partners, thesis, investments, etc.
 */

require('dotenv').config();
const { Pool } = require('pg');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY });
const pool = new Pool({ 
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:Q9PM1qv1xwf0jFf@db.unkpogyhhjbvxxjvmxlt.supabase.co:5432/postgres' 
});

async function enrichInvestor(investorName) {
  const prompt = `Research ${investorName} VC firm. Return JSON with:
{
  "partners": [{"name": "Name", "title": "Title"}],  // Max 5 key partners
  "investment_thesis": "Brief 1-2 sentence focus",
  "notable_investments": [{"company": "Name", "stage": "Seed/A/B", "year": 2023}],  // Max 5 recent
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
          content: 'You are a VC research expert. Provide accurate, concise data. Always return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error(`   ❌ Error enriching ${investorName}:`, error.message);
    return null;
  }
}

async function updateInvestor(investorId, enrichment) {
  try {
    await pool.query(`
      UPDATE investors 
      SET 
        partners = $1,
        investment_thesis = $2,
        notable_investments = $3,
        sectors = $4,
        stage = $5,
        check_size_min = $6,
        check_size_max = $7,
        total_investments = $8,
        last_enrichment_date = NOW()
      WHERE id = $9
    `, [
      JSON.stringify(enrichment.partners),
      enrichment.investment_thesis,
      JSON.stringify(enrichment.notable_investments),
      enrichment.sectors,
      enrichment.stages,
      enrichment.check_size_min,
      enrichment.check_size_max,
      enrichment.portfolio_count,
      investorId
    ]);
    return true;
  } catch (error) {
    console.error('   ❌ Database update error:', error.message);
    return false;
  }
}

async function main() {
  console.log('\n🔥 Starting Bulk Investor Enrichment\n');
  console.log('═'.repeat(70));
  
  // Get investors that need enrichment
  const { rows: investors } = await pool.query(`
    SELECT id, name, firm 
    FROM investors 
    WHERE last_enrichment_date IS NULL 
    ORDER BY created_at DESC 
    LIMIT 30
  `);
  
  if (investors.length === 0) {
    console.log('\n✅ All investors are already enriched!');
    await pool.end();
    return;
  }
  
  console.log(`\n📊 Found ${investors.length} investors to enrich\n`);
  
  let success = 0;
  let errors = 0;
  
  for (let i = 0; i < investors.length; i++) {
    const investor = investors[i];
    
    console.log(`\n[${i + 1}/${investors.length}] 🔍 ${investor.name}`);
    
    // Rate limiting
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const enrichment = await enrichInvestor(investor.name);
    
    if (enrichment) {
      const updated = await updateInvestor(investor.id, enrichment);
      if (updated) {
        console.log(`   ✅ Enriched successfully`);
        console.log(`   👥 ${enrichment.partners?.length || 0} partners`);
        console.log(`   💼 ${enrichment.notable_investments?.length || 0} investments`);
        console.log(`   🎯 ${enrichment.sectors?.join(', ')}`);
        success++;
      } else {
        errors++;
      }
    } else {
      errors++;
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('📈 ENRICHMENT SUMMARY');
  console.log('═'.repeat(70));
  console.log(`✅ Successfully enriched: ${success}/${investors.length}`);
  console.log(`❌ Errors: ${errors}/${investors.length}`);
  console.log(`📊 Success rate: ${Math.round(success/investors.length*100)}%`);
  console.log('\n✨ Enrichment complete!\n');
  
  await pool.end();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
