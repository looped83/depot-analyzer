import React from 'react';
import type { DepotPosition } from '../../lib/types';
import { KPICard } from '../KPICard';
import { Card } from '../Card';
import { SortableTable } from '../tables/SortableTable';
import { fmt, fmtPct, fmtNum } from '../../lib/format';

interface Props { positions: DepotPosition[] }

function capitalForWeight(targetPct: number, currentWert: number, totalWert: number): number {
  // New capital needed so that (currentWert + x) / (totalWert + x) = targetPct/100
  const t = targetPct / 100;
  return Math.max(0, (t * totalWert - currentWert) / (1 - t));
}

export function WatchlistTab({ positions }: Props) {
  const totalWert = positions.reduce((s, p) => s + p.wert, 0);

  const candidates = positions
    .filter((p) => p.wert === 0)
    .sort((a, b) => b.dividendScore - a.dividendScore);

  const watchList = positions
    .filter((p) => p.wert > 0 && p.status === 'Beobachten')
    .sort((a, b) => b.wert - a.wert);

  const sellList = positions
    .filter((p) => p.wert > 0 && p.status === 'Verkauf')
    .sort((a, b) => b.wert - a.wert);

  const topCandidates = candidates.filter((p) => p.prio && ['A', 'B'].includes(p.prio));

  const ScoreBadge = ({ v }: { v: number }) => (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg tabular-nums ${
      v >= 75 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' :
      v >= 50 ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' :
      'bg-slate-50 dark:bg-zinc-800 text-slate-400'
    }`}>{v}</span>
  );

  const PrioBadge = ({ v }: { v: string | null }) => (
    <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
      v === 'A' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
      v === 'B' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
      v === 'C' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
      v === 'D' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' :
      v === 'E' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
      'bg-slate-100 dark:bg-zinc-700 text-slate-500'
    }`}>{String(v || '—')}</span>
  );

  const candidateColumns = [
    { key: 'symbol', label: 'Symbol', width: '80px',
      render: (v: unknown) => <span className="font-mono font-semibold text-xs text-slate-800 dark:text-zinc-200">{String(v)}</span> },
    { key: 'name', label: 'Name' },
    { key: 'prio',  label: 'Prio', align: 'center' as const,
      render: (v: unknown) => <PrioBadge v={v as string | null} /> },
    { key: 'dividendScore', label: 'Score', align: 'right' as const,
      render: (v: unknown) => <ScoreBadge v={v as number} /> },
    { key: 'yield',  label: 'Yield',   align: 'right' as const, render: (v: unknown) => fmtPct(v as number) },
    { key: 'cagr5j', label: 'CAGR 5J', align: 'right' as const, render: (v: unknown) => fmtPct(v as number) },
    { key: 'chowderScore', label: 'Chowder', align: 'right' as const,
      render: (v: unknown) => <span className="font-mono tabular-nums">{fmtNum(v as number, 1)}</span> },
    { key: 'typ',       label: 'Typ',      align: 'center' as const },
    { key: 'kategorie', label: 'Kategorie' },
    { key: 'broker',    label: 'Broker',   align: 'center' as const },
  ];

  const sellWert = sellList.reduce((s, p) => s + p.wert, 0);
  const avgCandidateYield = candidates.length > 0 ? candidates.reduce((s, p) => s + p.yield, 0) / candidates.length : 0;
  const potentialDivFromSell = sellWert > 0 && topCandidates.length > 0
    ? sellWert * (topCandidates.reduce((s, p) => s + p.yield, 0) / topCandidates.length / 100)
    : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard title="Kaufkandidaten"    value={String(candidates.length)}    sub="Noch nicht im Depot" info="Positionen mit Wert = 0, die als potenzielle Käufe vorgemerkt sind." />
        <KPICard title="Prio A/B Pipeline" value={String(topCandidates.length)} sub="Hochwertige Kandidaten" info="Kandidaten mit Priorität A oder B – besonders empfehlenswert." />
        <KPICard title="Ø Yield Kandidaten" value={fmtPct(avgCandidateYield)}   sub="Durchschnitt Watchlist" info="Durchschnittliche Dividendenrendite aller Kaufkandidaten." />
        <KPICard title="Beobachtungsliste" value={String(watchList.length)}     sub="Im Depot, unter Beobachtung" info="Aktive Positionen mit Status 'Beobachten' – ggf. reduzieren oder halten." />
        <KPICard title="Verkaufskandidaten" value={String(sellList.length)}     sub="Zum Verkauf markiert" info="Positionen mit Status 'Verkauf' – Kapital kann in stärkere Positionen umgeschichtet werden." />
        <KPICard title="Reinvest-Potenzial" value={sellWert > 0 ? fmt(potentialDivFromSell) : '—'} sub={sellWert > 0 ? `${fmt(sellWert)} umschichtbar` : 'Keine Verkäufe'} info="Geschätzte zusätzliche Dividende bei Umschichtung von Verkaufskandidaten in Top-Kandidaten." />
      </div>

      {/* Reinvestment opportunity */}
      {sellList.length > 0 && topCandidates.length > 0 && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Umschichtungs-Potenzial</p>
          <p className="text-xs text-emerald-600/70 dark:text-emerald-300/60">
            Durch Verkauf von {sellList.map(p => p.symbol).join(', ')} werden {fmt(sellWert)} frei.
            Reinvestiert in Top-Kandidaten ergibt das ca. {fmt(potentialDivFromSell)} zusätzliche Dividende pro Jahr.
          </p>
        </div>
      )}

      {/* Capital needed for top candidates */}
      {topCandidates.length > 0 && (
        <Card title="Kaufkandidaten Prio A/B – Kapitalbedarf"
          sub="Geschätztes Kapital um Zielgewicht im Depot zu erreichen">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            {topCandidates.slice(0, 6).map((p) => {
              const cap1 = capitalForWeight(1, 0, totalWert);
              const cap2 = capitalForWeight(2, 0, totalWert);
              const cap3 = capitalForWeight(3, 0, totalWert);
              return (
                <div key={p.symbol}
                  className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-mono font-bold text-sm text-slate-800 dark:text-zinc-200">{p.symbol}</span>
                      <p className="text-xs text-slate-400 dark:text-zinc-500 truncate max-w-[140px]">{p.name}</p>
                    </div>
                    <PrioBadge v={p.prio} />
                  </div>
                  <div className="flex gap-3 text-xs mb-2">
                    <span className="text-slate-500 dark:text-zinc-400">Yield <span className="font-semibold text-slate-700 dark:text-zinc-300">{fmtPct(p.yield)}</span></span>
                    <span className="text-slate-500 dark:text-zinc-400">CAGR <span className="font-semibold text-slate-700 dark:text-zinc-300">{fmtPct(p.cagr5j)}</span></span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    {[['1 %', cap1], ['2 %', cap2], ['3 %', cap3]].map(([label, val]) => (
                      <div key={String(label)} className="text-center bg-white/60 dark:bg-zinc-800/60 rounded-lg py-1.5">
                        <div className="text-slate-400 dark:text-zinc-500">{String(label)}</div>
                        <div className="font-semibold text-slate-700 dark:text-zinc-200">{fmt(val as number)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* All candidates table */}
      <Card title={`Alle Kaufkandidaten (${candidates.length})`} pad={false}>
        <div className="px-5 pb-5">
          {candidates.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-zinc-500 py-4 text-center">
              Keine Positionen mit Wert = 0 gefunden. Trage Wunschpositionen mit Wert 0 in dein Depot ein.
            </p>
          ) : (
            <SortableTable
              data={candidates}
              rowKey={(r) => r.symbol}
              filterKeys={['symbol', 'name', 'typ', 'kategorie', 'prio']}
              columns={candidateColumns}
            />
          )}
        </div>
      </Card>

      {/* Watchlist */}
      {watchList.length > 0 && (
        <Card title={`Beobachtungsliste – Im Depot (${watchList.length})`} pad={false}>
          <div className="px-5 pb-5">
            <SortableTable
              data={watchList}
              rowKey={(r) => r.symbol}
              filterKeys={['symbol', 'name']}
              columns={[
                { key: 'symbol', label: 'Symbol', width: '80px',
                  render: (v) => <span className="font-mono font-semibold text-xs text-slate-800 dark:text-zinc-200">{String(v)}</span> },
                { key: 'name', label: 'Name' },
                { key: 'wert', label: 'Wert', align: 'right', render: (v) => fmt(v as number) },
                { key: 'portfolioWeight', label: 'Gewicht', align: 'right', render: (v) => fmtPct(v as number) },
                { key: 'yield',   label: 'Yield',   align: 'right', render: (v) => fmtPct(v as number) },
                { key: 'cagr5j',  label: 'CAGR 5J', align: 'right', render: (v) => fmtPct(v as number) },
                { key: 'dividendScore', label: 'Score', align: 'right',
                  render: (v) => <ScoreBadge v={v as number} /> },
                { key: 'annualDividend', label: 'Dividende/Jahr', align: 'right', render: (v) => fmt(v as number) },
              ]}
            />
          </div>
        </Card>
      )}

      {/* Sell list */}
      {sellList.length > 0 && (
        <Card title={`Verkaufskandidaten (${sellList.length})`} pad={false}>
          <div className="px-5 pb-5">
            <div className="mb-3 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-xl px-4 py-2">
              Diese Positionen sind als "Verkauf" markiert. Gebundenes Kapital: {fmt(sellList.reduce((s, p) => s + p.wert, 0))}
            </div>
            <SortableTable
              data={sellList}
              rowKey={(r) => r.symbol}
              filterKeys={['symbol', 'name']}
              columns={[
                { key: 'symbol', label: 'Symbol', width: '80px',
                  render: (v) => <span className="font-mono font-semibold text-xs text-slate-800 dark:text-zinc-200">{String(v)}</span> },
                { key: 'name', label: 'Name' },
                { key: 'wert', label: 'Wert', align: 'right', render: (v) => fmt(v as number) },
                { key: 'portfolioWeight', label: 'Gewicht', align: 'right', render: (v) => fmtPct(v as number) },
                { key: 'yield',          label: 'Yield',   align: 'right', render: (v) => fmtPct(v as number) },
                { key: 'annualDividend', label: 'Div/Jahr', align: 'right', render: (v) => fmt(v as number) },
                { key: 'dividendScore',  label: 'Score',   align: 'right',
                  render: (v) => <ScoreBadge v={v as number} /> },
              ]}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
