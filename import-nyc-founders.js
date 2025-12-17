#!/usr/bin/env node
/**
 * Import NYC Founder Guide Investors
 * Source: https://www.nycfounderguide.com/investors
 * ~90 NYC-based investors
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY });

// Parse stage strings into arrays
function parseStages(stageStr) {
  if (!stageStr) return [];
  return stageStr.split(',').map(s => s.trim()).filter(Boolean);
}

// Parse sectors string into arrays
function parseSectors(sectorStr) {
  if (!sectorStr) return [];
  return sectorStr.split(',').map(s => s.trim()).filter(Boolean);
}

// NYC Founder Guide investor data
const nycInvestors = [
  { firm: "25madison", stages: "Pre-seed, Seed", location: "New York, NY", sectors: "Consumer, FinTech, SaaS, Food Tech, Real Estate, Marketplaces, Generalist, Construction, PropTech" },
  { firm: "645 Ventures", stages: "Seed, Seed+, Late Seed", location: "New York, NY", sectors: "SaaS, Enterprise, B2B Tech, Internet Tech" },
  { firm: "Acronym Venture Capital", stages: "Late Seed", location: "New York, NY", sectors: "Enterprise, PropTech, Hospitality Tech, FinTech, Workflow, E-commerce, DTC" },
  { firm: "Advancit Capital", stages: "Seed, Seed+, Late Seed", location: "New York, NY", sectors: "Consumer, Media Tech" },
  { firm: "AlphaPrime Ventures", stages: "Seed, Seed+", location: "New York, NY", sectors: "Enterprise, General Tech, Internet Tech" },
  { firm: "Alpine Meridian Ventures", stages: "Seed", location: "New York, NY", sectors: "SaaS, Internet Tech" },
  { firm: "Amplifyher Ventures", stages: "Seed, Seed+, Late Seed, Pre-seed", location: "New York, NY", sectors: "Consumer, Healthcare, Media Tech, E-commerce" },
  { firm: "ANIMO Ventures", stages: "Pre-seed, Seed, Late Seed, Seed+", location: "New York, NY", sectors: "Generalist" },
  { firm: "APA Venture Partners", stages: "Pre-seed, Seed+", location: "New York, NY", sectors: "Consumer, Healthcare, SaaS, Enterprise, E-commerce, Marketplaces, B2B Tech, General Tech" },
  { firm: "Armory Square Ventures", stages: "Seed, Seed+, Late Seed", location: "New York, NY", sectors: "Generalist, B2B Tech, SaaS, Enterprise, Marketplaces" },
  { firm: "Bayes Ventures", stages: "Pre-seed, Seed, Angel", location: "New York, NY", sectors: "Healthcare, Generalist, FinTech, SaaS, Enterprise" },
  { firm: "BBG Ventures", stages: "Seed, Pre-seed", location: "New York, NY", sectors: "Consumer" },
  { firm: "Betaworks", stages: "Seed, Pre-seed", location: "New York, NY", sectors: "Media Tech" },
  { firm: "Black Jays Investments", stages: "Seed", location: "New York, NY", sectors: "Consumer, E-commerce, Media Tech" },
  { firm: "Blue 9 Capital", stages: "Seed, Seed+, Late Seed", location: "New York, NY", sectors: "FinTech, Consumer, Healthcare, General Tech, E-commerce, CommerceTech" },
  { firm: "BOLDstart Ventures", stages: "Pre-seed, Seed", location: "New York, NY", sectors: "Enterprise" },
  { firm: "Bowery Capital", stages: "Pre-seed, Seed", location: "New York, NY", sectors: "SaaS, Enterprise, B2B Tech, IT, Energy, Healthcare, Construction, Agriculture, Workflow, Applied AI" },
  { firm: "BoxGroup", stages: "Pre-seed, Seed", location: "New York, NY", sectors: "Generalist, FinTech, Consumer, Healthcare, SaaS, Enterprise, B2B Tech, Energy, Marketplaces, Synthetic Biology, Climate Change" },
  { firm: "Brooklyn Bridge Ventures", stages: "Pre-seed, Seed", location: "Brooklyn, NY", sectors: "Generalist" },
  { firm: "Bullish Brand Fund", stages: "Pre-seed, Seed+, Late Seed", location: "New York, NY", sectors: "Consumer, E-commerce, DTC" },
  { firm: "Cloquet Capital Partners", stages: "Pre-seed, Seed, Seed+", location: "New York, NY", sectors: "General Tech" },
  { firm: "Collaborative Fund", stages: "Seed", location: "New York, NY", sectors: "FinTech" },
  { firm: "Comcast Ventures", stages: "Seed", location: "New York, NY", sectors: "Generalist" },
  { firm: "Communitas Capital", stages: "Seed+, Late Seed", location: "New York, NY", sectors: "FinTech, SaaS, Enterprise, B2B Tech, Internet Tech, Marketplaces" },
  { firm: "Company Ventures", stages: "Pre-seed, Seed, Seed+, Late Seed", location: "New York, NY", sectors: "Generalist" },
  { firm: "Compound", stages: "Seed", location: "New York, NY", sectors: "Generalist" },
  { firm: "Corigin Ventures", stages: "Pre-seed, Seed", location: "New York, NY", sectors: "Consumer, E-commerce, FinTech, Real Estate" },
  { firm: "Corner Table", stages: "Pre-seed", location: "Other", sectors: "Food Tech" },
  { firm: "Counterview Capital", stages: "Pre-seed, Seed, Seed+, Late Seed", location: "New York, NY", sectors: "Generalist" },
  { firm: "Differential Ventures", stages: "Pre-seed, Seed, Seed+, Late Seed", location: "New York, NY", sectors: "FinTech, SaaS, Enterprise, B2B Tech, Applied AI" },
  { firm: "Eniac Ventures", stages: "Seed", location: "New York, NY", sectors: "Generalist" },
  { firm: "Expansion VC", stages: "Seed, Late Seed", location: "New York, NY", sectors: "FinTech, PropTech, Marketplaces, Consumer" },
  { firm: "Exponential", stages: "Seed, Seed+, Late Seed", location: "New York, NY", sectors: "Generalist" },
  { firm: "ff Venture Capital", stages: "Seed", location: "New York, NY", sectors: "Generalist, FinTech, Drones/Robotics, Applied AI" },
  { firm: "FinTech Collective", stages: "Pre-seed, Seed, Seed+, Late Seed", location: "New York, NY", sectors: "FinTech" },
  { firm: "Fintech Ventures Fund", stages: "Pre-seed, Seed+, Late Seed", location: "New York, NY", sectors: "FinTech" },
  { firm: "First Round Capital", stages: "Seed", location: "New York, NY", sectors: "Generalist" },
  { firm: "FirstMark Capital", stages: "Seed, Seed+, Pre-seed", location: "New York, NY", sectors: "Generalist" },
  { firm: "FMW Media", stages: "Pre-seed, Seed, Late Seed, Seed+", location: "New York, NY", sectors: "FinTech, EdTech, Consumer, Enterprise, B2B Tech, E-commerce, Energy, Applied AI" },
  { firm: "Founder Collective", stages: "Pre-seed, Seed+, Seed", location: "New York, NY", sectors: "Generalist" },
  { firm: "Founders Factory NY", stages: "Pre-seed, Seed", location: "New York, NY", sectors: "Healthcare" },
  { firm: "Genacast Ventures", stages: "Seed", location: "New York, NY", sectors: "Generalist" },
  { firm: "Human Ventures", stages: "Pre-seed, Seed+", location: "New York, NY", sectors: "Consumer, Healthcare, General Tech, Food Tech, DTC" },
  { firm: "Hypothesis", stages: "Pre-seed", location: "New York, NY", sectors: "Generalist" },
  { firm: "IA Ventures", stages: "Seed", location: "New York, NY", sectors: "Generalist, FinTech, Healthcare, Internet Tech" },
  { firm: "Indicator Ventures", stages: "Pre-seed, Seed", location: "New York, NY", sectors: "Healthcare, SaaS, Marketplaces, Enterprise" },
  { firm: "Interlace Ventures", stages: "Pre-seed, Seed", location: "New York, NY", sectors: "CommerceTech, E-commerce, RetailTech, Consumer" },
  { firm: "Joyance Partners", stages: "Pre-seed, Seed+, Late Seed", location: "New York, NY", sectors: "Consumer, Healthcare, EdTech, SaaS, Food Tech, Mobile Tech, VR, Drones/Robotics, Energy, Construction, Applied AI, Synthetic Biology" },
  { firm: "K50 Ventures", stages: "Pre-seed, Seed", location: "New York, NY", sectors: "FinTech, Consumer, Healthcare, EdTech, SaaS, Enterprise, Food Tech, B2B Tech, Real Estate, Mobile Tech, Internet Tech, Agriculture, PropTech, Workflow, Marketplaces, Applied AI, DTC, Climate Change" },
  { firm: "Laconia", stages: "Seed, Seed+", location: "New York, NY", sectors: "B2B Tech, FinTech, Healthcare, SaaS, Enterprise, RetailTech, Food Tech, Real Estate, CommerceTech" },
  { firm: "Lakehouse Ventures", stages: "Pre-seed, Seed", location: "New York, NY", sectors: "Consumer, E-commerce, FinTech, Food Tech, PropTech" },
  { firm: "Lerer Hippeau Ventures", stages: "Seed", location: "New York, NY", sectors: "Generalist" },
  { firm: "Looking Glass Capital", stages: "Pre-seed, Seed, Seed+, Late Seed", location: "New York, NY", sectors: "Consumer, Healthcare, SaaS, Internet Tech, Energy, Climate Change, Marketplaces, Workflow" },
  { firm: "Maccabee Ventures", stages: "Pre-seed, Seed", location: "New York, NY", sectors: "FinTech, Healthcare, SaaS, Enterprise, B2B Tech, Real Estate, PropTech, EdTech" },
  { firm: "Max Ventures", stages: "Pre-seed, Seed", location: "New York, NY", sectors: "Healthcare, Consumer, E-commerce, Marketplaces, Generalist" },
  { firm: "Melitas Ventures", stages: "Seed, Seed+", location: "New York, NY", sectors: "Consumer, Food Tech, DTC" },
  { firm: "New York Venture Partners", stages: "Pre-seed, Seed, Angel", location: "New York, NY", sectors: "Generalist, Consumer, SaaS, Enterprise, General Tech, E-commerce, B2B Tech, Mobile Tech" },
  { firm: "Newark Venture Partners", stages: "Pre-seed, Seed", location: "Newark, NJ", sectors: "Generalist" },
  { firm: "NextView Ventures", stages: "Seed, Pre-seed, Late Seed", location: "New York, NY", sectors: "Generalist" },
  { firm: "NOEMIS Ventures", stages: "Pre-seed, Seed+", location: "New York, NY", sectors: "FinTech, Marketplaces, Applied AI" },
  { firm: "Notation", stages: "Pre-seed, Seed", location: "Brooklyn, NY", sectors: "Generalist" },
  { firm: "NY Technology Capital Partners", stages: "Pre-seed, Seed, Late Seed", location: "New York, NY", sectors: "SaaS, Enterprise, B2B Tech" },
  { firm: "Primary Venture Partners", stages: "Seed", location: "New York, NY", sectors: "Generalist" },
  { firm: "Red Sea Ventures", stages: "Seed, Pre-seed, Seed+, Late Seed", location: "New York, NY", sectors: "Consumer, Healthcare, SaaS, Food Tech, E-commerce, Generalist, Marketplaces" },
  { firm: "RiverPark Ventures", stages: "Seed, Seed+, Late Seed", location: "New York, NY", sectors: "Generalist, Consumer, SaaS, Food Tech, Real Estate, Marketplaces" },
  { firm: "RTP Seed", stages: "Seed, Pre-seed", location: "New York, NY", sectors: "Generalist, Healthcare, FinTech, Enterprise, SaaS, Workflow, Applied AI, B2B Tech, Mobile Tech" },
  { firm: "Runway Venture Partners", stages: "Seed+, Late Seed", location: "New York, NY", sectors: "SaaS, Enterprise, B2B Tech" },
  { firm: "Saola Ventures", stages: "Seed+", location: "New York, NY", sectors: "Generalist" },
  { firm: "Social Starts", stages: "Pre-seed, Seed, Seed+, Late Seed", location: "New York, NY", sectors: "Synthetic Biology, Applied AI, DTC, Drones/Robotics, VR, Energy, Media Tech, Mobile Tech, Construction, Food Tech, B2B Tech, SaaS, EdTech, Healthcare, Consumer" },
  { firm: "Story Ventures", stages: "Pre-seed, Seed", location: "New York, NY", sectors: "FinTech, Healthcare, SaaS, B2B Tech, General Tech, Mobile Tech, Drones/Robotics" },
  { firm: "TACK Ventures", stages: "Seed, Seed+, Late Seed", location: "Brooklyn, NY", sectors: "Generalist, DTC, Consumer, Media Tech" },
  { firm: "Tectonic Ventures", stages: "Pre-seed, Seed", location: "Other", sectors: "FinTech, SaaS, Enterprise, B2B Tech, Marketplaces" },
  { firm: "The Fund", stages: "Pre-seed, Seed", location: "New York, NY", sectors: "Generalist" },
  { firm: "The Helm", stages: "Pre-seed, Seed, Seed+, Late Seed", location: "Brooklyn, NY", sectors: "Healthcare, Climate Change, Agriculture, Energy, General Tech, FinTech, SaaS, Generalist" },
  { firm: "The Venture Collective", stages: "Pre-seed, Seed+, Seed, Late Seed, Angel", location: "New York, NY", sectors: "Generalist" },
  { firm: "Third Kind Venture Capital", stages: "Pre-seed", location: "New York, NY", sectors: "Generalist" },
  { firm: "TIA Ventures", stages: "Seed+, Seed", location: "New York, NY", sectors: "B2B Tech, SaaS, Marketplaces, Generalist" },
  { firm: "Tournon Ventures", stages: "Seed, Pre-seed, Angel", location: "New York, NY", sectors: "Healthcare, Enterprise, Energy, Real Estate, Climate Change" },
  { firm: "Trail Mix Ventures", stages: "Seed", location: "New York, NY", sectors: "Healthcare, SaaS, Consumer, Enterprise, Mobile Tech, B2B Tech, Workflow, CommerceTech" },
  { firm: "Uncommon Denominator", stages: "Pre-seed, Seed, Seed+", location: "New York, NY", sectors: "Consumer, SaaS, Synthetic Biology" },
  { firm: "Upstage Ventures", stages: "Pre-seed, Seed", location: "New York, NY", sectors: "Consumer, SaaS, E-commerce, VR, DTC, Media Tech, RetailTech" },
  { firm: "Work-Bench", stages: "Seed+", location: "New York, NY", sectors: "Enterprise, SaaS" },
  { firm: "Zigg Capital", stages: "Pre-seed, Seed+, Late Seed, Seed", location: "New York, NY", sectors: "RetailTech, Real Estate, E-commerce, Construction, Agriculture, Drones/Robotics, PropTech, Hospitality Tech, Marketplaces" }
];

async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000)
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding error:', error.message);
    return null;
  }
}

async function importInvestors() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║           🗽 NYC FOUNDER GUIDE INVESTOR IMPORT                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');
  console.log(`📊 Total investors to process: ${nycInvestors.length}\n`);

  let inserted = 0, updated = 0, errors = 0;

  for (let i = 0; i < nycInvestors.length; i++) {
    const inv = nycInvestors[i];
    const stages = parseStages(inv.stages);
    const sectors = parseSectors(inv.sectors);
    
    // Build embedding text
    const embeddingText = `${inv.firm} is a venture capital firm based in ${inv.location}. ` +
      `They invest in ${stages.join(', ')} stage companies. ` +
      `Focus areas: ${sectors.join(', ')}.`;
    
    const embedding = await generateEmbedding(embeddingText);
    
    if (!embedding) {
      console.log(`❌ [${i+1}] ${inv.firm} - embedding failed`);
      errors++;
      continue;
    }

    // Check if exists
    const { data: existing } = await supabase.rpc('exec_sql_rows', {
      sql_query: `SELECT id FROM investors WHERE firm = '${inv.firm.replace(/'/g, "''")}'`
    });

    if (existing && existing.length > 0) {
      // Update existing - use correct column names: stage_focus, sector_focus
      const updateQuery = `
        UPDATE investors SET
          stage_focus = ARRAY[${stages.map(s => `'${s}'`).join(',')}]::text[],
          sector_focus = ARRAY[${sectors.map(s => `'${s.replace(/'/g, "''")}'`).join(',')}]::text[],
          geography = '${inv.location}',
          embedding = '[${embedding.join(',')}]'::vector,
          updated_at = NOW()
        WHERE firm = '${inv.firm.replace(/'/g, "''")}'
      `;
      
      const { data: result } = await supabase.rpc('exec_sql_modify', { sql_query: updateQuery });
      if (result?.success) {
        console.log(`🔄 [${i+1}] ${inv.firm} - updated`);
        updated++;
      } else {
        console.log(`❌ [${i+1}] ${inv.firm} - update failed: ${result?.error}`);
        errors++;
      }
    } else {
      // Insert new - use correct column names: stage_focus, sector_focus, geography
      const insertQuery = `
        INSERT INTO investors (firm, name, stage_focus, sector_focus, geography, embedding)
        VALUES (
          '${inv.firm.replace(/'/g, "''")}',
          '${inv.firm.replace(/'/g, "''")}',
          ARRAY[${stages.map(s => `'${s}'`).join(',')}]::text[],
          ARRAY[${sectors.map(s => `'${s.replace(/'/g, "''")}'`).join(',')}]::text[],
          '${inv.location}',
          '[${embedding.join(',')}]'::vector
        )
      `;
      
      const { data: result } = await supabase.rpc('exec_sql_modify', { sql_query: insertQuery });
      if (result?.success) {
        console.log(`✅ [${i+1}] ${inv.firm} - inserted`);
        inserted++;
      } else {
        console.log(`❌ [${i+1}] ${inv.firm} - insert failed: ${result?.error}`);
        errors++;
      }
    }

    // Rate limit
    if (i > 0 && i % 20 === 0) {
      console.log(`\n   ⏳ Processed ${i}/${nycInvestors.length}...\n`);
    }
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                           📊 IMPORT RESULTS                               ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝');
  console.log(`   ✅ New investors:     ${inserted}`);
  console.log(`   🔄 Updated investors: ${updated}`);
  console.log(`   ❌ Errors:            ${errors}`);
  console.log(`   📊 Total processed:   ${inserted + updated + errors}\n`);

  // Get final count
  const { data: count } = await supabase.rpc('exec_sql_rows', {
    sql_query: `SELECT COUNT(*) as total FROM investors`
  });
  console.log(`   🏢 Total investors in DB: ${count?.[0]?.total}\n`);
}

importInvestors().catch(console.error);
