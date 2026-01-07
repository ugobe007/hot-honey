const website = require('./website');
const github = require('./github');

async function extract(source) {
  const results = await Promise.all(source.queries.map(async url => {
    try {
      const extractor = url.includes('github.com') ? github : website;
      return { url, data: await extractor.extract(url), error: null };
    } catch (e) {
      return { url, data: null, error: e.message };
    }
  }));
  
  const success = results.filter(r => r.data);
  if (success.length === 0) return { error: 'No sources found' };
  
  const merged = {};
  success.forEach(r => Object.assign(merged, r.data));
  merged._sources = success.map(r => r.url);
  return merged;
}

module.exports = { extract };
