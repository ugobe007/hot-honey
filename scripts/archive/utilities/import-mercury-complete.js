/**
 * MERCURY INVESTOR IMPORTER - SCHEMA-CORRECT VERSION
 * =====================================================
 * Correctly maps Mercury data to actual database schema:
 *   - name: person's name (e.g., "Bruno Werneck de Almeida")
 *   - firm: company name (e.g., "Plaid")
 *   - stage: text[] array (e.g., ["Pre-seed", "Seed"])
 *   - sectors: text[] array (e.g., ["Fintech", "Crypto"])
 *   - check_size_min/max: bigint
 *   - embedding: vector(1536)
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY });

// SQL helpers
async function execSqlRows(query) {
  const { data, error } = await supabase.rpc('exec_sql_rows', { sql_query: query });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

async function execSqlModify(query) {
  const { data, error } = await supabase.rpc('exec_sql_modify', { sql_query: query });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// Parse check size like "$500K-$1M" or "$50K" into min/max
function parseCheckSize(sizeStr) {
  if (!sizeStr) return { min: null, max: null };
  
  const match = sizeStr.match(/\$?([\d.]+)([KMB])?(?:\s*-\s*\$?([\d.]+)([KMB])?)?/i);
  if (!match) return { min: null, max: null };
  
  const parseNum = (num, unit) => {
    if (!num) return null;
    const n = parseFloat(num);
    const mult = { 'K': 1000, 'M': 1000000, 'B': 1000000000 }[unit?.toUpperCase()] || 1;
    return Math.round(n * mult);
  };
  
  const min = parseNum(match[1], match[2]);
  const max = match[3] ? parseNum(match[3], match[4]) : min;
  return { min, max };
}

// Parse stages like "Pre-seed, Seed, Series A" into array
function parseStages(stageStr) {
  if (!stageStr || stageStr === 'All stages') {
    return ['Pre-Seed', 'Seed', 'Series A', 'Series B'];
  }
  return stageStr.split(',').map(s => s.trim()).filter(Boolean);
}

// Parse sectors/industries
function parseSectors(sectorStr) {
  if (!sectorStr) return ['Technology'];
  // Handle "+N more" suffix
  const cleaned = sectorStr.replace(/\+\d+\s*more/gi, '').trim();
  return cleaned.split(',').map(s => s.trim()).filter(Boolean);
}

// Escape for SQL
const esc = (s) => s ? s.replace(/'/g, "''") : '';

// Generate embedding
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000),
      dimensions: 1536
    });
    return response.data[0]?.embedding;
  } catch (e) {
    console.error('Embedding error:', e.message);
    return null;
  }
}

// Import a single investor
async function importInvestor(investor) {
  const { name, firm, sectors, stages, checkSize } = investor;
  
  // Check if exists by firm name
  const existing = await execSqlRows(`SELECT id FROM investors WHERE LOWER(firm) = LOWER('${esc(firm)}')`);
  
  const stageArr = parseStages(stages);
  const sectorArr = parseSectors(sectors);
  const { min, max } = parseCheckSize(checkSize);
  
  // Build embedding text
  const embeddingText = [
    `Investor: ${name} at ${firm}`,
    `Investment stages: ${stageArr.join(', ')}`,
    `Sectors: ${sectorArr.join(', ')}`,
    min ? `Check size: $${min.toLocaleString()} - $${(max || min).toLocaleString()}` : ''
  ].filter(Boolean).join('. ');
  
  const embedding = await generateEmbedding(embeddingText);
  const embeddingStr = embedding ? `'[${embedding.join(',')}]'::vector(1536)` : 'NULL';
  
  if (existing && existing.length > 0) {
    // Update existing
    const result = await execSqlModify(`
      UPDATE investors SET
        name = '${esc(name)}',
        stage = ARRAY[${stageArr.map(s => `'${esc(s)}'`).join(',')}]::text[],
        sectors = ARRAY[${sectorArr.map(s => `'${esc(s)}'`).join(',')}]::text[],
        check_size_min = ${min || 'NULL'},
        check_size_max = ${max || 'NULL'},
        embedding = ${embeddingStr},
        updated_at = NOW()
      WHERE id = '${existing[0].id}'
    `);
    return { action: 'updated', success: result.success };
  } else {
    // Insert new
    const result = await execSqlModify(`
      INSERT INTO investors (name, firm, stage, sectors, check_size_min, check_size_max, embedding, status, created_at, updated_at)
      VALUES (
        '${esc(name)}',
        '${esc(firm)}',
        ARRAY[${stageArr.map(s => `'${esc(s)}'`).join(',')}]::text[],
        ARRAY[${sectorArr.map(s => `'${esc(s)}'`).join(',')}]::text[],
        ${min || 'NULL'},
        ${max || 'NULL'},
        ${embeddingStr},
        'active',
        NOW(),
        NOW()
      )
    `);
    return { action: 'added', success: result.success };
  }
}

// Main
async function main() {
  // Mercury investors pages 2-6 (all the data you shared)
  const investors = [
    // Page 2
    { name: "Bruno Werneck de Almeida", firm: "Plaid", sectors: "Crypto/Blockchain, Ecommerce, Fintech", stages: "Pre-seed, Seed", checkSize: "$5K-$50K" },
    { name: "Bucky Moore", firm: "Kleiner Perkins", sectors: "AI/ML", stages: "All stages", checkSize: "$500K-$50M" },
    { name: "Camila Saruhashi", firm: "QED Investors", sectors: "Crypto/Blockchain, Fintech, InsureTech, Proptech", stages: "Pre-seed, Seed, Series A", checkSize: "$500K-$1M" },
    { name: "Caroline Weintraub", firm: "True Beauty Ventures", sectors: "Consumer", stages: "Seed, Series A, Series B", checkSize: "$1M-$5M" },
    { name: "Cat Hernandez", firm: "The Venture Collective (TVC)", sectors: "Biotech, Climate, Consumer, Ecommerce, Education, Fintech, Healthcare, Marketplace, SaaS", stages: "Pre-seed, Seed", checkSize: "$500K-$1M" },
    { name: "Chad Byers", firm: "Susa Ventures", sectors: "Cloud, SaaS", stages: "Pre-seed, Seed, Series B", checkSize: "$1M-$5M" },
    { name: "Chang Xu", firm: "Basis Set", sectors: "AI/ML, API", stages: "Pre-seed, Seed", checkSize: "$1M-$5M" },
    { name: "Charles Hudson", firm: "Precursor Ventures", sectors: "AI/ML, API, Technology", stages: "Pre-seed, Seed", checkSize: "$100K-$500K" },
    { name: "Charlie Pinto", firm: "Bling Capital", sectors: "Consumer, Marketplace", stages: "Pre-seed, Seed, Series A", checkSize: "$1M" },
    { name: "Chris Harper", firm: "Torch Capital", sectors: "API, AR/VR, Technology", stages: "All stages", checkSize: "$1M-$5M" },
    { name: "Chris Howard", firm: "Fuel Capital", sectors: "AI/ML, API", stages: "Pre-seed, Seed", checkSize: "$500K-$1M" },
    { name: "Chris Wake", firm: "Atypical Ventures", sectors: "Climate, Fintech, Hardware, Healthcare, Industrial, Media", stages: "Pre-seed", checkSize: "$100K-$300K" },
    { name: "Chris Lyons", firm: "Andreessen Horowitz", sectors: "Consumer, Crypto, Fintech, Gaming, Marketplace, Media", stages: "All stages", checkSize: "$1M-$6M" },
    { name: "Chris Saum", firm: "Active Capital", sectors: "Enterprise, Future of Work, SaaS", stages: "Pre-seed, Seed", checkSize: "$750K" },
    { name: "Cindy Bi", firm: "CapitalX", sectors: "Enterprise, SaaS", stages: "Pre-seed, Seed", checkSize: "$100K-$250K" },
    { name: "Clara Brenner", firm: "Urban Innovation Fund", sectors: "AI/ML, API, PropTech", stages: "Pre-seed, Seed", checkSize: "$500K-$1M" },
    { name: "Courtney Chow", firm: "Battery Ventures", sectors: "AI/ML, API, SaaS", stages: "Seed, Series A, Series B", checkSize: "$1M-$5M" },
    { name: "Dan Bragiel", firm: "Bragiel Brothers", sectors: "AR/VR, Climate, Ecommerce, Fintech, Gaming, Healthcare, PropTech, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$100K-$500K" },
    { name: "Dan Kimerling", firm: "Deciens Capital", sectors: "Fintech", stages: "Pre-seed, Seed", checkSize: "$500K-$3M" },
    { name: "Dan Moskowitz", firm: "Third Point Ventures", sectors: "AI/ML, API, Enterprise", stages: "Series A, Series B", checkSize: "$15M-$25M" },
    { name: "Dan Westgarth", firm: "Expansion Capital", sectors: "Consumer, Crypto, Fintech, Future of Work", stages: "Pre-seed, Seed, Series A", checkSize: "$50K-$100K" },
    { name: "Daniel Gross", firm: "Pioneer.app", sectors: "Deep Tech, Enterprise", stages: "All stages", checkSize: "$1M" },
    { name: "Daniel Gulati", firm: "Treble Capital", sectors: "AI/ML, Climate, Consumer, Fintech, Gaming, Health, Marketplace", stages: "Pre-seed, Seed", checkSize: "$500K-$1M" },
    { name: "Danny Brown", firm: "MaC Venture", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed", checkSize: "$500K-$2M" },
    { name: "Darian Shirazi", firm: "Gradient Ventures", sectors: "AI/ML, API", stages: "Pre-seed, Seed, Series A", checkSize: "$1M-$5M" },
    { name: "Dave Eisenberg", firm: "Zigg Capital", sectors: "AI/ML, API, SaaS", stages: "All stages", checkSize: "$1M-$5M" },
    { name: "David Breger", firm: "Google Ventures", sectors: "AI/ML, API, Technology", stages: "All stages", checkSize: "$10K" },
    { name: "David Cheng", firm: "DCM", sectors: "Climate, Consumer, Ecommerce, Fintech, Gaming, Health", stages: "Pre-seed, Seed, Series A", checkSize: "$1M-$5M" },
    { name: "David Evans", firm: "Sentiero Ventures", sectors: "AI/ML, SaaS", stages: "Pre-seed, Seed", checkSize: "$100K-$500K" },
    { name: "David Greenbaum", firm: "Quiet Capital", sectors: "Deep Tech, Fintech, Food, Healthcare, Industrial, PropTech, SaaS", stages: "All stages", checkSize: "$1M-$25M" },
    { name: "David Mort", firm: "Propel Venture Partners", sectors: "Crypto, Fintech, InsurTech", stages: "Pre-seed, Seed, Series A", checkSize: "$250K-$5M" },
    { name: "Davis Treybig", firm: "Innovation Endeavors", sectors: "Analytics", stages: "Pre-seed, Seed, Series A", checkSize: "$1M-$10M" },
    { name: "Deborah Chu", firm: "NextGen Venture Partners", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed", checkSize: "$1M-$5M" },
    { name: "Deena Shakir", firm: "Lux Capital", sectors: "AI/ML, API, Healthcare, DeepTech", stages: "All stages", checkSize: "$1M-$5M" },
    { name: "Dilek Dayinlarli", firm: "ScaleX Ventures", sectors: "AI/ML, Technology", stages: "Pre-seed, Seed", checkSize: "$500K-$1M" },
    { name: "Dillon Ferdinandi", firm: "Slack Fund", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$1M-$5M" },
    { name: "Dmitry Firskin", firm: "AltaIR Capital", sectors: "AI/ML, SaaS", stages: "Seed, Series A, Series B", checkSize: "$1M-$5M" },
    { name: "Donna Harris", firm: "Builders + Backers", sectors: "AI/ML, Technology", stages: "Pre-seed, Seed, Series A", checkSize: "$50K-$100K" },
    { name: "Drew Volpe", firm: "First Star Ventures", sectors: "AI/ML, Technology", stages: "Pre-seed, Seed", checkSize: "$500K-$1M" },
    { name: "Duygu Clark", firm: "DO Venture Partners", sectors: "Climate, Fintech, Mobile, SaaS", stages: "Pre-seed, Seed", checkSize: "$50K-$100K" },
    { name: "Ed Roman", firm: "Hack VC", sectors: "AI/ML, Crypto, SaaS", stages: "Pre-seed, Seed", checkSize: "$50K-$500K" },
    { name: "Ed Sim", firm: "Boldstart Ventures", sectors: "API, Cloud, Developer Tools, SaaS", stages: "Pre-seed, Seed", checkSize: "$250K-$5M" },
    { name: "Eddie Lee", firm: "White Star Capital", sectors: "Consumer", stages: "Series A, Series B", checkSize: "$5M-$15M" },
    { name: "Ela Madej", firm: "Fifty Years", sectors: "AI/ML, Climate, DeepTech", stages: "Pre-seed, Seed", checkSize: "$500K-$1M" },
    { name: "Elad Gil", firm: "Elad Gil Angel", sectors: "Consumer, SaaS", stages: "Pre-seed, Seed", checkSize: "$100K-$10M" },
    { name: "Elizabeth Yin", firm: "Hustle Fund", sectors: "AI/ML, API, SaaS", stages: "Pre-seed", checkSize: "$50K" },
    { name: "Emma Peng", firm: "Target Global", sectors: "AI/ML, Climate, Consumer, Crypto, Fintech, Health, InsurTech, Marketplace, PropTech", stages: "All stages", checkSize: "$1M-$5M" },
    { name: "Eric Slesinger", firm: "201 Ventures", sectors: "AI/ML, Technology", stages: "Pre-seed, Seed, Series A", checkSize: "$250K-$2M" },
    { name: "Erik de Stefanis", firm: "Interlace Ventures", sectors: "Automation, Climate, Consumer, Crypto, Fintech, Gaming, Marketplace, SaaS", stages: "All stages", checkSize: "$100K-$500K" },
    { name: "Evan Moore", firm: "Khosla Ventures", sectors: "AI/ML, API, DeepTech", stages: "Seed, Series A, Series B", checkSize: "$1M-$20M" },
    // Page 3
    { name: "Fabrice Grinda", firm: "FJ Labs", sectors: "API, Climate, Consumer, Crypto, Ecommerce, Fintech, Marketplace, PropTech, SaaS", stages: "All stages", checkSize: "$150K-$2M" },
    { name: "Fady Yacoub", firm: "HOF Capital", sectors: "Consumer, Crypto, Ecommerce, Fintech, Gaming, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$500K-$1M" },
    { name: "Finn Meeks", firm: "South Park Commons Fund", sectors: "AI/ML, Fintech, SaaS", stages: "Pre-seed, Seed", checkSize: "$500K-$2M" },
    { name: "Francis Sani", firm: "MAGIC Fund", sectors: "Fintech", stages: "Pre-seed, Seed", checkSize: "$50K-$150K" },
    { name: "Garry Tan", firm: "Initialized Capital", sectors: "Analytics, Climate, Consumer, Crypto, DeepTech, Ecommerce, Fintech, Marketplace, PropTech, Robotics, SaaS", stages: "Seed", checkSize: "$1M-$5M" },
    { name: "Gary Sheynkman", firm: "Leyden Ventures", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$100K-$1M" },
    { name: "Gautam Gupta", firm: "TCV", sectors: "API, AR/VR, SaaS", stages: "Series A, Series B", checkSize: "$10M" },
    { name: "Geri Kirilova", firm: "Laconia", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed", checkSize: "$500K-$2M" },
    { name: "Grace Isford", firm: "Canvas Ventures", sectors: "AI/ML, API, SaaS", stages: "Seed, Series A", checkSize: "$1M-$5M" },
    { name: "Gyan Kapur", firm: "Surface Ventures", sectors: "Enterprise, Healthcare, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$250K-$4M" },
    { name: "Herston Powers", firm: "1982 Ventures", sectors: "Crypto, Ecommerce, Enterprise, Fintech, InsurTech, PropTech, SaaS", stages: "Pre-seed, Seed", checkSize: "$100K-$500K" },
    { name: "Hooman Radfar", firm: "Expa", sectors: "Consumer", stages: "All stages", checkSize: "$25K-$50K" },
    { name: "Hunter Walk", firm: "Homebrew", sectors: "Fintech, SaaS", stages: "Pre-seed, Seed", checkSize: "$750K-$2M" },
    { name: "Ilya Eremeev", firm: "The Games Fund", sectors: "AI/ML, Gaming", stages: "Pre-seed, Seed, Series A", checkSize: "$500K-$1M" },
    { name: "Ilya Sukhar", firm: "Matrix Partners", sectors: "DeepTech, Developer Tools, Fintech", stages: "Seed, Series A", checkSize: "$2M-$10M" },
    { name: "Immad Akhund", firm: "Mercury", sectors: "Fintech, Healthcare, SaaS", stages: "Pre-seed, Seed", checkSize: "$50K-$100K" },
    { name: "Ishan Sachdev", firm: "Deciens Capital", sectors: "Fintech", stages: "Pre-seed, Seed", checkSize: "$500K-$3M" },
    { name: "Ivan Alo", firm: "New Age Capital", sectors: "Fintech, Health, Marketplace", stages: "Seed", checkSize: "$750K-$1M" },
    { name: "Ivan Kirigin", firm: "Tango.vc", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed", checkSize: "$50K-$100K" },
    { name: "Jacob Peters", firm: "House Capital", sectors: "Consumer, Crypto, SaaS", stages: "Pre-seed, Seed", checkSize: "$50K-$100K" },
    { name: "Jai Malik", firm: "Countdown Capital", sectors: "DeepTech", stages: "Pre-seed, Seed", checkSize: "$100K" },
    { name: "Jake Jolis", firm: "Matrix Partners", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$1M-$5M" },
    { name: "Jake Kaldenbaugh", firm: "Accenture Ventures", sectors: "API, Enterprise, SaaS", stages: "Seed, Series A, Series B", checkSize: "$500K-$1M" },
    { name: "Jake Zeller", firm: "Jonathan Swanson & Jake Zeller", sectors: "DeepTech, Enterprise", stages: "All stages", checkSize: "$150K-$300K" },
    { name: "James Beshara", firm: "James Beshara Angel", sectors: "Consumer", stages: "Pre-seed, Seed, Series A", checkSize: "$100K" },
    { name: "James Green", firm: "CRV", sectors: "AI/ML, API, SaaS", stages: "All stages", checkSize: "$1M-$5M" },
    { name: "Jamie Quint", firm: "Uncommon Capital", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$100K-$500K" },
    { name: "Jason Calacanis", firm: "Launch", sectors: "AI/ML, API, Technology", stages: "All stages", checkSize: "$1M-$5M" },
    { name: "Jason Levine", firm: "Newflow Partners", sectors: "Consumer, Crypto, Fintech, Gaming, Health", stages: "Series A, Series B", checkSize: "$20M-$200M" },
    { name: "Jason Shuman", firm: "Primary", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed", checkSize: "$1M-$5M" },
    { name: "Jason Wong", firm: "Pughaus", sectors: "AI/ML, Consumer", stages: "Pre-seed", checkSize: "$50K" },
    { name: "Jed Lenzner", firm: "Tusk Venture Partners", sectors: "Climate, Crypto, Fintech, Gaming, Healthcare, Marketplace, SaaS", stages: "Seed, Series A", checkSize: "$500K-$7M" },
    { name: "Jeff Baehr", firm: "RueOne Investments", sectors: "AI/ML, SaaS", stages: "All stages", checkSize: "$1M-$5M" },
    { name: "Jeff Seibert", firm: "Jeff Seibert Angel", sectors: "Consumer, Fintech", stages: "Pre-seed, Seed", checkSize: "$25K-$50K" },
    { name: "Jenieri Cyrus", firm: "Urban Innovation Fund", sectors: "AI/ML, Technology", stages: "Pre-seed, Seed", checkSize: "$500K-$1M" },
    { name: "Jenny Fielding", firm: "The Fund", sectors: "AI/ML, API, SaaS", stages: "Pre-seed", checkSize: "$50K-$100K" },
    { name: "Jerry Lu", firm: "Maveron", sectors: "Consumer", stages: "Pre-seed, Seed, Series A", checkSize: "$1M-$5M" },
    { name: "Jesse Middleton", firm: "Flybridge", sectors: "Cloud, SaaS", stages: "Pre-seed, Seed", checkSize: "$500K-$1M" },
    { name: "Jessica Karr", firm: "Coyote Ventures", sectors: "Consumer, Health, Healthcare", stages: "Pre-seed, Seed, Series A", checkSize: "$100K-$500K" },
    { name: "Jessica Peltz", firm: "Hannah Grey", sectors: "AI/ML, SaaS", stages: "Pre-seed, Seed", checkSize: "$500K-$1M" },
    { name: "Jillian Cohn", firm: "Mouro Capital", sectors: "Fintech", stages: "Seed, Series A, Series B", checkSize: "$3M" },
    { name: "Jinal Jhaveri", firm: "Jinal Jhaveri Angel", sectors: "API, SaaS", stages: "All stages", checkSize: "$50K-$100K" },
    { name: "Joe Tsai", firm: "Mucker Capital", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$1M-$5M" },
    { name: "John Diaz", firm: "Stone Mountain Ventures", sectors: "Healthcare, Health, Consumer, Biotech", stages: "Seed", checkSize: "$100K-$500K" },
    { name: "John Smothers", firm: "Acrew Capital", sectors: "AI/ML, API, SaaS", stages: "All stages", checkSize: "$500K-$3M" },
    { name: "Johnnie Yu", firm: "Listen Ventures", sectors: "AR/VR, Consumer", stages: "Pre-seed, Seed, Series A", checkSize: "$1M-$5M" },
    { name: "Jon Broscious", firm: "Mucker Capital", sectors: "Fintech, Healthcare, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$100K-$5M" },
    { name: "Jon Dishotsky", firm: "Daft Capital", sectors: "Climate, Fintech, Health", stages: "Pre-seed, Seed, Series A", checkSize: "$500K-$2M" },
    { name: "Jon Soberg", firm: "MS&AD Ventures", sectors: "Fintech, InsurTech", stages: "Pre-seed, Seed, Series A", checkSize: "$500K-$2M" },
    { name: "Jonathan Abrams", firm: "8-Bit Capital", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed", checkSize: "$500K-$1M" },
    // Page 4
    { name: "Jonathan Ehrlich", firm: "Foundation Capital", sectors: "Consumer, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$1M-$5M" },
    { name: "Jonathan Hirsch", firm: "Syapse", sectors: "Healthcare", stages: "All stages", checkSize: "$25K-$2M" },
    { name: "Jonathan Lewy", firm: "InvestoVC", sectors: "AI/ML, API, SaaS", stages: "All stages", checkSize: "$100K-$500K" },
    { name: "Jonathan Tang", firm: "Pioneer Fund", sectors: "AI/ML, Climate, Consumer, Crypto, DeepTech, Fintech, Marketplace, SaaS", stages: "Pre-seed, Seed", checkSize: "$50K-$100K" },
    { name: "Jonathan Wasserstrum", firm: "SquareFoot", sectors: "Education, Healthcare, PropTech", stages: "All stages", checkSize: "$100K" },
    { name: "Josh Berns", firm: "Blue Collective", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$500K-$1M" },
    { name: "Josh Kopelman", firm: "First Round Capital", sectors: "AI/ML, Technology", stages: "Pre-seed, Seed", checkSize: "$1M-$3M" },
    { name: "Joshua Schachter", firm: "Joshua Schachter Angel", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed", checkSize: "$50K-$100K" },
    { name: "JP Bray", firm: "InnoStart Capital", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$50K-$100K" },
    { name: "Jude Gomila", firm: "Golden", sectors: "DeepTech, Enterprise, Fintech", stages: "Pre-seed, Seed", checkSize: "$150K" },
    { name: "Julie Lein", firm: "Urban Innovation Fund", sectors: "AI/ML, API, PropTech", stages: "Pre-seed, Seed", checkSize: "$500K-$1M" },
    { name: "Justin Olshavsky", firm: "Voyage Bio", sectors: "Biotech, Climate, Crypto, DeepTech, Healthcare, Life Sciences, Robotics", stages: "Pre-seed, Seed", checkSize: "$50K" },
    { name: "Kaitlyn Doyle", firm: "TechNexus Venture Collaborative", sectors: "AI/ML, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$100K-$500K" },
    { name: "Kamal Ravikant", firm: "Kamal Ravikant Angel", sectors: "Crypto, Ecommerce, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$100K" },
    { name: "Katie Stanton", firm: "Moxxie Ventures", sectors: "Fintech, Healthcare", stages: "Pre-seed, Seed", checkSize: "$250K-$1M" },
    { name: "Keith Bender", firm: "Pear VC", sectors: "Consumer, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$1M" },
    { name: "Kevin Colleran", firm: "Slow Ventures", sectors: "Consumer, Crypto, Enterprise, Healthcare, SaaS", stages: "Pre-seed, Seed", checkSize: "$500K-$3M" },
    { name: "Kevin Liu", firm: "Techstars", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$50K-$100K" },
    { name: "Kevin Weatherman", firm: "KW Angel Fund", sectors: "AI/ML, API, SaaS", stages: "Pre-seed", checkSize: "$1K-$50K" },
    { name: "Kirsten Green", firm: "Forerunner Ventures", sectors: "Consumer", stages: "Seed, Series A, Series B", checkSize: "$1M-$15M" },
    { name: "Kiva Dickinson", firm: "Selva Ventures", sectors: "Consumer", stages: "Seed, Series A", checkSize: "$500K-$1M" },
    { name: "Koda Wang", firm: "Giant Ventures", sectors: "Consumer, Climate", stages: "Pre-seed, Seed", checkSize: "$100K-$2M" },
    { name: "Krista A. Worzalla", firm: "Swiftarc Ventures", sectors: "AI/ML, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$100K-$500K" },
    { name: "Kristin Stannard Kent", firm: "Expa", sectors: "Fintech, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$250K-$3M" },
    { name: "Kyle Lui", firm: "DCM", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$1M-$5M" },
    { name: "Lacey Johnson", firm: "Alumni Ventures", sectors: "AI/ML, Climate, Consumer, DeepTech, Fintech, Health, Healthcare, InsurTech, SaaS", stages: "Seed, Series A, Series B", checkSize: "$100K-$500K" },
    { name: "Lainy Painter Singh", firm: "Craft Ventures", sectors: "AI/ML, API, SaaS", stages: "Seed, Series A, Series B", checkSize: "$1M-$5M" },
    { name: "Lan Xuezhao", firm: "Basis Set Ventures", sectors: "AI/ML, API, SaaS", stages: "Seed", checkSize: "$1M-$5M" },
    { name: "Lee Jacobs", firm: "Long Journey Ventures", sectors: "AI/ML, Technology", stages: "Pre-seed, Seed", checkSize: "$500K-$1M" },
    { name: "Leo Polovets", firm: "Susa Ventures", sectors: "Fintech, Healthcare, SaaS", stages: "Pre-seed, Seed", checkSize: "$1M-$2M" },
    { name: "Lex Zhao", firm: "One Way Ventures", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed", checkSize: "$500K-$1M" },
    { name: "Li Jin", firm: "Atelier Ventures", sectors: "Consumer, Creator Economy, Future of Work", stages: "Pre-seed, Seed, Series A", checkSize: "$200K-$300K" },
    { name: "Luisa Sucre", firm: "Collaborative Fund", sectors: "Climate, Consumer, Food, Health", stages: "Seed, Series A", checkSize: "$1M-$5M" },
    { name: "Mallun Yen", firm: "Operator Collective", sectors: "Analytics, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$500K-$1M" },
    { name: "Manan Mehta", firm: "Unshackled Ventures", sectors: "AI/ML, Technology", stages: "Pre-seed", checkSize: "$100K-$500K" },
    { name: "Mar Hershenson", firm: "Pear VC", sectors: "AI/ML, Cloud, SaaS", stages: "Seed, Series A", checkSize: "$1M-$5M" },
    { name: "Marc McCabe", firm: "Nomad Capital", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$50K-$300K" },
    { name: "Mario Mitchell", firm: "Mech Ventures", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$100K-$500K" },
    { name: "Mark Ghermezian", firm: "m]x[v Capital", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$500K-$1M" },
    { name: "Mark Lee", firm: "Mucker Capital", sectors: "AI/ML, SaaS", stages: "Seed, Series A", checkSize: "$500K-$1M" },
    { name: "Mark Tomasovic", firm: "Energize Ventures", sectors: "AI/ML, API, Climate", stages: "Series A, Series B", checkSize: "$8M-$25M" },
    { name: "Matt Brezina", firm: "Ford Street Ventures", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$100K-$500K" },
    { name: "Matt Hayes", firm: "PJC", sectors: "AI/ML, SaaS", stages: "All stages", checkSize: "$500K-$1M" },
    { name: "Matt Heiman", firm: "Vetamer Capital", sectors: "Consumer, Crypto, Fintech, Gaming, InsurTech, Marketplace, PropTech, SaaS", stages: "Pre-seed, Seed", checkSize: "$50K" },
    { name: "Megan Ananian", firm: "Megan Ananian GP", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$100K-$500K" },
    { name: "Mendy Yang", firm: "Lerer Hippeau", sectors: "AI/ML, API, Consumer", stages: "Pre-seed, Seed, Series A", checkSize: "$1M-$5M" },
    { name: "Michael Cardamone", firm: "Forum Ventures", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed", checkSize: "$100K-$500K" },
    { name: "Michael Downing", firm: "MDSV Capital", sectors: "Space, IoT, DeepTech", stages: "All stages", checkSize: "$100K-$500K" },
    { name: "Michael Egziabher", firm: "AVG Basecamp", sectors: "Fintech, Health, SaaS", stages: "Pre-seed, Seed", checkSize: "$100K-$500K" },
    { name: "Michael Lee", firm: "Bull City Venture Partners", sectors: "AI/ML, API, SaaS", stages: "All stages", checkSize: "$1M-$5M" },
    // Page 5
    { name: "Michael Ma", firm: "Liquid2 Ventures", sectors: "Enterprise, SaaS", stages: "Seed", checkSize: "$100K-$500K" },
    { name: "Milun Tesovic", firm: "Expa", sectors: "API, DeepTech, Developer Tools, Fintech, Gaming, InsurTech", stages: "Pre-seed, Seed, Series A", checkSize: "$1M-$5M" },
    { name: "Mitra Lohrasbpour", firm: "South Park Commons Fund", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed", checkSize: "$1M-$5M" },
    { name: "Mo Islam", firm: "Threshold", sectors: "AI/ML, API, Space", stages: "Seed, Series A, Series B", checkSize: "$5M" },
    { name: "Mohammed Amdani", firm: "Adapt Ventures", sectors: "Consumer, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$100K-$500K" },
    { name: "Morgan Livermore", firm: "Quiet Capital", sectors: "AI/ML, API, SaaS", stages: "Seed, Series A", checkSize: "$5M-$20M" },
    { name: "Nakul Mandan", firm: "Audacious Ventures", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed", checkSize: "$1M-$5M" },
    { name: "Nate Bosshard", firm: "Offline Ventures", sectors: "Consumer", stages: "Pre-seed, Seed, Series A", checkSize: "$1M-$2M" },
    { name: "Nate Cooper", firm: "Barrel Ventures", sectors: "Consumer", stages: "Pre-seed, Seed, Series A", checkSize: "$250K" },
    { name: "Neil Devani", firm: "Necessary Ventures", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed", checkSize: "$250K-$500K" },
    { name: "Nick Pappageorge", firm: "Delphi Digital", sectors: "Cloud, Crypto, Fintech, Gaming, Marketplace", stages: "Pre-seed, Seed, Series A", checkSize: "$500K-$1M" },
    { name: "Nicole Williams Ruiz", firm: "Compound", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed", checkSize: "$500K-$1M" },
    { name: "Nik Sharma", firm: "Sharma Brands / Masala Capital", sectors: "Consumer, DTC", stages: "Pre-seed, Seed, Series A", checkSize: "$50K" },
    { name: "Nikhil Basu Trivedi", firm: "Footwork", sectors: "Consumer", stages: "Seed, Series A", checkSize: "$1M-$10M" },
    { name: "Niko Bonatsos", firm: "General Catalyst", sectors: "AI/ML, API, SaaS", stages: "All stages", checkSize: "$1M-$5M" },
    { name: "Nilesh Trivedi", firm: "J-Ventures", sectors: "Enterprise, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$500K-$1M" },
    { name: "Nimi Katragadda", firm: "BoxGroup", sectors: "Fintech, Healthcare, Marketplace", stages: "Pre-seed, Seed, Series A", checkSize: "$250K-$750K" },
    { name: "Nolan Church", firm: "Continuum", sectors: "Cloud, SaaS", stages: "Pre-seed, Seed", checkSize: "$50K" },
    { name: "Parasvil Patel", firm: "Radical Ventures", sectors: "AI/ML, API, DeepTech", stages: "Seed, Series A", checkSize: "$1M-$5M" },
    { name: "Parul Singh", firm: "Initialized", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed", checkSize: "$1M-$5M" },
    { name: "Pasha Tinkov", firm: "Audeo Ventures", sectors: "SaaS", stages: "Seed, Series A", checkSize: "$1M-$5M" },
    { name: "Patrick Harmon", firm: "B Capital", sectors: "AI/ML, SaaS", stages: "Seed, Series A", checkSize: "$1M-$5M" },
    { name: "Patrick Mathieson", firm: "Toba Capital", sectors: "AI/ML, API, SaaS", stages: "All stages", checkSize: "$500K-$1M" },
    { name: "Patrick Salyer", firm: "Mayfield", sectors: "API, Enterprise, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$2M-$10M" },
    { name: "Paul Levine", firm: "Sapphire Ventures", sectors: "API, Enterprise, SaaS", stages: "Series B", checkSize: "$15M-$75M" },
    { name: "Pejman Nozad", firm: "Pear VC", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$250K-$5M" },
    { name: "Peter Livingston", firm: "Unpopular Ventures", sectors: "AI/ML, API, SaaS", stages: "Seed, Series A", checkSize: "$25K-$1M" },
    { name: "Pierre Giraud", firm: "Indigo", sectors: "Consumer", stages: "Pre-seed, Seed", checkSize: "$100K-$250K" },
    { name: "Promise Phelon", firm: "Promise Phelon GP", sectors: "AI/ML, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$100K-$500K" },
    { name: "Qasar Younis", firm: "Applied Intuition", sectors: "AI/ML, API, Robotics", stages: "All stages", checkSize: "$50K-$100K" },
    { name: "Rachel Star", firm: "Unusual Ventures", sectors: "Consumer, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$1M-$5M" },
    { name: "Rafeh Saleh", firm: "Cubit Ventures", sectors: "AI/ML, API, SaaS", stages: "Seed", checkSize: "$100K-$500K" },
    { name: "Rahul Prakash", firm: "NOMO Ventures", sectors: "Crypto, Enterprise, Fintech, SaaS", stages: "Pre-seed, Seed", checkSize: "$500K-$1M" },
    { name: "Ravi Grover", firm: "Data Tech Fund", sectors: "AI/ML, API, Data", stages: "Pre-seed, Seed, Series A", checkSize: "$100K-$500K" },
    { name: "Raymond Tonsing", firm: "Caffeinated Capital", sectors: "AI/ML, API, SaaS", stages: "All stages", checkSize: "$1M-$5M" },
    { name: "Rich Maloy", firm: "SpringTime Ventures", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed", checkSize: "$100K-$500K" },
    { name: "Richard Dulude", firm: "Underscore VC", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed", checkSize: "$1M-$5M" },
    { name: "Richard Jhang", firm: "StratMinds", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$100K-$500K" },
    { name: "Rico Mallozzi", firm: "Sapphire Sport", sectors: "AI/ML, Sports", stages: "Seed, Series A", checkSize: "$1M-$5M" },
    { name: "Robert Wesley", firm: "Cameron Ventures", sectors: "AI/ML, API, SaaS", stages: "All stages", checkSize: "$100K-$500K" },
    { name: "Roberto Sanabria", firm: "Expa", sectors: "Analytics, Fintech", stages: "Pre-seed, Seed", checkSize: "$500K-$5M" },
    { name: "Roger Dickey", firm: "Untitled Capital", sectors: "Consumer", stages: "Pre-seed, Seed, Series A", checkSize: "$20K-$50K" },
    { name: "Saar Gur", firm: "CRV", sectors: "Consumer", stages: "Seed, Series A", checkSize: "$1M-$15M" },
    { name: "Sahil Lavingia", firm: "Gumroad", sectors: "Crypto, Future of Work, SaaS", stages: "Pre-seed, Seed", checkSize: "$100K-$250K" },
    { name: "Sam Campbell", firm: "Samsung Next", sectors: "AI/ML, Cloud, SaaS", stages: "Seed, Series A, Series B", checkSize: "$100K-$500K" },
    { name: "Samit Kalra", firm: "1984 Ventures", sectors: "Ecommerce, Fintech", stages: "Seed", checkSize: "$500K-$1M" },
    { name: "Sandeep Bhadra", firm: "Vertex Ventures", sectors: "Cloud, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$1M-$5M" },
    { name: "Sara Choi", firm: "Wing VC", sectors: "Biotech, Healthcare", stages: "Pre-seed, Seed, Series A", checkSize: "$250K-$10M" },
    { name: "Sarah Fu", firm: "Elsa Capital", sectors: "AI/ML, SaaS", stages: "Pre-seed, Seed", checkSize: "$100K-$500K" },
    { name: "Satya Patel", firm: "Homebrew", sectors: "Fintech, SaaS", stages: "Pre-seed, Seed", checkSize: "$200K-$2M" },
    // Page 6
    { name: "Scott Belsky", firm: "Adobe", sectors: "AI/ML, API, Creative, Design", stages: "Pre-seed, Seed, Series A", checkSize: "$50K-$100K" },
    { name: "Seema Amble", firm: "Andreessen Horowitz", sectors: "Creator Economy, Fintech, PropTech, SaaS, Supply Chain", stages: "Seed, Series A, Series B", checkSize: "$500K-$40M" },
    { name: "Sergio Romo", firm: "Investo", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$100K-$500K" },
    { name: "Seth Bannon", firm: "Fifty Years", sectors: "AI/ML, Climate, DeepTech", stages: "Pre-seed, Seed", checkSize: "$500K-$1M" },
    { name: "Severin Hacker", firm: "Duolingo", sectors: "AI/ML, API, EdTech", stages: "Pre-seed, Seed", checkSize: "$50K" },
    { name: "Shane Mac", firm: "Logos Labs", sectors: "AI/ML, Crypto, Marketplace, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$50K-$100K" },
    { name: "Sheel Mohnot", firm: "Better Tomorrow Ventures", sectors: "Fintech", stages: "Pre-seed, Seed", checkSize: "$500K-$2M" },
    { name: "Shruti Gandhi", firm: "Array Ventures", sectors: "AI/ML, DeepTech, Enterprise, SaaS", stages: "Pre-seed", checkSize: "$1M" },
    { name: "Siqi Chen", firm: "Runway", sectors: "AI/ML, Crypto, Fintech, Hardware, InsurTech, SaaS", stages: "Seed, Series A, Series B", checkSize: "$50K-$100K" },
    { name: "Sohail Prasad", firm: "Density", sectors: "Fintech", stages: "All stages", checkSize: "$100K-$500K" },
    { name: "Soraya Darabi", firm: "TMV (Trail Mix Ventures)", sectors: "Climate, Consumer, Crypto, Education, Fintech, Health, Healthcare, Marketplace, PropTech, SaaS", stages: "Pre-seed", checkSize: "$1M-$5M" },
    { name: "Stephanie Zhan", firm: "Sequoia", sectors: "Consumer, Enterprise", stages: "Pre-seed, Seed, Series A", checkSize: "$100K-$10M" },
    { name: "Stephen Schmalhofer", firm: "Teamworthy Ventures", sectors: "API, SaaS", stages: "All stages", checkSize: "$1M-$5M" },
    { name: "Steven Lee", firm: "SV Angel", sectors: "AI/ML, API, SaaS", stages: "Seed, Series A", checkSize: "$100K-$500K" },
    { name: "Stu Smith", firm: "Coughdrop Capital", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$50K" },
    { name: "Susan Liu", firm: "Uncork Capital", sectors: "AI/ML, SaaS", stages: "Seed, Series B", checkSize: "$1M-$5M" },
    { name: "Teddy Blank", firm: "First Star Ventures", sectors: "AI/ML, SaaS", stages: "Pre-seed, Seed", checkSize: "$100K-$500K" },
    { name: "Terrence Rohan", firm: "Otherwise Fund", sectors: "AI/ML, Climate", stages: "All stages", checkSize: "$100K-$1M" },
    { name: "Thomas Chen", firm: "MAGIC Fund", sectors: "AI/ML, API, SaaS", stages: "Seed", checkSize: "$100K-$500K" },
    { name: "Thomson Nguyen", firm: "Hatch", sectors: "Fintech", stages: "Pre-seed, Seed", checkSize: "$5K-$25K" },
    { name: "Tiffany Luck", firm: "GGV Capital", sectors: "API, SaaS", stages: "All stages", checkSize: "$1M-$5M" },
    { name: "Tim Griffin", firm: "Odeko", sectors: "Automation, Climate, Consumer, Fintech, Marketplace, SaaS", stages: "Pre-seed, Seed", checkSize: "$50K" },
    { name: "Tina Bou-Saba", firm: "Verity Venture Partners", sectors: "Analytics, Climate, Consumer, Fintech, Gaming, Health, Marketplace, SaaS", stages: "Seed, Series A", checkSize: "$1M-$5M" },
    { name: "Tod Sacerdoti", firm: "Turbo Ventures", sectors: "API, SaaS", stages: "All stages", checkSize: "$50K-$100K" },
    { name: "Todd Goldberg", firm: "Todd and Rahul's Angel Fund", sectors: "Health, Productivity", stages: "Pre-seed, Seed, Series A", checkSize: "$100K-$250K" },
    { name: "Tomer London", firm: "Gusto", sectors: "API, HR, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$50K" },
    { name: "Triet Nguyen", firm: "Render Capital", sectors: "DTC, Consumer, Fintech", stages: "Pre-seed, Seed, Series A", checkSize: "$500K-$1M" },
    { name: "Tripp Jones", firm: "Uncork Capital", sectors: "AI/ML, API, SaaS", stages: "Seed", checkSize: "$1M-$5M" },
    { name: "Turner Novak", firm: "Banana Capital", sectors: "Ecommerce, Consumer", stages: "Pre-seed, Seed, Series A", checkSize: "$250K-$750K" },
    { name: "Venky Karnam", firm: "Afore Capital", sectors: "API, SaaS", stages: "Pre-seed, Seed", checkSize: "$100K-$500K" },
    { name: "Vibhor Chhabra", firm: "Shunya Ventures", sectors: "API, Cloud, SaaS", stages: "Seed, Series A, Series B", checkSize: "$1K-$50K" },
    { name: "Vivien Ho", firm: "Pear VC", sectors: "AI/ML, Climate, Consumer, Crypto, DeepTech, Fintech, Health, Healthcare, Marketplace, SaaS", stages: "Pre-seed, Seed", checkSize: "$1M-$5M" },
    { name: "Vyshakh Kodoth", firm: "MetaProp Ventures", sectors: "AI/ML, API, PropTech", stages: "All stages", checkSize: "$1M-$5M" },
    { name: "Wayne Chang", firm: "Wayne Chang Angel", sectors: "Consumer, Fintech", stages: "Pre-seed, Seed", checkSize: "$25K-$50K" },
    { name: "Wen-Wen Lam", firm: "Gradient Ventures", sectors: "AI/ML, Crypto, Fintech, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$1M-$5M" },
    { name: "Wes Tang-Wymer", firm: "Rucker Park Capital", sectors: "Consumer, Fintech", stages: "Pre-seed, Seed, Series A", checkSize: "$500K-$3M" },
    { name: "Will McClelland", firm: "Elizabeth Street Ventures", sectors: "Consumer", stages: "Pre-seed, Seed, Series A", checkSize: "$500K-$1M" },
    { name: "William Leonard", firm: "Valor Ventures", sectors: "AI/ML, API, SaaS", stages: "Seed", checkSize: "$500K-$1M" },
    { name: "Yehong Zhu", firm: "Zette", sectors: "Consumer, Fintech, Marketplace, Media, SaaS", stages: "All stages", checkSize: "$1K-$50K" },
    { name: "Yigit Ihlamur", firm: "Vela Partners", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$500K-$1M" },
    { name: "Yotis Tonnelier", firm: "YOBE Ventures", sectors: "AI/ML, API, SaaS", stages: "Seed, Series A", checkSize: "$25K-$1M" },
    { name: "Youcef Oudjidane", firm: "Class 5 Global", sectors: "Consumer, Fintech", stages: "Pre-seed, Seed", checkSize: "$100K-$1M" },
    { name: "Yuri Sagalov", firm: "Wayfinder", sectors: "AI/ML, API, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$250K-$500K" },
    { name: "Zach Coelius", firm: "Coelius Capital", sectors: "Consumer, SaaS", stages: "All stages", checkSize: "$200K-$1M" },
    { name: "Zach DeWitt", firm: "Wing VC", sectors: "Fintech, SaaS", stages: "Pre-seed, Seed, Series A", checkSize: "$1M-$10M" }
  ];

  console.log(`\n📊 MERCURY INVESTOR IMPORT - SCHEMA CORRECT VERSION`);
  console.log(`   Total investors to process: ${investors.length}\n`);

  let added = 0, updated = 0, errors = 0;
  
  for (let i = 0; i < investors.length; i++) {
    const investor = investors[i];
    process.stdout.write(`   [${i + 1}/${investors.length}] ${investor.name.substring(0, 25).padEnd(25)} @ ${investor.firm.substring(0, 20).padEnd(20)}...`);
    
    try {
      const result = await importInvestor(investor);
      if (result.success) {
        console.log(result.action === 'added' ? ' ✅ NEW' : ' 🔄 UPDATED');
        if (result.action === 'added') added++;
        else updated++;
      } else {
        console.log(' ❌ FAILED');
        errors++;
      }
    } catch (e) {
      console.log(` ❌ ${e.message.substring(0, 30)}`);
      errors++;
    }
  }

  // Final stats
  const finalCount = await execSqlRows("SELECT COUNT(*) as total, COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings FROM investors");
  
  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║          📊 IMPORT COMPLETE                                ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝`);
  console.log(`   ✅ New investors added: ${added}`);
  console.log(`   🔄 Investors updated: ${updated}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📈 Total in database: ${finalCount[0]?.total || 'unknown'}`);
  console.log(`   🧠 With embeddings: ${finalCount[0]?.with_embeddings || 'unknown'}\n`);
}

main().catch(console.error);
