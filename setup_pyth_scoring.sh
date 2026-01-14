#!/usr/bin/env bash
set -euo pipefail

APP="pyth-scoring"
mkdir -p "$APP"
cd "$APP"

npm init -y >/dev/null
npm pkg set name="$APP" version="0.1.0" type="module" >/dev/null

npm i dotenv zod dayjs lodash-es pg pino pino-pretty csv-parse commander
npm i -D typescript tsx @types/node @types/pg eslint

cat > tsconfig.json <<'JSON'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
JSON

cat > .gitignore <<'TXT'
node_modules
dist
.env
.DS_Store
*.log
coverage
TXT

cat > .env.example <<'TXT'
# Optional Postgres (for later)
DATABASE_URL=postgresql://user:pass@localhost:5432/pyth

# Supabase (recommended path)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# Scoring params
FOMO_HALF_LIFE_DAYS=14
WINDOW_SHORT_DAYS=7
WINDOW_MED_DAYS=30
WINDOW_LONG_DAYS=90
TXT

mkdir -p src/{cli,core,features,signals,backtest,db,types,utils}
mkdir -p samples

cat > src/types/domain.ts <<'TS'
export type SourceType =
  | "forum_post"
  | "company_blog"
  | "press_quote"
  | "marketing_page"
  | "podcast_transcript"
  | "conf_talk"
  | "support_thread"
  | "postmortem"
  | "investor_letter"
  | "qa_transcript"
  | "social_post"
  | "other";

export type InvestorTier = 1 | 2 | 3;
export type StartupTier = 1 | 2 | 3;

export type InvestorArchetype =
  | "scout"
  | "conviction"
  | "pack"
  | "thematic"
  | "status"
  | "operator_angel";

export type TriggerType =
  | "IGNITION"
  | "BREAKOUT"
  | "OVERHEAT"
  | "NARRATIVE_MISMATCH"
  | "PREDATOR_MODE";

export interface ContentItem {
  id: string;
  startup_id: string;
  source_type: SourceType;
  tier: StartupTier | 3;
  source_url?: string | null;
  created_at: string;
  date_published?: string | null;
  text: string;
  author?: string | null;
}

export interface InvestorEvent {
  id: string;
  startup_id: string;
  investor_id: string;
  investor_tier: InvestorTier;
  archetype?: InvestorArchetype;
  event_type: "view" | "save" | "intro_request" | "comment" | "click";
  occurred_at: string;
}

export interface StartupDailySignals {
  startup_id: string;
  day: string;

  tech_density: number;
  founder_voice: number;
  customer_pull: number;
  objection_pressure: number;
  narrative_coherence: number;

  fomo: number;
  god: number;

  fomo_intensity_7d: number;
  fomo_accel: number;
  quality_shift: number;

  triggers: TriggerType[];
}
TS

cat > src/utils/math.ts <<'TS'
export function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}
export function sigmoid(x: number) { return 1 / (1 + Math.exp(-x)); }
export function logit(p: number) {
  const eps = 1e-9;
  const pp = clamp(p, eps, 1 - eps);
  return Math.log(pp / (1 - pp));
}
export function log1pPos(x: number) { return Math.log(1 + Math.max(0, x)); }
export function halfLifeLambda(days: number) { return Math.log(2) / Math.max(1e-9, days); }
export function expDecayWeight(deltaDays: number, lambda: number) {
  return Math.exp(-lambda * Math.max(0, deltaDays));
}
TS

cat > src/signals/narrative.ts <<'TS'
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
TS

cat > src/core/fomo.ts <<'TS'
import dayjs from "dayjs";
import { InvestorEvent } from "../types/domain.js";
import { clamp, halfLifeLambda, expDecayWeight, log1pPos, sigmoid } from "../utils/math.js";

export interface FomoParams { half_life_days: number; eta: number; kappa: number; }
export interface FomoResult { intensity_7d: number; accel: number; quality_shift: number; fomo: number; }

function tierWeight(tier: number) { return tier === 1 ? 3.5 : tier === 2 ? 2.0 : 1.0; }

