import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HamburgerMenu from '../components/HamburgerMenu';

interface AnalyticsData {
  totalStartups: number;
  totalVotes: number;
  industries: { [key: string]: number };
  stages: { [key: string]: number };
  fundingRanges: { [key: string]: number };
  avgHotness: number;
  topPerformers: any[];
  commonProblems: string[];
  commonSolutions: string[];
  teamBackgrounds: { [key: string]: number };
  votingPatterns: {
    avgYesRate: number;
    avgNoRate: number;
    mostControversial: any[];
  };
  timelineData: {
    uploadsPerDay: { [key: string]: number };
    votesPerDay: { [key: string]: number };
  };
}

export default function Analytics() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeData();
  }, []);

  const analyzeData = () => {
    setLoading(true);

    // Get all startups from localStorage
    const uploadedStartups = localStorage.getItem('uploadedStartups');
    const startups = uploadedStartups ? JSON.parse(uploadedStartups) : [];

    if (startups.length === 0) {
      setAnalytics(null);
      setLoading(false);
      return;
    }

    // Initialize analytics object
    const data: AnalyticsData = {
      totalStartups: startups.length,
      totalVotes: 0,
      industries: {},
      stages: {},
      fundingRanges: {},
      avgHotness: 0,
      topPerformers: [],
      commonProblems: [],
      commonSolutions: [],
      teamBackgrounds: {},
      votingPatterns: {
        avgYesRate: 0,
        avgNoRate: 0,
        mostControversial: []
      },
      timelineData: {
        uploadsPerDay: {},
        votesPerDay: {}
      }
    };

    let totalHotness = 0;
    let totalYesVotes = 0;
    let totalNoVotes = 0;
    const allProblemStatements: string[] = [];
    const allSolutionStatements: string[] = [];

    startups.forEach((startup: any) => {
      // Industry analysis
      if (startup.industries && Array.isArray(startup.industries)) {
        startup.industries.forEach((industry: string) => {
          data.industries[industry] = (data.industries[industry] || 0) + 1;
        });
      } else if (startup.industry) {
        data.industries[startup.industry] = (data.industries[startup.industry] || 0) + 1;
      }

      // Stage analysis
      const stageName = startup.stage === 1 ? 'Pre-Seed/Seed' : startup.stage === 2 ? 'Series A' : 'Series B+';
      data.stages[stageName] = (data.stages[stageName] || 0) + 1;

      // Funding range analysis
      const funding = startup.funding || startup.raise || 'Unknown';
      const fundingRange = categorizeFunding(funding);
      data.fundingRanges[fundingRange] = (data.fundingRanges[fundingRange] || 0) + 1;

      // Votes and hotness
      const yesVotes = startup.yesVotes || 0;
      const noVotes = startup.noVotes || 0;
      totalYesVotes += yesVotes;
      totalNoVotes += noVotes;
      data.totalVotes += yesVotes + noVotes;
      totalHotness += startup.hotness || 0;

      // Collect ALL problem and solution statements for analysis
      if (startup.fivePoints && Array.isArray(startup.fivePoints)) {
        // Problem statement (first point)
        if (startup.fivePoints[0]) {
          const problemText = startup.fivePoints[0].trim();
          // Only include real problem statements (not generic fallback text)
          if (problemText.length > 20 && 
              !problemText.toLowerCase().includes('solving a major') &&
              !problemText.toLowerCase().includes('innovative')) {
            allProblemStatements.push(problemText);
          }
        }
        // Solution statement (second point)
        if (startup.fivePoints[1]) {
          const solutionText = startup.fivePoints[1].trim();
          // Only include real solution statements
          if (solutionText.length > 20 && 
              !solutionText.toLowerCase().includes('technology solution') &&
              !solutionText.toLowerCase().includes('innovative')) {
            allSolutionStatements.push(solutionText);
          }
        }
        // Team backgrounds (fourth point)
        if (startup.fivePoints[3]) {
          extractTeamBackgrounds(startup.fivePoints[3], data.teamBackgrounds);
        }
      }
    });

    // Calculate averages
    data.avgHotness = startups.length > 0 ? totalHotness / startups.length : 0;
    data.votingPatterns.avgYesRate = data.totalVotes > 0 ? (totalYesVotes / data.totalVotes) * 100 : 0;
    data.votingPatterns.avgNoRate = data.totalVotes > 0 ? (totalNoVotes / data.totalVotes) * 100 : 0;

    // Top performers
    data.topPerformers = startups
      .sort((a: any, b: any) => (b.hotness || 0) - (a.hotness || 0))
      .slice(0, 10);

    // Most controversial (close yes/no split)
    data.votingPatterns.mostControversial = startups
      .filter((s: any) => (s.yesVotes || 0) > 0 && (s.noVotes || 0) > 0)
      .map((s: any) => ({
        ...s,
        controversy: Math.abs((s.yesVotes || 0) - (s.noVotes || 0)) / ((s.yesVotes || 0) + (s.noVotes || 0))
      }))
      .sort((a: any, b: any) => a.controversy - b.controversy)
      .slice(0, 5);

    // Analyze problem themes and return top 5 with examples
    data.commonProblems = analyzeProblemThemes(allProblemStatements);
    data.commonSolutions = analyzeSolutionThemes(allSolutionStatements);

    setAnalytics(data);
    setLoading(false);
  };

  const categorizeFunding = (funding: string): string => {
    const amount = funding.toLowerCase();
    if (amount.includes('pre-seed') || amount.includes('preseed')) return 'Pre-Seed (<$500K)';
    if (amount.includes('seed')) return 'Seed ($500K-$2M)';
    if (amount.includes('series a') || amount.includes('$2m') || amount.includes('$3m') || amount.includes('$5m')) return 'Series A ($2M-$15M)';
    if (amount.includes('series b')) return 'Series B ($15M-$50M)';
    if (amount.includes('series c')) return 'Series C+ ($50M+)';
    
    // Try to parse dollar amounts
    const match = amount.match(/\$(\d+(?:\.\d+)?)\s*([kmb])?/i);
    if (match) {
      let value = parseFloat(match[1]);
      const unit = match[2]?.toLowerCase();
      if (unit === 'k') value *= 1000;
      if (unit === 'm') value *= 1000000;
      if (unit === 'b') value *= 1000000000;
      
      if (value < 500000) return 'Pre-Seed (<$500K)';
      if (value < 2000000) return 'Seed ($500K-$2M)';
      if (value < 15000000) return 'Series A ($2M-$15M)';
      if (value < 50000000) return 'Series B ($15M-$50M)';
      return 'Series C+ ($50M+)';
    }
    
    return 'Unknown';
  };

  const analyzeProblemThemes = (statements: string[]): string[] => {
    if (statements.length === 0) return [];

    // Problem area keywords and their categories
    const themeKeywords = {
      'Healthcare & Medical': ['health', 'medical', 'patient', 'hospital', 'doctor', 'disease', 'treatment', 'diagnosis', 'care', 'wellness', 'pharmacy', 'medicine'],
      'Financial Services': ['financial', 'payment', 'bank', 'money', 'credit', 'loan', 'investment', 'transaction', 'fintech', 'expense', 'budget', 'revenue'],
      'E-commerce & Retail': ['shopping', 'retail', 'e-commerce', 'purchase', 'product', 'customer', 'seller', 'marketplace', 'delivery', 'order'],
      'Education & Learning': ['education', 'learning', 'student', 'teacher', 'school', 'training', 'course', 'skill', 'classroom'],
      'Supply Chain & Logistics': ['supply', 'logistics', 'shipping', 'delivery', 'warehouse', 'inventory', 'freight', 'transportation'],
      'HR & Recruiting': ['hiring', 'recruit', 'employee', 'talent', 'hr', 'workforce', 'job', 'resume', 'candidate'],
      'Real Estate & Property': ['real estate', 'property', 'housing', 'rent', 'lease', 'apartment', 'commercial', 'building'],
      'Marketing & Advertising': ['marketing', 'advertising', 'campaign', 'brand', 'social media', 'content', 'engagement'],
      'Productivity & Workflow': ['productivity', 'workflow', 'efficiency', 'process', 'automation', 'collaboration', 'task', 'project'],
      'Data & Analytics': ['data', 'analytics', 'insights', 'reporting', 'metrics', 'dashboard', 'intelligence'],
      'Security & Compliance': ['security', 'compliance', 'privacy', 'fraud', 'risk', 'audit', 'regulation'],
      'Communication & Collaboration': ['communication', 'collaboration', 'team', 'meeting', 'messaging', 'chat', 'video']
    };

    // Count theme occurrences with examples
    const themeCounts: { [key: string]: { count: number; examples: string[] } } = {};

    statements.forEach(statement => {
      const lowerStatement = statement.toLowerCase();
      
      Object.entries(themeKeywords).forEach(([theme, keywords]) => {
        if (keywords.some(keyword => lowerStatement.includes(keyword))) {
          if (!themeCounts[theme]) {
            themeCounts[theme] = { count: 0, examples: [] };
          }
          themeCounts[theme].count++;
          if (themeCounts[theme].examples.length < 2) {
            themeCounts[theme].examples.push(statement);
          }
        }
      });
    });

    // Sort by count and return top 5 with format: "Theme (count) - example"
    return Object.entries(themeCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([theme, data]) => {
        const example = data.examples[0]?.substring(0, 150) || '';
        return `${theme} (${data.count} startup${data.count > 1 ? 's' : ''}) - ${example}${example.length >= 150 ? '...' : ''}`;
      });
  };

  const analyzeSolutionThemes = (statements: string[]): string[] => {
    if (statements.length === 0) return [];

    // Solution approach keywords
    const themeKeywords = {
      'AI & Machine Learning': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'neural', 'algorithm', 'predictive', 'automation'],
      'SaaS Platform': ['platform', 'saas', 'software', 'cloud', 'dashboard', 'portal', 'app', 'application'],
      'Marketplace Model': ['marketplace', 'connect', 'match', 'network', 'community', 'peer-to-peer', 'platform'],
      'Mobile App': ['mobile', 'ios', 'android', 'smartphone', 'device', 'app'],
      'API & Integration': ['api', 'integration', 'connect', 'sync', 'plugin', 'webhook'],
      'Blockchain & Web3': ['blockchain', 'crypto', 'web3', 'decentralized', 'smart contract', 'nft'],
      'Hardware & IoT': ['hardware', 'device', 'sensor', 'iot', 'wearable', 'physical'],
      'Analytics & Insights': ['analytics', 'insights', 'data', 'reporting', 'visualization', 'metrics'],
      'Automation & Workflow': ['automate', 'workflow', 'streamline', 'process', 'efficiency'],
      'Personalization & AI': ['personalized', 'custom', 'tailored', 'recommendation', 'adaptive']
    };

    const themeCounts: { [key: string]: { count: number; examples: string[] } } = {};

    statements.forEach(statement => {
      const lowerStatement = statement.toLowerCase();
      
      Object.entries(themeKeywords).forEach(([theme, keywords]) => {
        if (keywords.some(keyword => lowerStatement.includes(keyword))) {
          if (!themeCounts[theme]) {
            themeCounts[theme] = { count: 0, examples: [] };
          }
          themeCounts[theme].count++;
          if (themeCounts[theme].examples.length < 2) {
            themeCounts[theme].examples.push(statement);
          }
        }
      });
    });

    return Object.entries(themeCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([theme, data]) => {
        const example = data.examples[0]?.substring(0, 150) || '';
        return `${theme} (${data.count} startup${data.count > 1 ? 's' : ''}) - ${example}${example.length >= 150 ? '...' : ''}`;
      });
  };

  const extractTeamBackgrounds = (text: string, backgrounds: { [key: string]: number }) => {
    // Common company patterns
    const companies = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    companies.forEach(company => {
      if (company.length > 2 && !['Team', 'Founder', 'CEO', 'CTO'].includes(company)) {
        backgrounds[company] = (backgrounds[company] || 0) + 1;
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-slate-100 flex items-center justify-center">
        <div className="text-orange-600 text-2xl font-bold">🔍 Analyzing data...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-slate-100 p-8">
        {/* Hamburger Menu */}
        <HamburgerMenu />

        {/* Current Page Button */}
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-full bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 text-slate-800 font-medium text-sm flex items-center gap-2 shadow-lg hover:from-slate-400 hover:via-slate-300 hover:to-slate-500 transition-all cursor-pointer"
            style={{
              boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.2)',
              textShadow: '0 1px 1px rgba(255,255,255,0.8)'
            }}>
            <span>📊</span>
            <span>Analytics</span>
          </button>
        </div>

        <div className="max-w-4xl mx-auto pt-28">
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-12 text-center border-2 border-orange-200">
            <h1 className="text-4xl font-black text-orange-600 mb-4">📊 No Data Yet</h1>
            <p className="text-slate-700 text-lg mb-6">
              Upload some startups to see analytics and intelligence
            </p>
            <button
              onClick={() => navigate('/submit')}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl"
            >
              Upload Startups
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#160020] via-[#240032] to-[#330044] p-8 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#9400cd]/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#9400cd]/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Hamburger Menu */}
      <HamburgerMenu />

      {/* Current Page Button */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40">
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-full bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 text-slate-800 font-medium text-sm flex items-center gap-2 shadow-lg hover:from-slate-400 hover:via-slate-300 hover:to-slate-500 transition-all cursor-pointer"
          style={{
            boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.2)',
            textShadow: '0 1px 1px rgba(255,255,255,0.8)'
          }}>
          <span>📊</span>
          <span>Analytics</span>
        </button>
      </div>

      <div className="max-w-7xl mx-auto pt-28">
        {/* Header */}
        <div className="flex justify-end items-center mb-8">
          <button
            onClick={analyzeData}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg"
          >
            🔄 Refresh Data
          </button>
        </div>

        <h1 className="text-5xl font-black text-orange-600 mb-8 text-center">
          📊 Startup Intelligence Dashboard
        </h1>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border-2 border-purple-300">
            <div className="text-purple-700 text-sm font-bold mb-2">Total Startups</div>
            <div className="text-4xl font-black text-slate-800">{analytics.totalStartups}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border-2 border-orange-300">
            <div className="text-orange-700 text-sm font-bold mb-2">Total Votes</div>
            <div className="text-4xl font-black text-slate-800">{analytics.totalVotes}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border-2 border-green-300">
            <div className="text-green-700 text-sm font-bold mb-2">Avg Hotness</div>
            <div className="text-4xl font-black text-slate-800">{analytics.avgHotness.toFixed(1)}🔥</div>
          </div>
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border-2 border-blue-300">
            <div className="text-blue-700 text-sm font-bold mb-2">Yes Rate</div>
            <div className="text-4xl font-black text-slate-800">{analytics.votingPatterns.avgYesRate.toFixed(1)}%</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Industry Distribution */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border-2 border-purple-300">
            <h2 className="text-2xl font-black text-purple-700 mb-4">🏢 Industry Trends</h2>
            <div className="space-y-3">
              {Object.entries(analytics.industries)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([industry, count]) => (
                  <div key={industry}>
                    <div className="flex justify-between text-slate-800 font-bold mb-1">
                      <span>{industry}</span>
                      <span>{count}</span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full"
                        style={{ width: `${(count / analytics.totalStartups) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Funding Stages */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border-2 border-orange-300">
            <h2 className="text-2xl font-black text-orange-700 mb-4">💰 Funding Stages</h2>
            <div className="space-y-3">
              {Object.entries(analytics.stages)
                .sort(([, a], [, b]) => b - a)
                .map(([stage, count]) => (
                  <div key={stage}>
                    <div className="flex justify-between text-slate-800 font-bold mb-1">
                      <span>{stage}</span>
                      <span>{count}</span>
                    </div>
                    <div className="w-full bg-orange-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full"
                        style={{ width: `${(count / analytics.totalStartups) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Funding Ranges */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border-2 border-green-300">
            <h2 className="text-2xl font-black text-green-700 mb-4">💵 Funding Ranges</h2>
            <div className="space-y-3">
              {Object.entries(analytics.fundingRanges)
                .sort(([, a], [, b]) => b - a)
                .map(([range, count]) => (
                  <div key={range}>
                    <div className="flex justify-between text-slate-800 font-bold mb-1">
                      <span>{range}</span>
                      <span>{count}</span>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                        style={{ width: `${(count / analytics.totalStartups) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Team Backgrounds */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border-2 border-blue-300">
            <h2 className="text-2xl font-black text-blue-700 mb-4">👥 Common Team Backgrounds</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(analytics.teamBackgrounds)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 15)
                .map(([company, count]) => (
                  <span
                    key={company}
                    className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold"
                  >
                    {company} ({count})
                  </span>
                ))}
            </div>
          </div>
        </div>

        {/* Common Problems */}
        <div className="mt-8 bg-white/80 backdrop-blur-md rounded-3xl p-6 border-2 border-red-300">
          <h2 className="text-2xl font-black text-red-700 mb-4">🔥 Top 5 Problem Areas</h2>
          <p className="text-red-600 text-sm mb-4">Market problems startups are solving (weighted by frequency)</p>
          {analytics.commonProblems.length > 0 ? (
            <div className="space-y-4">
              {analytics.commonProblems.map((problemTheme, idx) => {
                // Parse format: "Theme (X startups) - example"
                const match = problemTheme.match(/^(.+?)\s+\((\d+)\s+startup[s]?\)\s+-\s+(.+)$/);
                const theme = match ? match[1] : problemTheme;
                const count = match ? match[2] : '0';
                const example = match ? match[3] : '';
                
                return (
                  <div key={idx} className="bg-red-100 rounded-xl p-5 border-l-4 border-red-500">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-red-700 font-black text-lg">#{idx + 1} {theme}</h3>
                      <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                        {count} startup{count !== '1' ? 's' : ''}
                      </span>
                    </div>
                    {example && (
                      <p className="text-slate-800 text-sm leading-relaxed italic">
                        Example: "{example}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-red-600 text-sm italic">No problem statements captured yet. Upload startups with detailed pitch decks.</p>
          )}
        </div>

        {/* Common Solutions */}
        <div className="mt-8 bg-white/80 backdrop-blur-md rounded-3xl p-6 border-2 border-yellow-300">
          <h2 className="text-2xl font-black text-yellow-700 mb-4">💡 Top 5 Solution Approaches</h2>
          <p className="text-yellow-700 text-sm mb-4">How startups are solving problems (weighted by frequency)</p>
          {analytics.commonSolutions.length > 0 ? (
            <div className="space-y-4">
              {analytics.commonSolutions.map((solutionTheme, idx) => {
                const match = solutionTheme.match(/^(.+?)\s+\((\d+)\s+startup[s]?\)\s+-\s+(.+)$/);
                const theme = match ? match[1] : solutionTheme;
                const count = match ? match[2] : '0';
                const example = match ? match[3] : '';
                
                return (
                  <div key={idx} className="bg-yellow-100 rounded-xl p-5 border-l-4 border-yellow-500">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-yellow-700 font-black text-lg">#{idx + 1} {theme}</h3>
                      <span className="bg-yellow-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                        {count} startup{count !== '1' ? 's' : ''}
                      </span>
                    </div>
                    {example && (
                      <p className="text-slate-800 text-sm leading-relaxed italic">
                        Example: "{example}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-yellow-700 text-sm italic">No solution statements captured yet. Upload startups with detailed pitch decks.</p>
          )}
        </div>

        {/* Top Performers */}
        <div className="mt-8 bg-white/80 backdrop-blur-md rounded-3xl p-6 border-2 border-pink-300">
          <h2 className="text-2xl font-black text-pink-700 mb-4">🏆 Top Performers</h2>
          <div className="space-y-3">
            {analytics.topPerformers.slice(0, 5).map((startup, i) => (
              <div key={startup.id} className="bg-pink-100 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-black text-pink-700">#{i + 1}</div>
                  <div>
                    <h3 className="text-slate-800 font-bold text-lg">{startup.name}</h3>
                    <p className="text-pink-700 text-sm">{startup.pitch}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-slate-800">{startup.hotness || 0}🔥</div>
                  <div className="text-pink-700 text-xs">
                    👍 {startup.yesVotes || 0} | 👎 {startup.noVotes || 0}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Controversial */}
        {analytics.votingPatterns.mostControversial.length > 0 && (
          <div className="mt-8 bg-white/80 backdrop-blur-md rounded-3xl p-6 border-2 border-gray-300">
            <h2 className="text-2xl font-black text-gray-700 mb-4">⚖️ Most Controversial (Split Decisions)</h2>
            <div className="space-y-3">
              {analytics.votingPatterns.mostControversial.map((startup) => (
                <div key={startup.id} className="bg-gray-100 rounded-xl p-4">
                  <h3 className="text-slate-800 font-bold text-lg mb-2">{startup.name}</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-green-600 font-bold">👍 Yes: {startup.yesVotes || 0}</span>
                        <span className="text-red-600 font-bold">👎 No: {startup.noVotes || 0}</span>
                      </div>
                      <div className="w-full bg-gray-300 rounded-full h-3 flex overflow-hidden">
                        <div
                          className="bg-green-500"
                          style={{ width: `${((startup.yesVotes || 0) / ((startup.yesVotes || 0) + (startup.noVotes || 0))) * 100}%` }}
                        />
                        <div
                          className="bg-red-500"
                          style={{ width: `${((startup.noVotes || 0) / ((startup.yesVotes || 0) + (startup.noVotes || 0))) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
