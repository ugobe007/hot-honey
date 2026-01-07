import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, Save, RotateCcw, AlertTriangle, CheckCircle, 
  TrendingUp, TrendingDown, ArrowRight, RefreshCw, Settings
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import LogoDropdownMenu from '../components/LogoDropdownMenu';

interface GODWeights {
  team: number;
  traction: number;
  market: number;
  product: number;
  vision: number;
  ecosystem: number;
  grit: number;
  problemValidation: number;
}

interface WeightHistory {
  id: string;
  changed_at: string;
  changed_by: string;
  old_weights: GODWeights;
  new_weights: GODWeights;
  reason?: string;
}

const DEFAULT_WEIGHTS: GODWeights = {
  team: 3.0,
  traction: 3.0,
  market: 2.0,
  product: 2.0,
  vision: 2.0,
  ecosystem: 1.5,
  grit: 1.5,
  problemValidation: 2.0
};

export default function GODSettingsPage() {
  const navigate = useNavigate();
  const [weights, setWeights] = useState<GODWeights>(DEFAULT_WEIGHTS);
  const [originalWeights, setOriginalWeights] = useState<GODWeights>(DEFAULT_WEIGHTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<WeightHistory[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadWeights();
    loadHistory();
  }, []);

  const loadWeights = async () => {
    setLoading(true);
    try {
      // Try to load from database (algorithm_weight_history or config table)
      // For now, use localStorage with fallback to defaults
      const savedWeights = localStorage.getItem('god_algorithm_weights');
      if (savedWeights) {
        const parsed = JSON.parse(savedWeights);
        setWeights(parsed);
        setOriginalWeights(parsed);
      } else {
        setWeights(DEFAULT_WEIGHTS);
        setOriginalWeights(DEFAULT_WEIGHTS);
      }
    } catch (error) {
      console.error('Error loading weights:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      // Load from algorithm_weight_history table if it exists
      const { data, error } = await supabase
        .from('algorithm_weight_history')
        .select('*')
        .order('applied_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setHistory(data.map((h: any) => ({
          id: h.id,
          changed_at: h.applied_at,
          changed_by: h.applied_by || 'system',
          old_weights: h.weight_updates?.[0]?.old_weight || DEFAULT_WEIGHTS,
          new_weights: h.weight_updates?.[0]?.new_weight || DEFAULT_WEIGHTS,
          reason: h.reason
        })));
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const updateWeight = (component: keyof GODWeights, value: number) => {
    const newWeights = { ...weights, [component]: Math.max(0, Math.min(10, value)) };
    setWeights(newWeights);
    setHasChanges(JSON.stringify(newWeights) !== JSON.stringify(originalWeights));
  };

  const saveWeights = async () => {
    setSaving(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';
      
      // Save to API/database
      const response = await fetch(`${API_BASE}/api/god-weights/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weights,
          userId: 'admin' // TODO: Get from auth context
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save weights');
      }

      // Also save to localStorage as backup
      localStorage.setItem('god_algorithm_weights', JSON.stringify(weights));
      localStorage.setItem('god_weights_last_updated', new Date().toISOString());

      setOriginalWeights(weights);
      setHasChanges(false);
      
      alert('✅ GOD Algorithm weights saved successfully!');
      await loadHistory();
    } catch (error: any) {
      console.error('Error saving weights:', error);
      // Fallback to localStorage if API fails
      localStorage.setItem('god_algorithm_weights', JSON.stringify(weights));
      localStorage.setItem('god_weights_last_updated', new Date().toISOString());
      setOriginalWeights(weights);
      setHasChanges(false);
      alert(`⚠️ Weights saved locally. API error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const resetWeights = () => {
    if (confirm('Reset all weights to defaults? This will discard your changes.')) {
      setWeights(DEFAULT_WEIGHTS);
      setHasChanges(JSON.stringify(DEFAULT_WEIGHTS) !== JSON.stringify(originalWeights));
    }
  };

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

  const WeightSlider = ({ 
    label, 
    component, 
    value, 
    description 
  }: { 
    label: string; 
    component: keyof GODWeights; 
    value: number;
    description: string;
  }) => (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">{label}</h3>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
        <div className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
          {value.toFixed(1)}
        </div>
      </div>
      
      <input
        type="range"
        min="0"
        max="10"
        step="0.1"
        value={value}
        onChange={(e) => updateWeight(component, parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
      />
      
      <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
        <span>0</span>
        <span className="text-orange-400 font-semibold">Weight: {value.toFixed(1)}</span>
        <span>10</span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0729] via-[#1a0f3a] to-[#2d1558] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-orange-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading GOD settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0729] via-[#1a0f3a] to-[#2d1558] text-white">
      <LogoDropdownMenu />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent mb-2 flex items-center gap-3">
                <Sparkles className="w-10 h-10 text-orange-400" />
                GOD Algorithm Settings
              </h1>
              <p className="text-slate-400">Adjust component weights to fine-tune startup scoring</p>
            </div>
            
            <div className="flex items-center gap-3">
              {hasChanges && (
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-yellow-400">Unsaved changes</span>
                </div>
              )}
              
              <button
                onClick={resetWeights}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              
              <button
                onClick={saveWeights}
                disabled={saving || !hasChanges}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Weights
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Total Weight Indicator */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-400 mb-1">Total Weight</div>
                <div className="text-2xl font-bold text-white">{totalWeight.toFixed(1)}</div>
              </div>
              <div className={`px-4 py-2 rounded-lg ${
                totalWeight >= 17 && totalWeight <= 18 
                  ? 'bg-green-500/20 border border-green-500/30' 
                  : 'bg-yellow-500/20 border border-yellow-500/30'
              }`}>
                <div className="text-sm text-slate-400 mb-1">Status</div>
                <div className={`text-sm font-semibold ${
                  totalWeight >= 17 && totalWeight <= 18 ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {totalWeight >= 17 && totalWeight <= 18 ? '✅ Balanced' : '⚠️ Review recommended'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Weight Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <WeightSlider
            label="Team"
            component="team"
            value={weights.team}
            description="Founder experience, technical cofounder, domain expertise"
          />
          
          <WeightSlider
            label="Traction"
            component="traction"
            value={weights.traction}
            description="Revenue, users, growth rate, retention metrics"
          />
          
          <WeightSlider
            label="Market"
            component="market"
            value={weights.market}
            description="TAM size, market growth, problem importance"
          />
          
          <WeightSlider
            label="Product"
            component="product"
            value={weights.product}
            description="Demo, launch status, IP, defensibility"
          />
          
          <WeightSlider
            label="Vision"
            component="vision"
            value={weights.vision}
            description="Clarity, ambition, long-term potential"
          />
          
          <WeightSlider
            label="Ecosystem"
            component="ecosystem"
            value={weights.ecosystem}
            description="Investors, advisors, strategic partnerships"
          />
          
          <WeightSlider
            label="Grit"
            component="grit"
            value={weights.grit}
            description="Persistence, pivots, customer obsession"
          />
          
          <WeightSlider
            label="Problem Validation"
            component="problemValidation"
            value={weights.problemValidation}
            description="Customer validation, willingness to pay, demand signals"
          />
        </div>

        {/* Weight History */}
        {history.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-orange-400" />
              Recent Changes
            </h3>
            <div className="space-y-3">
              {history.slice(0, 5).map((change) => (
                <div key={change.id} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-slate-400">
                      {new Date(change.changed_at).toLocaleString()}
                    </div>
                    <div className="text-sm text-slate-400">by {change.changed_by}</div>
                  </div>
                  {change.reason && (
                    <div className="text-sm text-slate-300 mb-2">{change.reason}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-white mb-2">How GOD Scoring Works</h4>
              <p className="text-sm text-slate-300 mb-3">
                Each component is scored 0-10, then multiplied by its weight. The total score is normalized to 0-100.
                Adjusting weights changes how much each factor influences the final GOD score. Higher weights = more emphasis.
              </p>
              <button
                onClick={() => navigate('/admin/god-scores')}
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-medium"
              >
                View GOD Scores <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
