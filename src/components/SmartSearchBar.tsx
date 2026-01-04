import React, { useState } from 'react';
import { 
  ArrowRight,
  Loader2,
  Globe,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    return normalized.replace(/\/$/, '');
  };

  const extractDomain = (input: string): string => {
    try {
      const url = new URL(normalizeUrl(input));
      return url.hostname.replace('www.', '');
    } catch {
      return input.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    }
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

    const domain = extractDomain(trimmed);
    const normalizedUrl = normalizeUrl(trimmed);

    try {
      // Check if startup exists with this domain
      const { data: existingStartup, error: startupError } = await supabase
        .from('startup_uploads')
        .select('id, name')
        .ilike('website', `%${domain}%`)
        .limit(1)
        .maybeSingle();

      if (existingStartup && !startupError) {
        // Found! Go to their matches page
        navigate(`/startup/${existingStartup.id}/matches`);
        return;
      }

      // Check if it's an investor (LinkedIn URL)
      if (domain.includes('linkedin.com')) {
        const linkedinPath = trimmed.split('/').pop() || trimmed.split('/').slice(-2).join('/');
        const { data: existingInvestor, error: investorError } = await supabase
          .from('investors')
          .select('id, name')
          .ilike('linkedin_url', `%${linkedinPath}%`)
          .limit(1)
          .maybeSingle();

        if (existingInvestor && !investorError) {
          navigate(`/investor/${existingInvestor.id}/matches`);
          return;
        }
      }

      // Not found - create new startup profile
      const companyName = domain.split('.')[0];
      const capitalizedName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
      
      const { data: newStartup, error: createError } = await supabase
        .from('startup_uploads')
        .insert({
          name: capitalizedName,
          website: normalizedUrl,
          status: 'approved', // Auto-approve so matches can be generated
          source_type: 'url',
          source_url: normalizedUrl,
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating startup:', createError);
        setError('Failed to create profile. Please try again.');
        return;
      }

      // Go to matches page - it will show "no matches yet" or trigger matching
      navigate(`/startup/${newStartup.id}/matches`);
      
    } catch (err) {
      console.error('Error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`w-full max-w-xl mx-auto ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className={`relative flex items-center bg-slate-800/90 border rounded-2xl overflow-hidden transition-all shadow-xl shadow-black/20 ${
          error ? 'border-red-500/50' : 'border-white/10 hover:border-white/20 focus-within:border-orange-500/50'
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
            className="flex-1 py-4 bg-transparent text-white placeholder-gray-500 outline-none text-base"
            disabled={isSubmitting}
          />
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !url.trim()}
            className="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-gray-900 font-bold transition-all hover:from-orange-400 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline">Get Matched</span>
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
