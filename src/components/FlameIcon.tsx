import React from 'react';

/**
 * Flame Icon Component
 * 
 * Uses custom flame images from the family of 9 flame designs.
 * Image files should be placed in /public/images/flames/
 * 
 * Available variants:
 * - flame-1 through flame-9 (the 9 flame designs)
 * - default: flame-5 (center, most balanced)
 * 
 * Sizes: xs, sm, md, lg, xl, 2xl, 3xl
 */

export type FlameVariant = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

interface FlameIconProps {
  variant?: FlameVariant;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  className?: string;
  animate?: boolean;
  onClick?: () => void;
}

const sizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-10 h-10',
  '2xl': 'w-12 h-12',
  '3xl': 'w-16 h-16',
  '4xl': 'w-24 h-24',
};

// Fallback SVG flame when image not loaded
const FallbackFlame: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path 
      d="M12 2C12 2 6 8 6 14C6 17.3137 8.68629 20 12 20C15.3137 20 18 17.3137 18 14C18 8 12 2 12 2Z" 
      fill="url(#flame-gradient)"
    />
    <path 
      d="M12 8C12 8 9 11 9 14C9 15.6569 10.3431 17 12 17C13.6569 17 15 15.6569 15 14C15 11 12 8 12 8Z" 
      fill="#FCD34D"
    />
    <defs>
      <linearGradient id="flame-gradient" x1="12" y1="2" x2="12" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F97316"/>
        <stop offset="1" stopColor="#DC2626"/>
      </linearGradient>
    </defs>
  </svg>
);

const FlameIcon: React.FC<FlameIconProps> = ({ 
  variant = 5, 
  size = 'md', 
  className = '',
  animate = false,
  onClick
}) => {
  const [imageError, setImageError] = React.useState(false);
  const animationClass = animate ? 'animate-pulse hover:animate-bounce' : '';
  const baseClass = `${sizeClasses[size]} ${animationClass} ${className} object-contain`;
  
  if (imageError) {
    return <FallbackFlame className={baseClass} />;
  }
  
  // Format variant as 01, 02, ... 09
  const variantStr = variant.toString().padStart(2, '0');
  
  return (
    <img 
      src={`/images/fire_icon_${variantStr}.jpg`}
      alt="Flame"
      className={baseClass}
      onClick={onClick}
      onError={() => setImageError(true)}
      style={{ cursor: onClick ? 'pointer' : 'inherit' }}
    />
  );
};

// Animated flame that cycles through variants
export const AnimatedFlame: React.FC<Omit<FlameIconProps, 'variant' | 'animate'>> = (props) => {
  const [variant, setVariant] = React.useState<FlameVariant>(5);
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setVariant(prev => ((prev % 9) + 1) as FlameVariant);
    }, 200);
    return () => clearInterval(interval);
  }, []);
  
  return <FlameIcon {...props} variant={variant} />;
};

// Pre-configured flame variants for specific use cases
export const HotMatchLogo: React.FC<{ size?: FlameIconProps['size']; className?: string }> = ({ size = 'lg', className }) => (
  <FlameIcon variant={5} size={size} className={className} />
);

export const StartupFlame: React.FC<{ size?: FlameIconProps['size']; className?: string }> = ({ size = 'md', className }) => (
  <FlameIcon variant={8} size={size} className={className} />
);

export const TrendingFlame: React.FC<{ size?: FlameIconProps['size']; className?: string }> = ({ size = 'md', className }) => (
  <FlameIcon variant={9} size={size} className={`${className}`} animate />
);

export const MatchFlame: React.FC<{ size?: FlameIconProps['size']; className?: string }> = ({ size = 'md', className }) => (
  <FlameIcon variant={7} size={size} className={className} />
);

export default FlameIcon;
