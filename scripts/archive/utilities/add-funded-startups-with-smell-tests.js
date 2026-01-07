#!/usr/bin/env node
/**
 * ADD FUNDED STARTUPS WITH YC SMELL TESTS
 * ========================================
 * Adds recently funded startups and applies YC "smell test" scoring
 * 
 * YC Smell Tests:
 * 1. Could 2 people build this in 3 months? (Lean)
 * 2. Do users sound emotionally attached? (User Passion)
 * 3. Is the founder learning in public? (Transparency)
 * 4. Does this feel early but inevitable? (Timing)
 * 5. Could this be massive if it works? (TAM Potential)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://unkpogyhhjbvxxjvmxlt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTkwMzUsImV4cCI6MjA3NjczNTAzNX0.DdtBUf-liELSfKs2akrrHMcmlX4vHEkTuytWnvAYpJ8';
const supabase = createClient(supabaseUrl, supabaseKey);

// Recently funded startups from news
const fundedStartups = [
  {
    name: 'EDT',
    tagline: 'Consumer appliances & tech brand revolutionizing home products',
    pitch: 'EDT is building the next generation of consumer home appliances with smart technology integration. Their product-first approach focuses on design and functionality.',
    industry: 'Consumer Tech',
    industries: ['Consumer', 'Hardware', 'Smart Home'],
    geography: 'India',
    latest_funding_amount: '$1.4M',
    latest_funding_round: 'pre-seed',
    lead_investor: 'Sauce VC',
    funding_news_source: 'The Economic Times',
    // Smell test estimates
    team_size_estimate: 5,
    build_complexity: 'moderate', // Hardware is harder
    smell_test_lean: false, // Hardware needs more resources
    smell_test_user_passion: true, // Consumer products can have passionate users
    smell_test_learning_public: false, // Unknown
    smell_test_inevitable: true, // Smart home is inevitable
    smell_test_massive_if_works: true, // Consumer appliances = huge TAM
    tam_estimate: '$100B+',
    market_timing_score: 7,
    enabling_technology: 'IoT, smart home ecosystems'
  },
  {
    name: 'IPF',
    tagline: 'Peer-to-peer marketplace for preloved kids products',
    pitch: 'IPF connects parents to buy and sell quality preloved kids products. Sustainable, affordable, and community-driven approach to kids commerce.',
    industry: 'Marketplace',
    industries: ['Marketplace', 'Consumer', 'Sustainability'],
    geography: 'India',
    latest_funding_amount: '$375K',
    latest_funding_round: 'seed',
    funding_news_source: 'The Economic Times',
    // Smell test estimates
    team_size_estimate: 3,
    build_complexity: 'simple',
    smell_test_lean: true, // Marketplace MVP is buildable by 2 people
    smell_test_user_passion: true, // Parents are passionate about kids products
    smell_test_learning_public: false,
    smell_test_inevitable: true, // Circular economy is inevitable
    smell_test_massive_if_works: true, // Kids market is huge
    tam_estimate: '$10B+',
    market_timing_score: 8,
    enabling_technology: 'Mobile payments, trust/verification systems'
  },
  {
    name: 'NeoSapien',
    tagline: 'AI-native wearable tech ecosystem',
    pitch: 'NeoSapien is building an AI-first wearable ecosystem that learns and adapts to users. Their devices integrate seamlessly with AI assistants for a truly intelligent wearable experience.',
    industry: 'Wearables',
    industries: ['AI', 'Wearables', 'Hardware', 'Consumer'],
    geography: 'India',
    latest_funding_amount: '$2M',
    latest_funding_round: 'seed',
    lead_investor: 'Merak Ventures',
    funding_news_source: 'The Times of India',
    // Smell test estimates
    team_size_estimate: 8,
    build_complexity: 'complex', // Hardware + AI
    smell_test_lean: false, // Hardware + AI needs team
    smell_test_user_passion: true, // Wearable users are passionate
    smell_test_learning_public: true, // AI companies often build in public
    smell_test_inevitable: true, // AI wearables are inevitable
    smell_test_massive_if_works: true, // Wearables = massive market
    tam_estimate: '$100B+',
    market_timing_score: 9,
    enabling_technology: 'LLMs, edge AI, advanced sensors'
  },
  {
    name: 'Aurassure',
    tagline: 'Climate tech & environmental data intelligence',
    pitch: 'Aurassure provides environmental data intelligence for climate resilience. Their platform helps organizations understand and adapt to climate risks with actionable insights.',
    industry: 'Climate Tech',
    industries: ['Climate', 'Data', 'Enterprise', 'Sustainability'],
    geography: 'India',
    latest_funding_round: 'seed',
    funding_news_source: 'The Economic Times',
    // Smell test estimates
    team_size_estimate: 6,
    build_complexity: 'moderate',
    smell_test_lean: true, // Data platform is buildable lean
    smell_test_user_passion: true, // Climate people are passionate
    smell_test_learning_public: true, // Climate companies share research
    smell_test_inevitable: true, // Climate adaptation is inevitable
    smell_test_massive_if_works: true, // Climate is existential = massive
    tam_estimate: '$100B+',
    market_timing_score: 10,
    enabling_technology: 'Satellite data, ML, IoT sensors'
  },
  {
    name: 'Lawyered',
    tagline: 'Legal-tech platform streamlining legal operations',
    pitch: 'Lawyered is digitizing legal services in India with an end-to-end platform for contracts, compliance, and legal operations. Making legal accessible to businesses of all sizes.',
    industry: 'Legal Tech',
    industries: ['Legal', 'Enterprise', 'SaaS'],
    geography: 'India',
    latest_funding_amount: '₹8.5 crore (~$1M)',
    latest_funding_round: 'pre-series-a',
    funding_news_source: 'The Economic Times',
    // Smell test estimates
    team_size_estimate: 10,
    build_complexity: 'moderate',
    smell_test_lean: true, // Legal SaaS can be built lean
    smell_test_user_passion: false, // Legal is needed, not loved
    smell_test_learning_public: false,
    smell_test_inevitable: true, // Legal digitization is inevitable
    smell_test_massive_if_works: true, // Legal services = huge market
    tam_estimate: '$10B+',
    market_timing_score: 7,
    enabling_technology: 'AI document processing, e-signatures'
  },
  {
    name: 'Keeper',
    tagline: 'AI-driven dating platform with unique matchmaking',
    pitch: 'Keeper uses AI to create meaningful romantic connections. Unlike swipe-based apps, Keeper focuses on compatibility and long-term relationship potential through intelligent matching.',
    industry: 'Consumer',
    industries: ['AI', 'Consumer', 'Dating', 'Social'],
    geography: 'USA',
    latest_funding_amount: '$4M',
    latest_funding_round: 'seed',
    funding_news_source: 'Business Insider',
    // Smell test estimates
    team_size_estimate: 5,
    build_complexity: 'simple',
    smell_test_lean: true, // Dating app MVP is lean
    smell_test_user_passion: true, // People are VERY passionate about dating
    smell_test_learning_public: true, // Consumer apps often share growth
    smell_test_inevitable: true, // AI dating is inevitable
    smell_test_massive_if_works: true, // Dating = massive market
    tam_estimate: '$10B+',
    market_timing_score: 8,
    enabling_technology: 'LLMs, recommendation systems'
  },
  {
    name: 'AIR Credit Intelligence',
    tagline: 'AI-powered credit intelligence platform',
    pitch: 'AIR provides AI-driven credit intelligence, helping financial institutions make better lending decisions with advanced risk assessment and predictive analytics.',
    industry: 'Fintech',
    industries: ['AI', 'Fintech', 'Enterprise', 'Data'],
    geography: 'USA',
    latest_funding_amount: '$6.1M',
    latest_funding_round: 'seed',
    funding_news_source: 'VC News Daily',
    // Smell test estimates
    team_size_estimate: 8,
    build_complexity: 'complex', // ML + regulated industry
    smell_test_lean: false, // Fintech needs compliance team
    smell_test_user_passion: false, // B2B fintech
    smell_test_learning_public: false,
    smell_test_inevitable: true, // AI credit is inevitable
    smell_test_massive_if_works: true, // Credit industry = massive
    tam_estimate: '$100B+',
    market_timing_score: 9,
    enabling_technology: 'ML models, alternative data sources'
  },
  {
    name: 'Subsense',
    tagline: 'Next-gen subscription intelligence platform',
    pitch: 'Subsense helps businesses optimize their subscription economy with intelligent analytics and automation tools for retention and growth.',
    industry: 'SaaS',
    industries: ['SaaS', 'Enterprise', 'Analytics'],
    latest_funding_amount: '$10M',
    latest_funding_round: 'series-a',
    funding_news_source: 'VC News Daily',
    // Smell test estimates
    team_size_estimate: 15,
    build_complexity: 'moderate',
    smell_test_lean: true, // Analytics platform can start lean
    smell_test_user_passion: false, // B2B tool
    smell_test_learning_public: true, // SaaS companies share metrics
    smell_test_inevitable: true, // Subscription economy growing
    smell_test_massive_if_works: true, // SaaS tools = large market
    tam_estimate: '$10B+',
    market_timing_score: 8,
    enabling_technology: 'Data integrations, ML analytics'
  },
  {
    name: 'Double',
    tagline: 'Practice management platform for professionals',
    pitch: 'Double provides practice management software that helps professional service firms streamline operations, from client management to billing.',
    industry: 'SaaS',
    industries: ['SaaS', 'Enterprise', 'Professional Services'],
    latest_funding_amount: '$6.5M',
    latest_funding_round: 'series-a',
    funding_news_source: 'VC News Daily',
    // Smell test estimates
    team_size_estimate: 12,
    build_complexity: 'moderate',
    smell_test_lean: true, // Practice management MVP is doable
    smell_test_user_passion: false, // Utility software
    smell_test_learning_public: false,
    smell_test_inevitable: true, // Professional services need better tools
    smell_test_massive_if_works: true, // Professional services = huge
    tam_estimate: '$10B+',
    market_timing_score: 7,
    enabling_technology: 'Cloud infrastructure, integrations'
  },
  {
    name: 'Valerie Health',
    tagline: 'Healthcare admin automation platform',
    pitch: 'Valerie Health automates healthcare administration, reducing paperwork burden on providers and improving patient experience through intelligent workflow automation.',
    industry: 'Healthcare',
    industries: ['Healthcare', 'AI', 'Enterprise', 'Automation'],
    geography: 'USA',
    latest_funding_amount: '$30M',
    latest_funding_round: 'series-a',
    funding_news_source: 'Business Insider',
    // Smell test estimates  
    team_size_estimate: 40,
    build_complexity: 'enterprise', // Healthcare compliance
    smell_test_lean: false, // Healthcare needs compliance
    smell_test_user_passion: true, // Healthcare workers want less admin
    smell_test_learning_public: false,
    smell_test_inevitable: true, // Healthcare automation inevitable
    smell_test_massive_if_works: true, // Healthcare = massive
    tam_estimate: '$100B+',
    market_timing_score: 9,
    enabling_technology: 'AI, EHR integrations, workflow automation'
  }
];

// Calculate smell test score
function calculateSmellTestScore(startup) {
  let score = 0;
  if (startup.smell_test_lean) score++;
  if (startup.smell_test_user_passion) score++;
  if (startup.smell_test_learning_public) score++;
  if (startup.smell_test_inevitable) score++;
  if (startup.smell_test_massive_if_works) score++;
  return score;
}

async function addStartupsWithSmellTests() {
  console.log('🧪 Adding Funded Startups with YC Smell Tests');
  console.log('='.repeat(50));
  
  let added = 0;
  let updated = 0;
  let skipped = 0;
  
  for (const startup of fundedStartups) {
    // Calculate smell test score
    startup.smell_test_score = calculateSmellTestScore(startup);
    
    // Check if startup exists
    const { data: existing } = await supabase
      .from('startups')
      .select('id, name')
      .ilike('name', startup.name)
      .single();
    
    if (existing) {
      // Update with smell test data
      const { error } = await supabase
        .from('startups')
        .update({
          latest_funding_amount: startup.latest_funding_amount,
          latest_funding_round: startup.latest_funding_round,
          latest_funding_date: new Date().toISOString().split('T')[0],
          lead_investor: startup.lead_investor,
          funding_news_source: startup.funding_news_source,
          team_size_estimate: startup.team_size_estimate,
          build_complexity: startup.build_complexity,
          smell_test_lean: startup.smell_test_lean,
          smell_test_user_passion: startup.smell_test_user_passion,
          smell_test_learning_public: startup.smell_test_learning_public,
          smell_test_inevitable: startup.smell_test_inevitable,
          smell_test_massive_if_works: startup.smell_test_massive_if_works,
          smell_test_score: startup.smell_test_score,
          tam_estimate: startup.tam_estimate,
          market_timing_score: startup.market_timing_score,
          enabling_technology: startup.enabling_technology
        })
        .eq('id', existing.id);
      
      if (!error) {
        updated++;
        console.log(`  ✓ Updated: ${startup.name} (smell score: ${startup.smell_test_score}/5)`);
      } else {
        console.log(`  ✗ Error updating ${startup.name}: ${error.message}`);
      }
    } else {
      // Insert new startup
      const { error } = await supabase
        .from('startups')
        .insert({
          id: `startup_${startup.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
          name: startup.name,
          tagline: startup.tagline,
          pitch: startup.pitch,
          industry: startup.industry,
          industries: startup.industries,
          geography: startup.geography,
          entity_type: 'startup',
          status: 'active',
          validated: true,
          latest_funding_amount: startup.latest_funding_amount,
          latest_funding_round: startup.latest_funding_round,
          latest_funding_date: new Date().toISOString().split('T')[0],
          lead_investor: startup.lead_investor,
          funding_news_source: startup.funding_news_source,
          team_size_estimate: startup.team_size_estimate,
          build_complexity: startup.build_complexity,
          smell_test_lean: startup.smell_test_lean,
          smell_test_user_passion: startup.smell_test_user_passion,
          smell_test_learning_public: startup.smell_test_learning_public,
          smell_test_inevitable: startup.smell_test_inevitable,
          smell_test_massive_if_works: startup.smell_test_massive_if_works,
          smell_test_score: startup.smell_test_score,
          tam_estimate: startup.tam_estimate,
          market_timing_score: startup.market_timing_score,
          enabling_technology: startup.enabling_technology,
          created_at: new Date().toISOString()
        });
      
      if (!error) {
        added++;
        console.log(`  ✓ Added: ${startup.name} (smell score: ${startup.smell_test_score}/5)`);
      } else {
        console.log(`  ✗ Error adding ${startup.name}: ${error.message}`);
        skipped++;
      }
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Results: ${added} added, ${updated} updated, ${skipped} skipped`);
  
  // Show smell test distribution
  console.log('\n🧪 Smell Test Analysis:');
  for (const startup of fundedStartups) {
    const tests = [
      startup.smell_test_lean ? '✅' : '❌',
      startup.smell_test_user_passion ? '✅' : '❌',
      startup.smell_test_learning_public ? '✅' : '❌',
      startup.smell_test_inevitable ? '✅' : '❌',
      startup.smell_test_massive_if_works ? '✅' : '❌'
    ];
    console.log(`  ${startup.name.padEnd(20)} ${tests.join(' ')} = ${startup.smell_test_score}/5`);
  }
  
  console.log('\n📋 Smell Test Legend:');
  console.log('  1. Lean (2 people, 3 months)');
  console.log('  2. User Passion (emotionally attached)');
  console.log('  3. Learning in Public');
  console.log('  4. Inevitable (early but certain)');
  console.log('  5. Massive if Works (TAM potential)');
}

addStartupsWithSmellTests().catch(console.error);
