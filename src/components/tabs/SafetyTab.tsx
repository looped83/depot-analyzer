import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { useDepot } from '../../lib/depotContext';
import { fmt, fmtNum, fmtPct } from '../../lib/format';
import { AXIS, GRID, SURFACE } from '../../lib/chartTheme';
import { TONE, scoreTone } from '../../lib/score';
import { CAGR_LOW, YIELD_HIGH, YIELD_RISK, RISK_LABEL, cagrTone, isDividendTrap, yieldTone } from '../../lib/risk';
import type { RiskRow } from '../../lib/metrics';
import { KPICard, KPIGrid } from '../ui/KPICard';
import { Card } from '../ui/Card';
import { Callout } from '../ui/Callout';
import { CellBar } from '../ui/Bars';
import { ChipList } from '../ui/Chip';
import { MiniStat, TileGrid } from '../ui/MiniStat';
import { StatusBadge } from '../ui/Badges';
import { TooltipBox } from '../ui/ChartTooltip';
import { PositionTable } from '../tables/PositionTable';

const LEVELS = ['danger', 'warning', 'success'] as const;
const toneText = (t: ReturnType<typeof yieldTone>) => (t === 'neutral' ? '' : TONE[t].text);

export function SafetyTab() {
  const { m, openPosition } = useDepot();
  const rows = m.riskRows;
  const count = (l: RiskRow['risk']) => rows.filter((r) => r.risk === l).length;
  const avgSafety = rows.reduce((s, r) => s + r.safety, 0) / (rows.length || 1);
  const traps = m.active.filter(isDividendTrap);
  const stress = [0, 20, 50].map((pct) => ({ pct, ...m.stress(pct) }));

  return (
    <>
      <KPIGrid>
        <KPICard title="Sicher" value={count('success')} sub={`von ${rows.length} aktiven`} tone="success" info={`Yield ≤ ${fmtNum(YIELD_HIGH, 1)} % und CAGR ≥ ${CAGR_LOW} %, kein Beobachten/Verkauf.`} />
        <KPICard title="Beobachten" value={count('warning')} sub="Yield hoch oder Wachstum schwach" tone="warning" info={`Yield über ${fmtNum(YIELD_HIGH, 1)} %, CAGR unter ${CAGR_LOW} % oder Status „Beobachten“.`} />
        <KPICard title="Risiko" value={count('danger')} sub="Handlungsbedarf" tone="danger" info={`Yield über ${YIELD_RISK} %, negativer CAGR oder Status „Verkauf“.`} />
        <KPICard title="Ø Safety Score" value={fmtNum(avgSafety)} sub="0 kritisch · 100 sicher" tone={scoreTone(avgSafety)} info="Aus CAGR, Yield-Niveau, Priorität und Status." />
      </KPIGrid>

      <Card title="Sicherheitsmatrix" sub={`Linien: Yield ${fmtNum(YIELD_HIGH, 1)} % / ${YIELD_RISK} % und CAGR ${CAGR_LOW} % · rechts unten = Dividendenfallen-Zone`}>
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: -12 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="yield" type="number" name="Yield" {...AXIS} tickFormatter={(v) => `${v} %`} />
            <YAxis dataKey="cagr5j" type="number" name="CAGR" {...AXIS} tickFormatter={(v) => `${v} %`} width={48} />
            <ReferenceLine x={YIELD_HIGH} stroke={TONE.warning.hex} strokeDasharray="4 4" />
            <ReferenceLine x={YIELD_RISK} stroke={TONE.danger.hex} strokeDasharray="4 4" />
            <ReferenceLine y={CAGR_LOW} stroke={TONE.warning.hex} strokeDasharray="4 4" />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                const d = active && (payload?.[0]?.payload as RiskRow | undefined);
                return d ? (
                  <TooltipBox title={d.symbol}>
                    <p>Yield {fmtPct(d.yield)} · CAGR {fmtPct(d.cagr5j)}</p>
                    <p className={TONE[d.risk].text}>{RISK_LABEL[d.risk]} · Safety {d.safety}</p>
                  </TooltipBox>
                ) : null;
              }}
            />
            <Scatter data={rows} isAnimationActive={false} onClick={(d) => openPosition((d as unknown as { symbol: string }).symbol)} className="cursor-pointer">
              {rows.map((r) => <Cell key={r.symbol} fill={TONE[r.risk].hex} fillOpacity={0.85} stroke={SURFACE} strokeWidth={1.5} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="mt-3 divide-y divide-zinc-800">
          {LEVELS.map((l) => {
            const list = rows.filter((r) => r.risk === l);
            return (
              <div key={l} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-start sm:gap-4">
                <span className={`w-28 shrink-0 text-xs font-semibold ${TONE[l].text}`}>{RISK_LABEL[l]} ({list.length})</span>
                <ChipList items={list.map((r) => ({ symbol: r.symbol }))} max={10} />
              </div>
            );
          })}
        </div>
      </Card>

      {traps.length > 0 && (
        <Callout tone="danger" title={`${traps.length} mögliche Dividendenfallen`}>
          <p>Yield über {fmtNum(YIELD_HIGH, 1)} % bei weniger als {CAGR_LOW} % Dividendenwachstum – oft ein Vorbote einer Kürzung.</p>
          <ChipList items={traps.map((p) => ({ symbol: p.symbol, meta: `${fmtPct(p.yield, 1)} / ${fmtPct(p.cagr5j, 1)}` }))} />
        </Callout>
      )}

      <Card id="stresstest" title="Stresstest" sub="Die 5 größten Dividendenzahler kürzen ihre Dividende">
        <TileGrid cols={3}>
          {stress.map((s) => (
            <MiniStat
              key={s.pct}
              label={s.pct === 0 ? 'Aktuell' : `−${s.pct} % Kürzung`}
              value={`${fmt(s.stressedAnnualDiv)} / J.`}
              sub={s.pct === 0 ? `${fmt(s.stressedAnnualDiv / 12)} / Monat` : `−${fmt(s.lostIncome)} Einkommen`}
              tone={s.pct === 0 ? 'success' : s.pct <= 20 ? 'warning' : 'danger'}
            />
          ))}
        </TileGrid>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          Betroffen: <ChipList items={stress[0].affectedSymbols.map((s) => ({ symbol: s }))} />
        </div>
      </Card>

      <PositionTable
        title="Safety-Ranking"
        sub="Unsicherste zuerst"
        data={[...rows].sort((a, b) => a.safety - b.safety)}
        searchKeys={['status']}
        columns={[
          { key: 'safety', label: 'Safety', align: 'right', render: (r) => <CellBar pct={r.safety} label={r.safety} tone={scoreTone(r.safety)} /> },
          { key: 'yield', label: 'Yield', align: 'right', render: (r) => <span className={toneText(yieldTone(r.yield))}>{fmtPct(r.yield)}</span> },
          { key: 'cagr5j', label: 'CAGR', align: 'right', hide: 'sm', render: (r) => <span className={toneText(cagrTone(r.cagr5j))}>{fmtPct(r.cagr5j)}</span> },
          { key: 'status', label: 'Status', align: 'center', hide: 'md', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'wert', label: 'Wert', align: 'right', hide: 'lg', render: (r) => fmt(r.wert) },
        ]}
      />
    </>
  );
}
