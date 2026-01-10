import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, TrendingUp, Target } from 'lucide-react';

interface CompletionStats {
  total: number;
  completed: number;
  progress: number;
  recent_completions: Array<{
    template_name: string;
    completed_at: string;
  }>;
}

export default function TemplateCompletionWidget({ startupId }: { startupId: string }) {
  const [stats, setStats] = useState<CompletionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [startupId]);

  const loadStats = async () => {
    try {
      // Get total templates
      const { data: templates, error: templatesError } = await supabase
        .from('service_templates')
        .select('id, name, slug')
        .eq('is_active', true);

      // Get completed templates
      const { data: completions, error: completionsError } = await supabase
        .from('template_completions')
        .select('template_slug, completed_at, service_templates(name)')
        .eq('startup_id', startupId)
        .order('completed_at', { ascending: false })
        .limit(5);

      if (templatesError || completionsError) {
        console.error('Error loading stats:', templatesError || completionsError);
        return;
      }

      const total = templates?.length || 0;
      const completed = completions?.length || 0;
      const progress = total > 0 ? (completed / total) * 100 : 0;

      const recent_completions = (completions || []).map((c: any) => ({
        template_name: c.service_templates?.name || c.template_slug,
        completed_at: c.completed_at
      }));

      setStats({
        total,
        completed,
        progress,
        recent_completions
      });
    } catch (error) {
      console.error('Error loading template stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-300 text-sm">Completion Progress</span>
          <span className="text-cyan-400 font-bold">{stats.completed}/{stats.total}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all"
            style={{ width: `${stats.progress}%` }}
          />
        </div>
      </div>

      {/* Recent Completions */}
      {stats.recent_completions.length > 0 && (
        <div>
          <h4 className="text-white font-semibold mb-2 text-sm">Recently Completed</h4>
          <div className="space-y-2">
            {stats.recent_completions.map((completion, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>{completion.template_name}</span>
                <span className="text-gray-500 text-xs ml-auto">
                  {new Date(completion.completed_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      {stats.progress < 100 && (
        <div className="pt-2 border-t border-gray-700">
          <Link
            to={`/startup/${startupId}/templates`}
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium"
          >
            <Target className="w-4 h-4" />
            Complete more templates to improve your GOD score
          </Link>
        </div>
      )}
    </div>
  );
}

