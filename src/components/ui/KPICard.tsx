import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { InfoTip } from './Card';
import { TONE, type Tone } from '../../lib/score';
import type { TabId } from '../../lib/types';
import { useOptionalDepot } from '../../lib/depotContext';

interface Props {
  title: string;
  value: ReactNode;
  sub?: ReactNode;
  info?: string;
  tone?: Tone;
  /** Turns the card into a teaser that jumps to the tab (and card) where the topic lives. */
  to?: { tab: TabId; anchor?: string };
  children?: ReactNode;
}

export function KPICard({ title, value, sub, info, tone, to, children }: Props) {
  const depot = useOptionalDepot();
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="label flex items-center gap-1">
          {title}
          {/* no InfoTip inside a teaser: it would nest a button in a button */}
          {info && !to && <InfoTip text={info} />}
        </span>
        {to && <ChevronRight size={14} className="shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-300" />}
      </div>
      <div className={`mt-1.5 text-xl font-semibold leading-tight tracking-tight tabular-nums sm:text-2xl ${tone ? TONE[tone].text : 'text-white'}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
      {children && <div className="mt-2.5">{children}</div>}
    </>
  );

  const base = 'card block min-w-0 p-4 sm:p-5';
  if (to && depot) {
    return (
      <button
        type="button"
        onClick={() => depot.navigate(to.tab, to.anchor)}
        className={`${base} group w-full text-left transition-colors hover:border-zinc-700`}
      >
        {content}
      </button>
    );
  }
  return <div className={base}>{content}</div>;
}

/** The standard KPI row: 2 columns on phones, 4 from laptop width. */
export function KPIGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>;
}
