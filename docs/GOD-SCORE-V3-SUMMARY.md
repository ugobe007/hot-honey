# GOD Score V3 - Forward-Looking Scoring System

**Date:** December 27, 2025
**Version:** 3.0

## Overview

GOD Score V3 introduces forward-looking components that predict fundability based on execution velocity, capital efficiency, and market timing - not just historical traction.

## New Scoring Components

| Component | Weight | Description |
|-----------|--------|-------------|
| Velocity | 0-2.0 | Launch speed, solo leverage, AI-native building |
| Capital Efficiency | 0-1.0 | Revenue/capital ratio, bootstrap bonus |
| Market Timing | 0-2.0 | Hot sector alignment, emerging categories |

## Configuration

- normalizationDivisor: 23
- baseBoostMinimum: 2.0

## Tier Distribution (n=2,037)

| Tier | Threshold | Count | Percent | Target |
|------|-----------|-------|---------|--------|
| T1 Elite | 58+ | 206 | 10% | 10% |
| T2 Strong | 50-57 | 581 | 29% | 28% |
| T3 Emerging | 40-49 | 798 | 39% | 50% |
| T4 Angels | 35-39 | 127 | 6% | 10% |
| T5 Incubator | <35 | 325 | 16% | 2% |

## Hot Sectors (2025-Q4)

### Tier 1 - Explosive
- Vertical AI, Applied AI, Agentic AI
- Defense Tech, Autonomous Systems
- Robotics, Humanoid Robots
- Quantum Computing

### Tier 2 - Strong
- Climate Tech, Clean Energy
- HealthTech, Biotech, Genomics
- Cybersecurity
- Fintech, DeFi

## Files

- server/services/startupScoringService.ts - Main scoring logic
- server/services/velocityScoring.ts - Velocity component
- server/services/capitalEfficiencyScoring.ts - Efficiency component
- server/services/marketTimingScoring.ts - Market timing component
- config/hot-sectors-2025.json - Sector configuration
- config/investor-tiers.json - Tier thresholds

## Automation

Every 2 hours (FREE, no AI):
- :45 - Inference enrichment (pattern matching)
- :00 - Score recalculation

## Key Insights

1. T1/T2 are well-calibrated - 10% elite, 29% strong matches VC reality
2. T5 is high (16%) - These are enrichment candidates, not junk
3. Forward-looking signals working - Defense tech, robotics, AI startups scoring higher
4. Solo founders rewarded - Velocity scoring captures AI-leveraged builders
