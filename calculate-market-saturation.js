#!/usr/bin/env node
/**
 * Market Saturation Algorithm
 * 
 * Analyzes investment trends and applies negative weighting to sectors
 * where deal velocity is declining, indicating market saturation.
 * 
 * Logic:
 * 1. Track investments by sector over time (6-month windows)
 * 2. Calculate investment velocity (deals per month)
 * 3. Detect declining velocity (slowdown indicator)
 * 4. Apply penalty multiplier to GOD scores in saturated sectors
 */

const { Client } = require('pg');
require('dotenv').config();

const POSTGRES_URL = process.env.POSTGRES_URL;
const client = new Client({ connectionString: POSTGRES_URL });

// Saturation penalties based on velocity decline
const SATURATION_LEVELS = {
  CRITICAL: { threshold: -50, penalty: 0.70 },  // 30% score reduction
  HIGH: { threshold: -30, penalty: 0.85 },      // 15% score reduction
  MODERATE: { threshold: -15, penalty: 0.93 },  // 7% score reduction
  LOW: { threshold: 0, penalty: 1.00 }          // No penalty
};

async function analyzeSectorSaturation() {
  console.log('\n🔍 Market Saturation Analysis\n');
  console.log('═'.repeat(80));

  await client.connect();

  // Get investment counts by sector for last 12 months
  const sectorQuery = `
    WITH sector_timeline AS (
      SELECT 
        s.sectors,
        DATE_TRUNC('month', s.created_at) as month,
        COUNT(*) as deal_count
      FROM startup_uploads s
      WHERE 
        s.created_at >= NOW() - INTERVAL '12 months'
        AND s.sectors IS NOT NULL
      GROUP BY s.sectors, DATE_TRUNC('month', s.created_at)
    ),
    sector_stats AS (
      SELECT 
        sectors,
        month,
        deal_count,
        LAG(deal_count, 3) OVER (PARTITION BY sectors ORDER BY month) as prev_quarter_count
      FROM sector_timeline
    )
    SELECT 
      sectors,
      SUM(deal_count) as total_deals,
      AVG(deal_count) as avg_monthly_deals,
      MAX(CASE WHEN prev_quarter_count > 0 
        THEN ((deal_count - prev_quarter_count) * 100.0 / prev_quarter_count)
        ELSE 0 
      END) as velocity_change
    FROM sector_stats
    WHERE prev_quarter_count IS NOT NULL
    GROUP BY sectors
    HAVING SUM(deal_count) >= 3
    ORDER BY velocity_change ASC
  `;

  const { rows: sectors } = await client.query(sectorQuery);

  console.log(`\n📊 Analyzed ${sectors.length} active sectors\n`);

  const saturatedSectors = [];

  for (const sector of sectors) {
    const velocityChange = parseFloat(sector.velocity_change) || 0;
    let saturationLevel = 'LOW';
    let penalty = 1.0;

    // Determine saturation level
    if (velocityChange <= SATURATION_LEVELS.CRITICAL.threshold) {
      saturationLevel = 'CRITICAL';
      penalty = SATURATION_LEVELS.CRITICAL.penalty;
    } else if (velocityChange <= SATURATION_LEVELS.HIGH.threshold) {
      saturationLevel = 'HIGH';
      penalty = SATURATION_LEVELS.HIGH.penalty;
    } else if (velocityChange <= SATURATION_LEVELS.MODERATE.threshold) {
      saturationLevel = 'MODERATE';
      penalty = SATURATION_LEVELS.MODERATE.penalty;
    }

    const sectorNames = sector.sectors;
    const sectorStr = Array.isArray(sectorNames) ? sectorNames.join(', ') : sectorNames;

    console.log(`\n${getStatusIcon(saturationLevel)} ${sectorStr}`);
    console.log(`   Total deals: ${sector.total_deals}`);
    console.log(`   Avg monthly: ${parseFloat(sector.avg_monthly_deals).toFixed(1)}`);
    console.log(`   Velocity: ${velocityChange >= 0 ? '+' : ''}${velocityChange.toFixed(1)}%`);
    console.log(`   Status: ${saturationLevel}`);
    console.log(`   Penalty: ${((1 - penalty) * 100).toFixed(0)}% reduction`);

    if (penalty < 1.0) {
      saturatedSectors.push({
        sectors: sectorNames,
        penalty,
        velocityChange,
        level: saturationLevel
      });
    }
  }

  // Apply penalties to affected startups
  if (saturatedSectors.length > 0) {
    console.log('\n' + '═'.repeat(80));
    console.log(`\n⚠️  Applying penalties to ${saturatedSectors.length} saturated sectors...\n`);

    let affectedStartups = 0;

    for (const satSector of saturatedSectors) {
      // Update startups in this sector
      const updateQuery = `
        UPDATE startup_uploads
        SET 
          total_god_score = ROUND(total_god_score * $1),
          market_score = ROUND(market_score * $1)
        WHERE 
          sectors && $2::text[]
          AND total_god_score IS NOT NULL
        RETURNING id, name, total_god_score
      `;

      const { rows: updated } = await client.query(updateQuery, [
        satSector.penalty,
        satSector.sectors
      ]);

      affectedStartups += updated.length;

      if (updated.length > 0) {
        const sectorStr = Array.isArray(satSector.sectors) 
          ? satSector.sectors.join(', ') 
          : satSector.sectors;
        console.log(`   ✓ ${updated.length} startups adjusted in: ${sectorStr}`);
      }
    }

    console.log(`\n✅ Applied saturation penalties to ${affectedStartups} total startups`);
  } else {
    console.log('\n✅ No saturated sectors detected - all markets healthy!');
  }

  console.log('\n' + '═'.repeat(80) + '\n');
  
  await client.end();
}

function getStatusIcon(level) {
  switch (level) {
    case 'CRITICAL': return '🔴';
    case 'HIGH': return '🟠';
    case 'MODERATE': return '🟡';
    default: return '🟢';
  }
}

// Run analysis
analyzeSectorSaturation().catch(console.error);
