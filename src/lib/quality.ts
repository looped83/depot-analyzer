import type { DepotPosition } from './types';

// Data fields that drive the analyses. CAGR is excluded on purpose: 0,00 % is a valid
// value and can't be told apart from an empty cell.
const FIELDS: { label: string; weight: number; has: (p: DepotPosition) => boolean }[] = [
  { label: 'Yield',               weight: 25, has: (p) => p.yield > 0 },
  { label: 'ISIN',                weight: 20, has: (p) => !!p.isin },
  { label: 'Priorität',           weight: 20, has: (p) => !!p.prio },
  { label: 'Ausschüttungsmonate', weight: 20, has: (p) => !!p.ausschuettungsmonate },
  { label: 'Rating',              weight: 15, has: (p) => p.ratingScore > 0 },
];

/** Per-position completeness, 0–100 (weighted by field importance). */
export const positionCompleteness = (p: DepotPosition): number =>
  FIELDS.reduce((s, f) => s + (f.has(p) ? f.weight : 0), 0);

/** Share of positions with each field filled, plus the unweighted average across fields. */
export function fieldCoverage(positions: DepotPosition[]) {
  const n = positions.length || 1;
  const fields = FIELDS.map((f) => {
    const count = positions.filter(f.has).length;
    return { label: f.label, count, pct: (count / n) * 100 };
  });
  const avg = fields.reduce((s, f) => s + f.pct, 0) / fields.length;
  return { fields, avg };
}
