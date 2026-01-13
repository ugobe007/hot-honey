const axios = require('axios');
const cheerio = require('cheerio');

const DEFAULT_HEADERS = {
  'User-Agent': 'PythiaBot/0.1',
  'Accept': 'text/html,application/xhtml+xml',
};

/**
 * Normalize hostname: remove www.
 */
function host(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Return absolute URL for a possibly-relative href.
 */
function toAbs(href, baseUrl) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

/**
 * Score outbound links for "this is the company's site".
 * Deterministic heuristics — no AI.
 */
function scoreCandidate(url, anchorText) {
  const h = host(url) || '';
  const t = (anchorText || '').toLowerCase();

  // Prefer plain domains over deep paths
  let score = 0;

  // Strong anchor text signals
  if (/\b(website|official|visit|company site|homepage)\b/.test(t)) score += 5;
  if (/\b(app|product|platform)\b/.test(t)) score += 1;

  // Penalize socials/aggregators
  if (/(linkedin\.com|twitter\.com|x\.com|facebook\.com|instagram\.com|youtube\.com|tiktok\.com)/.test(h)) score -= 8;
  if (/(wellfound\.com|angel\.co|crunchbase\.com|pitchbook\.com|cbinsights\.com)/.test(h)) score -= 8;

  // Penalize tracking-heavy URLs
  if (/[?&](utm_|ref=|source=)/i.test(url)) score -= 1;

  // Prefer https and short paths
  try {
    const u = new URL(url);
    if (u.protocol === 'https:') score += 0.5;
    const pathDepth = (u.pathname || '').split('/').filter(Boolean).length;
    score += Math.max(0, 2 - pathDepth); // 0..2
  } catch {}

  return score;
}

/**
 * Infer a company's canonical website domain from an aggregator/article page.
 * Returns a domain string like "example.com" or null.
 */
async function inferCompanyDomainFromPageUrl(pageUrl, opts = {}) {
  const timeout = opts.timeout || 10000;

  let html;
  try {
    const res = await axios.get(pageUrl, {
      timeout,
      maxRedirects: 3,
      headers: DEFAULT_HEADERS,
      responseType: 'text',
      validateStatus: s => s < 400,
    });
    html = res.data;
  } catch {
    return null;
  }

  if (!html || typeof html !== 'string' || html.length < 200) return null;

  const $ = cheerio.load(html);

  // 1) Try explicit "website" style links first
  const candidates = [];

  $('a[href]').each((_, a) => {
    const href = $(a).attr('href');
    const text = $(a).text().trim().slice(0, 120);
    const abs = toAbs(href, pageUrl);
    if (!abs) return;

    const h = host(abs);
    if (!h) return;

    // Ignore mailto/tel
    if (abs.startsWith('mailto:') || abs.startsWith('tel:')) return;

    // Ignore same-host links (aggregator internal nav)
    if (h === host(pageUrl)) return;

    // Keep
    candidates.push({ url: abs, text, score: scoreCandidate(abs, text) });
  });

  // Sort high score first
  candidates.sort((a, b) => b.score - a.score);

  // Pick top candidate if it clears a threshold
  const best = candidates[0];
  if (best && best.score >= 4) {
    return host(best.url);
  }

  // 2) Fallback: try canonical link (sometimes points to original source)
  const canonical = $('link[rel="canonical"]').attr('href');
  if (canonical) {
    const abs = toAbs(canonical, pageUrl);
    const h = host(abs);
    // only accept if it's not the aggregator itself
    if (h && h !== host(pageUrl)) return h;
  }

  return null;
}

module.exports = { inferCompanyDomainFromPageUrl };
