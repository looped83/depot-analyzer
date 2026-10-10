import type { ReactNode } from 'react';

/** Shared tooltip frame for every chart. */
export function TooltipBox({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-xs shadow-xl">
      {title != null && <p className="mb-1 font-semibold text-zinc-100">{title}</p>}
      <div className="space-y-0.5 text-zinc-300">{children}</div>
    </div>
  );
}

// Recharts passes loosely typed payload entries.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Entry = Record<string, any>;

interface Props {
  active?: boolean;
  payload?: readonly Entry[];
  label?: string | number;
  formatLabel?: (label: string | number) => ReactNode;
  formatValue?: (v: number) => string;
  /** Display names per dataKey (series legend names). */
  names?: Record<string, string>;
}

/** Default series tooltip: label + one colored row per series. */
export function ChartTooltip({ active, payload, label, formatLabel, formatValue, names }: Props) {
  if (!active || !payload?.length) return null;
  return (
    <TooltipBox title={label !== undefined ? (formatLabel ? formatLabel(label) : label) : undefined}>
      {payload.map((item) => (
        <div key={String(item.dataKey)} className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color ?? item.payload?.fill }} />
          {names?.[item.dataKey] && <span className="text-zinc-400">{names[item.dataKey]}</span>}
          <span className="ml-auto font-medium tabular-nums text-zinc-100">
            {formatValue ? formatValue(Number(item.value)) : String(item.value)}
          </span>
        </div>
      ))}
    </TooltipBox>
  );
}
