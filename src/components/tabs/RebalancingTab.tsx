import { useState } from 'react';
import { useDepot } from '../../lib/depotContext';
import { TRANCHE, type Strategy } from '../../lib/rebalancing';
import { fmt, fmtNum, fmtPct, fmtSigned } from '../../lib/format';
import { TONE } from '../../lib/score';
import { KPICard, KPIGrid } from '../ui/KPICard';
import { Card, Note } from '../ui/Card';
import { Callout } from '../ui/Callout';
import { BarList } from '../ui/Bars';
import { Segmented, SliderField } from '../ui/Controls';
import { ChipList } from '../ui/Chip';
import { PrioBadge } from '../ui/Badges';
import { PositionTable } from '../tables/PositionTable';

const STRATEGIES: { value: Strategy; label: string }[] = [
  { value: 'prio', label: 'Nach Prio' },
  { value: 'equal', label: 'Gleichgewichtet' },
];

const deltaClass = (d: number) => (d > 0.5 ? TONE.success.text : d < -0.5 ? TONE.warning.text : 'text-zinc-500');

export function RebalancingTab() {
  const { m } = useDepot();
  const [strategy, setStrategy] = useState<Strategy>('prio');
  const [budget, setBudget] = useState(3 * TRANCHE);

  const rows = m.rebalance(strategy);
  const candidates = m.buyCandidates(strategy);
  const tranches = Math.max(1, Math.floor(budget / TRANCHE));
  const buy = candidates.slice(0, tranches);
  const under = rows.filter((r) => r.deltaPct > 0.1);
  const over = rows.filter((r) => r.deltaPct < -0.5).sort((a, b) => a.deltaPct - b.deltaPct);
  const avgDev = rows.reduce((s, r) => s + Math.abs(r.deltaPct), 0) / (rows.length || 1);

  return (
    <>
      <KPIGrid>
        <KPICard title="Budget" value={fmt(budget)} sub={`${tranches} × ${fmt(TRANCHE)} Tranchen`} />
        <KPICard title="Untergewichtet" value={under.length} sub="unter Zielgewicht" />
        <KPICard title="Übergewichtet" value={over.length} sub="über Zielgewicht" tone={over.length ? 'warning' : undefined} />
        <KPICard title="Ø Abweichung" value={`${fmtNum(avgDev, 1)} %-Pkt.`} sub="vom Zielgewicht" />
      </KPIGrid>

      <Card title="Strategie & Budget">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-medium text-zinc-400">Zielgewicht</p>
            <Segmented label="Zielgewicht-Strategie" value={strategy} onChange={setStrategy} options={STRATEGIES} />
            <p className="mt-2 text-xs text-zinc-500">
              {strategy === 'prio' ? 'Prio A = 4×, B = 3×, C = 2×, D = 1×, E = 0,5×, ohne Prio = 1,5× Gewicht.' : 'Alle aktiven Positionen erhalten dasselbe Zielgewicht.'}
            </p>
          </div>
          <SliderField label="Budget pro Monat" value={budget} onChange={setBudget} min={TRANCHE} max={10 * TRANCHE} step={TRANCHE} unit="€" />
        </div>
      </Card>

      <Card id="kaufen" title={`Kaufempfehlung: ${buy.length} × ${fmt(TRANCHE)}`} sub="Aufbau-Positionen mit dem größten Abstand zum Zielgewicht · Balken = Ist / Ziel">
        <BarList
          ranked
          max={100}
          items={buy.map((r) => ({
            key: r.symbol, label: r.symbol, sub: r.name, symbol: r.symbol,
            value: (r.portfolioWeight / r.targetPct) * 100,
            display: `${fmtPct(r.portfolioWeight, 1)} → ${fmtPct(r.targetPct, 1)}`,
            tone: 'success',
          }))}
        />
        {candidates.length > buy.length && (
          <p className="mt-3 text-xs text-zinc-500">Weitere {candidates.length - buy.length} Kandidaten bei höherem Budget.</p>
        )}
      </Card>

      {over.length > 0 && (
        <Callout tone="warning" title={`${over.length} Positionen über Zielgewicht – Sparplan pausieren oder reduzieren`}>
          <ChipList items={over.map((r) => ({ symbol: r.symbol, meta: `+${fmtNum(-r.deltaPct, 1)}` }))} max={12} />
        </Callout>
      )}

      <PositionTable
        title="Ist vs. Ziel"
        data={rows}
        searchKeys={['prio', 'status']}
        columns={[
          { key: 'deltaPct', label: 'Delta', align: 'right', render: (r) => <span className={deltaClass(r.deltaPct)}>{r.deltaPct > 0 ? '+' : ''}{fmtNum(r.deltaPct, 2)}</span> },
          { key: 'portfolioWeight', label: 'Ist', align: 'right', render: (r) => fmtPct(r.portfolioWeight, 1) },
          { key: 'targetPct', label: 'Ziel', align: 'right', hide: 'sm', render: (r) => fmtPct(r.targetPct, 1) },
          { key: 'deltaEur', label: 'Delta €', align: 'right', hide: 'md', render: (r) => <span className={deltaClass(r.deltaPct)}>{fmtSigned(r.deltaEur)}</span> },
          { key: 'prio', label: 'Prio', align: 'center', hide: 'sm', render: (r) => <PrioBadge prio={r.prio} /> },
          { key: 'wert', label: 'Wert', align: 'right', hide: 'lg', render: (r) => fmt(r.wert) },
        ]}
      />

      <Note>Delta in Prozentpunkten: positiv = unter Ziel (aufstocken), negativ = über Ziel.</Note>
    </>
  );
}