export function computeFomo(startupEvents: InvestorEvent[], nowIso: string, params: FomoParams): FomoResult {
  const lambda = halfLifeLambda(params.half_life_days);
  const now = dayjs(nowIso);

  const events7d = startupEvents.filter(e => now.diff(dayjs(e.occurred_at), "day") <= 7);
  const eventsPrev7d = startupEvents.filter(e => {
    const d = now.diff(dayjs(e.occurred_at), "day");
    return d > 7 && d <= 14;
  });

  const intensity = (evs: InvestorEvent[]) =>
    evs.reduce((sum, e) => {
      const delta = now.diff(dayjs(e.occurred_at), "day", true);
      return sum + tierWeight(e.investor_tier) * expDecayWeight(delta, lambda);
    }, 0);

  const I7 = intensity(events7d);
  const Iprev = intensity(eventsPrev7d);
  const accel = log1pPos(I7) - log1pPos(Iprev);

  const shareQuality = (evs: InvestorEvent[]) => {
    if (!evs.length) return { t1: 0, t2: 0, t3: 0 };
    const n1 = evs.filter(e => e.investor_tier === 1).length;
    const n2 = evs.filter(e => e.investor_tier === 2).length;
    const n3 = evs.filter(e => e.investor_tier === 3).length;
    const tot = evs.length;
    return { t1: n1 / tot, t2: n2 / tot, t3: n3 / tot };
  };

  const qNow = shareQuality(events7d);
  const qPrev = shareQuality(eventsPrev7d);
  const qualityShift = (qNow.t1 + 0.5 * qNow.t2) - (qPrev.t1 + 0.5 * qPrev.t2);

  const fomo01 = sigmoid(params.eta * accel + params.kappa * qualityShift);
  return { intensity_7d: I7, accel, quality_shift: qualityShift, fomo: 100 * clamp(fomo01, 0, 1) };
}
TS

cat > src/core/god.ts <<'TS'
import { clamp, logit, sigmoid } from "../utils/math.js";
export interface GodComponents { grit: number; opportunity: number; determination: number; belief_bonus: number; }
export interface GodParams { alpha: number; beta: number; gamma: number; delta: number; }

export function computeGod(c: GodComponents, p: GodParams) {
  const G = clamp(c.grit, 0, 1);
  const O = clamp(c.opportunity, 0, 1);
  const D = clamp(c.determination, 0, 1);
  const B = clamp(c.belief_bonus, 0, 1);
  const u = p.alpha * logit(G) + p.beta * logit(O) + p.gamma * logit(D) + p.delta * B;
  return clamp(100 * sigmoid(u), 0, 100);
}
TS

cat > src/core/triggers.ts <<'TS'
import { StartupDailySignals, TriggerType } from "../types/domain.js";

export interface TriggerParams {
  ignition_fomo: number;
  ignition_accel: number;
  ignition_narr: number;
  breakout_fomo: number;
  breakout_quality_shift: number;
  breakout_god: number;
  overheat_fomo: number;
  overheat_accel_neg_days: number;
  mismatch_narr_drop: number;
}

export function applyTriggers(today: StartupDailySignals, history: StartupDailySignals[], p: TriggerParams): TriggerType[] {
  const t: TriggerType[] = [];
  const h = [...history].sort((a,b)=>a.day.localeCompare(b.day));
  const prev = h.length ? h[h.length - 1] : null;

  if (today.fomo >= p.ignition_fomo && today.fomo_accel >= p.ignition_accel && today.narrative_coherence >= p.ignition_narr) t.push("IGNITION");
  if (today.fomo >= p.breakout_fomo && today.quality_shift >= p.breakout_quality_shift && today.god >= p.breakout_god) t.push("BREAKOUT");

  if (today.fomo >= p.overheat_fomo) {
    const lastN = h.slice(-p.overheat_accel_neg_days);
    if (lastN.length === p.overheat_accel_neg_days && lastN.every(d => d.fomo_accel < 0)) t.push("OVERHEAT");
  }

  if (prev) {
    const narrDrop = prev.narrative_coherence - today.narrative_coherence;
    if (narrDrop >= p.mismatch_narr_drop && today.fomo_intensity_7d > prev.fomo_intensity_7d) t.push("NARRATIVE_MISMATCH");
  }

  return t;
}
TS

