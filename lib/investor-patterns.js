/**
 * Investor Pattern Library v3 - Strict matching
 */

const VC_SUFFIXES = ['Ventures', 'Capital', 'Partners'];

// Known good investor name patterns
const VALID_PATTERNS = [
  /^[A-Z][a-z]+\s+[A-Z][a-z]+\s+(?:Ventures|Capital|Partners)$/,  // Two Word Ventures
  /^[A-Z][a-z]+\s+(?:Ventures|Capital|Partners)$/,  // One Word Ventures
  /^[A-Z][A-Z0-9]+\s+(?:Ventures|Capital|Partners)$/,  // ABC Capital
  /^[A-Z][a-z]+(?:[A-Z][a-z]+)+\s+(?:Ventures|Capital|Partners)$/,  // CamelCase Ventures
];

// Blacklist patterns - definitely not investors
const BLACKLIST = [
  /fund$/i,
  /^M in/i,
  /^The /i,
  /^In /i,
  /Series [A-Z]/i,
  /intends to/i,
  /company/i,
  /Raises/i,
  /Daily|Weekly|Notable/i,
  /million|billion/i,
  /^rom /i,
  /^s /i,
  /^new investor/i,
  /AlleyWatch/i,
  /Crunchbase/i,
  /Background/i,
  /Biggest/i,
  /raiser/i,
  /Real Estate Tech/i,
];

function cleanInvestorName(name) {
  if (!name) return null;
  name = name.trim();
  
  // Check blacklist
  if (BLACKLIST.some(p => p.test(name))) return null;
  
  // Length check
  if (name.length < 8 || name.length > 40) return null;
  
  // Must end with VC suffix
  const hasVCSuffix = VC_SUFFIXES.some(s => name.endsWith(s));
  if (!hasVCSuffix) return null;
  
  // Count words - should be 2-4 words
  const words = name.split(/\s+/);
  if (words.length < 2 || words.length > 4) return null;
  
  // First word must start with capital
  if (!/^[A-Z]/.test(words[0])) return null;
  
  return name;
}

function extractInvestors(text) {
  const found = new Set();
  
  // Match: Word(s) + Ventures/Capital/Partners
  const pattern = /([A-Z][A-Za-z0-9\-]+(?:\s+[A-Z][A-Za-z0-9\-]+){0,2}\s+(?:Ventures|Capital|Partners))/g;
  
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const cleaned = cleanInvestorName(match[1]);
    if (cleaned) found.add(cleaned);
  }
  
  return [...found];
}

module.exports = { extractInvestors, cleanInvestorName };
