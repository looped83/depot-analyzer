import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { fmtNum } from '../../lib/format';

export function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="relative block w-full sm:w-48">
      <span className="sr-only">Positionen durchsuchen</span>
      <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Symbol, Name …"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 py-1.5 pl-8 pr-2.5 text-xs text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40"
      />
    </label>
  );
}

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}

/** Mutually exclusive choice (view switch, strategy, yes/no). Scrolls horizontally if needed. */
export function Segmented<T extends string>({ options, value, onChange, label }: SegmentedProps<T>) {
  const activeRef = useRef<HTMLButtonElement>(null);
  // Keep the selected option visible when the row is wider than the screen. Scrolls only
  // the row itself (scrollIntoView could also move the page).
  useEffect(() => {
    const btn = activeRef.current;
    const row = btn?.parentElement;
    if (!btn || !row) return;
    const left = btn.offsetLeft - 4;
    const right = btn.offsetLeft + btn.offsetWidth + 4;
    if (left < row.scrollLeft) row.scrollLeft = left;
    else if (right > row.scrollLeft + row.clientWidth) row.scrollLeft = right - row.clientWidth;
  }, [value]);
  return (
    <div role="group" aria-label={label} className="no-scrollbar relative inline-flex max-w-full overflow-x-auto rounded-xl bg-zinc-800/70 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          ref={o.value === value ? activeRef : undefined}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 ${
            o.value === value ? 'bg-zinc-600/80 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: '€' | '%';
}

/** Range slider plus an exact number field – sliders alone are too coarse on phones. */
export function SliderField({ label, value, onChange, min, max, step, unit }: SliderProps) {
  const id = useId();
  // Local draft so typing "1" on the way to "1500" isn't clamped mid-entry.
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (raw: string) => {
    const n = Number(raw.replace(',', '.'));
    if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
    setDraft(null);
  };
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-xs font-medium text-zinc-400">{label}</label>
        <span className="flex items-center gap-1 text-sm text-zinc-200">
          <input
            type="text"
            inputMode="decimal"
            aria-label={`${label} (Zahl)`}
            value={draft ?? fmtNum(value, unit === '€' ? 0 : 1)}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => { setDraft(String(value)); e.target.select(); }}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="w-20 rounded-md border border-zinc-700 bg-zinc-800/60 px-2 py-0.5 text-right tabular-nums outline-none focus:border-blue-500"
          />
          <span className="text-zinc-500">{unit}</span>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-6 w-full accent-blue-500"
      />
    </div>
  );
}

/** Inline text action ("Alle anzeigen", "Zurücksetzen"). */
export function TextButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-xs font-medium text-blue-400 hover:text-blue-300">
      {children}
    </button>
  );
}
