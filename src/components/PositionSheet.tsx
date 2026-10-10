import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import { X } from 'lucide-react';
import type { DepotMetrics } from '../lib/metrics';
import { fmt, fmtNum, fmtPct } from '../lib/format';
import { TONE, scoreTone, type Tone } from '../lib/score';
import { RISK_LABEL, cagrTone, yieldTone } from '../lib/risk';
import { parsePaymentMonths } from '../lib/calculations';
import { StatusBadge, PrioBadge } from './ui/Badges';

export interface PositionSheetHandle { open: (symbol: string) => void }

const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function Fact({ label, value, tone }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-zinc-500">{label}</dt>
      <dd className={`truncate text-sm font-medium tabular-nums ${tone && tone !== 'neutral' ? TONE[tone].text : 'text-zinc-100'}`}>{value}</dd>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-zinc-800 px-4 py-3.5 sm:px-5">
      <h3 className="label mb-2">{title}</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">{children}</dl>
    </section>
  );
}

/**
 * Detail view for one position, reachable from every table row, bar list and chip.
 * Native <dialog>: focus trap, Escape and backdrop come for free. Holds its own state,
 * so opening it doesn't re-render the active tab.
 */
export function PositionSheet({ m, ref }: { m: DepotMetrics; ref: Ref<PositionSheetHandle> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [symbol, setSymbol] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({ open: setSymbol }), []);

  useEffect(() => {
    if (!symbol) return;
    if (!dialog.current?.open) dialog.current?.showModal();
    const html = document.documentElement;
    html.style.overflow = 'hidden';
    return () => { html.style.overflow = ''; };
  }, [symbol]);

  const p = symbol ? m.bySymbol.get(symbol) : undefined;
  const risk = p ? m.riskRows.find((r) => r.symbol === p.symbol) : undefined;
  const months = p ? parsePaymentMonths(p.ausschuettungsmonate) : [];

  return (
    <dialog
      ref={dialog}
      onClose={() => setSymbol(null)}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      aria-labelledby="sheet-title"
      className="m-0 mt-auto max-h-[88vh] w-full max-w-none overflow-y-auto rounded-t-2xl border border-zinc-800 bg-zinc-900 p-0 text-zinc-100 sm:m-auto sm:max-w-xl sm:rounded-2xl"
    >
      {p && (
        <>
          <header className="sticky top-0 z-10 flex items-start gap-3 bg-zinc-900 px-4 pb-3 pt-4 sm:px-5">
            <div className="min-w-0 flex-1">
              <h2 id="sheet-title" className="font-mono text-lg font-semibold">{p.symbol}</h2>
              <p className="truncate text-sm text-zinc-400">{p.name}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <StatusBadge status={p.status} />
                <PrioBadge prio={p.prio} />
                {risk && (
                  <span className={`rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none ${TONE[risk.risk].soft} ${TONE[risk.risk].text}`}>
                    Ampel: {RISK_LABEL[risk.risk]}
                  </span>
                )}
              </div>
            </div>
            <button type="button" onClick={() => dialog.current?.close()} aria-label="Schließen" className="-mr-1 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white">
              <X size={18} />
            </button>
          </header>

          <Group title="Bestand">
            <Fact label="Wert" value={fmt(p.wert)} />
            <Fact label="Gewicht" value={fmtPct(p.portfolioWeight, 1)} />
            <Fact label="Stückzahl" value={p.stueckzahl > 0 ? fmtNum(p.stueckzahl, Number.isInteger(p.stueckzahl) ? 0 : 2) : '—'} />
            {p.einstandswert > 0 && (
              <>
                <Fact label="Einstand" value={fmt(p.einstandswert)} />
                <Fact label="Kaufkurs → aktuell" value={`${fmt(p.kaufkurs, 2)} → ${fmt(p.aktuellerKurs, 2)}`} />
                <Fact
                  label="Gewinn / Verlust"
                  value={`${fmt(p.gewinnVerlust)} (${fmtPct(p.gewinnVerlustPct, 1)})`}
                  tone={p.gewinnVerlust >= 0 ? 'success' : 'danger'}
                />
              </>
            )}
          </Group>

          <Group title="Dividende">
            <Fact label="Yield" value={fmtPct(p.yield)} tone={yieldTone(p.yield)} />
            <Fact label="Pro Jahr" value={fmt(p.annualDividend)} />
            <Fact label="Ø pro Monat" value={fmt(p.monthlyDividend)} />
            <Fact label="Anteil an Dividende" value={fmtPct(p.dividendContribution, 1)} />
            <Fact label="Frequenz" value={p.ausschuettungsfrequenz || '—'} />
            <Fact label="Monate" value={months.length === 12 ? 'jeden Monat' : months.map((n) => MONTHS[n - 1]).join(', ') || '—'} />
          </Group>

          <Group title="Wachstum & Qualität">
            <Fact label="CAGR 5J" value={fmtPct(p.cagr5j)} tone={cagrTone(p.cagr5j)} />
            <Fact label="Chowder" value={fmtNum(p.chowderScore, 1)} tone={p.chowderScore >= 12 ? 'success' : undefined} />
            <Fact label="Dividend Score" value={fmtNum(p.dividendScore)} tone={scoreTone(p.dividendScore)} />
            {risk && <Fact label="Safety Score" value={fmtNum(risk.safety)} tone={scoreTone(risk.safety)} />}
            <Fact label="Rating" value={p.ratingScore > 0 ? fmtNum(p.ratingScore) : '—'} />
          </Group>

          <Group title="Sparplan & Stammdaten">
            <Fact label="Sparbetrag" value={p.sparbetrag > 0 ? fmt(p.sparbetrag) : '—'} />
            <Fact label="Zyklus" value={p.zyklus ?? '—'} />
            <Fact label="Broker" value={p.broker} />
            <Fact label="Typ" value={p.typ} />
            <Fact label="Kategorie" value={p.kategorie} />
            <Fact label="ISIN" value={p.isin || '—'} />
          </Group>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </>
      )}
    </dialog>
  );
}
