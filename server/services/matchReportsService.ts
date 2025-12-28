/**
 * Match Reports Service
 * 
 * Generates reports, summaries, and exports for matches
 * (CSV, JSON, and formatted summaries)
 */

import { supabase } from '../config/supabase';
import { searchStartupMatches, MatchSearchResult } from './startupMatchSearchService';
import { searchInvestorMatches, InvestorMatchResult } from './investorMatchSearchService';
import { getStartupMatchStats } from './startupMatchSearchService';
import { getInvestorMatchStats } from './investorMatchSearchService';

export interface MatchReport {
  generated_at: string;
  entity_type: 'startup' | 'investor';
  entity_id: string;
  entity_name: string;
  summary: {
    total_matches: number;
    high_confidence: number;
    medium_confidence: number;
    low_confidence: number;
    average_score: number;
    date_range: {
      start: string;
      end: string;
    };
  };
  top_matches: any[];
  insights: string[];
  recommendations: string[];
}

/**
 * Generate comprehensive match report for a startup
 */
export async function generateStartupMatchReport(
  startupId: string,
  options: {
    includeAllMatches?: boolean;
    minScore?: number;
    format?: 'json' | 'summary';
  } = {}
): Promise<MatchReport> {
  try {
    const { includeAllMatches = false, minScore = 50, format = 'json' } = options;

    // Get startup info
    const { data: startup, error: startupError } = await supabase
      .from('startup_uploads')
      .select('id, name')
      .eq('id', startupId)
      .single();

    if (startupError) throw startupError;

    // Get matches
    const { matches, total } = await searchStartupMatches(startupId, {
      minScore,
      sortBy: 'score',
      sortOrder: 'desc',
      limit: includeAllMatches ? 1000 : 50,
    });

    // Get stats
    const stats = await getStartupMatchStats(startupId);

    // Get top matches
    const topMatches = matches.slice(0, 10).map(m => ({
      investor_name: m.investor.name,
      investor_firm: m.investor.firm,
      match_score: m.match_score,
      confidence_level: m.confidence_level,
      investor_tier: m.investor.investor_tier,
      check_size_range: m.investor.check_size_min && m.investor.check_size_max
        ? `$${(m.investor.check_size_min / 1000000).toFixed(1)}M - $${(m.investor.check_size_max / 1000000).toFixed(1)}M`
        : 'N/A',
      sectors: m.investor.sectors?.join(', ') || 'N/A',
      reasoning: m.reasoning?.substring(0, 150) || 'N/A',
    }));

    // Generate insights
    const insights: string[] = [];
    if (stats.highConfidence > 0) {
      insights.push(`${stats.highConfidence} high-confidence matches (70+ score)`);
    }
    if (stats.averageScore > 60) {
      insights.push(`Strong average match score: ${stats.averageScore}`);
    }
    if (stats.topSectors.length > 0) {
      insights.push(`Top matched sectors: ${stats.topSectors.slice(0, 3).map(s => s.sector).join(', ')}`);
    }
    if (stats.topInvestorTiers.length > 0) {
      const eliteCount = stats.topInvestorTiers.find(t => t.tier === 'elite')?.count || 0;
      if (eliteCount > 0) {
        insights.push(`${eliteCount} matches with elite-tier investors`);
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (stats.highConfidence < total * 0.2) {
      recommendations.push('Focus on improving startup profile to increase high-confidence matches');
    }
    if (stats.averageScore < 55) {
      recommendations.push('Review and update key startup metrics (revenue, growth, team)');
    }
    if (stats.topSectors.length > 0 && stats.topSectors[0].count > total * 0.5) {
      recommendations.push('Consider diversifying investor outreach beyond top sector');
    }
    recommendations.push('Prioritize outreach to high-confidence matches first');
    recommendations.push('Research investor portfolios for connection opportunities');

    const report: MatchReport = {
      generated_at: new Date().toISOString(),
      entity_type: 'startup',
      entity_id: startupId,
      entity_name: startup?.name || 'Unknown',
      summary: {
        total_matches: total,
        high_confidence: stats.highConfidence,
        medium_confidence: stats.mediumConfidence,
        low_confidence: stats.lowConfidence,
        average_score: stats.averageScore,
        date_range: {
          start: matches.length > 0 ? matches[matches.length - 1].created_at : new Date().toISOString(),
          end: matches.length > 0 ? matches[0].created_at : new Date().toISOString(),
        },
      },
      top_matches: topMatches,
      insights,
      recommendations,
    };

    if (format === 'summary') {
      return formatReportAsSummary(report);
    }

    return report;
  } catch (error) {
    console.error('Error generating startup match report:', error);
    throw error;
  }
}

/**
 * Generate comprehensive match report for an investor
 */
export async function generateInvestorMatchReport(
  investorId: string,
  options: {
    includeAllMatches?: boolean;
    minScore?: number;
    format?: 'json' | 'summary';
  } = {}
): Promise<MatchReport> {
  try {
    const { includeAllMatches = false, minScore = 50, format = 'json' } = options;

    // Get investor info
    const { data: investor, error: investorError } = await supabase
      .from('investors')
      .select('id, name, firm')
      .eq('id', investorId)
      .single();

    if (investorError) throw investorError;

    // Get matches
    const { matches, total } = await searchInvestorMatches(investorId, {
      minScore,
      sortBy: 'score',
      sortOrder: 'desc',
      limit: includeAllMatches ? 1000 : 50,
    });

    // Get stats
    const stats = await getInvestorMatchStats(investorId);

    // Get top matches
    const topMatches = matches.slice(0, 10).map(m => ({
      startup_name: m.startup.name,
      match_score: m.match_score,
      confidence_level: m.confidence_level,
      god_score: m.startup.total_god_score,
      sectors: m.startup.sectors?.join(', ') || 'N/A',
      stage: m.startup.stage === 1 ? 'Pre-seed' : m.startup.stage === 2 ? 'Seed' : `Series ${String.fromCharCode(64 + (m.startup.stage || 2))}`,
      location: m.startup.location || 'N/A',
      traction: m.startup.mrr || m.startup.arr
        ? `$${((m.startup.mrr || m.startup.arr || 0) / 1000).toFixed(0)}K ${m.startup.mrr ? 'MRR' : 'ARR'}`
        : 'N/A',
      reasoning: m.reasoning?.substring(0, 150) || 'N/A',
    }));

    // Generate insights
    const insights: string[] = [];
    if (stats.highConfidence > 0) {
      insights.push(`${stats.highConfidence} high-confidence matches (70+ score)`);
    }
    if (stats.averageGODScore > 70) {
      insights.push(`Strong average startup GOD score: ${stats.averageGODScore.toFixed(1)}`);
    }
    if (stats.topSectors.length > 0) {
      insights.push(`Top matched sectors: ${stats.topSectors.slice(0, 3).map(s => s.sector).join(', ')}`);
    }
    if (stats.topStages.length > 0) {
      insights.push(`Most matches at ${stats.topStages[0].stage} stage`);
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (stats.highConfidence < total * 0.2) {
      recommendations.push('Review investment criteria to increase high-confidence matches');
    }
    if (stats.averageGODScore < 65) {
      recommendations.push('Consider adjusting filters to focus on higher-quality startups');
    }
    if (stats.topSectors.length > 0 && stats.topSectors[0].count > total * 0.5) {
      recommendations.push('Strong sector concentration - consider diversifying if desired');
    }
    recommendations.push('Prioritize outreach to high-confidence, high-GOD-score matches');
    recommendations.push('Review startup traction metrics for investment readiness');

    const report: MatchReport = {
      generated_at: new Date().toISOString(),
      entity_type: 'investor',
      entity_id: investorId,
      entity_name: `${investor?.name} (${investor?.firm})`,
      summary: {
        total_matches: total,
        high_confidence: stats.highConfidence,
        medium_confidence: stats.mediumConfidence,
        low_confidence: stats.lowConfidence,
        average_score: stats.averageScore,
        date_range: {
          start: matches.length > 0 ? matches[matches.length - 1].created_at : new Date().toISOString(),
          end: matches.length > 0 ? matches[0].created_at : new Date().toISOString(),
        },
      },
      top_matches: topMatches,
      insights,
      recommendations,
    };

    if (format === 'summary') {
      return formatReportAsSummary(report);
    }

    return report;
  } catch (error) {
    console.error('Error generating investor match report:', error);
    throw error;
  }
}

/**
 * Format report as human-readable summary
 */
function formatReportAsSummary(report: MatchReport): any {
  const summary = `
═══════════════════════════════════════════════════════════════
MATCH REPORT: ${report.entity_name}
═══════════════════════════════════════════════════════════════
Generated: ${new Date(report.generated_at).toLocaleString()}

SUMMARY:
  Total Matches: ${report.summary.total_matches}
  High Confidence: ${report.summary.high_confidence}
  Medium Confidence: ${report.summary.medium_confidence}
  Low Confidence: ${report.summary.low_confidence}
  Average Score: ${report.summary.average_score.toFixed(1)}

TOP MATCHES:
${report.top_matches.slice(0, 5).map((m, i) => 
  `  ${i + 1}. ${report.entity_type === 'startup' ? m.investor_name : m.startup_name} - Score: ${m.match_score} (${m.confidence_level})`
).join('\n')}

INSIGHTS:
${report.insights.map(i => `  • ${i}`).join('\n')}

RECOMMENDATIONS:
${report.recommendations.map(r => `  • ${r}`).join('\n')}
`;

  return {
    ...report,
    formatted_summary: summary,
  };
}

/**
 * Export matches to CSV format
 */
export async function exportMatchesToCSV(
  entityId: string,
  entityType: 'startup' | 'investor'
): Promise<string> {
  try {
    let matches: any[];
    
    if (entityType === 'startup') {
      const result = await searchStartupMatches(entityId, { limit: 1000 });
      matches = result.matches.map(m => ({
        'Match Score': m.match_score,
        'Confidence': m.confidence_level,
        'Investor Name': m.investor.name,
        'Investor Firm': m.investor.firm,
        'Investor Tier': m.investor.investor_tier || 'N/A',
        'Check Size Min': m.investor.check_size_min ? `$${(m.investor.check_size_min / 1000000).toFixed(1)}M` : 'N/A',
        'Check Size Max': m.investor.check_size_max ? `$${(m.investor.check_size_max / 1000000).toFixed(1)}M` : 'N/A',
        'Sectors': Array.isArray(m.investor.sectors) ? m.investor.sectors.join('; ') : 'N/A',
        'Reasoning': m.reasoning?.replace(/\n/g, ' ') || 'N/A',
        'Created At': m.created_at,
      }));
    } else {
      const result = await searchInvestorMatches(entityId, { limit: 1000 });
      matches = result.matches.map(m => ({
        'Match Score': m.match_score,
        'Confidence': m.confidence_level,
        'Startup Name': m.startup.name,
        'GOD Score': m.startup.total_god_score || 'N/A',
        'Sectors': Array.isArray(m.startup.sectors) ? m.startup.sectors.join('; ') : 'N/A',
        'Stage': m.startup.stage === 1 ? 'Pre-seed' : m.startup.stage === 2 ? 'Seed' : `Series ${String.fromCharCode(64 + (m.startup.stage || 2))}`,
        'Location': m.startup.location || 'N/A',
        'MRR': m.startup.mrr ? `$${(m.startup.mrr / 1000).toFixed(0)}K` : 'N/A',
        'ARR': m.startup.arr ? `$${(m.startup.arr / 1000).toFixed(0)}K` : 'N/A',
        'Growth Rate': m.startup.growth_rate_monthly ? `${m.startup.growth_rate_monthly}%` : 'N/A',
        'Reasoning': m.reasoning?.replace(/\n/g, ' ') || 'N/A',
        'Created At': m.created_at,
      }));
    }

    // Convert to CSV
    if (matches.length === 0) {
      return 'No matches found';
    }

    const headers = Object.keys(matches[0]);
    const csvRows = [
      headers.join(','),
      ...matches.map(m => 
        headers.map(h => {
          const value = m[h];
          // Escape commas and quotes in CSV
          if (typeof value === 'string') {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      ),
    ];

    return csvRows.join('\n');
  } catch (error) {
    console.error('Error exporting matches to CSV:', error);
    throw error;
  }
}





