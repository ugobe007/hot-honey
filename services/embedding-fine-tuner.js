/**
 * EMBEDDING FINE-TUNER SERVICE
 * 
 * Generates domain-specific training data for embedding fine-tuning.
 * Uses feedback data to create positive/negative pairs for contrastive learning.
 * 
 * The goal is to learn what "good match" means in our specific domain
 * rather than relying on general-purpose embeddings.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

class EmbeddingFineTuner {
  constructor() {
    this.trainingDataPath = path.join(__dirname, '../training-data');
  }

  /**
   * Generate training pairs from match feedback
   * Creates positive pairs (high engagement) and hard negatives (passed/rejected)
   */
  async generateTrainingPairs() {
    console.log('🎯 Generating embedding training pairs...');

    // Get positive signals (saved, contacted, meeting, invested)
    const { data: positives } = await supabase
      .from('match_feedback')
      .select(`
        startup_id,
        investor_id,
        feedback_type,
        feedback_value,
        startup_uploads!inner(name, description, pitch, sectors, stage),
        investors!inner(name, investment_thesis, sectors, stage)
      `)
      .in('feedback_type', ['saved', 'contacted', 'meeting_scheduled', 'invested'])
      .limit(10000);

    // Get negative signals (passed, reported)
    const { data: negatives } = await supabase
      .from('match_feedback')
      .select(`
        startup_id,
        investor_id,
        feedback_type,
        feedback_value,
        startup_uploads!inner(name, description, pitch, sectors, stage),
        investors!inner(name, investment_thesis, sectors, stage)
      `)
      .in('feedback_type', ['passed', 'reported'])
      .limit(5000);

    // Also get high-scoring matches that haven't been interacted with as positives
    const { data: highMatches } = await supabase
      .from('startup_investor_matches')
      .select(`
        startup_id,
        investor_id,
        match_score,
        startup_uploads!inner(name, description, pitch, sectors, stage),
        investors!inner(name, investment_thesis, sectors, stage)
      `)
      .gte('match_score', 75)
      .limit(5000);

    console.log(`  Positives from feedback: ${positives?.length || 0}`);
    console.log(`  Negatives from feedback: ${negatives?.length || 0}`);
    console.log(`  High-score matches: ${highMatches?.length || 0}`);

    // Convert to training format
    const trainingData = [];

    // Process positives
    for (const p of (positives || [])) {
      const startup = p.startup_uploads;
      const investor = p.investors;
      
      trainingData.push({
        anchor: this.formatForEmbedding('startup', startup),
        positive: this.formatForEmbedding('investor', investor),
        label: 1,
        weight: this.feedbackWeight(p.feedback_type)
      });
    }

    // Process high matches as positives
    for (const m of (highMatches || [])) {
      trainingData.push({
        anchor: this.formatForEmbedding('startup', m.startup_uploads),
        positive: this.formatForEmbedding('investor', m.investors),
        label: 1,
        weight: m.match_score / 100
      });
    }

    // Process negatives as hard negatives
    for (const n of (negatives || [])) {
      trainingData.push({
        anchor: this.formatForEmbedding('startup', n.startup_uploads),
        negative: this.formatForEmbedding('investor', n.investors),
        label: 0,
        weight: Math.abs(n.feedback_value)
      });
    }

    console.log(`  Total training pairs: ${trainingData.length}`);

    return trainingData;
  }

  /**
   * Format entity for embedding text
   */
  formatForEmbedding(type, entity) {
    if (type === 'startup') {
      return [
        entity.name || '',
        entity.description || '',
        entity.pitch || '',
        `Sectors: ${(entity.sectors || []).join(', ')}`,
        `Stage: ${entity.stage || ''}`
      ].filter(Boolean).join(' | ');
    }
    
    if (type === 'investor') {
      return [
        entity.name || '',
        entity.investment_thesis || '',
        `Invests in: ${(entity.sectors || []).join(', ')}`,
        `Stages: ${(entity.stage || []).join(', ')}`
      ].filter(Boolean).join(' | ');
    }

    return entity.toString();
  }

  feedbackWeight(type) {
    return {
      'invested': 2.0,
      'meeting_scheduled': 1.5,
      'contacted': 1.2,
      'saved': 1.0,
      'passed': 1.0,
      'reported': 1.5
    }[type] || 1.0;
  }

  /**
   * Generate triplet training data for contrastive learning
   * Each triplet: (anchor, positive, negative)
   */
  async generateTriplets() {
    const pairs = await this.generateTrainingPairs();
    
    // Group by anchor
    const positivesByAnchor = {};
    const negativesByAnchor = {};

    for (const pair of pairs) {
      const anchor = pair.anchor;
      if (pair.positive) {
        positivesByAnchor[anchor] = positivesByAnchor[anchor] || [];
        positivesByAnchor[anchor].push(pair.positive);
      }
      if (pair.negative) {
        negativesByAnchor[anchor] = negativesByAnchor[anchor] || [];
        negativesByAnchor[anchor].push(pair.negative);
      }
    }

    // Create triplets
    const triplets = [];
    const anchors = Object.keys(positivesByAnchor);

    for (const anchor of anchors) {
      const positives = positivesByAnchor[anchor] || [];
      let negatives = negativesByAnchor[anchor] || [];

      // If no explicit negatives, use positives from other anchors as negatives
      if (negatives.length === 0) {
        const otherAnchors = anchors.filter(a => a !== anchor);
        for (const other of otherAnchors.slice(0, 5)) {
          negatives.push(...(positivesByAnchor[other] || []).slice(0, 2));
        }
      }

      for (const positive of positives.slice(0, 3)) {
        for (const negative of negatives.slice(0, 3)) {
          triplets.push({ anchor, positive, negative });
        }
      }
    }

    console.log(`  Generated ${triplets.length} triplets for contrastive learning`);
    return triplets;
  }

  /**
   * Export training data for external fine-tuning
   * Supports multiple formats: JSONL, CSV, Sentence Transformers
   */
  async exportTrainingData(format = 'jsonl') {
    await fs.mkdir(this.trainingDataPath, { recursive: true });

    const triplets = await this.generateTriplets();
    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'jsonl') {
      // JSONL format for OpenAI fine-tuning
      const jsonlPath = path.join(this.trainingDataPath, `triplets-${timestamp}.jsonl`);
      const lines = triplets.map(t => JSON.stringify({
        query: t.anchor,
        positive: t.positive,
        negative: t.negative
      }));
      await fs.writeFile(jsonlPath, lines.join('\n'));
      console.log(`  Exported to: ${jsonlPath}`);
      return jsonlPath;
    }

    if (format === 'sentence-transformers') {
      // Format for sentence-transformers library
      const stPath = path.join(this.trainingDataPath, `training-${timestamp}.csv`);
      const header = 'sentence1,sentence2,label';
      const lines = [];
      
      for (const t of triplets) {
        // Positive pair
        lines.push(`"${this.escapeCSV(t.anchor)}","${this.escapeCSV(t.positive)}",1`);
        // Negative pair
        lines.push(`"${this.escapeCSV(t.anchor)}","${this.escapeCSV(t.negative)}",0`);
      }

      await fs.writeFile(stPath, [header, ...lines].join('\n'));
      console.log(`  Exported to: ${stPath}`);
      return stPath;
    }

    if (format === 'huggingface') {
      // Hugging Face datasets format
      const hfPath = path.join(this.trainingDataPath, `dataset-${timestamp}.json`);
      const dataset = {
        version: '1.0',
        generated_at: new Date().toISOString(),
        task: 'sentence-similarity',
        data: triplets.map(t => ({
          anchor: t.anchor,
          positive: t.positive,
          negative: t.negative
        }))
      };
      await fs.writeFile(hfPath, JSON.stringify(dataset, null, 2));
      console.log(`  Exported to: ${hfPath}`);
      return hfPath;
    }

    throw new Error(`Unknown format: ${format}`);
  }

  escapeCSV(str) {
    return (str || '').replace(/"/g, '""').replace(/\n/g, ' ');
  }

  /**
   * Calculate domain-specific similarity metrics
   * Use these to evaluate fine-tuned vs base embeddings
   */
  async evaluateEmbeddings() {
    // Get known positive pairs from feedback
    const { data: positives } = await supabase
      .from('match_feedback')
      .select('startup_id, investor_id')
      .in('feedback_type', ['contacted', 'meeting_scheduled', 'invested'])
      .limit(100);

    // Get known negative pairs
    const { data: negatives } = await supabase
      .from('match_feedback')
      .select('startup_id, investor_id')
      .in('feedback_type', ['passed', 'reported'])
      .limit(100);

    if (!positives?.length || !negatives?.length) {
      console.log('  Not enough feedback data for evaluation');
      return null;
    }

    // Calculate current embedding similarities
    const results = {
      positive_mean_similarity: 0,
      negative_mean_similarity: 0,
      separation: 0 // Difference between positive and negative means
    };

    // Get embeddings for evaluation
    const startupIds = [...new Set([
      ...positives.map(p => p.startup_id),
      ...negatives.map(n => n.startup_id)
    ])];

    const investorIds = [...new Set([
      ...positives.map(p => p.investor_id),
      ...negatives.map(n => n.investor_id)
    ])];

    const { data: startups } = await supabase
      .from('startup_uploads')
      .select('id, embedding_1536')
      .in('id', startupIds);

    const { data: investors } = await supabase
      .from('investors')
      .select('id, embedding_1536')
      .in('id', investorIds);

    const startupEmbeddings = Object.fromEntries((startups || []).map(s => [s.id, s.embedding_1536]));
    const investorEmbeddings = Object.fromEntries((investors || []).map(i => [i.id, i.embedding_1536]));

    // Calculate similarities for positives
    let posSum = 0, posCount = 0;
    for (const p of positives) {
      const se = startupEmbeddings[p.startup_id];
      const ie = investorEmbeddings[p.investor_id];
      if (se && ie) {
        posSum += this.cosineSimilarity(se, ie);
        posCount++;
      }
    }
    results.positive_mean_similarity = posCount > 0 ? posSum / posCount : 0;

    // Calculate similarities for negatives
    let negSum = 0, negCount = 0;
    for (const n of negatives) {
      const se = startupEmbeddings[n.startup_id];
      const ie = investorEmbeddings[n.investor_id];
      if (se && ie) {
        negSum += this.cosineSimilarity(se, ie);
        negCount++;
      }
    }
    results.negative_mean_similarity = negCount > 0 ? negSum / negCount : 0;

    results.separation = results.positive_mean_similarity - results.negative_mean_similarity;

    console.log('\n📊 Embedding Evaluation Results:');
    console.log(`  Positive pairs mean similarity: ${(results.positive_mean_similarity * 100).toFixed(1)}%`);
    console.log(`  Negative pairs mean similarity: ${(results.negative_mean_similarity * 100).toFixed(1)}%`);
    console.log(`  Separation (higher is better): ${(results.separation * 100).toFixed(1)}%`);
    console.log(`  Samples: ${posCount} positive, ${negCount} negative`);

    return results;
  }

  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
  }

  /**
   * Generate fine-tuning instructions for different platforms
   */
  generateFineTuningInstructions() {
    return `
# Embedding Fine-Tuning Guide for Hot Honey

## Option 1: OpenAI Fine-Tuning
1. Export training data: node services/embedding-fine-tuner.js --export jsonl
2. Upload to OpenAI: openai api fine_tunes.create -t training-data/triplets-*.jsonl
3. Update FINE_TUNED_MODEL in .env

## Option 2: Sentence Transformers (Recommended)
1. Export training data: node services/embedding-fine-tuner.js --export sentence-transformers
2. Fine-tune locally:
   
   from sentence_transformers import SentenceTransformer, InputExample, losses
   from torch.utils.data import DataLoader
   
   model = SentenceTransformer('all-MiniLM-L6-v2')
   train_examples = [InputExample(texts=[row[0], row[1]], label=float(row[2])) for row in data]
   train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=16)
   train_loss = losses.CosineSimilarityLoss(model)
   model.fit(train_objectives=[(train_dataloader, train_loss)], epochs=3)
   model.save('hot-honey-embeddings')

## Option 3: Hugging Face
1. Export: node services/embedding-fine-tuner.js --export huggingface
2. Upload to HF Hub
3. Fine-tune with Trainer API

## Evaluation
Run: node services/embedding-fine-tuner.js --evaluate
Target: >10% separation between positive and negative pairs
`;
  }
}

// CLI interface
async function main() {
  const fineTuner = new EmbeddingFineTuner();
  const args = process.argv.slice(2);

  if (args.includes('--export')) {
    const formatIdx = args.indexOf('--export') + 1;
    const format = args[formatIdx] || 'jsonl';
    await fineTuner.exportTrainingData(format);
  } else if (args.includes('--evaluate')) {
    await fineTuner.evaluateEmbeddings();
  } else if (args.includes('--instructions')) {
    console.log(fineTuner.generateFineTuningInstructions());
  } else {
    console.log('🎯 Embedding Fine-Tuner');
    console.log('Usage:');
    console.log('  --export [jsonl|sentence-transformers|huggingface]  Export training data');
    console.log('  --evaluate                                          Evaluate current embeddings');
    console.log('  --instructions                                      Show fine-tuning guide');
    
    // Default: show stats
    const pairs = await fineTuner.generateTrainingPairs();
    console.log(`\nReady to export ${pairs.length} training pairs`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { EmbeddingFineTuner };
