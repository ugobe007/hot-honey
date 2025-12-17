# Hot Match Flame Icons

## Directory: `/public/images/flames/`

Place your 9 flame icon images here with these exact names:

```
flame-1.png  (top-left flame from your grid)
flame-2.png  (top-center flame)
flame-3.png  (top-right flame)
flame-4.png  (middle-left flame)
flame-5.png  (middle-center flame) ← DEFAULT, most balanced
flame-6.png  (middle-right flame)
flame-7.png  (bottom-left flame) ← MATCH indicator
flame-8.png  (bottom-center flame) ← STARTUP indicator
flame-9.png  (bottom-right flame) ← TRENDING indicator
```

## Grid Reference (from your image):
```
┌─────────┬─────────┬─────────┐
│ flame-1 │ flame-2 │ flame-3 │
├─────────┼─────────┼─────────┤
│ flame-4 │ flame-5 │ flame-6 │
├─────────┼─────────┼─────────┤
│ flame-7 │ flame-8 │ flame-9 │
└─────────┴─────────┴─────────┘
```

## How to Use in Code:

```tsx
import FlameIcon, { HotMatchLogo, StartupFlame, TrendingFlame, MatchFlame, AnimatedFlame } from '../components/FlameIcon';

// Basic usage with variant 1-9
<FlameIcon variant={5} size="lg" />

// Pre-configured variants
<HotMatchLogo size="xl" />           // Main logo (flame-5)
<StartupFlame size="md" />            // Startup indicator (flame-8)
<TrendingFlame size="lg" />           // Trending with pulse animation (flame-9)
<MatchFlame size="md" />              // Match indicator (flame-7)

// Animated flame that cycles through all variants
<AnimatedFlame size="xl" />

// Sizes available: xs, sm, md, lg, xl, 2xl, 3xl, 4xl
```

## File Format Recommendations:
- PNG with transparent background (preferred)
- SVG also supported (change extension in FlameIcon.tsx)
- Minimum resolution: 128x128px
- Recommended: 256x256px or larger for sharp display at all sizes
