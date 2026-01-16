import { Link } from 'react-router-dom';

interface BrandMarkProps {
  variant?: 'default' | 'light' | 'minimal';
  showTagline?: boolean;
}

/**
 * [pythh] ai Brand Mark
 * 
 * Persistent, subtle brand identity used across the platform.
 * Square brackets = technical, oracle-like
 * lowercase = modern, confident
 * "ai" secondary, not dominant
 */
export default function BrandMark({ variant = 'default', showTagline = true }: BrandMarkProps) {
  const textColor = variant === 'light' ? 'text-gray-900' : 'text-white';
  const bracketColor = variant === 'light' ? 'text-gray-400' : 'text-gray-600';
  const taglineColor = variant === 'light' ? 'text-gray-500' : 'text-gray-600';
  
  if (variant === 'minimal') {
    return (
      <span className={`text-sm ${textColor} tracking-tight font-medium`}>
        <span className={bracketColor}>[</span> pythh <span className={bracketColor}>]</span>
      </span>
    );
  }
  
  return (
    <Link to="/" className="group flex flex-col items-start leading-none">
      <span className={`text-sm ${textColor} tracking-tight font-medium`}>
        <span className={bracketColor}>[</span> pythh <span className={bracketColor}>]</span>
        <span className={`${bracketColor} text-xs ml-0.5`}>ai</span>
      </span>
      {showTagline && (
        <span className={`text-[9px] ${taglineColor} uppercase tracking-[0.2em] group-hover:text-gray-500 transition-colors`}>
          Signal Science
        </span>
      )}
    </Link>
  );
}
