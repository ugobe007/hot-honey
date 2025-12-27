/**
 * Funding Pattern Library
 * Centralized patterns for all scrapers
 */

// Primary patterns - high confidence
const PRIMARY_PATTERNS = [
  // "X raises $YM"
  /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+[Rr]aises?\s+\$?([\d\.]+)\s*([MmBb]|Million|Billion)/i,
  // "X secures $YM"
  /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+[Ss]ecures?\s+\$?([\d\.]+)\s*([MmBb]|Million|Billion)/i,
  // "X closes $YM"
  /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+[Cc]loses?\s+\$?([\d\.]+)\s*([MmBb]|Million|Billion)/i,
];

// Secondary patterns - medium confidence
const SECONDARY_PATTERNS = [
  // "X lands $YM"
  /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+[Ll]ands?\s+\$?([\d\.]+)\s*([MmBb])/i,
  // "X gets $YM"
  /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+[Gg]ets?\s+\$?([\d\.]+)\s*([MmBb])/i,
  // "X nabs $YM"
  /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+[Nn]abs?\s+\$?([\d\.]+)\s*([MmBb])/i,
  // "X announces $YM"
  /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+[Aa]nnounces?\s+\$?([\d\.]+)\s*([MmBb])/i,
  // "X bags $YM"
  /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+[Bb]ags?\s+\$?([\d\.]+)\s*([MmBb])/i,
  // "X pulls in $YM"
  /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+pulls?\s+in\s+\$?([\d\.]+)\s*([MmBb])/i,
  // "X snags $YM"
  /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+[Ss]nags?\s+\$?([\d\.]+)\s*([MmBb])/i,
];

