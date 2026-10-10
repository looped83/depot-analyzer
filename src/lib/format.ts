export const fmt = (v: number | null | undefined, decimals = 0): string => {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    style: 'currency',
    currency: 'EUR',
  }).format(v);
};

export const fmtPct = (v: number | null | undefined, decimals = 2): string => {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v) + ' %';
};

export const fmtNum = (v: number | null | undefined, decimals = 0): string => {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v);
};


/** Axis ticks for euro amounts: 12.500 → "12,5k", 1.250.000 → "1.250k". */
export const fmtK = (v: number): string => `${fmtNum(v / 1000, Math.abs(v) < 10000 && v !== 0 ? 1 : 0)}k`;

/** Signed amount for deltas: +1.234 € / −567 €. */
export const fmtSigned = (v: number, decimals = 0): string => `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt(Math.abs(v), decimals)}`;
