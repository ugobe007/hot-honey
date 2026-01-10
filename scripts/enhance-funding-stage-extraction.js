#!/usr/bin/env node
/**
 * Enhance Funding Stage Extraction
 * Finds startups that should be Series A/B but aren't tagged correctly
 * Uses RSS articles and extracted_data to identify missing funding signals
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function enhanceFundingStageExtraction() {
  console.log('🔍 Analyzing funding stage signals...\n');

  try {
    // Step 1: Find RSS articles with Series A/B mentions that aren't linked to startups
    console.log('📰 Finding RSS articles with Series A/B mentions...');
    const { data: fundingArticles } = await supabase
      .from('rss_articles')
      .select('id, title, content, url, published_at')
      .or('title.ilike.%Series A%,title.ilike.%Series B%,content.ilike.%Series A%,content.ilike.%Series B%')
      .order('published_at', { ascending: false })
      .limit(100);

    if (!fundingArticles || fundingArticles.length === 0) {
      console.log('⚠️  No RSS articles with Series A/B mentions found');
    } else {
      console.log(`✅ Found ${fundingArticles.length} articles with Series A/B mentions\n`);
    }

    // Step 2: Find startups with funding signals in extracted_data but wrong stage
    console.log('🏢 Finding startups with funding signals but incorrect stage...');
    const { data: startupsWithSignals } = await supabase
      .from('startup_uploads')
      .select('id, name, stage, raise_type, raise_amount, extracted_data, website')
      .or('extracted_data->>funding_stage.not.is.null,extracted_data->>funding_amount.not.is.null,extracted_data->>round_type.not.is.null')
      .limit(500);

    if (!startupsWithSignals) {
      console.log('⚠️  No startups found with funding signals');
      return;
    }

    console.log(`✅ Found ${startupsWithSignals.length} startups with funding signals\n`);

    // Step 3: Analyze and identify missing Series A/B tags
    const needsUpdate = [];
    let seriesA = 0;
    let seriesB = 0;
    let otherStages = 0;

    for (const startup of startupsWithSignals) {
      const extracted = startup.extracted_data || {};
      const fundingStage = extracted.funding_stage || extracted.funding_round || extracted.round_type;
      const fundingAmount = extracted.funding_amount || startup.raise_amount;
      const currentStage = startup.stage;
      const raiseType = startup.raise_type;

      // Check if extracted data suggests Series A/B but stage is wrong
      if (fundingStage) {
        const stageLower = fundingStage.toLowerCase();
        let shouldBeStage = null;

        if (stageLower.includes('series a')) {
          shouldBeStage = 3; // Series A = stage 3
          seriesA++;
        } else if (stageLower.includes('series b')) {
          shouldBeStage = 5; // Series B = stage 5
          seriesB++;
        } else if (stageLower.includes('series c')) {
          shouldBeStage = 7;
          otherStages++;
        } else if (stageLower.includes('seed')) {
          shouldBeStage = 1;
          otherStages++;
        }

        // Check if stage needs updating
        if (shouldBeStage && currentStage !== shouldBeStage) {
          needsUpdate.push({
            id: startup.id,
            name: startup.name,
            currentStage,
            shouldBeStage,
            fundingStage,
            fundingAmount,
            raiseType,
            extracted
          });
        }
      }

      // Also check raise_type for Series A/B mentions
      if (raiseType) {
        const raiseLower = raiseType.toLowerCase();
        let shouldBeStage = null;

        if (raiseLower.includes('series a')) {
          shouldBeStage = 3;
          if (currentStage !== 3) {
            needsUpdate.push({
              id: startup.id,
              name: startup.name,
              currentStage,
              shouldBeStage: 3,
              fundingStage: raiseType,
              fundingAmount,
              raiseType,
              extracted,
              source: 'raise_type'
            });
          }
        } else if (raiseLower.includes('series b')) {
          shouldBeStage = 5;
          if (currentStage !== 5) {
            needsUpdate.push({
              id: startup.id,
              name: startup.name,
              currentStage,
              shouldBeStage: 5,
              fundingStage: raiseType,
              fundingAmount,
              raiseType,
              extracted,
              source: 'raise_type'
            });
          }
        }
      }

      // Check funding amount as signal (Series A/B typically $5M-$50M)
      if (fundingAmount && !fundingStage && !raiseType) {
        const amountStr = fundingAmount.toString().toLowerCase();
        const amountMatch = amountStr.match(/\$?([\d.]+)\s*([mbk])?/);
        if (amountMatch) {
          const value = parseFloat(amountMatch[1]);
          const unit = amountMatch[2] || 'm';
          let amount = value;
          if (unit === 'k') amount = value / 1000;
          if (unit === 'b') amount = value * 1000;

          // Series A: typically $5M-$15M, Series B: $15M-$50M
          if (amount >= 5 && amount <= 15 && currentStage !== 3) {
            needsUpdate.push({
              id: startup.id,
              name: startup.name,
              currentStage,
              shouldBeStage: 3,
              fundingStage: 'Inferred from amount',
              fundingAmount,
              raiseType,
              extracted,
              source: 'funding_amount_inference'
            });
          } else if (amount >= 15 && amount <= 50 && currentStage !== 5) {
            needsUpdate.push({
              id: startup.id,
              name: startup.name,
              currentStage,
              shouldBeStage: 5,
              fundingStage: 'Inferred from amount',
              fundingAmount,
              raiseType,
              extracted,
              source: 'funding_amount_inference'
            });
          }
        }
      }
    }

    // Remove duplicates (same startup might appear multiple times)
    const uniqueUpdates = Array.from(
      new Map(needsUpdate.map(item => [item.id, item])).values()
    );

    console.log('📊 Analysis Results:\n');
    console.log(`  Startups with Series A signals: ${seriesA}`);
    console.log(`  Startups with Series B signals: ${seriesB}`);
    console.log(`  Startups needing stage update: ${uniqueUpdates.length}\n`);

    if (uniqueUpdates.length === 0) {
      console.log('✅ All startups have correct funding stages!');
      return;
    }

    // Step 4: Show what needs updating
    console.log('🔧 Startups That Need Stage Updates:\n');
    const seriesAUpdates = uniqueUpdates.filter(u => u.shouldBeStage === 3);
    const seriesBUpdates = uniqueUpdates.filter(u => u.shouldBeStage === 5);

    if (seriesAUpdates.length > 0) {
      console.log(`📈 Should be Series A (Stage 3): ${seriesAUpdates.length} startups`);
      seriesAUpdates.slice(0, 10).forEach(u => {
        console.log(`  - ${u.name}: Current=${u.currentStage}, Should be=3, Signal=${u.fundingStage || u.source}`);
      });
      if (seriesAUpdates.length > 10) {
        console.log(`  ... and ${seriesAUpdates.length - 10} more`);
      }
      console.log();
    }

    if (seriesBUpdates.length > 0) {
      console.log(`📈 Should be Series B (Stage 5): ${seriesBUpdates.length} startups`);
      seriesBUpdates.slice(0, 10).forEach(u => {
        console.log(`  - ${u.name}: Current=${u.currentStage}, Should be=5, Signal=${u.fundingStage || u.source}`);
      });
      if (seriesBUpdates.length > 10) {
        console.log(`  ... and ${seriesBUpdates.length - 10} more`);
      }
      console.log();
    }

    // Step 5: Ask if user wants to update
    console.log('💡 Recommendation:');
    console.log(`   Run this query to see details: migrations/analyze_funding_stage_signals.sql`);
    console.log(`   Then update stages using the IDs above\n`);

    // Export for potential batch update
    const updateData = uniqueUpdates.map(u => ({
      id: u.id,
      name: u.name,
      current_stage: u.currentStage,
      new_stage: u.shouldBeStage,
      signal_source: u.source || 'extracted_data',
      funding_stage: u.fundingStage,
      funding_amount: u.fundingAmount
    }));

    console.log('📝 Export data for review:');
    console.log(JSON.stringify(updateData.slice(0, 20), null, 2));

    return {
      totalNeedingUpdate: uniqueUpdates.length,
      seriesA: seriesAUpdates.length,
      seriesB: seriesBUpdates.length,
      updates: updateData
    };

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

enhanceFundingStageExtraction();
