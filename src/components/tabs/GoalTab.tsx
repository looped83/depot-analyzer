import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Check } from 'lucide-react';
import { useDepot } from '../../lib/depotContext';
import { computeProjection } from '../../lib/calculations';
import { fmt, fmtK, fmtPct } from '../../lib/format';
import { AXIS, GRID } from '../../lib/chartTheme';
import { TONE } from '../../lib/score';
import { KPICard, KPIGrid } from '../ui/KPICard';
import { Card } from '../ui/Card';
import { SliderField } from '../ui/Controls';
import { ProgressBar } from '../ui/Bars';
import { Callout } from '../ui/Callout';
import { ChartTooltip } from '../ui/ChartTooltip';
import { AssumptionFields } from '../AssumptionFields';
import { SortableTable } from '../tables/SortableTable';

const HORIZON = 30;
const MILESTONES = [
  { label: 'Streaming-Abo', monthly: 15 },
  { label: 'Handy-Rechnung', monthly: 50 },
  { label: 'Strom & Internet', monthly: 120 },
  { label: 'Urlaub (Ø / Monat)', monthly: 250 },
  { label: 'Lebensmittel', monthly: 300 },
  { label: 'Auto (Rate / Vers.)', monthly: 500 },
  { label: 'Miete (anteilig)', monthly: 800 },
  { label: 'Teilzeit möglich', monthly: 1200 },
  { label: 'Halb finanzfrei', monthly: 1500 },
  { label: 'Voll finanzfrei', monthly: 3000 },
];
const SERIES = [
  { key: 'optimistisch', label: 'Optimistisch (8 / 10 %)', color: TONE.success.hex },
  { key: 'realistisch', label: 'Deine Annahmen', color: TONE.info.hex },
  { key: 'konservativ', label: 'Konservativ (3 / 3 %)', color: TONE.warning.hex },
] as const;

