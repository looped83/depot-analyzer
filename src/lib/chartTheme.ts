// Shared chart tokens (dark UI only).

// Categorical order, validated for the dark surface (lightness band, CVD separation).
// Assigned in fixed order and never cycled: a 9th slice folds into "Sonstige".
export const PALETTE = [
  '#3b82f6', // blue
  '#059669', // emerald
  '#d97706', // amber
  '#8b5cf6', // violet
  '#0891b2', // cyan
  '#ea580c', // orange
  '#db2777', // pink
  '#65a30d', // lime
];
export const OTHER_COLOR = '#52525b'; // zinc-600, for the folded "Sonstige" slice

export const AXIS = {
  tick: { fontSize: 11, fill: '#71717a' },
  axisLine: false as const,
  tickLine: false as const,
};

export const GRID = {
  strokeDasharray: '3 3' as const,
  stroke: '#27272a',
};

// Neutral strokes: reference lines, secondary series, polar grid, mark outlines.
export const MUTED = '#71717a';   // zinc-500
export const SURFACE = '#18181b'; // zinc-900, card background – used as gap/outline around marks
export const POLAR_GRID = '#3f3f46';

// Subtle hover band for bar charts on the dark surface.
export const BAR_CURSOR = { fill: 'rgba(255,255,255,0.04)' };
