#!/usr/bin/env node
/**
 * Dynamic API Discovery
 * 
 * When you load a page in Playwright, intercept network calls and extract JSON.
 * 
 * In Playwright:
 * - capture all XHR/fetch requests + responses
 * - store: request URL, method, headers, response content-type, response body (only if JSON)
 * - then build a site profile:
 *   - GraphQL endpoint? (often /graphql)
 *   - Next.js data? (/_next/data/...json)
 *   - Algolia? (algolia.net, x-algolia-*)
 *   - WordPress? (/wp-json/wp/v2/)
 *   - Prismic/Contentful/Sanity? recognizable endpoints
 * 
 * Outcome: You stop scraping HTML and start pulling the same JSON the site uses.
 * 
 * Implementing EXACTLY as specified in architecture document.
 */

require('dotenv').config();
const { chromium } = require('playwright');

/**
 * Discover APIs from a website by intercepting network calls
 */
async function discoverAPIs(url, timeout = 30000) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const apiEndpoints = {
    graphql: null,
    nextjs: null,
    algolia: null,
    wordpress: null,
    prismic: null,
    contentful: null,
    sanity: null,
    other: []
  };
  
  const requests = [];
  const responses = [];
  
  // Intercept network requests
  page.on('request', (request) => {
    const url = request.url();
    const method = request.method();
    const headers = request.headers();
    
    requests.push({
      url,
      method,
      headers: Object.keys(headers)
    });
  });
  
  // Intercept network responses
  page.on('response', async (response) => {
    const url = response.url();
    const status = response.status();
    const contentType = response.headers()['content-type'] || '';
    
    // Only capture JSON responses
    if (contentType.includes('application/json') && status === 200) {
      try {
        const body = await response.json();
        
        responses.push({
          url,
          status,
          contentType,
          body: JSON.stringify(body).substring(0, 1000) // Store first 1000 chars
        });
        
        // Categorize endpoints
        if (url.includes('/graphql')) {
          apiEndpoints.graphql = url;
        } else if (url.includes('/_next/data/') || url.includes('/_next/static/')) {
          apiEndpoints.nextjs = url;
        } else if (url.includes('algolia.net') || headers['x-algolia-application-id']) {
          apiEndpoints.algolia = url;
        } else if (url.includes('/wp-json/wp/v2/')) {
          apiEndpoints.wordpress = url;
        } else if (url.includes('prismic.io') || url.includes('.prismic.')) {
          apiEndpoints.prismic = url;
        } else if (url.includes('contentful.com') || url.includes('cdn.contentful.com')) {
          apiEndpoints.contentful = url;
        } else if (url.includes('sanity.io') || url.includes('api.sanity.io')) {
          apiEndpoints.sanity = url;
        } else {
          apiEndpoints.other.push(url);
        }
      } catch (e) {
        // Not JSON or couldn't parse, skip
      }
    }
  });
  
  try {
    // Navigate to page and wait for network to be idle
    await page.goto(url, { waitUntil: 'networkidle', timeout });
    
    // Wait a bit more for any lazy-loaded API calls
    await page.waitForTimeout(2000);
  } catch (error) {
    console.error(`   ⚠️  Error loading ${url}:`, error.message);
  } finally {
    await browser.close();
  }
  
  return {
    url,
    endpoints: apiEndpoints,
    requests: requests.slice(0, 50), // Limit to first 50 requests
    responses: responses.slice(0, 20) // Limit to first 20 JSON responses
  };
}

/**
 * Build site profile from discovered APIs
 */
function buildSiteProfile(discoveryResult) {
  const profile = {
    url: discoveryResult.url,
    api_type: 'unknown',
    endpoints: {},
    has_structured_api: false
  };
  
  const endpoints = discoveryResult.endpoints;
  
  if (endpoints.graphql) {
    profile.api_type = 'graphql';
    profile.endpoints.graphql = endpoints.graphql;
    profile.has_structured_api = true;
  } else if (endpoints.nextjs) {
    profile.api_type = 'nextjs';
    profile.endpoints.nextjs = endpoints.nextjs;
    profile.has_structured_api = true;
  } else if (endpoints.algolia) {
    profile.api_type = 'algolia';
    profile.endpoints.algolia = endpoints.algolia;
    profile.has_structured_api = true;
  } else if (endpoints.wordpress) {
    profile.api_type = 'wordpress';
    profile.endpoints.wordpress = endpoints.wordpress;
    profile.has_structured_api = true;
  } else if (endpoints.prismic) {
    profile.api_type = 'prismic';
    profile.endpoints.prismic = endpoints.prismic;
    profile.has_structured_api = true;
  } else if (endpoints.contentful) {
    profile.api_type = 'contentful';
    profile.endpoints.contentful = endpoints.contentful;
    profile.has_structured_api = true;
  } else if (endpoints.sanity) {
    profile.api_type = 'sanity';
    profile.endpoints.sanity = endpoints.sanity;
    profile.has_structured_api = true;
  }
  
  if (endpoints.other.length > 0) {
    profile.endpoints.other = endpoints.other;
  }
  
  return profile;
}

/**
 * Discover APIs for a startup website
 */
async function discoverStartupAPIs(website) {
  if (!website) return null;
  
  const url = website.startsWith('http') ? website : `https://${website}`;
  
  console.log(`   🔍 Discovering APIs for: ${url}`);
  
  const discoveryResult = await discoverAPIs(url);
  const profile = buildSiteProfile(discoveryResult);
  
  return profile;
}

/**
 * Main function
 */
async function runAPIDiscovery(limit = 10) {
  console.log('\n🔌 DYNAMIC API DISCOVERY');
  console.log('='.repeat(60));
  
  console.log(`\n📊 Discovering APIs for ${limit} startup websites...\n`);
  
  // This would fetch from startup_uploads, but for now just demonstrate
  const testUrls = [
    'https://vercel.com',
    'https://stripe.com',
    'https://github.com'
  ].slice(0, limit);
  
  const results = [];
  
  for (const url of testUrls) {
    const profile = await discoverStartupAPIs(url);
    if (profile) {
      results.push(profile);
      console.log(`   ✅ ${url}: ${profile.api_type} API discovered`);
    }
  }
  
  console.log(`\n✅ Discovered APIs for ${results.length} websites\n`);
  
  return results;
}

// Run if called directly
if (require.main === module) {
  const limit = process.argv[2] ? parseInt(process.argv[2]) : 10;
  runAPIDiscovery(limit).catch(console.error);
}

module.exports = { discoverAPIs, buildSiteProfile, discoverStartupAPIs };
