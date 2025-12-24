module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ════════════════════════════════════════════════════════════════
        // 🔥 HOT HONEY - BLACK & GOLD ELEGANCE PALETTE
        // ════════════════════════════════════════════════════════════════
        
        // ── PRIMARY: Black & Gold Elegance ──
        'hh-gold': '#FCA311',         // Primary accent, CTAs, highlights
        'hh-gold-light': '#FDBC4B',   // Hover states, secondary accent
        'hh-gold-dark': '#E59200',    // Pressed states
        'hh-navy': '#14213D',         // Primary dark, headers, nav
        'hh-navy-light': '#1D3461',   // Cards, elevated surfaces
        'hh-navy-dark': '#0D1527',    // Deepest backgrounds
        
        // ── NEUTRALS: Clean Whites & Grays ──
        'hh-white': '#FFFFFF',        // Pure white backgrounds
        'hh-gray': '#E5E5E5',         // Borders, secondary backgrounds
        'hh-gray-dark': '#CCCCCC',    // Muted elements
        'hh-black': '#000000',        // Text, maximum contrast
        'hh-charcoal': '#1A1A1A',     // Near-black backgrounds
        
        // ── ACCENT: Purple & Green (Glistening) ──
        'hh-purple': '#8B5CF6',       // Premium features, special
        'hh-purple-light': '#A78BFA', // Purple hover
        'hh-purple-dark': '#7C3AED',  // Purple pressed
        'hh-green': '#10B981',        // Glistening green, success
        'hh-green-light': '#34D399',  // Green hover, highlights
        'hh-green-dark': '#059669',   // Green pressed
        'hh-emerald': '#00D9A5',      // Bright glistening accent
        
        // ── SEMANTIC: Status Colors ──
        'hh-success': '#10B981',      // Success states (green)
        'hh-warning': '#FCA311',      // Warning (gold)
        'hh-error': '#EF4444',        // Error states
        'hh-info': '#8B5CF6',         // Info states (purple)
        
        // ════════════════════════════════════════════════════════════════
        // 🎨 LEGACY: Hot Money Spectrum (Keep for compatibility)
        // ════════════════════════════════════════════════════════════════
        'hot-yellow': '#FEF301',
        'hot-turbo': '#FFE102',
        'hot-supernova': '#fccc04',
        'hot-selective': '#FFB402',
        'hot-golden': '#f7c20e',
        'hot-amber': '#f4a404',
        'hot-pizazz': '#f99006',
        'hot-coral': '#f97a1e',
        'hot-fire': '#f87004',
        'hot-california': '#fb9f05',
        'hot-rust': '#ae3e07',
        'hot-burnt': '#9a3604',
        'hot-gold': '#d99205',
        
        // ── Legacy Cool Colors ──
        'cool-bondi': '#04a3b2',
        'cool-robin': '#04cccc',
        'cool-cerulean': '#04829c',
        'cool-navy': '#04204f',
        'cool-sapphire': '#042962',
        'cool-sky': '#00aaff',
        'cool-bright': '#008cff',
        'cool-electric': '#001eff',
        'cool-deep': '#0700d9',
        'cool-purple': '#4700d6',
        'cool-burgundy': '#540405',
      },
    },
  },
  plugins: [],
}
