/**
 * STRUCTURE EXTRACTOR
 * ====================
 * 
 * Extracts structured data from HTML using multiple strategies:
 * 
 * 1. Schema.org / JSON-LD - The gold standard for structured data
 * 2. OpenGraph tags - Social sharing metadata (often has good info)
 * 3. Twitter Cards - Similar to OG, sometimes different data
 * 4. Meta tags - Basic SEO metadata
 * 5. Microdata - HTML5 microdata attributes
 * 6. RDFa - Resource Description Framework in Attributes
 * 
 * Priority: JSON-LD > Microdata > RDFa > OpenGraph > Meta
 */

class StructureExtractor {
  constructor() {
    // Schema.org types we care about for startups
    this.relevantSchemaTypes = [
      'Organization',
      'Corporation', 
      'LocalBusiness',
      'Person',
      'Product',
      'SoftwareApplication',
      'WebApplication',
      'MobileApplication',
      'Article',
      'NewsArticle',
      'BlogPosting',
      'Event',
      'JobPosting',
      'MonetaryAmount',
      'QuantitativeValue'
    ];
  }

  /**
   * Main extraction method
   */
  async extract(html, source = {}) {
    if (!html || typeof html !== 'string') {
      return this.emptyResult();
    }

    const result = {
      schemaOrg: [],
      jsonLd: [],
      openGraph: {},
      twitterCard: {},
      metaTags: {},
      microdata: [],
      links: {},
      raw: {}
    };

    try {
      // Extract JSON-LD (highest quality)
      result.jsonLd = this.extractJsonLd(html);
      result.schemaOrg = this.normalizeSchemaOrg(result.jsonLd);

      // Extract OpenGraph
      result.openGraph = this.extractOpenGraph(html);

      // Extract Twitter Card
      result.twitterCard = this.extractTwitterCard(html);

      // Extract standard meta tags
      result.metaTags = this.extractMetaTags(html);

      // Extract link tags (canonical, alternate, etc.)
      result.links = this.extractLinks(html);

      // Extract microdata
      result.microdata = this.extractMicrodata(html);

      // Build unified profile from all sources
      result.unified = this.unifyData(result);

    } catch (error) {
      result.error = error.message;
    }

    return result;
  }

