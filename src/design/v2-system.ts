// NEW DESIGN SYSTEM v2.0 - Clean & Modern
// Based on "The Palette" color scheme

export const colors = {
  // Primary Colors
  steelGray: '#24213B',     // Reliability & Robustness - Main dark
  caribbeanGreen: '#1DD1A1', // Growth & Sustenance - Success/Yes votes
  texasRose: '#FF864D',      // Excitement & Enthusiasm - Primary actions
  wafer: '#E4D7CC',         // Empathy & Humility - Soft backgrounds
  snow: '#FFFFFF',          // Clarity & Simplicity - Clean whites

  // Semantic Usage
  primary: '#FF864D',       // Texas Rose for main actions
  success: '#1DD1A1',       // Caribbean Green for positive actions
  background: '#24213B',    // Steel Gray for main backgrounds
  surface: '#FFFFFF',       // Snow white for cards/surfaces
  accent: '#E4D7CC',        // Wafer for subtle accents
  text: {
    primary: '#24213B',     // Steel Gray for main text
    secondary: '#999999',   // Gray for secondary text
    inverse: '#FFFFFF',     // White text on dark backgrounds
  }
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

export const borderRadius = {
  none: '0px',       // NEW: No curves, straight lines only
  small: '2px',      // Minimal for subtle definition
  medium: '4px',     // Slightly more defined
  large: '8px',      // Maximum roundness we'll use
};

export const shadows = {
  none: 'none',
  subtle: '0 1px 3px rgba(36, 33, 59, 0.1)',
  medium: '0 4px 12px rgba(36, 33, 59, 0.15)',
  strong: '0 8px 24px rgba(36, 33, 59, 0.2)',
};

export const typography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

// Component-specific styles
export const components = {
  button: {
    primary: `
      background: ${colors.texasRose};
      color: ${colors.snow};
      border: none;
      border-radius: ${borderRadius.none};
      padding: ${spacing.md} ${spacing.lg};
      font-weight: ${typography.fontWeight.semibold};
      transition: all 0.2s ease;
      box-shadow: ${shadows.medium};
    `,
    secondary: `
      background: ${colors.caribbeanGreen};
      color: ${colors.snow};
      border: none;
      border-radius: ${borderRadius.none};
      padding: ${spacing.md} ${spacing.lg};
      font-weight: ${typography.fontWeight.semibold};
      transition: all 0.2s ease;
      box-shadow: ${shadows.medium};
    `,
    ghost: `
      background: transparent;
      color: ${colors.steelGray};
      border: 2px solid ${colors.steelGray};
      border-radius: ${borderRadius.none};
      padding: ${spacing.md} ${spacing.lg};
      font-weight: ${typography.fontWeight.semibold};
      transition: all 0.2s ease;
    `,
  },
  card: `
    background: ${colors.snow};
    border: 2px solid ${colors.wafer};
    border-radius: ${borderRadius.none};
    box-shadow: ${shadows.medium};
    padding: ${spacing.xl};
  `,
  nav: `
    background: ${colors.steelGray};
    border: none;
    border-radius: ${borderRadius.none};
    padding: ${spacing.sm} ${spacing.md};
  `,
};

// Icon replacements
export const icons = {
  success: '🔥',        // Replace honeypot with flame
  fire: '🔥',          // Fire for hot/trending
  vote: '⚡',          // Lightning for voting
  growth: '📈',        // Growth arrow
  money: '💰',         // Money for funding
  team: '👥',          // Team
  idea: '💡',          // Ideas/innovation
  rocket: '🚀',        // Launch/scaling
  target: '🎯',        // Goals/objectives
  chart: '📊',         // Analytics
};

export default {
  colors,
  spacing,
  borderRadius,
  shadows,
  typography,
  components,
  icons,
};