// Reverse patterns - "$YM for X" style
const REVERSE_PATTERNS = [
  // "$YM for X"
  /\$?([\d\.]+)\s*([MmBb]|Million|Billion)\s+for\s+([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)/i,
  // "$YM funding for X"
  /\$?([\d\.]+)\s*([MmBb])\s+funding\s+for\s+([A-Z][A-Za-z0-9\-\.]+)/i,
  // "$YM investment in X"
  /\$?([\d\.]+)\s*([MmBb])\s+investment\s+in\s+([A-Z][A-Za-z0-9\-\.]+)/i,
  // "$YM round for X"
  /\$?([\d\.]+)\s*([MmBb])\s+round\s+for\s+([A-Z][A-Za-z0-9\-\.]+)/i,
];

// Series patterns
const SERIES_PATTERNS = [
  // "X closes Series A"
  /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+closes?\s+Series\s+([A-Z])/i,
  // "Series A for X"
  /Series\s+([A-Z])\s+for\s+([A-Z][A-Za-z0-9\-\.]+)/i,
  // "X completes Series A"
  /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+completes?\s+Series\s+([A-Z])/i,
];

// Valuation patterns
const VALUATION_PATTERNS = [
  // "X valued at $YB"
  /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+valued\s+at\s+\$?([\d\.]+)\s*([MmBb])/i,
  // "X hits $YB valuation"
  /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+hits?\s+\$?([\d\.]+)\s*([MmBb])\s+valuation/i,
  // "X reaches unicorn status"
  /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+reaches?\s+unicorn/i,
];

// Invalid name patterns - reject these
const INVALID_NAMES = [
  /^(the|a|an|this|how|why|what|who|when|where)\s/i,
  /^(exclusive|breaking|update|report|analysis)\s/i,
  /funding|raises|million|billion|series|round|investor|venture|startup/i,
  /daily|weekly|monthly|annual|report|news|update/i,
  /^\d/,  // starts with number
  /^[a-z]/,  // starts with lowercase
];

function isValidName(name) {
  if (!name || name.length < 2 || name.length > 50) return false;
  return !INVALID_NAMES.some(p => p.test(name));
}

function parseFunding(amount, unit) {
  const num = parseFloat(amount);
  const u = (unit || 'm').toLowerCase();
  if (u.startsWith('b')) return num * 1e9;
  return num * 1e6;
}

function extractFromHeadline(headline) {
  // Try primary patterns first
  for (const p of PRIMARY_PATTERNS) {
    const m = headline.match(p);
    if (m && isValidName(m[1])) {
      return { name: m[1].trim(), funding: parseFunding(m[2], m[3]), confidence: 'high' };
    }
  }
  
  // Try secondary patterns
  for (const p of SECONDARY_PATTERNS) {
    const m = headline.match(p);
    if (m && isValidName(m[1])) {
      return { name: m[1].trim(), funding: parseFunding(m[2], m[3]), confidence: 'medium' };
    }
  }
  
  // Try reverse patterns (name is in position 3)
  for (const p of REVERSE_PATTERNS) {
    const m = headline.match(p);
    if (m && isValidName(m[3])) {
      return { name: m[3].trim(), funding: parseFunding(m[1], m[2]), confidence: 'medium' };
    }
  }
  
  // Try valuation patterns
  for (const p of VALUATION_PATTERNS) {
    const m = headline.match(p);
    if (m && isValidName(m[1])) {
      return { name: m[1].trim(), funding: parseFunding(m[2], m[3]), confidence: 'low', type: 'valuation' };
    }
  }
  
  return null;
}

module.exports = {
  PRIMARY_PATTERNS,
  SECONDARY_PATTERNS,
  REVERSE_PATTERNS,
  SERIES_PATTERNS,
  VALUATION_PATTERNS,
  isValidName,
  parseFunding,
  extractFromHeadline
};

// Additional patterns for edge cases (added after testing)
const EDGE_PATTERNS = [
  // "Startup X valued at $YB"
  /^Startup\s+([A-Z][A-Za-z0-9\-\.]+)\s+valued\s+at\s+\$?([\d\.]+)\s*([MmBb])/i,
  // "Investors pour $YM into X"
  /[Ii]nvestors?\s+pour\s+\$?([\d\.]+)\s*([MmBb])\s+into\s+(?:.*?\s+)?([A-Z][A-Za-z0-9\-\.]+)$/i,
  // "Series X for Y closes at $ZM"
  /Series\s+[A-Z]\s+for\s+([A-Z][A-Za-z0-9\-\.]+)\s+closes?\s+at\s+\$?([\d\.]+)\s*([MmBb])/i,
  // "AI startup X snags $YM" (word before startup name)
  /(?:AI|tech|fintech|health|crypto)\s+startup\s+([A-Z][A-Za-z0-9\-\.]+)\s+(?:snags?|grabs?|lands?|gets?|raises?)\s+\$?([\d\.]+)\s*([MmBb])/i,
  // "X lands $YM in Series A"
  /^([A-Z][A-Za-z0-9\-\.]+(?:\s+[A-Z][a-z]+)?)\s+lands?\s+\$?([\d\.]+)\s*([MmBb])\s+in/i,
];

// Update extractFromHeadline to include edge patterns
const originalExtract = module.exports.extractFromHeadline;
module.exports.extractFromHeadline = function(headline) {
  // Try original patterns first
  const result = originalExtract(headline);
  if (result) return result;
  
  // Try edge patterns
  for (const p of EDGE_PATTERNS) {
    const m = headline.match(p);
    if (m) {
      // Handle different capture group positions
      let name, amount, unit;
      if (p.source.includes('pour') || p.source.includes('Series.*closes')) {
        // Amount first, then name
        amount = m[1];
        unit = m[2];
        name = m[3];
      } else {
        name = m[1];
        amount = m[2];
        unit = m[3];
      }
      
      if (module.exports.isValidName(name)) {
        return { 
          name: name.trim(), 
          funding: module.exports.parseFunding(amount, unit), 
          confidence: 'low' 
        };
      }
    }
  }
  
  return null;
};

module.exports.EDGE_PATTERNS = EDGE_PATTERNS;
