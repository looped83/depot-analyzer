import type { ReactNode } from 'react';
import { TONE, scoreTone, type Tone } from '../../lib/score';
import { fmtNum } from '../../lib/format';
import { useOptionalDepot } from '../../lib/depotContext';

const clamp = (v: number) => Math.max(0, Math.min(100, v));

interface ProgressProps {
  /** 0–100 */
  value: number;
  tone?: Tone;
  /** Goal-style progress (blue → emerald) instead of a single tone. */
  gradient?: boolean;
  size?: 'sm' | 'md';
  /** Tick marks in percent, e.g. [25, 50, 75]. */
  marks?: number[];
}

export function ProgressBar({ value, tone = 'info', gradient, size = 'sm', marks }: ProgressProps) {
  return (
    <div className={`relative w-full overflow-hidden rounded-full bg-zinc-800 ${size === 'md' ? 'h-2.5' : 'h-1.5'}`}>
      <div
        className={`h-full rounded-full ${gradient ? 'bg-gradient-to-r from-blue-500 to-emerald-500' : TONE[tone].bar}`}
        style={{ width: `${clamp(value)}%` }}
      />
      {marks?.map((m) => <span key={m} className="absolute inset-y-0 w-px bg-zinc-950/60" style={{ left: `${m}%` }} />)}
    </div>
  );
}

/** Value with a small inline bar for table cells; the bar is dropped on phones to save width. */
export function CellBar({ pct, label, tone = 'info' }: { pct: number; label: ReactNode; tone?: Tone }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="hidden h-1 w-12 overflow-hidden rounded-full bg-zinc-800 sm:block">
        <div className={`h-full rounded-full ${TONE[tone].bar}`} style={{ width: `${clamp(pct)}%` }} />
      </div>
      <span className={tone === 'info' || tone === 'neutral' ? '' : TONE[tone].text}>{label}</span>
    </div>
  );
}

/** One scored dimension: label, detail, 0–100 bar and score, colored on the shared scale. */
export function ScoreRow({ label, detail, score, children }: { label: string; detail?: string; score: number; children?: ReactNode }) {
  const tone = scoreTone(score);
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
        <span className="font-medium text-zinc-200">{label}</span>
        {detail && <span className="text-zinc-500">{detail}</span>}
      </div>
      <div className="flex items-center gap-3">
        <ProgressBar value={score} tone={tone} size="md" />
        <span className={`w-8 shrink-0 text-right text-sm font-semibold tabular-nums ${TONE[tone].text}`}>{fmtNum(score)}</span>
      </div>
      {children && <div className="mt-1.5">{children}</div>}
    </div>
  );
}

export interface BarItem {
  key: string;
  label: string;
  sub?: string;
  /** Bar length; negative values are drawn by magnitude. */
  value: number;
  display: ReactNode;
  tone?: Tone;
  color?: string;
  /** Opens this position's detail sheet on click. */
  symbol?: string;
}

/**
 * Ranked horizontal bars in plain HTML: lighter than an SVG chart, readable on phones
 * (label and value sit above the bar), and clickable through to the position.
 */
export function BarList({ items, ranked, max }: { items: BarItem[]; ranked?: boolean; max?: number }) {
  const depot = useOptionalDepot();
  const top = max ?? Math.max(...items.map((i) => Math.abs(i.value)), 0);
  if (items.length === 0) return <p className="py-6 text-center text-xs text-zinc-500">Keine Einträge</p>;
  return (
    <ol className="space-y-2.5">
      {items.map((item, i) => {
        const row = (
          <>
            {ranked && <span className="w-4 shrink-0 pt-px text-right text-xs tabular-nums text-zinc-600">{i + 1}</span>}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="min-w-0 truncate">
                  <span className="font-mono font-semibold text-zinc-100">{item.label}</span>
                  {item.sub && <span className="ml-1.5 text-zinc-500">{item.sub}</span>}
                </span>
                <span className="shrink-0 font-medium tabular-nums text-zinc-200">{item.display}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full ${item.color ? '' : TONE[item.tone ?? 'info'].bar}`}
                  style={{ width: `${top > 0 ? clamp((Math.abs(item.value) / top) * 100) : 0}%`, background: item.color }}
                />
              </div>
            </div>
          </>
        );
        return (
          <li key={item.key}>
            {item.symbol && depot ? (
              <button type="button" onClick={() => depot.openPosition(item.symbol!)} className="-mx-1.5 flex w-[calc(100%+0.75rem)] gap-2 rounded-lg px-1.5 py-0.5 text-left hover:bg-zinc-800/50">
                {row}
              </button>
            ) : (
              <div className="flex gap-2">{row}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
