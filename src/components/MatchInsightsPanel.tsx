/**
 * Match Insights Panel Component
 * 
 * Displays AI-powered insights, trends, and recommendations for matches
 */

import { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, AlertTriangle, Lightbulb, 
  Sparkles, ArrowRight, Info, CheckCircle2, XCircle
} from 'lucide-react';
import { API_BASE } from '@/lib/apiConfig';

interface Insight {
  type: 'trend' | 'recommendation' | 'warning' | 'opportunity';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable?: boolean;
  actionText?: string;
  data?: any;
}

interface Trend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  change: number;
  period: string;
  significance: 'high' | 'medium' | 'low';
}

interface Props {
  entityId: string;
  entityType: 'startup' | 'investor';
}

export default function MatchInsightsPanel({ entityId, entityType }: Props) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
    loadTrends();
  }, [entityId, entityType]);

  const loadInsights = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/matches/${entityType}/${entityId}/insights`);
      const data = await response.json();
      
      if (data.success) {
        setInsights(data.data || []);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrends = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/matches/${entityType}/${entityId}/trends?days=30`);
      const data = await response.json();
      
      if (data.success) {
        setTrends(data.data || []);
      }
    } catch (error) {
      console.error('Error loading trends:', error);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend': return <TrendingUp className="w-5 h-5" />;
      case 'recommendation': return <Lightbulb className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'opportunity': return <Sparkles className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getInsightColor = (type: string, priority: string) => {
    if (type === 'opportunity' && priority === 'high') {
      return 'bg-green-500/20 border-green-500/30 text-green-300';
    }
    if (type === 'warning' && priority === 'high') {
      return 'bg-red-500/20 border-red-500/30 text-red-300';
    }
    if (type === 'trend') {
      return 'bg-blue-500/20 border-blue-500/30 text-blue-300';
    }
    return 'bg-yellow-500/20 border-cyan-500/30 text-yellow-300';
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-400" />;
      default: return <div className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Insights */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          AI-Powered Insights
        </h3>
        
        {insights.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No insights available yet. Check back after more matches are generated.
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={`rounded-lg border p-4 ${getInsightColor(insight.type, insight.priority)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold mb-1">{insight.title}</div>
                    <div className="text-sm opacity-90 mb-2">{insight.description}</div>
                    {insight.actionable && insight.actionText && (
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <ArrowRight className="w-4 h-4" />
                        <span>{insight.actionText}</span>
                      </div>
                    )}
                  </div>
                  {insight.priority === 'high' && (
                    <div className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs font-semibold">
                      HIGH
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trends */}
      {trends.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Trends (Last 30 Days)
          </h3>
          
          <div className="space-y-3">
            {trends.map((trend, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700"
              >
                <div className="flex items-center gap-3">
                  {getTrendIcon(trend.direction)}
                  <div>
                    <div className="font-semibold">{trend.metric}</div>
                    <div className="text-sm text-gray-400">{trend.period}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${
                    trend.direction === 'up' ? 'text-green-400' : 
                    trend.direction === 'down' ? 'text-red-400' : 
                    'text-gray-400'
                  }`}>
                    {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
                    {trend.change.toFixed(1)}
                    {trend.metric.includes('%') ? '%' : ''}
                  </div>
                  {trend.significance === 'high' && (
                    <div className="text-xs text-yellow-400 mt-1">Significant</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}





