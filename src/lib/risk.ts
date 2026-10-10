import type { DepotPosition } from './types';
import type { Tone } from './score';

// Single source for the yield/growth thresholds used by every tab, finding and score.
export const YIELD_LOW = 1.5;   // below: low-yield outlier
export const YIELD_HIGH = 6.5;  // above: watch (possible dividend trap)
export const YIELD_RISK = 9;    // above: high risk
export const CAGR_LOW = 2;      // below: weak dividend growth
export const MAX_WEIGHT = 5;    // portfolio weight % above which a position counts as cluster risk

/** High yield without meaningful dividend growth – often precedes a dividend cut. */
export const isDividendTrap = (p: DepotPosition) =>
  p.yield > YIELD_HIGH && p.cagr5j >= 0 && p.cagr5j < CAGR_LOW;

/** Traffic-light risk class of a position: success = sicher, warning = beobachten, danger = Risiko. */
export function riskTone(p: DepotPosition): Exclude<Tone, 'neutral' | 'info'> {
  if (p.status === 'Verkauf' || p.yield > YIELD_RISK || p.cagr5j < 0) return 'danger';
  if (p.yield > YIELD_HIGH || p.cagr5j < CAGR_LOW || p.status === 'Beobachten') return 'warning';
  return 'success';
}

export const RISK_LABEL: Record<ReturnType<typeof riskTone>, string> = {
  success: 'Sicher',
  warning: 'Beobachten',
  danger: 'Risiko',
};

export const yieldTone = (y: number): Tone =>
  y > YIELD_RISK ? 'danger' : y > YIELD_HIGH ? 'warning' : 'neutral';

export const cagrTone = (c: number): Tone =>
  c < 0 ? 'danger' : c < CAGR_LOW ? 'warning' : 'neutral';

/** 0–100 safety score from growth, yield level, priority and status. */
export function safetyScore(p: DepotPosition): number {
  let score = 50;
  if (p.cagr5j >= 8) score += 20;
  else if (p.cagr5j >= 5) score += 12;
  else if (p.cagr5j >= CAGR_LOW) score += 4;
  else if (p.cagr5j < 0) score -= 20;

  if (p.yield <= 4) score += 10;
  else if (p.yield <= YIELD_HIGH) score += 4;
  else if (p.yield <= YIELD_RISK) score -= 10;
  else score -= 20;

  const prioMod: Record<string, number> = { A: 10, B: 5, C: -5, D: -10, E: -20 };
  score += prioMod[p.prio ?? ''] ?? 0;

  if (p.status === 'Beobachten') score -= 10;
  if (p.status === 'Verkauf') score -= 20;

  return Math.max(0, Math.min(100, score));
}
