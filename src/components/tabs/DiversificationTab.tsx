import { useState } from 'react';
import { Treemap, Tooltip, ResponsiveContainer } from 'recharts';
import { useDepot } from '../../lib/depotContext';
import type { DepotPosition } from '../../lib/types';
import { fmt, fmtNum, fmtPct } from '../../lib/format';
import { PALETTE, SURFACE } from '../../lib/chartTheme';
import { MAX_WEIGHT } from '../../lib/risk';
import { KPICard, KPIGrid } from '../ui/KPICard';
import { Card } from '../ui/Card';
import { Callout } from '../ui/Callout';
import { BarList, CellBar } from '../ui/Bars';
import { Segmented } from '../ui/Controls';
import { Donut } from '../ui/Donut';
import { PrioBadge } from '../ui/Badges';
import { TooltipBox } from '../ui/ChartTooltip';
import { PositionTable } from '../tables/PositionTable';

const EUR_PREFIXES = new Set(['DE', 'FR', 'NL', 'LU', 'IE', 'AT', 'BE', 'ES', 'IT', 'FI', 'PT', 'SK', 'SI', 'EE', 'LV', 'LT', 'MT', 'CY', 'HR', 'GR']);
const CURRENCY_BY_PREFIX: Record<string, string> = { US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', JP: 'JPY', CH: 'CHF' };

// Currency inferred from the ISIN country prefix – an approximation (ETFs domiciled in IE/LU count as EUR).
const currencyOf = (isin: string) => {
  const prefix = isin.slice(0, 2).toUpperCase();
  return EUR_PREFIXES.has(prefix) ? 'EUR' : CURRENCY_BY_PREFIX[prefix] ?? 'Sonstige';
};

const DIMENSIONS = {
  kategorie: { label: 'Kategorie', key: (p: DepotPosition) => p.kategorie || 'Sonstige' },
  typ: { label: 'Typ', key: (p: DepotPosition) => p.typ || 'Sonstige' },
  broker: { label: 'Broker', key: (p: DepotPosition) => p.broker || 'Sonstige' },
  waehrung: { label: 'Währung', key: (p: DepotPosition) => currencyOf(p.isin) },
} as const;
type Dimension = keyof typeof DIMENSIONS;

// Category colors are fixed so the treemap and donut always agree.
const CATEGORY_COLORS: Record<string, string> = { Growth: PALETTE[0], Income: PALETTE[1], 'High Yield': PALETTE[2], Accumulation: PALETTE[4] };

const hhiLabel = (hhi: number) => (hhi < 1000 ? 'Gut diversifiziert' : hhi < 2500 ? 'Mäßig konzentriert' : 'Hoch konzentriert');

function TreemapCell(props: { x?: number; y?: number; width?: number; height?: number; name?: string; kategorie?: string; portfolioWeight?: number }) {
  const { x = 0, y = 0, width = 0, height = 0, name, kategorie, portfolioWeight = 0 } = props;
  if (width < 4 || height < 4) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={4} fill={CATEGORY_COLORS[kategorie ?? ''] ?? PALETTE[6]} stroke={SURFACE} strokeWidth={2} />
      {width > 40 && height > 20 && (
        <text x={x + 6} y={y + 15} fontSize={11} fontWeight={600} fill="#fff" style={{ pointerEvents: 'none' }}>{name}</text>
      )}
      {width > 40 && height > 34 && (
        <text x={x + 6} y={y + 28} fontSize={10} fill="#fff" fillOpacity={0.75} style={{ pointerEvents: 'none' }}>{fmtNum(portfolioWeight, 1)} %</text>
      )}
    </g>
  );
}

