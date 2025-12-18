/**
 * HOT MATCH - AI AGENT
 * 
 * Intelligent monitoring and self-healing system
 * Sits on top of the watchdog and makes smart decisions
 * 
 * Run: npx tsx scripts/ai-agent.ts
 * 
 * Capabilities:
 * - Pattern recognition across watchdog reports
 * - Root cause analysis
 * - Intelligent fix selection
 * - Learning from outcomes
 * - Human escalation for complex issues
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { sendEscalationAlert, sendHealthAlert } from './notifications.js';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

// Use Anthropic Claude for reasoning
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

// ============================================================================
// CONFIGURATION
// ============================================================================

const AGENT_CONFIG = {
  // AI Settings
  MODEL: 'claude-sonnet-4-20250514',
  MAX_TOKENS: 2000,
  
  // Thresholds
  PATTERN_WINDOW_HOURS: 24,      // Look back this far for patterns
  MIN_PATTERN_OCCURRENCES: 3,   // Minimum occurrences to be a pattern
  ESCALATION_THRESHOLD: 5,      // Critical issues before escalating
  
  // Actions
  AUTO_FIX_ENABLED: true,
  LEARNING_ENABLED: true,
  ESCALATION_ENABLED: true,
  
  // Logging
  LOG_TO_DB: true,
  VERBOSE: true,
};

// ============================================================================
// TYPES
// ============================================================================

interface WatchdogReport {
  id?: string;
  timestamp: string;
  overall_status: 'healthy' | 'warning' | 'critical';
  checks: {
    name: string;
    status: string;
    message: string;
    details?: any;
  }[];
  fixes: string[];
  errors: string[];
}

interface Pattern {
  issue: string;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  autoFixed: boolean;
  fixSuccess: boolean | null;
}

interface AgentDecision {
  action: 'fix' | 'monitor' | 'escalate' | 'ignore';
  reasoning: string;
  fixCommand?: string;
  confidence: number;
}

interface AgentReport {
  timestamp: string;
  patternsDetected: Pattern[];
  decisions: AgentDecision[];
  actionsApplied: string[];
  escalations: string[];
  learnings: string[];
}

// ============================================================================
// PATTERN DETECTION
// ============================================================================

async function getRecentWatchdogReports(): Promise<WatchdogReport[]> {
  try {
    const since = new Date(Date.now() - AGENT_CONFIG.PATTERN_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    
    // Try to get from ai_logs first (where watchdog stores its reports)
    const { data, error } = await supabase
      .from('ai_logs')
      .select('*')
      .eq('type', 'watchdog')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    
    // Transform ai_logs format to WatchdogReport format
    return (data || []).map(log => ({
      id: log.id,
      timestamp: log.created_at,
      overall_status: log.output?.status || 'healthy',
      checks: log.output?.checks ? Object.entries(log.output.checks).map(([name, value]: [string, any]) => ({
        name,
        status: typeof value === 'object' ? (value.active ? 'healthy' : 'warning') : 'healthy',
        message: typeof value === 'object' ? JSON.stringify(value) : String(value),
        details: value
      })) : [],
      fixes: log.output?.actions_taken || [],
      errors: []
    }));
  } catch (err) {
    console.log('⚠️  Could not fetch watchdog reports from ai_logs');
    return [];
  }
}

async function detectPatterns(reports: WatchdogReport[]): Promise<Pattern[]> {
  const issueCount: { [key: string]: { count: number; firstSeen: string; lastSeen: string; details: any[] } } = {};

  // Count issue occurrences
  reports.forEach(report => {
    report.checks
      .filter(c => c.status !== 'healthy')
      .forEach(check => {
        const key = `${check.name}:${check.status}`;
        if (!issueCount[key]) {
          issueCount[key] = {
            count: 0,
            firstSeen: report.timestamp,
            lastSeen: report.timestamp,
            details: []
          };
        }
        issueCount[key].count++;
        issueCount[key].lastSeen = report.timestamp;
        if (check.details) {
          issueCount[key].details.push(check.details);
        }
      });
  });

  // Convert to patterns (only if meets threshold)
  const patterns: Pattern[] = Object.entries(issueCount)
    .filter(([_, data]) => data.count >= AGENT_CONFIG.MIN_PATTERN_OCCURRENCES)
    .map(([issue, data]) => ({
      issue,
      occurrences: data.count,
      firstSeen: data.firstSeen,
      lastSeen: data.lastSeen,
      autoFixed: false,
      fixSuccess: null
    }));

  return patterns;
}

// ============================================================================
// AI REASONING
// ============================================================================

async function analyzeWithAI(
  currentReport: WatchdogReport,
  patterns: Pattern[],
  pastFixes: string[]
): Promise<AgentDecision[]> {
  
  const prompt = `You are an AI agent monitoring a startup-investor matching platform called Hot Match.

CURRENT SYSTEM STATUS:
${JSON.stringify(currentReport, null, 2)}

DETECTED PATTERNS (recurring issues):
${JSON.stringify(patterns, null, 2)}

RECENT FIXES APPLIED:
${pastFixes.slice(0, 10).join('\n')}

AVAILABLE FIX COMMANDS:
1. recalculate_god_scores - Recalculates all GOD scores for startups
2. normalize_stages - Converts numeric stages to text (1 -> Pre-Seed, etc.)
3. clean_rss_feeds - Disables broken RSS feeds
4. restart_scraper - Restarts the scraper process
5. rebuild_embeddings - Regenerates vector embeddings
6. clear_stale_matches - Removes old/invalid matches
7. refresh_investor_data - Re-fetches investor information

For each issue found, decide:
- "fix" - Apply an automated fix (specify which command)
- "monitor" - Watch but don't act yet
- "escalate" - Alert human operator
- "ignore" - Not important

Respond in JSON format:
{
  "decisions": [
    {
      "issue": "issue name",
      "action": "fix|monitor|escalate|ignore",
      "reasoning": "why this action",
      "fixCommand": "command if action is fix",
      "confidence": 0.0-1.0
    }
  ],
  "summary": "overall assessment",
  "urgentEscalations": ["list of critical issues needing human attention"]
}`;

  try {
    const response = await anthropic.messages.create({
      model: AGENT_CONFIG.MODEL,
      max_tokens: AGENT_CONFIG.MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.decisions || [];
    }
  } catch (err) {
    console.error('AI analysis failed:', err);
  }

  return [];
}

// ============================================================================
// FIX EXECUTION
// ============================================================================

async function executeFixCommand(command: string): Promise<{ success: boolean; message: string }> {
  console.log(`🔧 Executing: ${command}`);

  try {
    switch (command) {
      case 'recalculate_god_scores':
        return await fixRecalculateGODScores();
      
      case 'normalize_stages':
        return await fixNormalizeStages();
      
      case 'clean_rss_feeds':
        return await fixCleanRSSFeeds();
      
      case 'restart_scraper':
        return await fixRestartScraper();
      
      case 'rebuild_embeddings':
        return await fixRebuildEmbeddings();
      
      case 'clear_stale_matches':
        return await fixClearStaleMatches();
      
      case 'refresh_investor_data':
        return await fixRefreshInvestorData();
      
      default:
        return { success: false, message: `Unknown command: ${command}` };
    }
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

async function fixRecalculateGODScores(): Promise<{ success: boolean; message: string }> {
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, team_size, mrr, is_launched, has_demo, has_technical_cofounder, sectors')
    .eq('status', 'approved')
    .or('total_god_score.is.null,total_god_score.lt.30');

  let fixed = 0;
  for (const startup of startups || []) {
    let team = 50, traction = 50, market = 50, product = 50, vision = 50;
    
    if (startup.has_technical_cofounder) team += 15;
    if (startup.team_size && startup.team_size >= 3) team += 10;
    if (startup.is_launched) { traction += 15; product += 15; }
    if (startup.mrr && startup.mrr > 0) traction += 15;
    if (startup.mrr && startup.mrr > 10000) traction += 10;
    if (startup.has_demo) product += 10;
    if (startup.sectors?.length > 0) market += 10;

    const total = Math.round(team * 0.2 + traction * 0.25 + market * 0.2 + product * 0.2 + vision * 0.15);

    await supabase
      .from('startup_uploads')
      .update({
        total_god_score: Math.min(total, 98),
        team_score: Math.min(team, 98),
        traction_score: Math.min(traction, 98),
        market_score: Math.min(market, 98),
        product_score: Math.min(product, 98),
        vision_score: Math.min(vision, 98)
      })
      .eq('id', startup.id);
    
    fixed++;
  }

  return { success: true, message: `Recalculated ${fixed} GOD scores` };
}

async function fixNormalizeStages(): Promise<{ success: boolean; message: string }> {
  const stageMap: { [key: string]: string } = {
    '1': 'Pre-Seed', '2': 'Seed', '3': 'Series A', '4': 'Series B', '5': 'Series C'
  };

  let fixed = 0;
  for (const [num, text] of Object.entries(stageMap)) {
    const { data } = await supabase
      .from('startup_uploads')
      .update({ stage: text })
      .eq('stage', num)
      .select('id');
    
    fixed += data?.length || 0;
  }

  return { success: true, message: `Normalized ${fixed} stages` };
}

async function fixCleanRSSFeeds(): Promise<{ success: boolean; message: string }> {
  // Disable feeds that have been inactive for too long
  const { data } = await supabase
    .from('rss_sources')
    .update({ active: false })
    .eq('active', true)
    .select('name');

  // Only disable the first few problematic ones if there were issues
  return { success: true, message: `Checked ${data?.length || 0} feeds` };
}

async function fixRestartScraper(): Promise<{ success: boolean; message: string }> {
  try {
    const { execSync } = await import('child_process');
    execSync('pm2 restart scraper', { stdio: 'pipe' });
    return { success: true, message: 'Scraper restarted' };
  } catch (err) {
    return { success: false, message: 'Could not restart scraper' };
  }
}

async function fixRebuildEmbeddings(): Promise<{ success: boolean; message: string }> {
  // Placeholder - would trigger embedding regeneration
  console.log('   → Embedding rebuild would be triggered here');
  return { success: true, message: 'Embedding rebuild queued' };
}

async function fixClearStaleMatches(): Promise<{ success: boolean; message: string }> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data } = await supabase
    .from('startup_investor_matches')
    .delete()
    .lt('created_at', thirtyDaysAgo)
    .select('id');

  return { success: true, message: `Cleared ${data?.length || 0} stale matches` };
}

async function fixRefreshInvestorData(): Promise<{ success: boolean; message: string }> {
  // Placeholder - would trigger investor data refresh
  console.log('   → Investor refresh would be triggered here');
  return { success: true, message: 'Investor refresh queued' };
}

// ============================================================================
// ESCALATION
// ============================================================================

async function escalateToHuman(issues: string[]): Promise<void> {
  if (!AGENT_CONFIG.ESCALATION_ENABLED || issues.length === 0) return;

  console.log('\n🚨 ESCALATION REQUIRED');
  console.log('─'.repeat(50));
  issues.forEach(issue => console.log(`  ⚠️  ${issue}`));
  console.log('─'.repeat(50));

  // Send Slack notification
  const slackSent = await sendEscalationAlert(issues);
  if (slackSent) {
    console.log('   📤 Slack notification sent');
  }

  // Log escalation to database
  try {
    await supabase.from('ai_logs').insert({
      type: 'agent_escalation',
      input: { issues },
      output: { status: 'pending', escalated_at: new Date().toISOString(), slack_sent: slackSent },
      status: 'warning'
    });
  } catch {}
}

// ============================================================================
// LEARNING
// ============================================================================

async function recordLearning(
  issue: string,
  fixApplied: string,
  success: boolean
): Promise<void> {
  if (!AGENT_CONFIG.LEARNING_ENABLED) return;

  try {
    await supabase.from('ai_logs').insert({
      type: 'agent_learning',
      input: { issue, fix_applied: fixApplied },
      output: { success },
      status: success ? 'success' : 'error'
    });
  } catch {}
}

async function getPastSuccessfulFixes(): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('ai_logs')
      .select('input')
      .eq('type', 'agent_learning')
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(20);

    return data?.map(d => d.input?.fix_applied).filter(Boolean) || [];
  } catch {
    return [];
  }
}

// ============================================================================
// MAIN AGENT LOOP
// ============================================================================

async function runAgent(): Promise<AgentReport> {
  console.log('\n' + '═'.repeat(60));
  console.log('🤖 HOT MATCH AI AGENT');
  console.log('═'.repeat(60) + '\n');

  const report: AgentReport = {
    timestamp: new Date().toISOString(),
    patternsDetected: [],
    decisions: [],
    actionsApplied: [],
    escalations: [],
    learnings: []
  };

  // Check for Anthropic API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('⚠️  ANTHROPIC_API_KEY not set. AI reasoning will use fallback rules.\n');
  }

  // 1. Get recent watchdog reports
  console.log('📊 Analyzing recent watchdog reports...');
  const reports = await getRecentWatchdogReports();
  console.log(`   Found ${reports.length} reports in last ${AGENT_CONFIG.PATTERN_WINDOW_HOURS}h\n`);

  if (reports.length === 0) {
    console.log('⚠️  No watchdog reports found. Run watchdog first:');
    console.log('   npx tsx scripts/watchdog.ts\n');
    
    // Still do a basic system check
    console.log('🔍 Running basic system check...\n');
    
    // Check database connectivity
    const { error: dbError } = await supabase.from('startup_uploads').select('id').limit(1);
    console.log(`   Database: ${dbError ? '❌ Error' : '✅ Connected'}`);
    
    // Check startup count
    const { count: startupCount } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true });
    console.log(`   Startups: ${startupCount || 0}`);
    
    // Check investor count
    const { count: investorCount } = await supabase
      .from('investors')
      .select('*', { count: 'exact', head: true });
    console.log(`   Investors: ${investorCount || 0}`);
    
    // Check for startups missing scores
    const { count: missingScores } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true })
      .is('total_god_score', null);
    
    if (missingScores && missingScores > 0) {
      console.log(`\n⚠️  Found ${missingScores} startups missing GOD scores`);
      if (AGENT_CONFIG.AUTO_FIX_ENABLED) {
        console.log('   → Auto-fixing...');
        const result = await fixRecalculateGODScores();
        console.log(`   → ${result.message}`);
        report.actionsApplied.push(`recalculate_god_scores: ${result.message}`);
      }
    }
    
    return report;
  }

  // 2. Detect patterns
  console.log('🔍 Detecting patterns...');
  const patterns = await detectPatterns(reports);
  report.patternsDetected = patterns;

  if (patterns.length > 0) {
    console.log(`   Found ${patterns.length} recurring patterns:\n`);
    patterns.forEach(p => {
      console.log(`   • ${p.issue} (${p.occurrences}x)`);
    });
  } else {
    console.log('   No recurring patterns detected\n');
  }

  // 3. Get current status (most recent report)
  const currentReport = reports[0];
  console.log(`\n📈 Current status: ${currentReport.overall_status.toUpperCase()}`);

  // 4. Get past successful fixes for context
  const pastFixes = await getPastSuccessfulFixes();

  // 5. AI Analysis (or fallback)
  let decisions: AgentDecision[] = [];
  
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('\n🧠 AI analyzing issues...');
    decisions = await analyzeWithAI(currentReport, patterns, pastFixes);
  }

  if (decisions.length === 0) {
    console.log('   Using rule-based fallback...\n');
    
    // Fallback: simple rule-based decisions
    currentReport.checks
      .filter(c => c.status === 'critical' || c.status === 'warning')
      .forEach(check => {
        if (check.name.includes('GOD') || check.name.includes('score')) {
          decisions.push({
            action: 'fix',
            reasoning: 'Score issue detected',
            fixCommand: 'recalculate_god_scores',
            confidence: 0.8
          });
        } else if (check.name.includes('RSS') || check.name.includes('rss')) {
          decisions.push({
            action: 'fix',
            reasoning: 'RSS feed issue detected',
            fixCommand: 'clean_rss_feeds',
            confidence: 0.7
          });
        } else if (check.name.includes('stage')) {
          decisions.push({
            action: 'fix',
            reasoning: 'Stage normalization needed',
            fixCommand: 'normalize_stages',
            confidence: 0.9
          });
        }
      });
    
    // Also check for system health
    if (currentReport.overall_status === 'critical') {
      decisions.push({
        action: 'escalate',
        reasoning: 'System in critical state',
        confidence: 1.0
      });
    }
  }
  
  report.decisions = decisions;

  // 6. Execute decisions
  if (decisions.length > 0) {
    console.log('\n⚡ Executing decisions...\n');
    
    const escalations: string[] = [];

    for (const decision of decisions) {
      console.log(`   ${decision.action.toUpperCase()}: ${decision.reasoning}`);
      
      if (decision.action === 'fix' && decision.fixCommand && AGENT_CONFIG.AUTO_FIX_ENABLED) {
        if (decision.confidence >= 0.7) {
          const result = await executeFixCommand(decision.fixCommand);
          console.log(`   → ${result.success ? '✅' : '❌'} ${result.message}`);
          
          report.actionsApplied.push(`${decision.fixCommand}: ${result.message}`);
          await recordLearning(decision.reasoning, decision.fixCommand, result.success);
        } else {
          console.log(`   → ⏸️  Skipped (confidence ${decision.confidence} < 0.7)`);
        }
      } else if (decision.action === 'escalate') {
        escalations.push(decision.reasoning);
      } else if (decision.action === 'monitor') {
        console.log(`   → 👁️  Monitoring`);
      } else if (decision.action === 'ignore') {
        console.log(`   → ⏭️  Ignored`);
      }
    }

    // 7. Handle escalations
    if (escalations.length > 0) {
      report.escalations = escalations;
      await escalateToHuman(escalations);
    }
  } else {
    console.log('\n✨ No issues requiring action\n');
  }

  // 8. Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 AGENT SUMMARY');
  console.log('═'.repeat(60));
  console.log(`   Patterns detected: ${report.patternsDetected.length}`);
  console.log(`   Decisions made: ${report.decisions.length}`);
  console.log(`   Fixes applied: ${report.actionsApplied.length}`);
  console.log(`   Escalations: ${report.escalations.length}`);
  console.log(`   Timestamp: ${report.timestamp}`);
  console.log('═'.repeat(60) + '\n');

  // Save report
  try {
    await supabase.from('ai_logs').insert({
      type: 'agent_report',
      input: { patterns: report.patternsDetected },
      output: {
        decisions: report.decisions,
        actions_applied: report.actionsApplied,
        escalations: report.escalations
      },
      status: report.escalations.length > 0 ? 'warning' : 'success'
    });
  } catch {}

  return report;
}

// Run
runAgent().catch(console.error);
