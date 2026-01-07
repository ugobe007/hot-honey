/**
 * Entity Resolver V2 - Canonical Domain Dedupe
 * 
 * Implements the "canonical domain is king" strategy:
 * - Primary key: canonical_domain
 * - Auto-merge rules
 * - Probable merge (with confidence)
 * - Evidence graph approach
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

class EntityResolverV2 {
  constructor(supabase) {
    this.supabase = supabase;
    this.cache = new Map(); // Cache of resolved entities by canonical_domain
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
   * Find existing startup by canonical domain (PRIMARY METHOD)
   */
  async findByCanonicalDomain(domain) {
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
      .select('id, name, canonical_domain, website, aliases')
      .eq('canonical_domain', canonical)
      .limit(1);
    
    if (data && data.length > 0) {
      this.cache.set(canonical, data[0]);
      return data[0];
    }
    
    return null;
  }
  
  /**
   * Check if one website redirects to another
   */
  async checkRedirectMatch(url1, url2) {
    // This would require HTTP requests - for now, return false
    // In production, you'd check redirects here
    return false;
  }
  
  /**
   * Find by shared external ID (LinkedIn, Crunchbase, GitHub)
   */
  async findByExternalID(type, id) {
    // This would require storing external IDs - for now, return null
    // In production, you'd have a separate table for external IDs
    return null;
  }
  
  /**
   * Auto-merge rules (high confidence)
   */
  async checkAutoMerge(contract) {
    // Rule 1: Same canonical domain
    if (contract.canonical_domain) {
      const domainMatch = await this.findByCanonicalDomain(contract.canonical_domain);
      if (domainMatch) {
        return {
          isDuplicate: true,
          existingId: domainMatch.id,
          matchMethod: 'canonical_domain',
          confidence: 0.95,
          action: 'auto_merge'
        };
      }
    }
    
    // Rule 2: Website redirects to existing
    if (contract.website_url) {
      // Check if any existing startup's website redirects to this one
      // (This would require HTTP checks - simplified for now)
      const existingByWebsite = await this.findByCanonicalDomain(contract.website_url);
      if (existingByWebsite && existingByWebsite.canonical_domain !== contract.canonical_domain) {
        const redirects = await this.checkRedirectMatch(contract.website_url, existingByWebsite.website);
        if (redirects) {
          return {
            isDuplicate: true,
            existingId: existingByWebsite.id,
            matchMethod: 'website_redirect',
            confidence: 0.90,
            action: 'auto_merge'
          };
        }
      }
    }
    
    // Rule 3: Shared external ID (LinkedIn, Crunchbase, GitHub)
    // (Would require external ID storage - skipped for now)
    
    return null;
  }
  
  /**
   * Probable merge (needs confidence score)
   */
  async checkProbableMerge(contract) {
    if (!contract.company_name || contract.company_name.length < 3) {
      return null;
    }
    
    // Get candidates by fuzzy name match
    const { data: candidates } = await this.supabase
      .from('startup_uploads')
      .select('id, name, canonical_domain, website, hq_location, category_primary')
      .ilike('name', `%${contract.company_name}%`)
      .limit(20);
    
    if (!candidates || candidates.length === 0) return null;
    
    // Score similarity
    const scored = candidates.map(candidate => {
      const nameSimilarity = stringSimilarity(
        contract.company_name.toLowerCase(),
        candidate.name.toLowerCase()
      );
      
      let score = nameSimilarity;
      let matchReasons = [];
      
      // Boost if location matches
      if (contract.hq_location && candidate.hq_location) {
        const contractCity = contract.hq_location.city?.toLowerCase() || '';
        const candidateCity = candidate.hq_location.city?.toLowerCase() || '';
        if (contractCity && candidateCity && contractCity === candidateCity) {
          score += 0.2;
          matchReasons.push('same_city');
        }
      }
      
      // Boost if category matches
      if (contract.category_primary && candidate.category_primary) {
        if (contract.category_primary.toLowerCase() === candidate.category_primary.toLowerCase()) {
          score += 0.1;
          matchReasons.push('same_category');
        }
      }
      
      // Boost if shared founder name (would require team_signals check)
      // (Skipped for now - would need to check team_signals)
      
      return { 
        ...candidate, 
        similarity: score,
        matchReasons
      };
    });
    
    // Return best match if similarity > 0.8
    scored.sort((a, b) => b.similarity - a.similarity);
    const best = scored[0];
    
    if (best.similarity >= 0.8) {
      return {
        isDuplicate: true,
        existingId: best.id,
        matchMethod: 'fuzzy_name_location_category',
        confidence: best.similarity,
        action: 'probable_merge',
        matchReasons: best.matchReasons
      };
    }
    
    return null;
  }
  
  /**
   * Never auto-merge conditions
   */
  static shouldNeverAutoMerge(contract, existing) {
    // Name matches but domains differ and both look legitimate
    if (contract.canonical_domain && existing.canonical_domain) {
      if (contract.canonical_domain !== existing.canonical_domain) {
        // Check if both are legitimate (not generic hosts)
        const genericHosts = ['linktr.ee', 'notion.site', 'substack.com'];
        const contractIsLegit = !genericHosts.some(h => contract.canonical_domain.includes(h));
        const existingIsLegit = !genericHosts.some(h => existing.canonical_domain.includes(h));
        
        if (contractIsLegit && existingIsLegit) {
          return {
            shouldNotMerge: true,
            reason: 'different_legitimate_domains',
            message: 'Same name but different legitimate domains - may be different companies'
          };
        }
      }
    }
    
    // One is a product and one is a parent company
    // (Would require parent/child link detection - simplified for now)
    
    return {
      shouldNotMerge: false,
      reason: null
    };
  }
  
  /**
   * Main resolve function
   */
  async resolve(contract) {
    // Step 1: Auto-merge (high confidence)
    const autoMerge = await this.checkAutoMerge(contract);
    if (autoMerge) {
      // Check if we should never auto-merge
      const existing = await this.supabase
        .from('startup_uploads')
        .select('*')
        .eq('id', autoMerge.existingId)
        .single();
      
      if (existing.data) {
        const neverMerge = EntityResolverV2.shouldNeverAutoMerge(contract, existing.data);
        if (neverMerge.shouldNotMerge) {
          return {
            isDuplicate: false,
            existingId: null,
            matchMethod: null,
            confidence: 1.0,
            action: 'create_new',
            reason: neverMerge.reason
          };
        }
      }
      
      return autoMerge;
    }
    
    // Step 2: Probable merge (medium confidence)
    const probableMerge = await this.checkProbableMerge(contract);
    if (probableMerge) {
      return probableMerge;
    }
    
    // New entity
    return {
      isDuplicate: false,
      existingId: null,
      matchMethod: null,
      confidence: 1.0,
      action: 'create_new'
    };
  }
  
  /**
   * Merge evidence into existing startup (evidence graph approach)
   */
  async mergeEvidence(startupId, contract) {
    // Get existing startup
    const { data: existing } = await this.supabase
      .from('startup_uploads')
      .select('*')
      .eq('id', startupId)
      .single();
    
    if (!existing) return;
    
    // Merge aliases
    const existingAliases = existing.aliases || [];
    if (contract.company_name && !existingAliases.includes(contract.company_name)) {
      existingAliases.push(contract.company_name);
    }
    
    // Merge evidence (evidence graph)
    const existingEvidence = existing.evidence || [];
    const mergedEvidence = [...existingEvidence, ...contract.evidence];
    
    // Merge signals
    const existingExtracted = existing.extracted_data || {};
    const mergedExtracted = {
      ...existingExtracted,
      traction_signals: [
        ...(existingExtracted.traction_signals || []),
        ...contract.traction_signals
      ],
      team_signals: [
        ...(existingExtracted.team_signals || []),
        ...contract.team_signals
      ],
      market_signals: [
        ...(existingExtracted.market_signals || []),
        ...contract.market_signals
      ],
      moat_signals: [
        ...(existingExtracted.moat_signals || []),
        ...contract.moat_signals
      ]
    };
    
    // Merge funding mentions
    const existingFunding = existing.funding_mentions || [];
    const mergedFunding = [...existingFunding, ...contract.funding_mentions];
    
    // Merge accelerators
    const existingAccelerators = existing.accelerators || [];
    const mergedAccelerators = [...existingAccelerators, ...contract.accelerators];
    
    // Update source_last_seen
    const now = new Date().toISOString();
    
    // Update database
    await this.supabase
      .from('startup_uploads')
      .update({
        aliases: existingAliases,
        evidence: mergedEvidence,
        extracted_data: mergedExtracted,
        funding_mentions: mergedFunding,
        accelerators: mergedAccelerators,
        source_last_seen: now,
        updated_at: now
      })
      .eq('id', startupId);
  }
}

module.exports = EntityResolverV2;


