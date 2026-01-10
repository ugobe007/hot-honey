/**
 * GOD Score Template Guide Generator
 * 
 * Analyzes a startup's GOD scores and provides recommendations
 * for which templates to complete to improve specific components.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Template to GOD Score Component Mapping
const TEMPLATE_GOD_MAPPING = {
  'pitch-analyzer': ['vision', 'market'],
  'value-prop-sharpener': ['vision', 'market', 'product'],
  'vc-approach-playbook': ['market'],
  'funding-strategy': ['market', 'vision'],
  'traction-improvement': ['traction'],
  'team-gap-analysis': ['team'],
  'pmf-analysis': ['product', 'traction'],
  'partnership-opportunities': ['market', 'traction']
};

// Score thresholds for recommendations
const THRESHOLDS = {
  excellent: 70,
  good: 50,
  needs_improvement: 40,
  critical: 30
};

async function analyzeStartupGODScores(startupId) {
  console.log(`📊 Analyzing GOD scores for startup: ${startupId}`);

  // Fetch startup with all GOD score components
  const { data: startup, error } = await supabase
    .from('startup_uploads')
    .select(`
      id,
      name,
      total_god_score,
      traction_score,
      team_score,
      market_score,
      product_score,
      vision_score,
      industry_god_score
    `)
    .eq('id', startupId)
    .single();

  if (error || !startup) {
    console.error('❌ Error fetching startup:', error);
    return null;
  }

  const recommendations = {
    startup_id: startup.id,
    startup_name: startup.name,
    current_scores: {
      total: startup.total_god_score || 0,
      traction: startup.traction_score || 0,
      team: startup.team_score || 0,
      market: startup.market_score || 0,
      product: startup.product_score || 0,
      vision: startup.vision_score || 0
    },
    recommendations: []
  };

  // Analyze each component
  const components = [
    { name: 'traction', score: startup.traction_score || 0, weight: 35 },
    { name: 'team', score: startup.team_score || 0, weight: 25 },
    { name: 'market', score: startup.market_score || 0, weight: 20 },
    { name: 'product', score: startup.product_score || 0, weight: 15 },
    { name: 'vision', score: startup.vision_score || 0, weight: 5 }
  ];

  for (const component of components) {
    let priority = 'low';
    let targetScore = component.score + 10;

    if (component.score < THRESHOLDS.critical) {
      priority = 'critical';
      targetScore = THRESHOLDS.needs_improvement;
    } else if (component.score < THRESHOLDS.needs_improvement) {
      priority = 'high';
      targetScore = THRESHOLDS.needs_improvement;
    } else if (component.score < THRESHOLDS.good) {
      priority = 'medium';
      targetScore = THRESHOLDS.good;
    }

    // Find templates that improve this component
    const relevantTemplates = Object.entries(TEMPLATE_GOD_MAPPING)
      .filter(([slug, impacts]) => impacts.includes(component.name))
      .map(([slug]) => slug);

    if (relevantTemplates.length > 0 && priority !== 'low') {
      recommendations.recommendations.push({
        component: component.name,
        current_score: component.score,
        target_score: targetScore,
        priority,
        impact_weight: component.weight,
        templates: relevantTemplates,
        reasoning: generateReasoning(component.name, component.score, priority)
      });
    }
  }

  // Sort by priority (critical > high > medium > low)
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.recommendations.sort((a, b) => 
    priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  return recommendations;
}

function generateReasoning(component, score, priority) {
  const templates = {
    traction: 'Focus on traction improvement templates to demonstrate growth metrics, revenue signals, and customer validation to VCs.',
    team: 'Complete team gap analysis templates to identify missing roles and strengthen your founding team narrative.',
    market: 'Work on market strategy templates to better articulate your TAM, market timing, and competitive positioning.',
    product: 'Use PMF and product analysis templates to validate product-market fit and demonstrate user engagement.',
    vision: 'Complete pitch and value prop templates to sharpen your vision and communicate your startup\'s potential.'
  };

  const baseReasoning = templates[component] || 'This component needs improvement.';
  
  if (priority === 'critical') {
    return `🚨 CRITICAL: ${baseReasoning} Your ${component} score is critically low and will significantly impact fundraising success.`;
  } else if (priority === 'high') {
    return `⚠️ HIGH PRIORITY: ${baseReasoning} Improving this will boost your overall GOD score.`;
  } else {
    return `📈 MEDIUM PRIORITY: ${baseReasoning}`;
  }
}

async function saveRecommendations(recommendations) {
  // Save to template_recommendations table (create if doesn't exist)
  const { error } = await supabase
    .from('template_recommendations')
    .upsert({
      startup_id: recommendations.startup_id,
      recommendations: recommendations.recommendations,
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'startup_id'
    });

  if (error) {
    console.error('⚠️  Error saving recommendations (table might not exist):', error.message);
    console.log('💡 Create table with: CREATE TABLE template_recommendations (startup_id UUID PRIMARY KEY, recommendations JSONB, generated_at TIMESTAMPTZ, updated_at TIMESTAMPTZ);');
  } else {
    console.log('✅ Recommendations saved to database');
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
📚 GOD Score Template Guide Generator

Usage:
  node scripts/templates/god-score-template-guide.js <startup-id>

Example:
  node scripts/templates/god-score-template-guide.js 123e4567-e89b-12d3-a456-426614174000

This script will:
1. Analyze the startup's GOD score components
2. Identify which components need improvement
3. Recommend templates that will improve each component
4. Save recommendations to the database
    `);
    process.exit(0);
  }

  const startupId = args[0];

  console.log('🎯 GOD Score Template Guide Generator');
  console.log('=====================================\n');

  const recommendations = await analyzeStartupGODScores(startupId);

  if (!recommendations) {
    console.error('❌ Failed to analyze startup');
    process.exit(1);
  }

  console.log(`\n📊 Analysis for: ${recommendations.startup_name}`);
  console.log(`   Total GOD Score: ${recommendations.current_scores.total}/100\n`);

  console.log('📈 Component Scores:');
  console.log(`   Traction: ${recommendations.current_scores.traction}/100`);
  console.log(`   Team: ${recommendations.current_scores.team}/100`);
  console.log(`   Market: ${recommendations.current_scores.market}/100`);
  console.log(`   Product: ${recommendations.current_scores.product}/100`);
  console.log(`   Vision: ${recommendations.current_scores.vision}/100\n`);

  if (recommendations.recommendations.length === 0) {
    console.log('✅ All components are above threshold. No recommendations needed!');
  } else {
    console.log('💡 Recommendations:\n');
    
    recommendations.recommendations.forEach((rec, idx) => {
      const emoji = rec.priority === 'critical' ? '🚨' : rec.priority === 'high' ? '⚠️' : '📈';
      console.log(`${emoji} ${idx + 1}. ${rec.component.toUpperCase()} (${rec.current_score}/100 → ${rec.target_score}/100)`);
      console.log(`   Priority: ${rec.priority.toUpperCase()}`);
      console.log(`   ${rec.reasoning}`);
      console.log(`   Recommended Templates: ${rec.templates.join(', ')}\n`);
    });

    // Save to database
    await saveRecommendations(recommendations);
  }

  console.log('\n✅ Analysis complete!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { analyzeStartupGODScores };

