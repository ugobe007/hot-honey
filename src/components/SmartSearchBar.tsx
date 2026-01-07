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
      // Check if startup exists with this exact domain (more precise matching)
      // First try exact match
      const { data: exactMatch, error: exactError } = await supabase
        .from('startup_uploads')
        .select('id, name, website')
        .eq('website', normalizedUrl)
        .limit(1)
        .maybeSingle();

      if (exactMatch && !exactError) {
        console.log('Found exact match:', exactMatch.id, exactMatch.name);
        navigate(`/startup/${exactMatch.id}/matches`);
        return;
      }

      // Then try domain match - be very specific to avoid false matches
      // Use the full domain (e.g., "x.ai") not just ".ai" to avoid matching "llamaindex.ai"
      const domainPattern = `%${domain}%`;
      const { data: existingStartups, error: startupError } = await supabase
        .from('startup_uploads')
        .select('id, name, website')
        .ilike('website', domainPattern)
        .limit(10); // Get multiple to find the best match

      if (existingStartups && existingStartups.length > 0 && !startupError) {
        // Find the best match - prioritize exact domain match
        // Normalize all websites for comparison
        const normalizedDomain = domain.toLowerCase();
        const bestMatch = existingStartups.find(s => {
          if (!s.website) return false;
          const sDomain = extractDomain(s.website).toLowerCase();
          return sDomain === normalizedDomain;
        }) || existingStartups.find(s => {
          if (!s.website) return false;
          return s.website.toLowerCase().includes(normalizedDomain);
        }) || existingStartups[0];
        
        console.log('✅ Found domain match:', bestMatch.id, bestMatch.name, bestMatch.website, 'from', existingStartups.length, 'candidates');
        navigate(`/startup/${bestMatch.id}/matches`);
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
      // Extract company name from domain (better extraction)
      let companyName = domain.split('.')[0];
      
      // Handle special cases like "x.ai" -> "X" (not "X")
      // For single-letter domains, use the full domain as name
      if (companyName.length === 1) {
        // For single letters, try to get a better name from the domain
        // e.g., "x.ai" -> "X" (the company formerly known as Twitter)
        companyName = companyName.toUpperCase();
      } else {
        // Capitalize first letter, handle camelCase domains
        companyName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
      }
      
      // Try to fetch the actual company name from the website using AI
      // For now, use the extracted name, but we'll improve this later
      const startupName = companyName;
      
      // Try to insert new startup
      const { data: newStartup, error: createError } = await supabase
        .from('startup_uploads')
        .insert({
          name: startupName,
          website: normalizedUrl,
          status: 'approved', // Auto-approve so matches can be generated
          source_type: 'url',
          source_url: normalizedUrl,
        })
        .select('id, name')
        .single();

      if (createError) {
        console.error('Error creating startup:', createError);
        console.error('Error code:', createError.code);
        console.error('Error message:', createError.message);
        console.error('Error details:', createError.details);
        console.error('Error hint:', createError.hint);
        
        // Handle duplicate/conflict errors - try to find existing startup
        const isDuplicateError = 
          createError.code === '23505' || // Unique violation
          createError.code === 'PGRST116' || // PostgREST duplicate
          createError.message?.toLowerCase().includes('duplicate') ||
          createError.message?.toLowerCase().includes('already exists') ||
          createError.message?.toLowerCase().includes('409') ||
          createError.hint?.toLowerCase().includes('duplicate');
        
        if (isDuplicateError) {
          // Try multiple ways to find existing startup
          let existingStartup = null;
          
          // Try by website first
          const { data: byWebsite } = await supabase
            .from('startup_uploads')
            .select('id')
            .eq('website', normalizedUrl)
            .maybeSingle();
          
          if (byWebsite) {
            existingStartup = byWebsite;
          } else {
            // Try by name (case insensitive)
            const { data: byName } = await supabase
              .from('startup_uploads')
              .select('id')
              .ilike('name', capitalizedName)
              .maybeSingle();
            
            if (byName) {
              existingStartup = byName;
            }
          }
          
          if (existingStartup) {
            console.log('Found existing startup, navigating to matches');
            navigate(`/startup/${existingStartup.id}/matches`);
            return;
          }
        }
        
        // Show user-friendly error message
        const errorMessage = isDuplicateError 
          ? 'This startup already exists in our database.'
          : createError.message || 'Failed to create profile. Please try again.';
        
        setError(errorMessage);
        return;
      }

      // Go to matches page - it will show "no matches yet" or trigger matching
      console.log('✅ Created new startup:', newStartup.id, newStartup.name, newStartup.website);
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
          error ? 'border-red-500/50' : 'border-white/10 hover:border-white/20 focus-within:border-cyan-500/50'
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
            className="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-black font-black text-base transition-all hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/60 hover:shadow-orange-500/80"
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
