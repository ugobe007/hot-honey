/**
 * Source Detector - Identify what type of data source we're dealing with
 */

const SOURCE_PATTERNS = {
  crunchbase: /crunchbase\.com\/organization\//i,
  linkedin: /linkedin\.com\/company\//i,
  github: /github\.com\/[^\/]+/i,
  producthunt: /producthunt\.com\/posts\//i,
  ycombinator: /ycombinator\.com\/companies\//i,
  angellist: /wellfound\.com\/company\//i,
  twitter: /twitter\.com\/|x\.com\//i,
  website: /^https?:\/\//i
};

async function detectSource(input) {
  if (input.startsWith('http')) {
    for (const [type, pattern] of Object.entries(SOURCE_PATTERNS)) {
      if (pattern.test(input)) {
        return { type, url: input };
      }
    }
    return { type: 'website', url: input };
  }
  
  const name = input.toLowerCase().replace(/\s+/g, '');
  return {
    type: 'search',
    url: null,
    queries: [
      'https://github.com/' + name,
      'https://' + name + '.com'
    ]
  };
}

function getExtractor(sourceType) {
  try {
    return require('./extractors/' + sourceType);
  } catch {
    return require('./extractors/website');
  }
}

module.exports = { detectSource, getExtractor };