cat > src/backtest/backtest.ts <<'TS'
import dayjs from "dayjs";
import { parse } from "csv-parse/sync";
import fs from "node:fs";
import { ContentItem, InvestorEvent, StartupDailySignals } from "../types/domain.js";
import { computeNarrativeSignals } from "../signals/narrative.js";
import { computeFomo } from "../core/fomo.js";
import { computeGod } from "../core/god.js";
import { applyTriggers } from "../core/triggers.js";

function groupBy<T>(xs: T[], key: (t: T) => string) {
  const m = new Map<string, T[]>();
  for (const x of xs) {
    const k = key(x);
    const arr = m.get(k) || [];
    arr.push(x);
    m.set(k, arr);
  }
  return m;
}

function loadCsv<T>(path: string): T[] {
  const txt = fs.readFileSync(path, "utf8");
  return parse(txt, { columns: true, skip_empty_lines: true, trim: true }) as T[];
}

function buildDailySignals(content: ContentItem[], events: InvestorEvent[], day: string): StartupDailySignals[] {
  const byStartupContent = groupBy(content, c => c.startup_id);
  const byStartupEvents = groupBy(events, e => e.startup_id);

  const startups = new Set<string>([
    ...Array.from(byStartupContent.keys()),
    ...Array.from(byStartupEvents.keys())
  ]);

  const nowIso = dayjs(day).endOf("day").toISOString();
  const results: StartupDailySignals[] = [];

  for (const startup_id of startups) {
    const c = (byStartupContent.get(startup_id) || [])
      .filter(x => dayjs(x.created_at).isBefore(dayjs(nowIso)))
      .sort((a,b)=>dayjs(b.created_at).valueOf()-dayjs(a.created_at).valueOf());

    const e = (byStartupEvents.get(startup_id) || [])
      .filter(x => dayjs(x.occurred_at).isBefore(dayjs(nowIso)))
      .sort((a,b)=>dayjs(b.occurred_at).valueOf()-dayjs(a.occurred_at).valueOf());

    const narr = computeNarrativeSignals(c);
    const fomoRes = computeFomo(e, nowIso, {
      half_life_days: Number(process.env.FOMO_HALF_LIFE_DAYS || 14),
      eta: 1.2,
      kappa: 2.0
    });

    // v1 placeholders (replace w/ your 15 algos)
    const grit = Math.min(1, 0.35 + 0.35 * narr.founder_voice + 0.15 * narr.customer_pull);
    const opp  = Math.min(1, 0.30 + 0.40 * (fomoRes.fomo / 100) + 0.20 * narr.narrative_coherence);
    const det  = Math.min(1, 0.35 + 0.35 * narr.tech_density + 0.20 * narr.founder_voice);
    const belief_bonus = (fomoRes.fomo / 100) * narr.narrative_coherence * narr.tech_density;

    const god = computeGod(
      { grit, opportunity: opp, determination: det, belief_bonus },
      { alpha: 1.0, beta: 1.0, gamma: 1.0, delta: 0.5 }
    );

    results.push({
      startup_id,
      day,
      ...narr,
      fomo: fomoRes.fomo,
      god,
      fomo_intensity_7d: fomoRes.intensity_7d,
      fomo_accel: fomoRes.accel,
      quality_shift: fomoRes.quality_shift,
      triggers: []
    });
  }

  return results;
}

