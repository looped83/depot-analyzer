import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDepot } from '../../lib/depotContext';
import { fmt, fmtK, fmtNum, fmtPct } from '../../lib/format';
import { AXIS, GRID } from '../../lib/chartTheme';
import { TONE, scoreLabel, scoreTone } from '../../lib/score';
import { MAX_WEIGHT } from '../../lib/risk';
import { KPICard, KPIGrid } from '../ui/KPICard';
import { Card, Note } from '../ui/Card';
import { ScoreRow, BarList, CellBar } from '../ui/Bars';
import { MiniStat, TileGrid } from '../ui/MiniStat';
import { Callout } from '../ui/Callout';
import { ChipList } from '../ui/Chip';
import { Donut } from '../ui/Donut';
import { PrioBadge } from '../ui/Badges';
import { ChartTooltip } from '../ui/ChartTooltip';
import { PositionTable } from '../tables/PositionTable';

const CURRENT_YEAR = new Date().getFullYear();

const sumBy = <T,>(items: T[], key: (i: T) => string, val: (i: T) => number) => {
  const map = new Map<string, number>();
  for (const i of items) map.set(key(i), (map.get(key(i)) ?? 0) + val(i));
  return [...map].map(([name, value]) => ({ name, value }));
};

export function SavingsTab() {
  const { m, assumptions } = useDepot();
  const { positions, totals, health } = m;
  const saved = positions.filter((p) => p.sparbetrag > 0).sort((a, b) => b.sparbetrag - a.sparbetrag);
  const total = totals.totalSparbetrag;

  const aufbau = positions.filter((p) => p.status === 'Aufbau');
  const prioA = positions.filter((p) => p.prio === 'A');
  const highPrioShare = total > 0 ? (saved.filter((p) => p.prio === 'A' || p.prio === 'B').reduce((s, p) => s + p.sparbetrag, 0) / total) * 100 : 0;
  // Same score as the "Sparplan-Effizienz" dimension of the health score.
  const efficiency = health.dimensions.find((d) => d.key === 'savingsEfficiency')?.score ?? 0;

  const missingPlan = positions.filter((p) => (p.prio === 'A' || p.prio === 'B') && p.status === 'Aufbau' && p.sparbetrag === 0);
  const overweight = saved.filter((p) => p.portfolioWeight > MAX_WEIGHT);

  // Future value of the assumed monthly investment (shared assumptions from "Ausblick").
  const growth = useMemo(() => {
    const r = assumptions.capitalGrowthRate / 100 / 12;
    // Future value of a monthly annuity after n months (closed form instead of a running sum).
    const fv = (n: number) => (r === 0 ? assumptions.monthlySavings * n : assumptions.monthlySavings * (1 + r) * ((1 + r) ** n - 1) / r);
    return Array.from({ length: 41 }, (_, i) => ({ month: i * 3, value: fv(i * 3) }));
  }, [assumptions]);
  const avgYieldSaved = saved.length ? saved.reduce((s, p) => s + p.yield, 0) / saved.length : totals.weightedYield;

  return (
    <>
      <KPIGrid>
        <KPICard title="Sparrate" value={fmt(total)} sub="Pro Ausführungszyklus" />
        <KPICard title="Sparpläne" value={`${saved.length} / ${positions.length}`} sub="Positionen bespart" />
        <KPICard title="Sparquote" value={totals.totalWert > 0 ? fmtPct(((total * 12) / totals.totalWert) * 100, 1) : '—'} sub="Jährl. Sparrate / Depotwert" />
        <KPICard title="Effizienz" value={`${fmtNum(efficiency)} / 100`} sub={scoreLabel(efficiency)} tone={scoreTone(efficiency)} info="Wie gut Sparpläne auf Aufbau- und Prio-A-Positionen ausgerichtet sind – identisch mit der Dimension im Depot-Check." />
      </KPIGrid>

      <Card title="Ausrichtung der Sparpläne">
        <div className="space-y-4">
          <ScoreRow label="Aufbau-Positionen bespart" detail={`${aufbau.filter((p) => p.sparbetrag > 0).length} von ${aufbau.length}`} score={aufbau.length ? (aufbau.filter((p) => p.sparbetrag > 0).length / aufbau.length) * 100 : 0} />
          <ScoreRow label="Prio-A-Positionen bespart" detail={`${prioA.filter((p) => p.sparbetrag > 0).length} von ${prioA.length}`} score={prioA.length ? (prioA.filter((p) => p.sparbetrag > 0).length / prioA.length) * 100 : 0} />
          <ScoreRow label="Sparrate in Prio A/B" detail={`${fmtPct(highPrioShare, 0)} des Betrags`} score={highPrioShare} />
        </div>
      </Card>

      {(missingPlan.length > 0 || overweight.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {missingPlan.length > 0 && (
            <Callout tone="info" title={`${missingPlan.length} Prio-A/B-Positionen im Aufbau ohne Sparplan`}>
              <p>Ein Sparplan würde den Aufbau beschleunigen.</p>
              <ChipList items={missingPlan.map((p) => ({ symbol: p.symbol, meta: p.prio }))} />
            </Callout>
          )}
          {overweight.length > 0 && (
            <Callout tone="warning" title={`${overweight.length} Positionen über ${MAX_WEIGHT} % werden weiter bespart`}>
              <p>Sparrate ggf. in untergewichtete Positionen umlenken.</p>
              <ChipList items={overweight.map((p) => ({ symbol: p.symbol, meta: fmtPct(p.portfolioWeight, 1) }))} />
            </Callout>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Sparrate je Broker">
          <Donut data={sumBy(saved, (p) => p.broker, (p) => p.sparbetrag)} format={(v) => fmt(v)} />
        </Card>
        <Card title="Sparrate je Zyklus">
          <BarList
            items={sumBy(saved, (p) => (p.zyklus ? `Zyklus ${p.zyklus}` : 'Ohne Zyklus'), (p) => p.sparbetrag)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((z) => ({ key: z.name, label: z.name, value: z.value, display: fmt(z.value) }))}
          />
        </Card>
      </div>

      <Card title="Wohin die Sparrate führt" sub={`${fmt(assumptions.monthlySavings)} / Monat · ${fmtPct(assumptions.capitalGrowthRate, 1)} Kurszuwachs p. a. · nur Neuinvestment`}>
        <TileGrid cols={4}>
          {[1, 3, 5, 10].map((y) => {
            const v = growth.find((d) => d.month === y * 12)?.value ?? 0;
            return <MiniStat key={y} label={`In ${y} ${y === 1 ? 'Jahr' : 'Jahren'}`} value={fmt(v)} sub={`+ ${fmt(v * (avgYieldSaved / 100))} Div. / Jahr`} />;
          })}
        </TileGrid>
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={growth} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid {...GRID} vertical={false} />
              <XAxis dataKey="month" {...AXIS} ticks={[0, 24, 48, 72, 96, 120]} tickFormatter={(v) => String(CURRENT_YEAR + v / 12)} />
              <YAxis {...AXIS} tickFormatter={fmtK} width={52} />
              <Tooltip content={(p) => <ChartTooltip {...p} formatValue={(v) => fmt(v)} formatLabel={(l) => `${CURRENT_YEAR + Math.floor(Number(l) / 12)}`} />} />
              <Area type="monotone" dataKey="value" stroke={TONE.info.hex} fill={TONE.info.hex} fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <PositionTable
        title="Sparpläne je Position"
        data={saved}
        searchKeys={['broker', 'prio']}
        columns={[
          { key: 'sparbetrag', label: 'Betrag', align: 'right', render: (p) => <CellBar pct={(p.sparbetrag / (saved[0]?.sparbetrag || 1)) * 100} label={fmt(p.sparbetrag)} /> },
          { key: 'prio', label: 'Prio', align: 'center', render: (p) => <PrioBadge prio={p.prio} /> },
          { key: 'portfolioWeight', label: 'Gewicht', align: 'right', hide: 'sm', render: (p) => <span className={p.portfolioWeight > MAX_WEIGHT ? TONE.warning.text : ''}>{fmtPct(p.portfolioWeight, 1)}</span> },
          { key: 'zyklus', label: 'Zyklus', align: 'center', hide: 'md', render: (p) => p.zyklus ?? '—' },
          { key: 'dividendScore', label: 'D-Score', align: 'right', hide: 'md', render: (p) => <span className={TONE[scoreTone(p.dividendScore)].text}>{p.dividendScore}</span> },
          { key: 'broker', label: 'Broker', hide: 'lg' },
        ]}
      />

      <Note>Die Projektion nutzt die Annahmen aus „Ausblick“ ({fmtNum(assumptions.monthlySavings)} € = 3 × 1.000 € Einmalkäufe + 1.200 € Sparpläne als Standard).</Note>
    </>
  );
}
