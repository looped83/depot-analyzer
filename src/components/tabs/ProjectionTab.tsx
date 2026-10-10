import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDepot } from '../../lib/depotContext';
import { computeProjection } from '../../lib/calculations';
import { fmt, fmtK, fmtNum, fmtPct } from '../../lib/format';
import { AXIS, GRID } from '../../lib/chartTheme';
import { TONE } from '../../lib/score';
import { KPICard, KPIGrid } from '../ui/KPICard';
import { Card, Note } from '../ui/Card';
import { AssumptionFields } from '../AssumptionFields';
import { MiniStat, TileGrid } from '../ui/MiniStat';
import { ChartTooltip } from '../ui/ChartTooltip';
import { SortableTable } from '../tables/SortableTable';

const INFLATION = 2.5;
const SCENARIOS = [
  { label: 'Konservativ', dividendGrowthRate: 3, capitalGrowthRate: 3 },
  { label: 'Realistisch', dividendGrowthRate: 5, capitalGrowthRate: 6 },
  { label: 'Optimistisch', dividendGrowthRate: 8, capitalGrowthRate: 10 },
];

export function ProjectionTab() {
  const { m, assumptions } = useDepot();
  const { positions, totals } = m;

  const proj = useMemo(() => computeProjection(positions, assumptions, 10), [positions, assumptions]);
  const scenarios = useMemo(
    () => SCENARIOS.map((s) => ({ ...s, r: computeProjection(positions, { ...assumptions, ...s }, 5)[5] })),
    [positions, assumptions],
  );
  const whatIf = useMemo(() => [
    { label: '+100 € pro Monat', p: { ...assumptions, monthlySavings: assumptions.monthlySavings + 100 } },
    { label: '+500 € pro Monat', p: { ...assumptions, monthlySavings: assumptions.monthlySavings + 500 } },
    { label: '+2 % Dividendenwachstum', p: { ...assumptions, dividendGrowthRate: assumptions.dividendGrowthRate + 2 } },
  ].map((w) => ({ label: w.label, r: computeProjection(positions, w.p, 5)[5] })), [positions, assumptions]);

  const y5 = proj[5];
  const rows = [1, 3, 5, 10].map((y) => {
    const d = proj[y];
    const real = Math.pow(1 + INFLATION / 100, y);
    return { key: String(y), year: d.year, after: y, value: d.portfolioValue, div: d.annualDividend, monthly: d.annualDividend / 12, realMonthly: d.annualDividend / 12 / real };
  });
  const chartData = proj.map((d) => ({ year: d.year, value: d.portfolioValue, monthly: Math.round(d.annualDividend / 12) }));

  return (
    <>
      <KPIGrid>
        <KPICard title="Depotwert heute" value={fmt(totals.totalWert)} />
        <KPICard title="Dividende heute" value={fmt(totals.totalMonthlyDiv)} sub="pro Monat" />
        <KPICard title="Depotwert in 5 J." value={fmt(y5.portfolioValue)} sub={`${y5.year}`} tone="info" />
        <KPICard title="Dividende in 5 J." value={fmt(y5.annualDividend / 12)} sub="pro Monat" tone="success" />
      </KPIGrid>

      <Card title="Annahmen" sub="Gelten für alle Projektionen der App">
        <AssumptionFields />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Depotwert" sub="10 Jahre">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid {...GRID} vertical={false} />
              <XAxis dataKey="year" {...AXIS} minTickGap={16} />
              <YAxis {...AXIS} tickFormatter={fmtK} width={52} />
              <Tooltip content={(p) => <ChartTooltip {...p} formatValue={(v) => fmt(v)} />} />
              <Area type="monotone" dataKey="value" stroke={TONE.info.hex} fill={TONE.info.hex} fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Dividende pro Monat" sub="10 Jahre">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid {...GRID} vertical={false} />
              <XAxis dataKey="year" {...AXIS} minTickGap={16} />
              <YAxis {...AXIS} tickFormatter={fmtK} width={52} />
              <Tooltip content={(p) => <ChartTooltip {...p} formatValue={(v) => fmt(v)} />} />
              <Area type="monotone" dataKey="monthly" stroke={TONE.success.hex} fill={TONE.success.hex} fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Verlauf" sub={`Real = kaufkraftbereinigt bei ${fmtNum(INFLATION, 1)} % Inflation`} flush>
        <SortableTable
          sortable={false}
          data={rows}
          rowKey={(r) => r.key}
          columns={[
            { key: 'after', label: 'Nach', render: (r) => <span className="font-medium text-zinc-100">{r.after} {r.after === 1 ? 'Jahr' : 'Jahren'}</span> },
            { key: 'value', label: 'Depotwert', align: 'right', render: (r) => fmt(r.value) },
            { key: 'monthly', label: 'Div. / Monat', align: 'right', render: (r) => <span className={TONE.success.text}>{fmt(r.monthly)}</span> },
            { key: 'realMonthly', label: 'Real / Monat', align: 'right', hide: 'sm', render: (r) => fmt(r.realMonthly) },
            { key: 'div', label: 'Div. / Jahr', align: 'right', hide: 'md', render: (r) => fmt(r.div) },
          ]}
        />
      </Card>

      <Card id="szenarien" title="Szenarien in 5 Jahren" sub="Dividendenwachstum / Kurszuwachs, übrige Annahmen wie oben">
        <TileGrid cols={3}>
          {scenarios.map((s) => (
            <MiniStat
              key={s.label}
              label={`${s.label} (${s.dividendGrowthRate} / ${s.capitalGrowthRate} %)`}
              value={`${fmt(s.r.annualDividend / 12)} / Mon.`}
              sub={`Depot ${fmt(s.r.portfolioValue)}`}
              tone={s.label === 'Realistisch' ? 'info' : undefined}
            />
          ))}
        </TileGrid>
      </Card>

      <Card title="Was wäre wenn?" sub="Mehrwert nach 5 Jahren gegenüber deinen Annahmen">
        <TileGrid cols={3}>
          {whatIf.map((w) => (
            <MiniStat
              key={w.label}
              label={w.label}
              value={`+${fmt((w.r.annualDividend - y5.annualDividend) / 12)} / Mon.`}
              sub={`Depot +${fmt(w.r.portfolioValue - y5.portfolioValue)}`}
              tone="success"
            />
          ))}
        </TileGrid>
      </Card>

      <Note>
        Modellrechnung auf Basis der aktuellen Depotzusammensetzung ({fmtPct(totals.weightedYield)} Yield auf neues Kapital), ohne Steuern und Kosten. Keine Garantie für zukünftige Erträge.
      </Note>
    </>
  );
}
