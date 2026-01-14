import { ContentItem } from "../types/domain.js";
import { clamp } from "../utils/math.js";

function countMatches(text: string, re: RegExp) {
  const m = text.match(re);
  return m ? m.length : 0;
}
function norm01(x: number, k = 1) {
  return clamp(1 - Math.exp(-k * Math.max(0, x)), 0, 1);
}
export function techDensity(text: string) {
  const t = text.toLowerCase();
  const atoms =
    countMatches(t, /\b(api|sdk|latency|throughput|benchmark|rfc|spec|architecture|kubernetes|postgres|gpu|mlops|inference|eval|security|compliance|soc2|iso|hipaa)\b/g) +
    countMatches(t, /\b(ms|sec|seconds|%|x|times)\b/g) +
    countMatches(t, /\b(\d+(\.\d+)?)\b/g) * 0.15;
  const per1k = atoms / Math.max(1, text.length / 1000);
  return clamp(per1k / 12, 0, 1);
}
export function founderVoice(text: string) {
  const t = text.toLowerCase();
  const score =
    countMatches(t, /\b(i built|we built|we're building|we are building|i started|we started|our users|we shipped|we launched|we iterated)\b/g) +
    countMatches(t, /\b(founder|co-founder|ceo|cto|cofounder)\b/g) * 0.5;
  return norm01(score, 0.25);
}
export function customerPull(text: string) {
  const t = text.toLowerCase();
  const score =
    countMatches(t, /\b(paying customers|revenue|pilot|loi|renewal|contracts?|bookings)\b/g) +
    countMatches(t, /\b(saved|reduced|increased|improved)\b/g) * 0.25 +
    countMatches(t, /\$\s?\d+|\b\d+\s?(mrr|arr)\b/g) * 0.5;
  return norm01(score, 0.22);
}
export function objectionPressure(text: string) {
  const t = text.toLowerCase();
  const score =
    countMatches(t, /\b(won't scale|will not scale|no moat|commodity|regulatory risk|competition already|hard to defend|too crowded)\b/g) +
    countMatches(t, /\b(scam|fraud|fake|ripoff)\b/g) * 1.5;
  return norm01(score, 0.35);
}
export function narrativeCoherence(items: ContentItem[]) {
  const tokenSets = items
    .slice(0, 5)
    .map(it => {
      const toks = it.text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(w => w.length >= 5 && !["their","about","which","there","these","those","would","could","should"].includes(w));
      return new Set(toks.slice(0, 120));
    })
    .filter(s => s.size > 0);

  if (tokenSets.length < 2) return 0.5;

  let overlaps = 0;
  let pairs = 0;
  for (let i = 0; i < tokenSets.length; i++) {
    for (let j = i + 1; j < tokenSets.length; j++) {
      const a = tokenSets[i], b = tokenSets[j];
      let inter = 0;
      for (const x of a) if (b.has(x)) inter++;
      const uni = a.size + b.size - inter;
      overlaps += uni ? inter / uni : 0;
      pairs++;
    }
  }
  return clamp(overlaps / Math.max(1, pairs), 0, 1);
}
export function computeNarrativeSignals(items: ContentItem[]) {
  const recent = items.slice(0, 10);
  const td = recent.length ? recent.map(i => techDensity(i.text)).reduce((a,b)=>a+b,0)/recent.length : 0;
  const fv = recent.length ? recent.map(i => founderVoice(i.text)).reduce((a,b)=>a+b,0)/recent.length : 0;
  const cp = recent.length ? recent.map(i => customerPull(i.text)).reduce((a,b)=>a+b,0)/recent.length : 0;
  const op = recent.length ? recent.map(i => objectionPressure(i.text)).reduce((a,b)=>a+b,0)/recent.length : 0;
  const nc = narrativeCoherence(recent);
  return { tech_density: td, founder_voice: fv, customer_pull: cp, objection_pressure: op, narrative_coherence: nc };
}
