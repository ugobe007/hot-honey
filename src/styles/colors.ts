/**
 * [pyth] ai Official Color Palette
 * 
 * USAGE: Import these colors for consistent branding.
 * These are the ONLY colors to use for UI elements.
 */

export const colors = {
  // Primary Background
  charcoal: '#393939',
  charcoalLight: '#454545',
  charcoalDark: '#2d2d2d',
  
  // Primary Action Color - Use for main buttons, CTAs
  fireOrange: '#FF5A09',
  fireOrangeHover: '#E54D00',
  
  // Secondary Accent - Use for secondary buttons, highlights  
  coral: '#F3843E',
  coralHover: '#E5742E',
  
  // Highlights - Use for active states, badges, emphasis
  amber: '#FF9900',
  amberHover: '#E68A00',
  
  // Neutral - Use for text, borders, muted elements
  steel: '#6E6E6E',
  steelLight: '#8A8A8A',
  steelDark: '#505050',
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#6E6E6E',
  
  // Status colors (minimal usage)
  success: '#22C55E',
  warning: '#FF9900', // Uses amber
  error: '#EF4444',
  info: '#3B82F6',
} as const;

// Tailwind class mappings
export const tw = {
  // Backgrounds
  bgPrimary: 'bg-[#393939]',
  bgSecondary: 'bg-[#2d2d2d]',
  bgCard: 'bg-[#454545]',
  
  // Buttons
  btnPrimary: 'bg-[#FF5A09] hover:bg-[#E54D00] text-white',
  btnSecondary: 'bg-[#F3843E] hover:bg-[#E5742E] text-white',
  btnGhost: 'bg-transparent hover:bg-[#454545] text-white border border-[#6E6E6E]',
  
  // Text
  textPrimary: 'text-white',
  textSecondary: 'text-[#B0B0B0]',
  textMuted: 'text-[#6E6E6E]',
  textAccent: 'text-[#FF9900]',
  
  // Borders
  border: 'border-[#6E6E6E]',
  borderAccent: 'border-[#FF5A09]',
  
  // Gradients
  gradientPrimary: 'bg-gradient-to-r from-[#FF5A09] to-[#FF9900]',
  gradientSecondary: 'bg-gradient-to-r from-[#F3843E] to-[#FF9900]',
} as const;

export type ColorKey = keyof typeof colors;
