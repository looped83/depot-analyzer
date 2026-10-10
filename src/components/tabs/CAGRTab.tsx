import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { useDepot } from '../../lib/depotContext';
import { fmt, fmtNum, fmtPct } from '../../lib/format';
import { AXIS, GRID, MUTED, SURFACE } from '../../lib/chartTheme';
import { TONE, type Tone } from '../../lib/score';
import { cagrTone } from '../../lib/risk';
import { KPICard, KPIGrid } from '../ui/KPICard';
import { Card } from '../ui/Card';
import { CellBar } from '../ui/Bars';
import { ChipList } from '../ui/Chip';
import { TooltipBox } from '../ui/ChartTooltip';
import { PositionTable } from '../tables/PositionTable';

export function CAGRTab() {
  const { m, openPosition } = useDepot();
  const active = m.active.filter((p) => p.cagr5j !== 0 || p.yield > 0);
  const avgCagr = m.weighted('cagr5j');
  const avgYield = m.totals.weightedYield;
  const avgChowder = m.weighted('chowderScore');

  // Quadrants around the depot averages (the dashed lines in the matrix).
  const quadrant = (p: (typeof active)[number]): Tone =>
    p.cagr5j >= avgCagr ? (p.yield >= avgYield ? 'success' : 'info') : p.yield >= avgYield ? 'warning' : 'neutral';
  const groups: { tone: Tone; label: string; hint: string }[] = [
    { tone: 'success', label: 'Stars', hint: 'Yield und Wachstum über Ø' },
    { tone: 'info', label: 'Wachstum', hint: 'Wachstum über Ø, Yield darunter' },
    { tone: 'warning', label: 'Einkommensfalle?', hint: 'Yield über Ø, Wachstum darunter' },
  ];
  const byCagr = [...active].sort((a, b) => b.cagr5j - a.cagr5j);
  const stars = active.filter((p) => quadrant(p) === 'success');

  return (
    <>
      <KPIGrid>
        <KPICard title="Ø CAGR 5J" value={fmtPct(avgCagr)} sub="Dividendenwachstum, gewichtet" />
        <KPICard title="Depot-Yield" value={fmtPct(avgYield)} sub="Nach Wert gewichtet" />
        <KPICard title="Ø Chowder" value={fmtNum(avgChowder, 1)} sub="Yield + CAGR, gewichtet" tone={avgChowder >= 12 ? 'success' : undefined} info="Chowder Score = Yield + CAGR 5J. Ab 12 gilt eine Position als attraktiv." />
        <KPICard title="Stars" value={fmtNum(stars.length)} sub="Yield & Wachstum über Ø" tone="success" />
      </KPIGrid>

      <Card title="Yield vs. Wachstum" sub="Gestrichelt = Depot-Durchschnitt · Punkt antippen für Details">
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: -12 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="yield" type="number" name="Yield" {...AXIS} tickFormatter={(v) => `${v} %`} />
            <YAxis dataKey="cagr5j" type="number" name="CAGR" {...AXIS} tickFormatter={(v) => `${v} %`} width={48} />
            <ReferenceLine x={avgYield} stroke={MUTED} strokeDasharray="4 4" />
            <ReferenceLine y={avgCagr} stroke={MUTED} strokeDasharray="4 4" />
            <Tooltip
              cursor={false}
              content={({ active: on, payload }) => {
                const d = on && payload?.[0]?.payload as (typeof active)[number] | undefined;
                return d ? (
                  <TooltipBox title={`${d.symbol} · ${d.name}`}>
                    <p>Yield {fmtPct(d.yield)} · CAGR {fmtPct(d.cagr5j)}</p>
                    <p className="text-zinc-400">Chowder {fmtNum(d.chowderScore, 1)}</p>
                  </TooltipBox>
                ) : null;
              }}
            />
            <Scatter data={active} isAnimationActive={false} onClick={(d) => openPosition((d as unknown as { symbol: string }).symbol)} className="cursor-pointer">
              {active.map((p) => <Cell key={p.symbol} fill={TONE[quadrant(p)].hex} fillOpacity={0.8} stroke={SURFACE} strokeWidth={1.5} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="mt-3 divide-y divide-zinc-800">
          {groups.map((g) => {
            const list = active.filter((p) => quadrant(p) === g.tone);
            return (
              <div key={g.tone} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-start sm:gap-4">
                <div className="w-44 shrink-0 text-xs">
                  <span className={`font-semibold ${TONE[g.tone].text}`}>{g.label} ({list.length})</span>
                  <div className="text-zinc-500">{g.hint}</div>
                </div>
                <ChipList items={list.map((p) => ({ symbol: p.symbol }))} max={10} />
              </div>
            );
          })}
        </div>
      </Card>

      <PositionTable
        title="Wachstum je Position"
        data={byCagr}
        searchKeys={['typ', 'kategorie']}
        columns={[
          { key: 'cagr5j', label: 'CAGR 5J', align: 'right', render: (p) => <CellBar pct={(p.cagr5j / (byCagr[0]?.cagr5j || 1)) * 100} label={fmtPct(p.cagr5j)} tone={cagrTone(p.cagr5j) === 'neutral' ? 'info' : cagrTone(p.cagr5j)} /> },
          { key: 'yield', label: 'Yield', align: 'right', render: (p) => fmtPct(p.yield) },
          { key: 'chowderScore', label: 'Chowder', align: 'right', hide: 'sm', render: (p) => <span className={p.chowderScore >= 12 ? TONE.success.text : ''}>{fmtNum(p.chowderScore, 1)}</span> },
          { key: 'wert', label: 'Wert', align: 'right', hide: 'md', render: (p) => fmt(p.wert) },
          { key: 'kategorie', label: 'Kategorie', hide: 'lg' },
        ]}
      />
    </>
  );
}
