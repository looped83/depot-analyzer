import { PALETTE, OTHER_COLOR } from '../../lib/chartTheme';
import { fmtPct } from '../../lib/format';

export interface Slice { name: string; value: number }

interface Props {
  data: Slice[];
  format: (v: number) => string;
  /** Fixed color per name (e.g. categories); otherwise the palette in order. */
  colors?: Record<string, string>;
}

const MAX_SLICES = PALETTE.length;

/**
 * Compact donut with a value legend beside it. Pure SVG (stroke-dasharray on one circle per
 * slice) – no chart library, no resize observer. Legend shows share and value, so identity
 * never depends on color alone.
 */
export function Donut({ data, format, colors }: Props) {
  const sorted = [...data].filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  const slices = sorted.length > MAX_SLICES
    ? [...sorted.slice(0, MAX_SLICES - 1), { name: 'Sonstige', value: sorted.slice(MAX_SLICES - 1).reduce((s, d) => s + d.value, 0) }]
    : sorted;
  const total = slices.reduce((s, d) => s + d.value, 0);
  const color = (name: string, i: number) => (name === 'Sonstige' ? OTHER_COLOR : colors?.[name] ?? PALETTE[i]);

  // Circle with circumference 100 so dash lengths are plain percentages.
  const R = 15.915;
  const GAP = slices.length > 1 ? 1 : 0;
  const pcts = slices.map((s) => (s.value / total) * 100);
  // Dash offset per slice: start at 12 o'clock, then advance by the preceding slices.
  const offsets = pcts.map((_, i) => 25 - pcts.slice(0, i).reduce((a, b) => a + b, 0));

  if (total === 0) return <p className="py-6 text-center text-xs text-zinc-500">Keine Daten</p>;

  return (
    <div className="flex items-center gap-4 sm:gap-5">
      <svg viewBox="0 0 36 36" className="h-24 w-24 shrink-0 sm:h-28 sm:w-28" role="img" aria-label="Verteilung">
        {slices.map((s, i) => {
          const pct = pcts[i];
          const dash = Math.max(pct - GAP, 0.01);
          return (
            <circle
              key={s.name}
              cx="18" cy="18" r={R} fill="none" strokeWidth="4.5"
              stroke={color(s.name, i)}
              strokeDasharray={`${dash} ${100 - dash}`}
              strokeDashoffset={offsets[i]}
            >
              <title>{`${s.name}: ${format(s.value)} (${fmtPct(pct, 1)})`}</title>
            </circle>
          );
        })}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {slices.map((s, i) => (
          <li key={s.name} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color(s.name, i) }} />
            <span className="min-w-0 flex-1 truncate text-zinc-300">{s.name}</span>
            <span className="shrink-0 tabular-nums text-zinc-500">{fmtPct((s.value / total) * 100, 0)}</span>
            <span className="hidden w-20 shrink-0 text-right tabular-nums text-zinc-300 sm:inline">{format(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
