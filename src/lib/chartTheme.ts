// Shared chart design tokens – used in all tabs

export const PALETTE = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#ec4899', // pink-500
  '#84cc16', // lime-500
  '#ef4444', // red-500
  '#6366f1', // indigo-500
];

export const AXIS = {
  tick: { fontSize: 11, fill: '#94a3b8' },
  axisLine: false as const,
  tickLine: false as const,
};

export const GRID = {
  strokeDasharray: '3 3' as const,
  strokeOpacity: 0.08,
  stroke: '#94a3b8',
};
