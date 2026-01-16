import React, { useState } from 'react';
import { 
  ArrowRight,
  Loader2,
  Globe,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SmartSearchBarProps {
  className?: string;
}

export default function SmartSearchBar({ className = '' }: SmartSearchBarProps) {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeUrl = (input: string): string => {
    let normalized = input.trim().toLowerCase();
    // Remove protocol for cleaner URL param
    normalized = normalized.replace(/^(https?:\/\/)?(www\.)?/, '');
    return normalized.replace(/\/$/, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    
    if (!trimmed) {
      setError('Please enter your website URL');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Clean the URL (same as SplitScreenHero)
    const cleanUrl = normalizeUrl(trimmed);
    
    // Navigate to InstantMatches - same as SplitScreenHero
    // This uses the same backend: resolveStartupFromUrl + getInvestorMatchesForStartup
    navigate(`/instant-matches?url=${encodeURIComponent(cleanUrl)}`);
  };

  return (
    <div className={`w-full max-w-xl mx-auto ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className={`relative flex items-center bg-[#1a1a1a] border rounded-2xl overflow-hidden transition-all shadow-xl shadow-black/40 ${
          error ? 'border-red-500/50' : 'border-white/20 hover:border-white/30 focus-within:border-orange-500/60'
        }`}>
          {/* Icon */}
          <div className="pl-5 pr-3">
            <Globe className="w-5 h-5 text-gray-500" />
          </div>
          
          {/* Input */}
          <input
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
            placeholder="Enter your website URL"
            className="flex-1 py-4 bg-transparent text-white placeholder-gray-400 outline-none text-base font-medium"
            disabled={isSubmitting}
          />
          
          {/* Submit Button - VIBRANT ORANGE to match match button */}
          <button
            type="submit"
            disabled={isSubmitting || !url.trim()}
            className="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-black font-black text-base transition-all hover:from-orange-400 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-orange-500/90 hover:shadow-orange-400/100"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline">Search Matches</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
        
        {error && (
          <p className="text-red-400 text-sm mt-2 text-center">{error}</p>
        )}
      </form>
      
      <p className="text-gray-500 text-sm text-center mt-3">
        We'll find your matches instantly
      </p>
    </div>
  );
}
