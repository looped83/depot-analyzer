import React from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPayload = readonly Record<string, any>[];

interface Props {
  active?: boolean;
  payload?: AnyPayload;
  label?: string | number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  labelFormatter?: (...args: any[]) => React.ReactNode;
  formatter?: (v: number | string, name: string) => string;
}

export function ChartTooltip({ active, payload, label, labelFormatter, formatter }: Props) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs shadow-xl shadow-slate-200/60 dark:shadow-none">
      {label !== undefined && (
        <p className="font-medium text-slate-500 dark:text-zinc-400 mb-1.5">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      {payload.map((item, i) => {
        const raw: number | string = item.value ?? 0;
        const name: string = String(item.name ?? '');
        const displayed = formatter ? formatter(raw, name) : String(raw);
        return (
          <div key={i} className="flex items-center gap-2">
            {item.color && (
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
            )}
            <span className="text-slate-800 dark:text-zinc-200 font-medium">{displayed}</span>
            {name && name !== String(item.dataKey ?? '') && (
              <span className="text-slate-400 dark:text-zinc-500">{name}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
