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
