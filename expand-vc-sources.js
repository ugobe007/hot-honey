#!/usr/bin/env node
/**
 * Expand VC/Investor Sources
 * Adds 100+ more VC firms to discover
 */

const fs = require('fs');

// More comprehensive VC list - focused on active investors
const NEW_VC_URLS = [
  // Top Tier VCs (not in original list)
  'https://www.bossanova.vc/',
  'https://www.craft.co/',
  'https://www.indexventures.com/',
  'https://redpoint.com/',
  'https://www.insightpartners.com/',
  'https://www.thrive.com/',
  'https://www.altosventures.com/',
  'https://www.boldstart.vc/',
  'https://www.bv.co/', // Bowery Capital
  'https://www.costanoa.vc/',
  'https://www.floodgate.com/',
  'https://www.foundersfund.com/',
  'https://www.homebrew.co/',
  'https://www.initialized.com/',
  'https://www.lowercase.com/',
  'https://matrix.vc/',
  'https://foundationcap.com/',
  'https://www.nyca.com/',
  'https://www.pear.vc/',
  'https://precursorvc.com/',
  'https://www.root.vc/',
  'https://www.uncorkfund.com/',
  'https://upfrontventures.com/',
  'https://www.wing.vc/',
  
  // Angel Groups & Syndicates
  'https://www.keiretsu.com/',
  'https://www.angelpad.com/',
  'https://www.svangel.com/',
  'https://www.band.vc/',
  'https://www.hustlefund.vc/',
  'https://www.angellist.com/',
  'https://republic.com/',
  'https://www.wefunder.com/',
  'https://www.startengine.com/',
  
  // Stage-specific VCs
  'https://www.lerer.vc/',
  'https://www.sfund.co/',
  'https://www.alphaventures.co/',
  'https://www.cofoundersvc.com/',
  'https://www.amplitudevc.com/',
  
  // Sector-specific VCs (AI/Tech)
  'https://www.a2ventures.com/',
  'https://www.a1xvc.com/',
  'https://www.dcvc.com/',
  'https://www.gradient-ventures.com/',
  'https://www.radical.vc/',
  'https://playground.vc/',
  
  // Growth Stage
  'https://www.bvp.com/',
  'https://capitalg.com/',
  'https://www.ivp.com/',
  'https://sapphireventures.com/',
  'https://www.stripes.co/',
  'https://www.activantcapital.com/',
  
  // European VCs active in US
  'https://www.balderton.com/',
  'https://www.eqt.com/',
  'https://www.northzone.com/',
  'https://www.creandum.com/',
  'https://www.acton.capital/',
  
  // Corporate VCs
  'https://www.m12.vc/',  // Microsoft
  'https://www.salesforceventures.com/',
  'https://www.cisco.com/c/en/us/about/csr/impact/cisco-investments.html',
  'https://www.workdayventures.com/',
  'https://www.qualcomm.com/company/ventures',
  
  // Fintech VCs
  'https://www.villageglobal.vc/',
  'https://www.clocktower.vc/',
  'https://www.deciens.com/',
  'https://www.fintechcollective.com/',
  'https://www.kaporcapital.com/',
  
  // Healthcare/Bio
  'https://www.gv.com/',
  'https://www.samsara.com/',
  'https://www.polaris.vc/',
  
  // Consumer
  'https://www.fondue.co/',
  'https://www.kirsten-green.com/',
  'https://www.graingergroup.com/',
];

// Read existing URLs
const existingFile = './all-vc-urls-unique.txt';
let existing = new Set();
if (fs.existsSync(existingFile)) {
  existing = new Set(
    fs.readFileSync(existingFile, 'utf-8')
      .split('\n')
      .map(u => u.trim().toLowerCase())
      .filter(u => u)
  );
}

// Add new URLs
let added = 0;
for (const url of NEW_VC_URLS) {
  const normalized = url.toLowerCase().replace(/\/$/, '');
  if (!existing.has(normalized) && !existing.has(normalized + '/')) {
    fs.appendFileSync(existingFile, url + '\n');
    added++;
    console.log(`✅ Added: ${url}`);
  }
}

console.log(`\n📊 Added ${added} new VC URLs`);
console.log(`📋 Total URLs now: ${existing.size + added}`);
