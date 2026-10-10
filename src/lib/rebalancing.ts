import type { DepotPosition } from './types';

export type Strategy = 'prio' | 'equal';

const PRIO_MULT: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, E: 0.5 };
const NO_PRIO_MULT = 1.5;

export interface RebalanceRow extends DepotPosition {
  targetPct: number;
  deltaPct: number;  // target − current, in percentage points
  deltaEur: number;
}

/** Target weight vs. actual weight for every active position, most underweight first. */
export function rebalanceRows(active: DepotPosition[], strategy: Strategy): RebalanceRow[] {
  const totalWert = active.reduce((s, p) => s + p.wert, 0);
  const mult = (p: DepotPosition) => (strategy === 'equal' ? 1 : PRIO_MULT[p.prio ?? ''] ?? NO_PRIO_MULT);
  const totalMult = active.reduce((s, p) => s + mult(p), 0) || 1;

  return active
    .map((p) => {
      const targetPct = (mult(p) / totalMult) * 100;
      const deltaPct = targetPct - p.portfolioWeight;
      return { ...p, targetPct, deltaPct, deltaEur: (deltaPct / 100) * totalWert };
    })
    .sort((a, b) => b.deltaPct - a.deltaPct);
}

/**
 * The app's one answer to "what should I buy next": positions in build-up ("Aufbau")
 * that sit furthest below their target weight. Used by Rebalancing and every teaser.
 */
export const buyCandidates = (rows: RebalanceRow[]) =>
  rows.filter((r) => r.status === 'Aufbau' && r.deltaPct > 0.1);

export const TRANCHE = 1000;
