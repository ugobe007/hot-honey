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