export function GoalTab() {
  const { m, assumptions } = useDepot();
  const { positions, totals } = m;
  const current = totals.totalMonthlyDiv;
  const [goal, setGoal] = useState(2000);

  const proj = useMemo(() => computeProjection(positions, assumptions, HORIZON), [positions, assumptions]);
  const chart = useMemo(() => {
    const cons = computeProjection(positions, { ...assumptions, dividendGrowthRate: 3, capitalGrowthRate: 3 }, 20);
    const opt = computeProjection(positions, { ...assumptions, dividendGrowthRate: 8, capitalGrowthRate: 10 }, 20);
    return proj.slice(0, 21).map((d, i) => ({
      year: d.year,
      realistisch: Math.round(d.annualDividend / 12),
      konservativ: Math.round(cons[i].annualDividend / 12),
      optimistisch: Math.round(opt[i].annualDividend / 12),
    }));
  }, [positions, assumptions, proj]);

  const yearOf = (monthly: number, list = proj) => list.find((d) => d.annualDividend / 12 >= monthly)?.year ?? null;
  const hitYear = yearOf(goal);
  const startYear = proj[0].year;
  const yearsToGoal = hitYear !== null ? hitYear - startYear : null;
  const progress = Math.min(100, (current / goal) * 100);

  const faster = useMemo(() => {
    if (yearsToGoal === null || yearsToGoal <= 3) return null;
    const alt = computeProjection(positions, { ...assumptions, monthlySavings: assumptions.monthlySavings + 100 }, HORIZON);
    const y = alt.find((d) => d.annualDividend / 12 >= goal)?.year;
    return y ? hitYear! - y : 0;
  }, [positions, assumptions, goal, yearsToGoal, hitYear]);

  return (
    <>
      <KPIGrid>
        <KPICard title="Aktuell" value={fmt(current)} sub="Dividende pro Monat" />
        <KPICard title="Ziel" value={fmt(goal)} sub="pro Monat" />
        <KPICard title="Fortschritt" value={fmtPct(progress, 1)} sub={`noch ${fmt(Math.max(0, goal - current))} / Monat`}>
          <ProgressBar value={progress} gradient />
        </KPICard>
        <KPICard title="Erreicht ca." value={hitYear ?? `> ${HORIZON} J.`} sub={yearsToGoal !== null ? `in ${yearsToGoal} Jahren` : 'Sparrate oder Wachstum erhöhen'} tone={hitYear ? 'success' : 'warning'} />
      </KPIGrid>

      <Card title="Ziel & Annahmen" sub="Annahmen gelten auch im Ausblick">
        <div className="space-y-4">
          <SliderField label="Monatsziel (Dividende)" value={goal} onChange={setGoal} min={100} max={10000} step={100} unit="€" />
          <div className="border-t border-zinc-800 pt-4"><AssumptionFields /></div>
        </div>
      </Card>

      {faster !== null && faster > 0 && (
        <Callout tone="info" title="Schneller zum Ziel">
          Mit 100 € mehr pro Monat ({fmt(assumptions.monthlySavings + 100)} statt {fmt(assumptions.monthlySavings)}) erreichst du dein Ziel {faster} {faster === 1 ? 'Jahr' : 'Jahre'} früher.
        </Callout>
      )}

      <Card title="Weg zum Ziel" sub="Monatliche Dividende in drei Szenarien · Linie = dein Ziel">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid {...GRID} vertical={false} />
            <XAxis dataKey="year" {...AXIS} minTickGap={20} />
            <YAxis {...AXIS} tickFormatter={fmtK} width={48} />
            <ReferenceLine y={goal} stroke={TONE.success.hex} strokeDasharray="5 4" />
            <Tooltip content={(p) => <ChartTooltip {...p} formatValue={(v) => fmt(v)} names={Object.fromEntries(SERIES.map((s) => [s.key, s.label]))} />} />
            {SERIES.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={s.key === 'realistisch' ? 2.5 : 1.5}
                strokeDasharray={s.key === 'realistisch' ? undefined : '4 3'} dot={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-zinc-400">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5"><span className="h-0.5 w-3" style={{ background: s.color }} />{s.label}</span>
          ))}
        </div>
      </Card>

      <Card title="Meilensteine" sub="Was deine Dividende wann deckt (deine Annahmen)">
        <ul className="grid gap-x-6 gap-y-3 md:grid-cols-2">
          {MILESTONES.map((ms) => {
            const reached = current >= ms.monthly;
            const year = yearOf(ms.monthly);
            return (
              <li key={ms.label}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-medium text-zinc-200">{ms.label} <span className="font-normal text-zinc-500">{fmt(ms.monthly)}</span></span>
                  <span className={`shrink-0 ${reached ? TONE.success.text : 'text-zinc-400'}`}>
                    {reached ? <span className="flex items-center gap-1"><Check size={12} />Erreicht</span> : year ? `ca. ${year}` : `> ${HORIZON} J.`}
                  </span>
                </div>
                <ProgressBar value={(current / ms.monthly) * 100} tone={reached ? 'success' : 'info'} />
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Jahresübersicht" sub="Deine Annahmen, 10 Jahre" flush>
        <SortableTable
          sortable={false}
          data={proj.slice(1, 11)}
          rowKey={(d) => String(d.year)}
          columns={[
            { key: 'year', label: 'Jahr', render: (d) => <span className="font-medium text-zinc-100">{d.year}</span> },
            { key: 'monthly', label: 'Div. / Monat', align: 'right', render: (d) => <span className={d.annualDividend / 12 >= goal ? TONE.success.text : ''}>{fmt(d.annualDividend / 12)}</span> },
            { key: 'goal', label: 'Ziel', align: 'right', render: (d) => fmtPct(Math.min(100, (d.annualDividend / 12 / goal) * 100), 0) },
            { key: 'portfolioValue', label: 'Depotwert', align: 'right', hide: 'sm', render: (d) => fmt(d.portfolioValue) },
            { key: 'annualDividend', label: 'Div. / Jahr', align: 'right', hide: 'md', render: (d) => fmt(d.annualDividend) },
          ]}
        />
      </Card>

    </>
  );
}
