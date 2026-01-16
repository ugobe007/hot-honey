/**
 * TEST SCRIPT: URL Submission Flow
 * =================================
 * Tests the core URL submission functionality:
 * 1. resolveStartupFromUrl - finds/creates startups from URLs
 * 2. getInvestorMatchesForStartup - gets investor matches
 * 
 * Run: npx tsx scripts/test-url-submission.ts
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

// ============================================
// INLINE FUNCTIONS (same logic as frontend)
// ============================================

interface NormalizedUrl {
  kind: 'website' | 'linkedin' | 'crunchbase';
  domain: string;
  linkedinSlug?: string;
  crunchbaseSlug?: string;
}

function normalizeUrl(input: string): NormalizedUrl | null {
  try {
    let url = input.trim().toLowerCase();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const parsed = new URL(url);
    const hostname = parsed.hostname.replace('www.', '');

    // LinkedIn company URL
    if (hostname.includes('linkedin.com') && parsed.pathname.includes('/company/')) {
      const slug = parsed.pathname.split('/company/')[1]?.split('/')[0];
      return { kind: 'linkedin', domain: hostname, linkedinSlug: slug };
    }

    // Crunchbase URL
    if (hostname.includes('crunchbase.com') && parsed.pathname.includes('/organization/')) {
      const slug = parsed.pathname.split('/organization/')[1]?.split('/')[0];
      return { kind: 'crunchbase', domain: hostname, crunchbaseSlug: slug };
    }

    // Regular website
    return { kind: 'website', domain: hostname };
  } catch {
    return null;
  }
}

interface ResolvedStartup {
  id: string;
  name: string | null;
  website: string | null;
  tagline?: string | null;
  sectors?: string[] | null;
  stage?: number | null;
  total_god_score?: number | null;
  status: string;
}

interface ResolveResult {
  startup: ResolvedStartup;
  confidence: 'exact_domain' | 'linkedin_match' | 'crunchbase_match' | 'contains_domain' | 'created_provisional';
}

async function resolveStartupFromUrl(input: string): Promise<ResolveResult | null> {
  const n = normalizeUrl(input);
  if (!n) {
    console.log('  ⚠️ Could not normalize URL:', input);
    return null;
  }
  console.log('  📍 Normalized:', n.kind, n.domain);

  // 1) LinkedIn company URL match
  if (n.kind === 'linkedin' && n.linkedinSlug) {
    const { data: row } = await supabase
      .from('startup_uploads')
      .select('id, name, website, tagline, sectors, stage, total_god_score, status')
      .ilike('linkedin_url', `%${n.linkedinSlug}%`)
      .limit(1)
      .maybeSingle();
    
    if (row) {
      return { startup: row as ResolvedStartup, confidence: 'linkedin_match' };
    }
  }

  // 2) Crunchbase URL match
  if (n.kind === 'crunchbase' && n.crunchbaseSlug) {
    const { data: row } = await supabase
      .from('startup_uploads')
      .select('id, name, website, tagline, sectors, stage, total_god_score, status')
      .ilike('crunchbase_url', `%${n.crunchbaseSlug}%`)
      .limit(1)
      .maybeSingle();
    
    if (row) {
      return { startup: row as ResolvedStartup, confidence: 'crunchbase_match' };
    }
  }

  // 3) Exact domain match
  const { data: exactMatch } = await supabase
    .from('startup_uploads')
    .select('id, name, website, tagline, sectors, stage, total_god_score, status')
    .or(`website.eq.https://${n.domain},website.eq.http://${n.domain},website.eq.${n.domain}`)
    .limit(1)
    .maybeSingle();

  if (exactMatch) {
    return { startup: exactMatch as ResolvedStartup, confidence: 'exact_domain' };
  }

  // 4) Contains domain match
  const { data: containsMatch } = await supabase
    .from('startup_uploads')
    .select('id, name, website, tagline, sectors, stage, total_god_score, status')
    .ilike('website', `%${n.domain}%`)
    .limit(1)
    .maybeSingle();

  if (containsMatch) {
    return { startup: containsMatch as ResolvedStartup, confidence: 'contains_domain' };
  }

  // 5) Create provisional startup
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
    console.log('  ❌ Failed to create startup:', error.message);
    return null;
  }

  return { startup: created as ResolvedStartup, confidence: 'created_provisional' };
}

interface InvestorMatch {
  investor_id: string;
  investor_name: string;
  firm?: string;
  score: number;
  reasons: string[];
  sectors?: string[];
  stage?: string[];
}

function generateReasons(startup: any, investor: any, score: number): string[] {
  const reasons: string[] = [];

  const startupSectors = startup?.sectors || [];
  const investorSectors = investor?.sectors || [];
  const sectorOverlap = startupSectors.filter((s: string) =>
    investorSectors.some((is: string) => 
      is?.toLowerCase().includes(s?.toLowerCase()) || 
      s?.toLowerCase().includes(is?.toLowerCase())
    )
  );
  if (sectorOverlap.length > 0) {
    reasons.push(`🎯 Invests in ${sectorOverlap[0]}`);
  }

  const investorStages = investor?.stage || [];
  if (investorStages.length > 0) {
    const stageNames = ['', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+'];
    const startupStageName = stageNames[startup?.stage] || 'Early stage';
    if (investorStages.some((s: string) => s?.toLowerCase().includes('seed'))) {
      reasons.push(`📈 Active at ${startupStageName}`);
    }
  }

  if (score >= 85) {
    reasons.push(`⭐ Exceptional thesis alignment`);
  } else if (score >= 75) {
    reasons.push(`✨ Strong investment fit`);
  } else if (score >= 65) {
    reasons.push(`🤝 Good portfolio match`);
  }

  return reasons.slice(0, 4);
}

async function getInvestorMatchesForStartup(
  startupId: string,
  startup: any,
  options: { limit?: number; minScore?: number } = {}
): Promise<InvestorMatch[]> {
  const { limit = 50, minScore = 20 } = options;

  // First try: Pre-computed matches (using separate queries to avoid FK join issue)
  const { data: matchData, error: matchError } = await supabase
    .from('startup_investor_matches')
    .select('match_score, reasoning, investor_id')
    .eq('startup_id', startupId)
    .gte('match_score', minScore)
    .order('match_score', { ascending: false })
    .limit(limit);

  if (matchData && matchData.length > 0) {
    // Get investor details in a separate query
    const investorIds = matchData.map(m => m.investor_id).filter((id): id is string => Boolean(id));
    const { data: investors } = await supabase
      .from('investors')
      .select('id, name, firm, sectors, stage, check_size_min, check_size_max')
      .in('id', investorIds);

    const investorMap = new Map((investors as any[] || []).map(inv => [inv.id, inv]));

    console.log(`  ✅ Found ${matchData.length} pre-computed matches`);
    return matchData.map((m: any) => {
      const investor = investorMap.get(m.investor_id) as any;
      return {
        investor_id: m.investor_id,
        investor_name: investor?.name || 'Unknown Investor',
        firm: investor?.firm,
        score: m.match_score || 0,
        reasons: m.reasoning || generateReasons(startup, investor, m.match_score || 0),
        sectors: investor?.sectors,
        stage: investor?.stage,
      };
    });
  }

  // Fallback: Real-time scoring
  console.log('  ⚡ No pre-computed matches, doing real-time scoring...');

  const { data: investors } = await supabase
    .from('investors')
    .select('id, name, firm, sectors, stage, check_size_min, check_size_max')
    .limit(200);

  if (!investors) return [];

  const startupSectors = startup?.sectors || ['Technology'];
  const startupStage = startup?.stage || 1;

  const scoredMatches = investors.map((inv: any) => {
    let score = 50;

    // Sector fit (0-30 points)
    const investorSectors = inv.sectors || [];
    const sectorOverlap = startupSectors.filter((s: string) =>
      investorSectors.some((is: string) => 
        is?.toLowerCase().includes(s?.toLowerCase()) || 
        s?.toLowerCase().includes(is?.toLowerCase())
      )
    );
    score += Math.min(sectorOverlap.length * 15, 30);

    // Stage fit (0-20 points)
    const investorStages = inv.stage || [];
    const stageNames = ['', 'pre-seed', 'seed', 'series a', 'series b', 'series c'];
    const startupStageName = stageNames[startupStage]?.toLowerCase() || 'seed';
    if (investorStages.some((s: string) => s?.toLowerCase().includes(startupStageName))) {
      score += 20;
    } else if (investorStages.length > 0) {
      score += 5;
    }

    return {
      investor_id: inv.id,
      investor_name: inv.name || 'Unknown',
      firm: inv.firm,
      score: Math.min(score, 98),
      reasons: generateReasons(startup, inv, score),
      sectors: inv.sectors,
      stage: inv.stage,
    };
  });

  return scoredMatches
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ============================================
// TEST CASES
// ============================================

interface TestResult {
  url: string;
  resolved: boolean;
  confidence?: string;
  startupName?: string;
  startupId?: string;
  godScore?: number;
  matchCount: number;
  topMatchScore?: number;
  topMatchInvestor?: string;
  error?: string;
  duration: number;
}

async function runTest(url: string): Promise<TestResult> {
  const start = Date.now();
  
  try {
    console.log(`\n🔍 Testing: ${url}`);
    
    // Step 1: Resolve URL
    const result = await resolveStartupFromUrl(url);
    
    if (!result) {
      return {
        url,
        resolved: false,
        matchCount: 0,
        error: 'Failed to resolve URL',
        duration: Date.now() - start
      };
    }
    
    console.log(`  ✅ Resolved: ${result.startup.name} (${result.confidence})`);
    console.log(`  📊 GOD Score: ${result.startup.total_god_score}`);
    
    // Step 2: Get matches
    const matches = await getInvestorMatchesForStartup(
      result.startup.id,
      result.startup,
      { limit: 10, minScore: 20 }
    );
    
    console.log(`  🎯 Matches: ${matches.length}`);
    if (matches.length > 0) {
      console.log(`  🏆 Top match: ${matches[0].investor_name} (${matches[0].score})`);
      if (matches[0].reasons?.length > 0) {
        console.log(`     Reason: ${matches[0].reasons[0]}`);
      }
    }
    
    return {
      url,
      resolved: true,
      confidence: result.confidence,
      startupName: result.startup.name || undefined,
      startupId: result.startup.id,
      godScore: result.startup.total_god_score || undefined,
      matchCount: matches.length,
      topMatchScore: matches[0]?.score,
      topMatchInvestor: matches[0]?.investor_name,
      duration: Date.now() - start
    };
    
  } catch (err: any) {
    console.log(`  ❌ Error: ${err.message}`);
    return {
      url,
      resolved: false,
      matchCount: 0,
      error: err.message,
      duration: Date.now() - start
    };
  }
}

async function runRepeatabilityTest(url: string, iterations: number = 3): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 REPEATABILITY TEST: ${url}`);
  console.log(`   Running ${iterations} iterations...`);
  console.log('='.repeat(60));
  
  const results: TestResult[] = [];
  
  for (let i = 0; i < iterations; i++) {
    console.log(`\n--- Iteration ${i + 1}/${iterations} ---`);
    const result = await runTest(url);
    results.push(result);
    
    // Small delay between tests
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Analyze repeatability
  console.log(`\n📊 REPEATABILITY ANALYSIS:`);
  
  const allResolved = results.every(r => r.resolved);
  console.log(`   All resolved: ${allResolved ? '✅ YES' : '❌ NO'}`);
  
  const startupIds = [...new Set(results.map(r => r.startupId).filter(Boolean))];
  console.log(`   Consistent startup ID: ${startupIds.length === 1 ? '✅ YES' : '❌ NO'} (${startupIds.length} unique)`);
  
  const matchCounts = results.map(r => r.matchCount);
  const avgMatches = matchCounts.reduce((a, b) => a + b, 0) / matchCounts.length;
  const matchVariance = matchCounts.every(c => c === matchCounts[0]);
  console.log(`   Match counts: ${matchCounts.join(', ')} (avg: ${avgMatches.toFixed(1)})`);
  console.log(`   Consistent match count: ${matchVariance ? '✅ YES' : '⚠️ VARIES'}`);
  
  const topScores = results.map(r => r.topMatchScore).filter(Boolean) as number[];
  if (topScores.length > 0) {
    const scoreVariance = Math.max(...topScores) - Math.min(...topScores);
    console.log(`   Top scores: ${topScores.join(', ')} (variance: ${scoreVariance})`);
    console.log(`   Score stability: ${scoreVariance <= 5 ? '✅ STABLE' : '⚠️ VARIES'}`);
  }
  
  const durations = results.map(r => r.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  console.log(`   Avg duration: ${avgDuration.toFixed(0)}ms`);
}

async function cleanupTestStartup(url: string): Promise<void> {
  const n = normalizeUrl(url);
  if (!n) return;
  
  // Delete test startup if it was created
  const { data: existing } = await supabase
    .from('startup_uploads')
    .select('id, name')
    .ilike('website', `%${n.domain}%`)
    .eq('source_type', 'url')
    .maybeSingle();
  
  if (existing) {
    console.log(`\n🧹 Cleaning up test startup: ${existing.name} (${existing.id})`);
    
    // Delete any matches first
    await supabase
      .from('startup_investor_matches')
      .delete()
      .eq('startup_id', existing.id);
    
    // Delete the startup
    await supabase
      .from('startup_uploads')
      .delete()
      .eq('id', existing.id);
    
    console.log('   ✅ Cleaned up');
  }
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function main() {
  console.log('🔮 PYTH URL SUBMISSION TEST SUITE');
  console.log('==================================\n');
  
  // Test URLs
  const testUrls = {
    // Existing startup (should find exact match)
    existing: 'swiftsense.com',
    
    // New startup (should create provisional)
    new: 'fastshot.ai',
    
    // Another test URL
    another: 'example-startup-test-12345.com',
  };
  
  // Test 1: Existing startup (repeatability)
  console.log('\n📌 TEST 1: Existing Startup Lookup');
  await runRepeatabilityTest(testUrls.existing, 3);
  
  // Test 2: New startup creation
  console.log('\n📌 TEST 2: New Startup Creation');
  
  // First clean up any existing test data
  await cleanupTestStartup(testUrls.new);
  
  // Run the test
  const newResult1 = await runTest(testUrls.new);
  
  // Run again - should find the same startup now
  console.log('\n   Re-running to verify consistency...');
  const newResult2 = await runTest(testUrls.new);
  
  console.log('\n📊 NEW STARTUP TEST ANALYSIS:');
  console.log(`   First run confidence: ${newResult1.confidence}`);
  console.log(`   Second run confidence: ${newResult2.confidence}`);
  console.log(`   Same startup ID: ${newResult1.startupId === newResult2.startupId ? '✅ YES' : '❌ NO'}`);
  console.log(`   Expected: First='created_provisional', Second='exact_domain' or 'contains_domain'`);
  
  // Test 3: Error handling
  console.log('\n📌 TEST 3: Error Handling');
  
  const invalidUrls = [
    '',  // Empty
    'not-a-url',  // Invalid
    'http://',  // Incomplete
  ];
  
  for (const url of invalidUrls) {
    console.log(`\n   Testing invalid URL: "${url || '(empty)'}"`);
    const result = await runTest(url || 'invalid');
    console.log(`   Result: ${result.resolved ? 'Resolved (unexpected)' : 'Failed (expected)'}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`
Key metrics to check:
1. Existing startups should resolve with 'exact_domain' confidence
2. New startups should be created with 'created_provisional' confidence
3. Re-querying the same URL should find the existing record
4. Match counts should be consistent across runs
5. GOD scores should come from database (not random)
6. Invalid URLs should fail gracefully
`);
  
  // Cleanup
  console.log('\n🧹 Cleaning up test data...');
  await cleanupTestStartup(testUrls.new);
  await cleanupTestStartup(testUrls.another);
  
  console.log('\n✅ Tests complete!');
}

main().catch(console.error);
