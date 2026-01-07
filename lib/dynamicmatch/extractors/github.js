const https = require('https');

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'DynamicMatch/1.0', 'Accept': 'application/vnd.github.v3+json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function extract(url) {
  const match = url.match(/github\.com\/([^\/]+)(?:\/([^\/]+))?/);
  if (!match) throw new Error('Invalid GitHub URL');
  const [, owner, repo] = match;
  
  if (repo) {
    const data = await fetchJSON('https://api.github.com/repos/' + owner + '/' + repo);
    return {
      name: data.name,
      description: data.description,
      stars: data.stargazers_count,
      forks: data.forks_count,
      language: data.language,
      updated_at: data.updated_at,
      topics: data.topics || []
    };
  } else {
    const [org, repos] = await Promise.all([
      fetchJSON('https://api.github.com/orgs/' + owner).catch(() => null),
      fetchJSON('https://api.github.com/users/' + owner + '/repos?per_page=5&sort=stars')
    ]);
    return {
      name: org?.name || owner,
      description: org?.description || repos[0]?.description,
      public_repos: org?.public_repos,
      total_stars: repos.reduce((s, r) => s + r.stargazers_count, 0),
      employee_count: org?.public_members_count
    };
  }
}

module.exports = { extract };
