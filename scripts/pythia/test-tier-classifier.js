#!/usr/bin/env node
/**
 * Test the tier classifier with sample text
 */

const { classifyTier } = require('./utils/tier-classifier');

// Sample blog post texts
const samples = [
  {
    name: 'Engineering post (should be Tier 2)',
    text: `We recently deployed a new feature that reduced latency by 40%. 
    The architecture change involved migrating from a monolith to microservices.
    We measured the impact and saw significant improvements in throughput.
    This required careful planning and testing.`
  },
  {
    name: 'PR-heavy post (should be Tier 3)',
    text: `We're thrilled to announce our latest funding round! 
    We're excited to share this transformative journey with you.
    Our mission is to redefine the industry with world-class solutions.
    This is a proud moment for our team.`
  },
  {
    name: 'Mixed post with metrics (should be Tier 2)',
    text: `We shipped version 2.0 last week, which increased user engagement by 25%.
    The update includes new features that our customers requested.
    We're proud of what we've built.`
  },
  {
    name: 'Simple blog post (should be Tier 2)',
    text: `Today we're sharing some updates about our product development.
    We've been working on improvements to the user experience.
    Our team has been focused on making the platform better.`
  }
];

console.log('\n🧪 TESTING TIER CLASSIFIER\n');
console.log('='.repeat(60));

samples.forEach((sample, i) => {
  const tier = classifyTier('company_blog', 'company_blog', sample.text);
  console.log(`\n${i + 1}. ${sample.name}`);
  console.log(`   Result: Tier ${tier}`);
  console.log(`   Preview: ${sample.text.substring(0, 100)}...`);
});

console.log('\n' + '='.repeat(60) + '\n');