  /**
   * Extract JSON-LD scripts from HTML
   */
  extractJsonLd(html) {
    const jsonLdBlocks = [];
    
    // Match all JSON-LD script tags
    const scriptPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = scriptPattern.exec(html)) !== null) {
      try {
        const content = match[1].trim();
        const parsed = JSON.parse(content);
        
        // Handle both single objects and arrays
        if (Array.isArray(parsed)) {
          jsonLdBlocks.push(...parsed);
        } else {
          jsonLdBlocks.push(parsed);
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    }

    return jsonLdBlocks;
  }

  /**
   * Normalize Schema.org data to consistent format
   */
  normalizeSchemaOrg(jsonLdBlocks) {
    const normalized = [];

    for (const block of jsonLdBlocks) {
      const type = this.getSchemaType(block);
      
      if (!type) continue;

      const item = {
        type,
        data: {}
      };

      // Extract based on type
      switch (type) {
        case 'Organization':
        case 'Corporation':
        case 'LocalBusiness':
          item.data = this.extractOrganization(block);
          break;
        case 'Person':
          item.data = this.extractPerson(block);
          break;
        case 'Product':
        case 'SoftwareApplication':
        case 'WebApplication':
        case 'MobileApplication':
          item.data = this.extractProduct(block);
          break;
        case 'Article':
        case 'NewsArticle':
        case 'BlogPosting':
          item.data = this.extractArticle(block);
          break;
        case 'JobPosting':
          item.data = this.extractJobPosting(block);
          break;
        default:
          item.data = this.extractGeneric(block);
      }

      normalized.push(item);
    }

    return normalized;
  }

  /**
   * Get Schema.org type from JSON-LD block
   */
  getSchemaType(block) {
    const typeField = block['@type'];
    if (!typeField) return null;

    // Handle array of types
    if (Array.isArray(typeField)) {
      for (const t of typeField) {
        const clean = t.replace('schema:', '').replace('http://schema.org/', '');
        if (this.relevantSchemaTypes.includes(clean)) {
          return clean;
        }
      }
      return typeField[0]?.replace('schema:', '').replace('http://schema.org/', '');
    }

    return typeField.replace('schema:', '').replace('http://schema.org/', '');
  }

  /**
   * Extract Organization schema
   */
  extractOrganization(block) {
    return {
      name: block.name,
      legalName: block.legalName,
      description: block.description,
      url: block.url,
      logo: this.extractImage(block.logo),
      foundingDate: block.foundingDate,
      founders: this.extractPeople(block.founder || block.founders),
      employees: this.extractNumber(block.numberOfEmployees),
      address: this.extractAddress(block.address),
      sameAs: this.ensureArray(block.sameAs),
      email: block.email,
      telephone: block.telephone,
      industry: block.industry,
      naics: block.naicsCode,
      // Funding info (if present)
      funding: block.funding || block.fundingRound,
      parentOrganization: block.parentOrganization?.name
    };
  }

  /**
   * Extract Person schema
   */
  extractPerson(block) {
    return {
      name: block.name,
      givenName: block.givenName,
      familyName: block.familyName,
      jobTitle: block.jobTitle,
      description: block.description,
      image: this.extractImage(block.image),
      email: block.email,
      url: block.url,
      sameAs: this.ensureArray(block.sameAs),
      worksFor: block.worksFor?.name,
      alumniOf: this.ensureArray(block.alumniOf).map(a => a.name || a),
      knowsAbout: this.ensureArray(block.knowsAbout)
    };
  }

  /**
   * Extract Product schema
   */
  extractProduct(block) {
    return {
      name: block.name,
      description: block.description,
      image: this.extractImage(block.image),
      url: block.url,
      brand: block.brand?.name || block.brand,
      category: block.category,
      offers: this.extractOffers(block.offers),
      aggregateRating: this.extractRating(block.aggregateRating),
      applicationCategory: block.applicationCategory,
      operatingSystem: block.operatingSystem,
      downloadUrl: block.downloadUrl,
      softwareVersion: block.softwareVersion,
      releaseNotes: block.releaseNotes,
      datePublished: block.datePublished
    };
  }

  /**
   * Extract Article schema
   */
  extractArticle(block) {
    return {
      headline: block.headline,
      description: block.description,
      datePublished: block.datePublished,
      dateModified: block.dateModified,
      author: this.extractPeople(block.author),
      publisher: block.publisher?.name,
      image: this.extractImage(block.image),
      articleBody: block.articleBody?.substring(0, 500), // Truncate
      keywords: this.ensureArray(block.keywords),
      wordCount: block.wordCount
    };
  }

  /**
   * Extract JobPosting schema
   */
  extractJobPosting(block) {
    return {
      title: block.title,
      description: block.description,
      datePosted: block.datePosted,
      validThrough: block.validThrough,
      employmentType: block.employmentType,
      hiringOrganization: block.hiringOrganization?.name,
      jobLocation: this.extractAddress(block.jobLocation?.address),
      baseSalary: this.extractSalary(block.baseSalary),
      skills: this.ensureArray(block.skills),
      qualifications: block.qualifications,
      responsibilities: block.responsibilities
    };
  }

  /**
   * Extract generic schema data
   */
  extractGeneric(block) {
    const data = {};
    for (const [key, value] of Object.entries(block)) {
      if (key.startsWith('@')) continue;
      if (typeof value === 'string' || typeof value === 'number') {
        data[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        if (value.name) data[key] = value.name;
        else if (value['@value']) data[key] = value['@value'];
      }
    }
    return data;
  }

  /**
   * Extract OpenGraph tags
   */
  extractOpenGraph(html) {
    const og = {};
    const pattern = /<meta[^>]*property=["'](og:[^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi;
    const patternAlt = /<meta[^>]*content=["']([^"']*)["'][^>]*property=["'](og:[^"']+)["'][^>]*>/gi;

    let match;
    while ((match = pattern.exec(html)) !== null) {
      const key = match[1].replace('og:', '');
      og[key] = match[2];
    }
    while ((match = patternAlt.exec(html)) !== null) {
      const key = match[2].replace('og:', '');
      og[key] = match[1];
    }

    return {
      title: og.title,
      description: og.description,
      image: og.image,
      url: og.url,
      type: og.type,
      siteName: og.site_name,
      locale: og.locale,
      // Article specific
      publishedTime: og['article:published_time'],
      modifiedTime: og['article:modified_time'],
      author: og['article:author'],
      section: og['article:section'],
      tags: og['article:tag']
    };
  }

  /**
   * Extract Twitter Card tags
   */
  extractTwitterCard(html) {
    const twitter = {};
    const pattern = /<meta[^>]*name=["'](twitter:[^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi;
    const patternAlt = /<meta[^>]*content=["']([^"']*)["'][^>]*name=["'](twitter:[^"']+)["'][^>]*>/gi;

    let match;
    while ((match = pattern.exec(html)) !== null) {
      const key = match[1].replace('twitter:', '');
      twitter[key] = match[2];
    }
    while ((match = patternAlt.exec(html)) !== null) {
      const key = match[2].replace('twitter:', '');
      twitter[key] = match[1];
    }

    return {
      card: twitter.card,
      title: twitter.title,
      description: twitter.description,
      image: twitter.image,
      site: twitter.site,
      creator: twitter.creator
    };
  }

  /**
   * Extract standard meta tags
   */
  extractMetaTags(html) {
    const meta = {};
    
    // Name-based meta tags
    const namePattern = /<meta[^>]*name=["']([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi;
    let match;
    while ((match = namePattern.exec(html)) !== null) {
      meta[match[1].toLowerCase()] = match[2];
    }

    // Title tag
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch) {
      meta.title = titleMatch[1].trim();
    }

    return {
      title: meta.title,
      description: meta.description,
      keywords: meta.keywords?.split(',').map(k => k.trim()),
      author: meta.author,
      robots: meta.robots,
      generator: meta.generator,
      viewport: meta.viewport,
      themeColor: meta['theme-color']
    };
  }

  /**
   * Extract link tags
   */
  extractLinks(html) {
    const links = {};
    const pattern = /<link[^>]*rel=["']([^"']+)["'][^>]*href=["']([^"']*)["'][^>]*>/gi;

    let match;
    while ((match = pattern.exec(html)) !== null) {
      const rel = match[1].toLowerCase();
      if (!links[rel]) links[rel] = [];
      links[rel].push(match[2]);
    }

    return {
      canonical: links.canonical?.[0],
      icon: links.icon?.[0] || links['shortcut icon']?.[0],
      manifest: links.manifest?.[0],
      alternate: links.alternate,
      preconnect: links.preconnect
    };
  }

  /**
   * Extract microdata (itemscope/itemprop)
   */
  extractMicrodata(html) {
    // Simplified microdata extraction
    // Full implementation would need DOM parsing
    const items = [];
    
    const itemPattern = /itemscope[^>]*itemtype=["']([^"']+)["']/gi;
    let match;
    while ((match = itemPattern.exec(html)) !== null) {
      items.push({
        type: match[1].split('/').pop(),
        source: 'microdata'
      });
    }

    return items;
  }

  /**
   * Unify data from all sources
   */
  unifyData(result) {
    const unified = {
      name: null,
      description: null,
      url: null,
      image: null,
      type: null,
      founders: [],
      employees: null,
      foundingDate: null,
      industry: null,
      social: {}
    };

    // Priority: Schema.org > OpenGraph > Meta
    
    // From Schema.org
    const org = result.schemaOrg.find(s => 
      ['Organization', 'Corporation', 'LocalBusiness'].includes(s.type)
    );
    if (org?.data) {
      unified.name = org.data.name;
      unified.description = org.data.description;
      unified.url = org.data.url;
      unified.image = org.data.logo;
      unified.founders = org.data.founders || [];
      unified.employees = org.data.employees;
      unified.foundingDate = org.data.foundingDate;
      unified.industry = org.data.industry;
      
      // Extract social links
      if (org.data.sameAs) {
        for (const link of org.data.sameAs) {
          if (link.includes('twitter.com') || link.includes('x.com')) {
            unified.social.twitter = link;
          } else if (link.includes('linkedin.com')) {
            unified.social.linkedin = link;
          } else if (link.includes('facebook.com')) {
            unified.social.facebook = link;
          } else if (link.includes('github.com')) {
            unified.social.github = link;
          } else if (link.includes('crunchbase.com')) {
            unified.social.crunchbase = link;
          }
        }
      }
    }

    // Fill gaps from OpenGraph
    unified.name = unified.name || result.openGraph.title || result.openGraph.siteName;
    unified.description = unified.description || result.openGraph.description;
    unified.image = unified.image || result.openGraph.image;
    unified.url = unified.url || result.openGraph.url;

    // Fill gaps from Meta
    unified.name = unified.name || result.metaTags.title;
    unified.description = unified.description || result.metaTags.description;

    // Add Twitter handle
    if (result.twitterCard.site) {
      unified.social.twitter = unified.social.twitter || 
        `https://twitter.com/${result.twitterCard.site.replace('@', '')}`;
    }

    return unified;
  }

  // ============ Helper Methods ============

  extractImage(img) {
    if (!img) return null;
    if (typeof img === 'string') return img;
    if (img.url) return img.url;
    if (img['@id']) return img['@id'];
    if (Array.isArray(img)) return this.extractImage(img[0]);
    return null;
  }

  extractPeople(people) {
    if (!people) return [];
    const arr = this.ensureArray(people);
    return arr.map(p => {
      if (typeof p === 'string') return { name: p };
      return {
        name: p.name,
        jobTitle: p.jobTitle,
        url: p.url
      };
    }).filter(p => p.name);
  }

  extractNumber(value) {
    if (!value) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseInt(value.replace(/[^0-9]/g, ''));
      return isNaN(num) ? null : num;
    }
    if (value.value) return this.extractNumber(value.value);
    if (value['@value']) return this.extractNumber(value['@value']);
    return null;
  }

  extractAddress(address) {
    if (!address) return null;
    if (typeof address === 'string') return address;
    return {
      street: address.streetAddress,
      city: address.addressLocality,
      state: address.addressRegion,
      country: address.addressCountry,
      postal: address.postalCode
    };
  }

  extractOffers(offers) {
    if (!offers) return null;
    const arr = this.ensureArray(offers);
    return arr.map(o => ({
      price: o.price,
      currency: o.priceCurrency,
      availability: o.availability
    }));
  }

  extractRating(rating) {
    if (!rating) return null;
    return {
      value: parseFloat(rating.ratingValue),
      count: parseInt(rating.ratingCount || rating.reviewCount),
      best: parseFloat(rating.bestRating) || 5
    };
  }

  extractSalary(salary) {
    if (!salary) return null;
    return {
      value: salary.value?.value || salary.value,
      currency: salary.currency,
      unitText: salary.unitText
    };
  }

  ensureArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  emptyResult() {
    return {
      schemaOrg: [],
      jsonLd: [],
      openGraph: {},
      twitterCard: {},
      metaTags: {},
      microdata: [],
      links: {},
      unified: {}
    };
  }
}

module.exports = { StructureExtractor };
