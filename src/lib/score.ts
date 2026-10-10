// One rating scale for every 0–100 score in the app (health score, its dimensions,
// quality, safety, dividend score), so the same number always reads the same.
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export function scoreTone(score: number): Tone {
  if (score >= 75) return 'success';
  if (score >= 50) return 'info';
  if (score >= 25) return 'warning';
  return 'danger';
}

const SCORE_LABEL: Record<Tone, string> = {
  success: 'Sehr gut',
  info: 'Solide',
  warning: 'Ausbaufähig',
  danger: 'Kritisch',
  neutral: '—',
};

export const scoreLabel = (score: number): string => SCORE_LABEL[scoreTone(score)];

// Tailwind classes per tone. Kept as full literals so Tailwind's scanner picks them up.
export const TONE: Record<Tone, { text: string; soft: string; bar: string; stroke: string; hex: string }> = {
  neutral: { text: 'text-zinc-200',    soft: 'bg-zinc-800/40 border-zinc-800',        bar: 'bg-zinc-500',    stroke: 'stroke-zinc-500',    hex: '#71717a' },
  info:    { text: 'text-blue-400',    soft: 'bg-blue-950/30 border-blue-900/50',     bar: 'bg-blue-500',    stroke: 'stroke-blue-500',    hex: '#3b82f6' },
  success: { text: 'text-emerald-400', soft: 'bg-emerald-950/30 border-emerald-900/50', bar: 'bg-emerald-500', stroke: 'stroke-emerald-500', hex: '#10b981' },
  warning: { text: 'text-amber-400',   soft: 'bg-amber-950/30 border-amber-900/50',   bar: 'bg-amber-500',   stroke: 'stroke-amber-500',   hex: '#f59e0b' },
  danger:  { text: 'text-red-400',     soft: 'bg-red-950/30 border-red-900/50',       bar: 'bg-red-500',     stroke: 'stroke-red-500',     hex: '#ef4444' },
};
