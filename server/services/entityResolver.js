/**
 * ENTITY RESOLVER
 * ================
 * 
 * Takes raw extracted signals and:
 * 1. Deduplicates entities (same person mentioned different ways)
 * 2. Normalizes data (company names, amounts, dates)
 * 3. Links related entities (founder → company)
 * 4. Merges data from multiple sources
 * 5. Resolves conflicts (different amounts for same funding round)
 */

class EntityResolver {
  constructor() {
    // Known company name variations
    this.companyAliases = new Map([
      ['y combinator', 'Y Combinator'],
      ['yc', 'Y Combinator'],
      ['a16z', 'Andreessen Horowitz'],
      ['andreessen', 'Andreessen Horowitz'],
      ['gv', 'Google Ventures'],
      ['google ventures', 'Google Ventures'],
      ['sv angel', 'SV Angel'],
      ['svangel', 'SV Angel']
    ]);

    // Title normalization
    this.titleAliases = new Map([
      ['ceo', 'CEO'],
      ['cto', 'CTO'],
      ['cfo', 'CFO'],
      ['coo', 'COO'],
      ['vp', 'VP'],
      ['svp', 'SVP'],
      ['evp', 'EVP'],
      ['founder', 'Founder'],
      ['co-founder', 'Co-Founder'],
      ['cofounder', 'Co-Founder']
    ]);
  }

  /**
   * Main resolution method
   */
  async resolve(signals, structure, context = {}) {
    const entities = {
      company: this.resolveCompany(signals, structure, context),
      founders: this.resolveFounders(signals, structure, context),
      investors: this.resolveInvestors(signals, structure, context),
      competitors: this.resolveCompetitors(signals, structure, context)
    };

    // Link entities
    this.linkEntities(entities);

    return entities;
  }

  /**
   * Resolve company entity
   */
  resolveCompany(signals, structure, context) {
    const company = {
      name: null,
      description: null,
      website: null,
      founded: null,
      location: null,
      stage: null,
      funding: {
        totalRaised: null,
        lastRound: null,
        lastAmount: null,
        valuation: null
      },
      metrics: {
        employees: null,
        users: null,
        revenue: null,
        arr: null
      },
      category: null,
      tags: [],
      confidence: 0
    };

    // From context (highest priority)
    if (context.companyName) {
      company.name = context.companyName;
      company.confidence = 0.95;
    }

    // From structure (Schema.org)
    if (structure.unified) {
      company.name = company.name || structure.unified.name;
      company.description = structure.unified.description;
      company.website = structure.unified.url;
      company.founded = structure.unified.foundingDate;
      if (structure.unified.employees) {
        company.metrics.employees = structure.unified.employees;
      }
    }

    // From signals
    if (signals.funding) {
      company.stage = signals.funding.stage;
      company.funding.lastAmount = signals.funding.amount;
      company.funding.totalRaised = signals.funding.totalRaised || signals.funding.amount;
      company.funding.valuation = signals.funding.valuation;
    }

    if (signals.traction) {
      company.metrics.users = signals.traction.users;
      company.metrics.revenue = signals.traction.revenue;
      company.metrics.arr = signals.traction.arr;
    }

    if (signals.team) {
      company.metrics.employees = company.metrics.employees || signals.team.employees;
    }

    if (signals.product) {
      company.category = signals.product.category;
      company.tags = [...new Set([
        ...company.tags,
        ...signals.product.techStack.map(t => t.name),
        ...(signals.product.category ? [signals.product.category] : [])
      ])];
    }

    // Calculate confidence
    const dataPoints = [
      company.name,
      company.description,
      company.website,
      company.stage,
      company.funding.lastAmount,
      company.metrics.employees
    ].filter(Boolean).length;

    company.confidence = Math.min(0.95, 0.3 + (dataPoints * 0.1));

    return company;
  }

  /**
   * Resolve founder entities
   */
  resolveFounders(signals, structure, context) {
    const foundersMap = new Map();

    // From structure
    if (structure.unified?.founders) {
      for (const f of structure.unified.founders) {
        const key = this.normalizePersonName(f.name);
        foundersMap.set(key, {
          name: f.name,
          title: this.normalizeTitle(f.jobTitle),
          url: f.url,
          confidence: 0.9,
          source: 'schema'
        });
      }
    }

    // From signals
    if (signals.team?.founders) {
      for (const f of signals.team.founders) {
        const key = this.normalizePersonName(f.name);
        if (foundersMap.has(key)) {
          // Merge with existing
          const existing = foundersMap.get(key);
          foundersMap.set(key, {
            ...existing,
            ...f,
            confidence: Math.max(existing.confidence, f.confidence || 0.7)
          });
        } else {
          foundersMap.set(key, {
            name: f.name,
            title: f.title || 'Founder',
            confidence: f.confidence || 0.7,
            source: 'signals'
          });
        }
      }
    }

    // Add credential flags
    const founders = Array.from(foundersMap.values());
    
    if (signals.team) {
      for (const founder of founders) {
        founder.credentials = {
          bigTech: signals.team.bigTechAlumni,
          repeatFounder: signals.team.repeatFounder,
          technical: signals.team.technicalFounder,
          yc: signals.team.yc
        };
      }
    }

    return founders;
  }