export function runBacktest(contentCsv: string, eventsCsv: string, days: number) {
  const content = loadCsv<any>(contentCsv).map((r) => ({
    id: String(r.id),
    startup_id: String(r.startup_id),
    source_type: r.source_type,
    tier: Number(r.tier),
    source_url: r.source_url || null,
    created_at: r.created_at,
    date_published: r.date_published || null,
    text: r.text,
    author: r.author || null
  })) as ContentItem[];

  const events = loadCsv<any>(eventsCsv).map((r) => ({
    id: String(r.id),
    startup_id: String(r.startup_id),
    investor_id: String(r.investor_id),
    investor_tier: Number(r.investor_tier),
    event_type: r.event_type,
    occurred_at: r.occurred_at
  })) as InvestorEvent[];

  const maxDay = dayjs().startOf("day");
  const start = maxDay.subtract(days - 1, "day");

  const historyByStartup = new Map<string, StartupDailySignals[]>();

  for (let d = 0; d < days; d++) {
    const day = start.add(d, "day").format("YYYY-MM-DD");
    const daily = buildDailySignals(content, events, day);

    for (const row of daily) {
      const h = historyByStartup.get(row.startup_id) || [];
      row.triggers = applyTriggers(row, h, {
        ignition_fomo: 65,
        ignition_accel: 0.25,
        ignition_narr: 0.55,
        breakout_fomo: 80,
        breakout_quality_shift: 0.10,
        breakout_god: 75,
        overheat_fomo: 90,
        overheat_accel_neg_days: 3,
        mismatch_narr_drop: 0.15
      });
      h.push(row);
      historyByStartup.set(row.startup_id, h);
    }
  }

  const today = maxDay.format("YYYY-MM-DD");
  const todaysRows: StartupDailySignals[] = [];
  for (const [, h] of historyByStartup) {
    const r = h.find(x => x.day === today);
    if (r) todaysRows.push(r);
  }

  const top = todaysRows.sort((a,b)=>b.god - a.god).slice(0, 25);

  console.log("\nTop 25 by GOD today:");
  for (const r of top) {
    const trig = r.triggers.length ? ` [${r.triggers.join(",")}]` : "";
    console.log(`- ${r.startup_id}  GOD=${r.god.toFixed(1)}  FOMO=${r.fomo.toFixed(1)}  NARR=${r.narrative_coherence.toFixed(2)}${trig}`);
  }
}
TS

cat > src/cli/index.ts <<'TS'
import "dotenv/config";
import { Command } from "commander";
import { runBacktest } from "../backtest/backtest.js";

const program = new Command();
program.name("pyth").description("Pyth GOD+FOMO scoring").version("0.1.0");

program
  .command("backtest")
  .requiredOption("--content <path>", "CSV of content items (snippets)")
  .requiredOption("--events <path>", "CSV of investor events")
  .option("--days <n>", "How many days to simulate", "30")
  .action((opts) => {
    runBacktest(opts.content, opts.events, Number(opts.days));
  });

program.parse(process.argv);
TS

cat > samples/content.csv <<'CSV'
id,startup_id,source_type,tier,source_url,created_at,date_published,text,author
1,s1,forum_post,1,https://news.ycombinator.com/item?id=1,2026-01-01T12:00:00Z,2026-01-01T12:00:00Z,"We built an API that drops latency from 220ms to 35ms. Paying customers in fintech.",someone
2,s1,company_blog,3,https://example.com/blog/launch,2026-01-03T12:00:00Z,2026-01-03T12:00:00Z,"We launched v2 with SOC2 controls and a new SDK.",founder
3,s2,forum_post,1,https://news.ycombinator.com/item?id=2,2026-01-02T12:00:00Z,2026-01-02T12:00:00Z,"No moat here, feels like a commodity. Competition already solved this.",critic
CSV

cat > samples/events.csv <<'CSV'
id,startup_id,investor_id,investor_tier,event_type,occurred_at
e1,s1,i1,1,view,2026-01-06T10:00:00Z
e2,s1,i2,2,save,2026-01-07T10:00:00Z
e3,s1,i3,1,intro_request,2026-01-09T10:00:00Z
e4,s2,i4,3,view,2026-01-07T10:00:00Z
CSV

npm pkg set scripts.dev="tsx src/cli/index.ts" >/dev/null
npm pkg set scripts.build="tsc -p tsconfig.json" >/dev/null
npm pkg set scripts.start="node dist/cli/index.js" >/dev/null

echo ""
echo "✅ Created $APP"
echo "Next:"
echo "  cd $APP"
echo "  cp .env.example .env"
echo "  npm run dev -- backtest --content samples/content.csv --events samples/events.csv --days 30"