export function DiversificationTab() {
  const { m, openPosition } = useDepot();
  const [dim, setDim] = useState<Dimension>('kategorie');
  const { active, byWeight, hhi } = m;
  const total = m.totals.totalWert;

  const groupBy = (d: Dimension) => {
    const map = new Map<string, number>();
    for (const p of active) map.set(DIMENSIONS[d].key(p), (map.get(DIMENSIONS[d].key(p)) ?? 0) + p.wert);
    return [...map].map(([name, value]) => ({ name, value }));
  };
  const eurShare = total > 0 ? ((groupBy('waehrung').find((g) => g.name === 'EUR')?.value ?? 0) / total) * 100 : 0;
  const { top: top3, pct: top3Pct } = m.top3Dividend;
  const clusters = byWeight.filter((p) => p.portfolioWeight > MAX_WEIGHT);

  return (
    <>
      <KPIGrid>
        <KPICard title="HHI" value={fmtNum(hhi)} sub={hhiLabel(hhi)} tone={hhi < 1000 ? 'success' : hhi < 2500 ? 'warning' : 'danger'}
          info="Herfindahl-Hirschman-Index: Summe der quadrierten Gewichte. Unter 1.000 gut diversifiziert, über 2.500 hoch konzentriert." />
        <KPICard title="Top-5-Gewicht" value={fmtPct(m.top5Weight, 1)} sub="Anteil am Depot" tone={m.top5Weight > 50 ? 'warning' : undefined} />
        <KPICard title="Top-3-Dividende" value={fmtPct(top3Pct, 0)} sub={top3.map((p) => p.symbol).join(', ')} tone={top3Pct > 50 ? 'warning' : undefined}
          info="Anteil der drei größten Dividendenzahler an der gesamten Dividende." />
        <KPICard title="Fremdwährung" value={fmtPct(100 - eurShare, 0)} sub={`${fmtPct(eurShare, 0)} in EUR`} info="Aus dem ISIN-Länderkürzel abgeleitet – eine Näherung." />
      </KPIGrid>

      {top3Pct > 50 && (
        <Callout tone="warning" title="Einkommensabhängigkeit">
          {top3.map((p) => p.symbol).join(', ')} liefern {fmtPct(top3Pct, 0)} deiner Dividende. Eine Kürzung bei einer dieser Positionen träfe dein Einkommen deutlich.
        </Callout>
      )}

      <Card title="Struktur" action={<Segmented label="Aufteilung nach" value={dim} onChange={setDim} options={(Object.keys(DIMENSIONS) as Dimension[]).map((d) => ({ value: d, label: DIMENSIONS[d].label }))} />}>
        <Donut data={groupBy(dim)} format={(v) => fmt(v)} colors={dim === 'kategorie' ? CATEGORY_COLORS : undefined} />
      </Card>

      <Card title="Depot-Karte" sub="Fläche = Depotwert · Farbe = Kategorie · antippen für Details">
        <ResponsiveContainer width="100%" height={300}>
          <Treemap
            data={active.map((p) => ({ name: p.symbol, size: p.wert, kategorie: p.kategorie, portfolioWeight: p.portfolioWeight }))}
            dataKey="size"
            content={<TreemapCell />}
            isAnimationActive={false}
            onClick={(node) => openPosition((node as unknown as { name: string }).name)}
          >
            <Tooltip
              content={({ active: on, payload }) => {
                const d = on && (payload?.[0]?.payload as { name: string; size: number; portfolioWeight: number; kategorie: string } | undefined);
                return d ? <TooltipBox title={d.name}><p>{fmt(d.size)} · {fmtPct(d.portfolioWeight, 1)}</p><p className="text-zinc-400">{d.kategorie}</p></TooltipBox> : null;
              }}
            />
          </Treemap>
        </ResponsiveContainer>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
          {Object.entries(CATEGORY_COLORS).map(([k, c]) => (
            <span key={k} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: c }} />{k}</span>
          ))}
        </div>
      </Card>

      <Card id="gewichtung" title="Größte Positionen" sub={`Top 15 nach Gewicht · ${clusters.length} über ${MAX_WEIGHT} % (Klumpenrisiko)`}>
        <BarList
          ranked
          items={byWeight.slice(0, 15).map((p) => ({
            key: p.symbol, label: p.symbol, sub: p.name, symbol: p.symbol, value: p.portfolioWeight,
            display: fmtPct(p.portfolioWeight, 1), tone: p.portfolioWeight > MAX_WEIGHT ? 'warning' : 'info',
          }))}
        />
      </Card>

      <PositionTable
        title="Gewichtung je Position"
        data={byWeight}
        searchKeys={['typ', 'kategorie', 'broker']}
        columns={[
          {
            key: 'portfolioWeight', label: 'Gewicht', align: 'right',
            render: (p) => <CellBar pct={(p.portfolioWeight / (byWeight[0]?.portfolioWeight || 1)) * 100} label={fmtPct(p.portfolioWeight, 1)} tone={p.portfolioWeight > MAX_WEIGHT ? 'warning' : 'info'} />,
          },
          { key: 'wert', label: 'Wert', align: 'right', render: (p) => fmt(p.wert) },
          { key: 'prio', label: 'Prio', align: 'center', hide: 'sm', render: (p) => <PrioBadge prio={p.prio} /> },
          { key: 'kategorie', label: 'Kategorie', hide: 'md' },
          { key: 'typ', label: 'Typ', hide: 'lg' },
          { key: 'broker', label: 'Broker', hide: 'lg' },
        ]}
      />
    </>
  );
}
