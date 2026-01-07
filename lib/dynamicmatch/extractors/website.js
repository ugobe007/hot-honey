const https = require('https');
const http = require('http');

async function fetchPage(url, depth = 0) {
  if (depth > 3) throw new Error('Too many redirects');
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DynamicMatch/1.0)' },
      timeout: 10000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href;
        return fetchPage(loc, depth + 1).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function extract(url) {
  const html = await fetchPage(url);
  return {
    name: extractMeta(html, 'og:site_name') || extractTitle(html),
    description: extractMeta(html, 'description') || extractMeta(html, 'og:description'),
    tagline: extractH1(html),
    has_pricing: /href="[^"]*pricing|>pricing</i.test(html),
    social_links: {
      twitter: (html.match(/href="(https?:\/\/(?:twitter|x)\.com\/[^"]+)"/i) || [])[1],
      linkedin: (html.match(/href="(https?:\/\/linkedin\.com\/company\/[^"]+)"/i) || [])[1],
      github: (html.match(/href="(https?:\/\/github\.com\/[^"]+)"/i) || [])[1]
    }
  };
}

function extractMeta(html, name) {
  const re = new RegExp('<meta[^>]*(?:name|property)="' + name + '"[^>]*content="([^"]+)"', 'i');
  const match = html.match(re);
  return match ? match[1] : null;
}

function extractTitle(html) {
  const match = html.match(/<title>([^<|]+)/i);
  return match ? match[1].trim() : null;
}

function extractH1(html) {
  const match = html.match(/<h1[^>]*>([^<]{10,100})<\/h1>/i);
  return match ? match[1].trim() : null;
}

module.exports = { extract };
