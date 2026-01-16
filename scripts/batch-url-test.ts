/**
 * BATCH URL SUBMISSION TEST
 * Tests multiple URLs through the URL submission flow
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// URLs to test
const TEST_URLS = [
  'everestmanagedai.com',
  'www.zalos.ai',
  'www.sourcebot.dev',
  'heylua.ai',
  'www.relaw.ai',
  'specific.dev',
  'kalpalabs.ai',
  'metorial.com',
  'denki.ai',
  'www.icarus.one',
  'www.telemetron.ai',
  'lunabill.com',
  'claybird.com',
  'www.fastshot.ai',
  'goclicks.ai',
  'www.openroll.com',
  'fixpoint.co',
  'usebear.ai'
];

interface NormalizedUrl {
  kind: 'website' | 'linkedin' | 'crunchbase';
  domain: string;
}

function normalizeUrl(input: string): NormalizedUrl | null {
  try {
    let url = input.trim().toLowerCase();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace('www.', '');
    return { kind: 'website', domain: hostname };
  } catch {
    return null;
  }
}

async function resolveStartupFromUrl(input: string): Promise<any> {
  const n = normalizeUrl(input);
  if (!n) return null;

  // Check existing
  const { data: exactMatch } = await supabase
    .from('startup_uploads')
    .select('id, name, website, tagline, sectors, stage, total_god_score, status')
    .or(`website.eq.https://${n.domain},website.eq.http://${n.domain},website.eq.${n.domain},website.ilike.%${n.domain}%`)
    .limit(1)
    .maybeSingle();

  if (exactMatch) {
    return { startup: exactMatch, confidence: 'existing', created: false };
  }

  // Create new
  const companyName = n.domain.split('.')[0];
  const formattedName = companyName.charAt(0).toUpperCase() + companyName.slice(1);

  const { data: created, error } = await supabase
    .from('startup_uploads')
    .insert({
      name: formattedName,
      website: `https://${n.domain}`,
      tagline: `Startup at ${n.domain}`,
      sectors: ['Technology'],
      stage: 1,
      status: 'approved',
      source_type: 'url',
      total_god_score: 60,
      created_at: new Date().toISOString(),
    })
    .select('id, name, website, tagline, sectors, stage, total_god_score, status')
    .single();

  if (error) {
    return { error: error.message };
  }

  return { startup: created, confidence: 'created_new', created: true };
}

async function getMatchesForStartup(startupId: string, startup: any): Promise<any[]> {
  // Try pre-computed matches first
  const { data: matchData } = await supabase
    .from('startup_investor_matches')
    .select('match_score, reasoning, investor_id')
    .eq('startup_id', startupId)
    .gte('match_score', 20)
    .order('match_score', { ascending: false })
    .limit(5);

  if (matchData && matchData.length > 0) {
    const investorIds = matchData.map(m => m.investor_id).filter(Boolean);
    const { data: investors } = await supabase
      .from('investors')
      .select('id, name, firm, sectors')
      .in('id', investorIds as string[]);

    const investorMap = new Map((investors || []).map((inv: any) => [inv.id, inv]));

    return matchData.map((m: any) => {
      const inv = investorMap.get(m.investor_id) as any;
      return {
        name: inv?.name || 'Unknown',
        firm: inv?.firm,
        score: m.match_score,
        source: 'pre-computed'
      };
    });
  }

  // Fallback: real-time scoring
  const { data: investors } = await supabase
    .from('investors')
    .select('id, name, firm, sectors, stage')
    .limit(100);

  if (!investors) return [];

  const startupSectors = startup?.sectors || ['Technology'];
  
  const scored = investors.map((inv: any) => {
    let score = 50;
    const invSectors = inv.sectors || [];
    const overlap = startupSectors.filter((s: string) =>
      invSectors.some((is: string) => is?.toLowerCase().includes(s?.toLowerCase()))
    );
    score += Math.min(overlap.length * 15, 30);
    return { name: inv.name, firm: inv.firm, score, source: 'real-time' };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 5);
}

async function testUrl(url: string): Promise<void> {
  const result = await resolveStartupFromUrl(url);
  
  if (result?.error) {
    console.log(`❌ ${url.padEnd(25)} | ERROR: ${result.error}`);
    return;
  }
  
  if (!result?.startup) {
    console.log(`❌ ${url.padEnd(25)} | Failed to resolve`);
    return;
  }

  const matches = await getMatchesForStartup(result.startup.id, result.startup);
  const topMatch = matches[0];
  
  const status = result.created ? '🆕 CREATED' : '✅ EXISTS';
  const godScore = result.startup.total_god_score || 60;
  const matchInfo = topMatch ? `${topMatch.name} (${topMatch.score}) [${topMatch.source}]` : 'No matches';
  
  console.log(`${status} ${url.padEnd(25)} | GOD: ${godScore.toString().padStart(2)} | Top: ${matchInfo}`);
}

async function main() {
  console.log('🔮 PYTH URL SUBMISSION BATCH TEST');
  console.log('='.repeat(100));
  console.log('');
  console.log('STATUS'.padEnd(10), 'URL'.padEnd(28), '| GOD Score | Top Investor Match');
  console.log('-'.repeat(100));

  for (const url of TEST_URLS) {
    await testUrl(url);
  }

  console.log('');
  console.log('='.repeat(100));
  console.log('✅ Batch test complete!');
  console.log('');
  console.log('Legend:');
  console.log('  🆕 CREATED = New startup record created');
  console.log('  ✅ EXISTS  = Found existing startup in database');
  console.log('  [pre-computed] = Matches from startup_investor_matches table');
  console.log('  [real-time] = Matches calculated on-the-fly (new startups)');
}

main().catch(console.error);
