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
  return `${v.toFixed(decimals)} %`;
};

export const fmtNum = (v: number | null | undefined, decimals = 2): string => {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v);
};
