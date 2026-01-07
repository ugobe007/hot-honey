/**
 * Entity Resolution / Deduplication Service
 * 
 * Creates a "Startup Identity Graph" to merge duplicates across sources
 */

const { createClient } = require('@supabase/supabase-js');

/**
 * Simple string similarity (Levenshtein-based)
 */
function stringSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

class EntityResolver {
  constructor(supabase) {
    this.supabase = supabase;
    this.cache = new Map(); // Cache of resolved entities
  }
  
  /**
   * Canonicalize domain (www.example.com → example.com)
   */
  canonicalizeDomain(url) {
    if (!url) return null;
    try {
      const { URL } = require('url');
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return null;
    }
  }
  
  /**
   * Find existing startup by domain match
   */
  async findByDomain(domain) {
    if (!domain) return null;
    
    const canonical = this.canonicalizeDomain(domain);
    if (!canonical) return null;
    
    // Check cache
    if (this.cache.has(canonical)) {
      return this.cache.get(canonical);
    }
    
    // Check database
    const { data } = await this.supabase
      .from('startup_uploads')
      .select('id, name, website')
      .or(`website.ilike.%${canonical}%,website.ilike.%www.${canonical}%`)
      .limit(1);
    
    if (data && data.length > 0) {
      this.cache.set(canonical, data[0]);
      return data[0];
    }
    
    return null;
  }
  
  /**
   * Find existing startup by fuzzy name match
   */
  async findByFuzzyName(name, { location, sector } = {}) {
    if (!name || name.length < 3) return null;
    
    // Get candidates
    const { data: candidates } = await this.supabase
      .from('startup_uploads')
      .select('id, name, website, location, sectors')
      .ilike('name', `%${name}%`)
      .limit(20);
    
    if (!candidates || candidates.length === 0) return null;
    
    // Score similarity
    const scored = candidates.map(candidate => {
      const nameSimilarity = stringSimilarity(
        name.toLowerCase(),
        candidate.name.toLowerCase()
      );
      
      let score = nameSimilarity;
      
      // Boost if location matches
      if (location && candidate.location) {
        if (candidate.location.toLowerCase().includes(location.toLowerCase()) ||
            location.toLowerCase().includes(candidate.location.toLowerCase())) {
          score += 0.2;
        }
      }
      
      // Boost if sector matches
      if (sector && candidate.sectors) {
        const sectorMatch = candidate.sectors.some(s => 
          s.toLowerCase().includes(sector.toLowerCase())
        );
        if (sectorMatch) score += 0.1;
      }
      
      return { ...candidate, similarity: score };
    });
    
    // Return best match if similarity > 0.8
    scored.sort((a, b) => b.similarity - a.similarity);
    const best = scored[0];
    
    if (best.similarity >= 0.8) {
      return best;
    }
    
    return null;
  }
  
  /**
   * Resolve startup entity (check for duplicates)
   * Returns existing startup ID if duplicate found, null if new
   */
  async resolve(contract) {
    // Method 1: Domain match (highest confidence)
    if (contract.website) {
      const domainMatch = await this.findByDomain(contract.website);
      if (domainMatch) {
        return {
          isDuplicate: true,
          existingId: domainMatch.id,
          matchMethod: 'domain',
          confidence: 0.95
        };
      }
    }
    
    // Method 2: Fuzzy name + location/sector match
    if (contract.name) {
      const location = contract._extractLocation();
      const sector = contract.category?.[0];
      
      const fuzzyMatch = await this.findByFuzzyName(contract.name, { location, sector });
      if (fuzzyMatch) {
        return {
          isDuplicate: true,
          existingId: fuzzyMatch.id,
          matchMethod: 'fuzzy_name',
          confidence: 0.85
        };
      }
    }
    
    // New entity
    return {
      isDuplicate: false,
      existingId: null,
      matchMethod: null,
      confidence: 1.0
    };
  }
  
  /**
   * Merge evidence into existing startup
   */
  async mergeEvidence(startupId, contract) {
    // Get existing extracted_data
    const { data: existing } = await this.supabase
      .from('startup_uploads')
      .select('extracted_data')
      .eq('id', startupId)
      .single();
    
    if (!existing) return;
    
    const existingData = existing.extracted_data || {};
    
    // Merge signals
    const merged = {
      ...existingData,
      traction_signals: [
        ...(existingData.traction_signals || []),
        ...contract.traction_signals
      ],
      team_signals: [
        ...(existingData.team_signals || []),
        ...contract.team_signals
      ],
      investor_signals: [
        ...(existingData.investor_signals || []),
        ...contract.investor_signals
      ],
      source_evidence: [
        ...(existingData.source_evidence || []),
        ...contract.source_evidence
      ]
    };
    
    // Update database
    await this.supabase
      .from('startup_uploads')
      .update({ extracted_data: merged })
      .eq('id', startupId);
  }
}

module.exports = EntityResolver;

