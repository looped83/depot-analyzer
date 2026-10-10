import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { useDepot } from '../../lib/depotContext';
import { fmt, fmtNum, fmtK } from '../../lib/format';
import { TONE, cashflowLabel, cashflowTone, type Tone } from '../../lib/score';
import { AXIS, GRID, BAR_CURSOR, MUTED } from '../../lib/chartTheme';
import { KPICard, KPIGrid } from '../ui/KPICard';
import { Card } from '../ui/Card';
import { Callout } from '../ui/Callout';
import { ChipList } from '../ui/Chip';
import { TooltipBox } from '../ui/ChartTooltip';

const FULL_MONTH: Record<string, string> = {
  Jan: 'Januar', Feb: 'Februar', Mär: 'März', Apr: 'April', Mai: 'Mai', Jun: 'Juni',
  Jul: 'Juli', Aug: 'August', Sep: 'September', Okt: 'Oktober', Nov: 'November', Dez: 'Dezember',
};

const FREQUENCIES = [['monatlich', 'Monatlich'], ['quartalsweise', 'Quartalsweise'], ['jährlich', 'Jährlich']] as const;

export function CalendarTab() {
  const { m } = useDepot();
  const { calendar, cashflow: cf } = m;

  // Month level relative to the average: one rule for bars, tiles and the legend.
  const monthTone = (v: number): Tone =>
    v === 0 ? 'neutral' : v < cf.avg * 0.5 ? 'danger' : v < cf.avg * 0.8 ? 'warning' : v > cf.avg * 1.3 ? 'success' : 'info';

  return (
    <>
      <KPIGrid>
        <KPICard title="Ø pro Monat" value={fmt(cf.avg)} sub={`${fmt(cf.avg * 12)} im Jahr`} />
        <KPICard title="Stärkster Monat" value={FULL_MONTH[cf.best.label]} sub={fmt(cf.best.expectedIncome)} />
        <KPICard title="Schwächster Monat" value={cf.worst ? FULL_MONTH[cf.worst.label] : '—'} sub={cf.worst ? fmt(cf.worst.expectedIncome) : undefined} />
        <KPICard
          title="Gleichmäßigkeit" value={cashflowLabel(cf.cv)} tone={cashflowTone(cf.cv)}
          sub={`Variationskoeffizient ${fmtNum(cf.cv)} %`}
          info="Streuung der Monatseinnahmen relativ zum Durchschnitt. Unter 30 % gleichmäßig, über 60 % unregelmäßig."
        />
      </KPIGrid>

      <Card title="Erwarteter Cashflow je Monat" sub={`Linie = Ø ${fmt(cf.avg)} · Rot < 50 % · Gelb < 80 % · Grün > 130 % des Ø`}>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={calendar} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid {...GRID} vertical={false} />
            <XAxis dataKey="label" {...AXIS} interval={0} tick={{ ...AXIS.tick, fontSize: 10 }} />
            <YAxis {...AXIS} tickFormatter={fmtK} width={44} />
            <Tooltip
              cursor={BAR_CURSOR}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as (typeof calendar)[number];
                return (
                  <TooltipBox title={FULL_MONTH[d.label]}>
                    <p className="font-medium text-zinc-100">{fmt(d.expectedIncome)}</p>
                    <p className="text-zinc-400">{d.positions.length} Zahler</p>
                  </TooltipBox>
                );
              }}
            />
            <ReferenceLine y={cf.avg} stroke={MUTED} strokeDasharray="4 4" />
            <Bar dataKey="expectedIncome" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false}>
              {calendar.map((d) => <Cell key={d.month} fill={TONE[monthTone(d.expectedIncome)].hex} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Zahler je Monat" sub="Antippen für Positionsdetails">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          {calendar.map((d) => {
            const t = TONE[monthTone(d.expectedIncome)];
            return (
              <div key={d.month} className={`rounded-xl border p-3 ${d.expectedIncome === 0 ? 'border-zinc-800 opacity-50' : t.soft}`}>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="text-xs font-semibold text-zinc-300">{FULL_MONTH[d.label]}</span>
                  <span className={`text-sm font-semibold tabular-nums ${d.expectedIncome === 0 ? 'text-zinc-500' : t.text}`}>
                    {fmt(d.expectedIncome)}
                  </span>
                </div>
                <ChipList items={d.positions.map((s) => ({ symbol: s }))} max={4} />
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Zahler nach Frequenz">
        <div className="divide-y divide-zinc-800">
          {FREQUENCIES.map(([key, label]) => {
            const list = m.active.filter((p) => p.ausschuettungsfrequenz === key);
            return (
              <div key={key} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-4">
                <div className="w-32 shrink-0 text-xs">
                  <span className="font-medium text-zinc-200">{label}</span>
                  <span className="ml-1.5 text-zinc-500">{list.length}</span>
                </div>
                <ChipList items={list.map((p) => ({ symbol: p.symbol }))} max={10} />
              </div>
            );
          })}
        </div>
      </Card>

      {(cf.weak.length > 0 || cf.empty.length > 0) && (
        <Callout tone="info" title="Cashflow-Lücken schließen">
          {cf.empty.length > 0 && <>Keine Dividende in {cf.empty.map((d) => d.label).join(', ')}. </>}
          {cf.weak.length > 0 && <>{cf.weak.map((d) => d.label).join(', ')} {cf.weak.length === 1 ? 'liegt' : 'liegen'} unter 50 % des Durchschnitts. </>}
          Monatliche Zahler (REITs, BDCs, ausgewählte ETFs) oder Quartalszahler mit passenden Monaten glätten den Verlauf.
        </Callout>
      )}
    </>
  );
}
