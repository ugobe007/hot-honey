import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UpgradeMoment, UPGRADE_COPY, buildPricingUrl } from '../lib/upgradeMoments';
import { analytics } from '../analytics';

interface UpgradeModalProps {
  moment: UpgradeMoment;
  open: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ moment, open, onClose }: UpgradeModalProps) {
  const navigate = useNavigate();
  const copy = UPGRADE_COPY[moment];
  
  // Fire analytics when modal opens
  useEffect(() => {
    if (open) {
      analytics.logEvent('upgrade_prompt_shown', {
        moment,
        target_plan: copy.targetPlan
      });
    }
  }, [open, moment, copy.targetPlan]);
  
  if (!open) return null;
  
  const handleUpgradeClick = () => {
    analytics.logEvent('upgrade_cta_clicked', {
      moment,
      target_plan: copy.targetPlan
    });
    
    // Store source in sessionStorage for attribution on upgrade
    sessionStorage.setItem('upgrade_source', moment);
    
    navigate(buildPricingUrl(moment));
    onClose();
  };
  
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
          {/* Header accent */}
          <div className={`h-1 ${copy.targetPlan === 'elite' ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`} />
          
          {/* Content */}
          <div className="p-6">
            {/* Icon + Title */}
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                copy.targetPlan === 'elite' 
                  ? 'bg-orange-500/20 border border-orange-500/30' 
                  : 'bg-cyan-500/20 border border-cyan-500/30'
              }`}>
                {copy.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1">{copy.title}</h3>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${
                  copy.targetPlan === 'elite'
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'bg-cyan-500/20 text-cyan-400'
                }`}>
                  {copy.targetPlan}
                </span>
              </div>
            </div>
            
            {/* Body */}
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              {copy.body}
            </p>
            
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
              >
                Maybe Later
              </button>
              <button
                onClick={handleUpgradeClick}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  copy.targetPlan === 'elite'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600'
                }`}
              >
                {copy.cta} →
              </button>
            </div>
          </div>
        </div>
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