  /**
   * Resolve investor entities
   */
  resolveInvestors(signals, structure, context) {
    const investorsMap = new Map();

    if (signals.funding?.investors) {
      for (const inv of signals.funding.investors) {
        const key = this.normalizeCompanyName(inv.name);
        
        if (investorsMap.has(key)) {
          const existing = investorsMap.get(key);
          investorsMap.set(key, {
            ...existing,
            isLead: existing.isLead || inv.isLead,
            confidence: Math.max(existing.confidence, inv.confidence || 0.7)
          });
        } else {
          investorsMap.set(key, {
            name: this.companyAliases.get(key) || inv.name,
            isLead: inv.isLead,
            tier: inv.tier,
            confidence: inv.confidence || 0.7
          });
        }
      }
    }

    return Array.from(investorsMap.values())
      .sort((a, b) => {
        // Lead investors first, then by tier, then by confidence
        if (a.isLead !== b.isLead) return b.isLead ? 1 : -1;
        if (a.tier !== b.tier) return a.tier === 'top' ? -1 : 1;
        return b.confidence - a.confidence;
      });
  }

  /**
   * Resolve competitor entities
   */
  resolveCompetitors(signals, structure, context) {
    const competitors = [];

    if (signals.market?.competitors) {
      for (const comp of signals.market.competitors) {
        const normalized = this.normalizeCompanyName(comp);
        if (!competitors.find(c => this.normalizeCompanyName(c.name) === normalized)) {
          competitors.push({
            name: comp,
            confidence: 0.65
          });
        }
      }
    }

    return competitors;
  }

  /**
   * Link entities together
   */
  linkEntities(entities) {
    // Link founders to company
    if (entities.company.name) {
      for (const founder of entities.founders) {
        founder.company = entities.company.name;
      }
    }

    // Link investors to funding round
    if (entities.company.funding?.lastAmount) {
      for (const investor of entities.investors) {
        investor.roundAmount = entities.company.funding.lastAmount;
        investor.roundStage = entities.company.stage;
      }
    }
  }

  /**
   * Merge results from multiple extractions
   */
  mergeResults(results) {
    const merged = {
      company: null,
      founders: [],
      investors: [],
      competitors: [],
      sources: [],
      confidence: 0
    };

    for (const result of results) {
      if (!result.entities) continue;

      // Track source
      merged.sources.push({
        type: result.source?.type,
        url: result.source?.url,
        confidence: result.confidence?.overall
      });

      // Merge company data (prefer higher confidence)
      if (result.entities.company) {
        if (!merged.company || 
            result.entities.company.confidence > merged.company.confidence) {
          merged.company = { ...result.entities.company };
        } else {
          // Merge individual fields
          merged.company = this.mergeCompanyData(merged.company, result.entities.company);
        }
      }

      // Merge founders (dedupe by name)
      if (result.entities.founders) {
        for (const founder of result.entities.founders) {
          const key = this.normalizePersonName(founder.name);
          const existing = merged.founders.find(f => 
            this.normalizePersonName(f.name) === key
          );
          
          if (existing) {
            Object.assign(existing, this.mergePersonData(existing, founder));
          } else {
            merged.founders.push({ ...founder });
          }
        }
      }

      // Merge investors (dedupe by name)
      if (result.entities.investors) {
        for (const investor of result.entities.investors) {
          const key = this.normalizeCompanyName(investor.name);
          const existing = merged.investors.find(i => 
            this.normalizeCompanyName(i.name) === key
          );
          
          if (existing) {
            existing.isLead = existing.isLead || investor.isLead;
            existing.confidence = Math.max(existing.confidence, investor.confidence);
          } else {
            merged.investors.push({ ...investor });
          }
        }
      }

      // Merge competitors (dedupe)
      if (result.entities.competitors) {
        for (const competitor of result.entities.competitors) {
          const key = this.normalizeCompanyName(competitor.name);
          if (!merged.competitors.find(c => this.normalizeCompanyName(c.name) === key)) {
            merged.competitors.push({ ...competitor });
          }
        }
      }
    }

    // Calculate overall confidence
    merged.confidence = merged.sources.length > 0
      ? merged.sources.reduce((sum, s) => sum + (s.confidence || 0), 0) / merged.sources.length
      : 0;

    return merged;
  }

  /**
   * Merge company data from two sources
   */
  mergeCompanyData(existing, incoming) {
    const merged = { ...existing };

    // Fill in missing fields from incoming
    for (const [key, value] of Object.entries(incoming)) {
      if (value !== null && value !== undefined) {
        if (merged[key] === null || merged[key] === undefined) {
          merged[key] = value;
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          // Recursively merge objects
          merged[key] = this.mergeCompanyData(merged[key], value);
        }
      }
    }

    // Update confidence
    merged.confidence = Math.max(existing.confidence || 0, incoming.confidence || 0);

    return merged;
  }

  /**
   * Merge person data from two sources
   */
  mergePersonData(existing, incoming) {
    return {
      ...existing,
      ...incoming,
      confidence: Math.max(existing.confidence || 0, incoming.confidence || 0)
    };
  }

  // ============ HELPER METHODS ============

  /**
   * Normalize person name for comparison
   */
  normalizePersonName(name) {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Normalize company name for comparison
   */
  normalizeCompanyName(name) {
    if (!name) return '';
    const normalized = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return this.companyAliases.get(normalized) || normalized;
  }

  /**
   * Normalize job title
   */
  normalizeTitle(title) {
    if (!title) return null;
    const normalized = title.toLowerCase().trim();
    return this.titleAliases.get(normalized) || title;
  }
}

module.exports = { EntityResolver };




