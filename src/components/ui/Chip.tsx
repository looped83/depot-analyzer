import { useState, type ReactNode } from 'react';
import { useOptionalDepot } from '../../lib/depotContext';

interface ChipProps {
  label: string;
  meta?: ReactNode;
  /** When set, the chip opens that position's detail sheet. */
  symbol?: string;
}

const CHIP = 'inline-flex items-center gap-1 rounded-md border border-zinc-700/80 bg-zinc-800/60 px-1.5 py-0.5 font-mono text-xs text-zinc-300';

export function Chip({ label, meta, symbol }: ChipProps) {
  const depot = useOptionalDepot();
  const content = (
    <>
      {label}
      {meta != null && <span className="font-sans text-zinc-500">{meta}</span>}
    </>
  );
  if (symbol && depot) {
    return (
      <button type="button" onClick={() => depot.openPosition(symbol)} className={`${CHIP} transition-colors hover:border-zinc-500 hover:text-white`}>
        {content}
      </button>
    );
  }
  return <span className={CHIP}>{content}</span>;
}

export interface ChipItem { symbol: string; meta?: ReactNode }

/** Symbol chips with a "+N" toggle beyond `max`, so long lists never flood the layout. */
export function ChipList({ items, max = 8 }: { items: ChipItem[]; max?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return <span className="text-xs text-zinc-600">—</span>;
  const shown = expanded ? items : items.slice(0, max);
  const hidden = items.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((i) => <Chip key={i.symbol} label={i.symbol} meta={i.meta} symbol={i.symbol} />)}
      {(hidden > 0 || expanded) && items.length > max && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="rounded-md px-1.5 py-0.5 text-xs text-zinc-500 hover:text-zinc-200"
        >
          {expanded ? 'weniger' : `+${hidden}`}
        </button>
      )}
    </div>
  );
}
