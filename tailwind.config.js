module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ════════════════════════════════════════════════════════════════
        // 🔥 HOT HONEY - OFFICIAL HYBRID PALETTE
        // ════════════════════════════════════════════════════════════════
        
        // ── PRIMARY: Warm Accent Colors (Brand Identity) ──
        'hh-fire': '#FF5A09',         // Primary CTA, buttons, links
        'hh-coral': '#F3843E',        // Secondary accents, hover states
        'hh-amber': '#FF9900',        // Highlights, active states, badges
        'hh-honey': '#FFB402',        // Subtle warmth, icons
        
        // ── NEUTRALS: Muted Grays (Professional Base) ──
        'hh-charcoal': '#393939',     // Primary backgrounds
        'hh-charcoal-light': '#454545', // Cards, elevated surfaces
        'hh-charcoal-dark': '#2d2d2d',  // Deeper backgrounds
        'hh-steel': '#6E6E6E',        // Borders, muted text
        'hh-slate': '#8A8A8A',        // Secondary text
        'hh-silver': '#B0B0B0',       // Disabled states
        
        // ── SECONDARY: Cool Accents (Data Viz, Info States) ──
        'hh-teal': '#00B4B4',         // Info badges, charts
        'hh-cyan': '#00CED1',         // Data visualization primary
        'hh-blue': '#3B82F6',         // Links in content, info states
        'hh-indigo': '#6366F1',       // Charts secondary
        'hh-purple': '#8B5CF6',       // Premium/special features
        
        // ── SEMANTIC: Status Colors ──
        'hh-success': '#22C55E',      // Success states
        'hh-warning': '#F59E0B',      // Warning (uses amber family)
        'hh-error': '#EF4444',        // Error states
        'hh-info': '#00B4B4',         // Info states (teal)
        
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
