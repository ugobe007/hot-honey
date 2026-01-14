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
