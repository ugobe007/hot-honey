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
