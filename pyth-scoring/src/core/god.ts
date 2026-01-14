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
