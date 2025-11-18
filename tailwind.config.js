module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 🔥 Hot Money Orange/Yellow Spectrum
        'hot-yellow': '#FEF301',      // Bright Yellow
        'hot-turbo': '#FFE102',       // Turbo
        'hot-supernova': '#fccc04',   // Supernova
        'hot-selective': '#FFB402',   // Selective Yellow
        'hot-golden': '#f7c20e',      // Golden Yellow
        'hot-amber': '#f4a404',       // Amber
        'hot-pizazz': '#f99006',      // Pizazz/Tangerine
        'hot-coral': '#f97a1e',       // Coral Orange
        'hot-fire': '#f87004',        // Chilean Fire
        'hot-california': '#fb9f05',  // California
        'hot-rust': '#ae3e07',        // Fire/Rust
        'hot-burnt': '#9a3604',       // Burnt Orange/Brown
        'hot-gold': '#d99205',        // Dark Gold
        
        // 💎 Complementary Cool Colors
        'cool-bondi': '#04a3b2',      // Bondi Blue (Turquoise)
        'cool-robin': '#04cccc',      // Robin's Egg Blue
        'cool-cerulean': '#04829c',   // Deep Cerulean
        'cool-navy': '#04204f',       // Downriver Navy
        'cool-sapphire': '#042962',   // Deep Sapphire
        'cool-sky': '#00aaff',        // Sky Blue
        'cool-bright': '#008cff',     // Bright Blue
        'cool-electric': '#001eff',   // Electric Blue
        'cool-deep': '#0700d9',       // Deep Blue
        'cool-purple': '#4700d6',     // Purple
        'cool-burgundy': '#540405',   // Bulgarian Rose (Deep Burgundy)
      },
    },
  },
  plugins: [],
}
