import type { ReactNode } from 'react';
import { TONE, type Tone } from '../../lib/score';

interface Props {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
}

/**
 * Secondary figure inside a card. On phones it is a compact row (label left, value
 * right) so 3–4 of them don't stack into tall tiles; from `sm` on it is a centered tile.
 */
export function MiniStat({ label, value, sub, tone }: Props) {
  return (
    <div
      className={`flex min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 sm:block sm:text-center ${
        tone ? TONE[tone].soft : 'border-zinc-800'
      }`}
    >
      <div className="min-w-0">
        <div className="text-xs text-zinc-400">{label}</div>
        {sub && <div className="text-[11px] text-zinc-500 sm:hidden">{sub}</div>}
      </div>
      <div className={`shrink-0 text-base font-semibold tabular-nums sm:mt-0.5 sm:text-lg ${tone ? TONE[tone].text : 'text-zinc-100'}`}>
        {value}
      </div>
      {sub && <div className="hidden text-xs text-zinc-500 sm:mt-0.5 sm:block">{sub}</div>}
    </div>
  );
}

const COLS = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' } as const;

export function TileGrid({ cols, children }: { cols: keyof typeof COLS; children: ReactNode }) {
  return <div className={`grid grid-cols-1 gap-2 sm:gap-3 ${COLS[cols]}`}>{children}</div>;
}
