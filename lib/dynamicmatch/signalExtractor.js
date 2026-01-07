/**
 * Signal Extractor - Pattern-based inference from any text
 */

function extractSignals(data) {
  const text = [
    data.description || '',
    data.about || '',
    data.tagline || '',
    JSON.stringify(data.meta || {})
  ].join(' ');

  return {
    funding_amount: extractFunding(text),
    funding_stage: extractStage(text),
    has_revenue: hasRevenueSignals(text),
    is_launched: hasLaunchSignals(text),
    employee_count: extractTeamSize(text),
    sectors: extractSectors(text)
  };
}

function extractFunding(text) {
  const match = text.match(/(?:raised|funding|round)\s*\$?([\d.]+)\s*(million|m|billion|b)/i);
  if (match) {
    const amt = parseFloat(match[1]);
    return match[2].toLowerCase().startsWith('b') ? amt * 1e9 : amt * 1e6;
  }
  return null;
}

function extractStage(text) {
  const t = text.toLowerCase();
  if (/series\s+[d-f]/i.test(t)) return 'series_d_plus';
  if (/series\s+c/i.test(t)) return 'series_c';
  if (/series\s+b/i.test(t)) return 'series_b';
  if (/series\s+a/i.test(t)) return 'series_a';
  if (/\bseed\b/i.test(t)) return 'seed';
  if (/pre-?seed/i.test(t)) return 'pre_seed';
  return null;
}

function hasRevenueSignals(text) {
  return /\$[\d.]+[km]?\s*(?:arr|mrr|revenue)|profitable|paying\s+customers?|pricing/i.test(text);
}

function hasLaunchSignals(text) {
  return /\blaunched\b|\blive\b|available\s+now|sign\s*up|get\s+started|try\s+free/i.test(text);
}

function extractTeamSize(text) {
  const match = text.match(/(\d+)\s*(?:\+\s*)?employees?|team\s+of\s+(\d+)/i);
  return match ? parseInt(match[1] || match[2]) : null;
}

function extractSectors(text) {
  const sectors = [];
  const t = text.toLowerCase();
  if (/\b(ai|artificial intelligence|machine learning|llm)\b/.test(t)) sectors.push('AI');
  if (/\b(fintech|financial|payments?)\b/.test(t)) sectors.push('Fintech');
  if (/\b(health|medical|biotech)\b/.test(t)) sectors.push('HealthTech');
  if (/\b(climate|carbon|clean\s*energy)\b/.test(t)) sectors.push('Climate');
  if (/\b(defense|military)\b/.test(t)) sectors.push('Defense');
  if (/\b(robot|automation)\b/.test(t)) sectors.push('Robotics');
  if (/\b(saas|software|cloud)\b/.test(t)) sectors.push('SaaS');
  if (/\b(devtools?|developer|api)\b/.test(t)) sectors.push('DevTools');
  return sectors;
}

module.exports = { extractSignals };
