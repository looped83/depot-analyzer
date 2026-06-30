import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Treemap,
} from 'recharts';
import type { DepotPosition } from '../../lib/types';
import { KPICard } from '../KPICard';
import { Card } from '../Card';
import { ChartTooltip } from '../ChartTooltip';
import { SortableTable } from '../tables/SortableTable';
import { fmt, fmtPct, fmtNum } from '../../lib/format';
import { topDividendContributors } from '../../lib/calculations';
import { PALETTE, AXIS, GRID, BAR_CURSOR } from '../../lib/chartTheme';

interface Props { positions: DepotPosition[] }

function groupBy(positions: DepotPosition[], key: keyof DepotPosition) {
  const map = new Map<string, number>();
  for (const p of positions) {
    const k = String(p[key] || 'Sonstige');
    map.set(k, (map.get(k) ?? 0) + p.wert);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function inferCurrency(isin: string): string {
  const prefix = (isin ?? '').substring(0, 2).toUpperCase();
  if (prefix === 'US') return 'USD';
  if (prefix === 'GB') return 'GBP';
  if (prefix === 'CA') return 'CAD';
  if (prefix === 'AU') return 'AUD';
  if (prefix === 'JP') return 'JPY';
  if (['DE','FR','NL','LU','IE','AT','BE','ES','IT','FI','PT','PL','SK','SI','EE','LV','LT','MT','CY'].includes(prefix)) return 'EUR';
  return 'Sonstige';
}

function groupByCurrency(positions: DepotPosition[]) {
  const map = new Map<string, number>();
  for (const p of positions) {
    const k = inferCurrency(p.isin ?? '');
    map.set(k, (map.get(k) ?? 0) + p.wert);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// Herfindahl-Hirschman Index: sum of squared weights, 0–10000
function calcHHI(positions: DepotPosition[]) {
  return positions.reduce((s, p) => s + p.portfolioWeight ** 2, 0);
}

const KATEGORIE_COLORS: Record<string, string> = {
  'Income':      PALETTE[1],
  'Growth':      PALETTE[0],
  'High Yield':  PALETTE[2],
  'Accumulation': PALETTE[4],
};

function TreemapContent(props: {
  x?: number; y?: number; width?: number; height?: number;
  name?: string; kategorie?: string; portfolioWeight?: number;
}) {
  const { x = 0, y = 0, width = 0, height = 0, name, kategorie, portfolioWeight } = props;
  if (width < 30 || height < 18) return null;
  const fill = KATEGORIE_COLORS[kategorie ?? ''] ?? PALETTE[6];
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={4}
        fill={fill} fillOpacity={0.82} stroke="white" strokeWidth={1.5} />
      {width > 44 && height > 22 && (
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle"
          dominantBaseline="middle" fontSize={Math.min(11, width / 5)}
          fill="white" fontWeight={600} style={{ pointerEvents: 'none' }}>
          {name}
        </text>
      )}
      {width > 50 && height > 36 && (
        <text x={x + width / 2} y={y + height / 2 + 13} textAnchor="middle"
          dominantBaseline="middle" fontSize={9} fill="white" fillOpacity={0.8}
          style={{ pointerEvents: 'none' }}>
          {fmtNum(portfolioWeight ?? 0, 1)}%
        </text>
      )}
    </g>
  );
}

export function DiversificationTab({ positions }: Props) {
  const active = positions.filter((p) => p.wert > 0);
  const totalWert = active.reduce((s, p) => s + p.wert, 0);

  const byTyp      = groupBy(active, 'typ');
  const byKategorie = groupBy(active, 'kategorie');
  const byBroker   = groupBy(active, 'broker');
  const byWaehrung = groupByCurrency(active);
  const eurWert = byWaehrung.find(w => w.name === 'EUR')?.value ?? 0;
  const fremdwaehrungPct = totalWert > 0 ? ((totalWert - eurWert) / totalWert * 100) : 0;

  const sorted = [...active].sort((a, b) => b.portfolioWeight - a.portfolioWeight);
  const top5Weight  = sorted.slice(0, 5).reduce((s, p) => s + p.portfolioWeight, 0);
  const hhi = calcHHI(active);
  const hhiLabel = hhi < 1000 ? 'Gut diversifiziert' : hhi < 2500 ? 'Mäßig konzentriert' : 'Hoch konzentriert';

  const treemapData = active.map((p) => ({
    name: p.symbol,
    size: Math.round(p.wert),
    kategorie: p.kategorie,
    portfolioWeight: p.portfolioWeight,
  }));

  const clumps = sorted.filter((p) => p.portfolioWeight > 5);

  const divGrade = hhi < 500 ? 'A+' : hhi < 800 ? 'A' : hhi < 1200 ? 'B+' : hhi < 1800 ? 'B' : hhi < 2500 ? 'C' : 'D';

  const { top: top3DivContrib, pct: top3DivPct } = topDividendContributors(active, 3);

  const brokerCount = new Set(active.map(p => p.broker)).size;
  const typCount = new Set(active.map(p => p.typ)).size;
  const katCount = new Set(active.map(p => p.kategorie)).size;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KPICard title="Aktive Positionen"  value={String(active.length)}        sub="Positionen im Depot" info="Anzahl aller Positionen mit einem Depotwert > 0." />
        <KPICard title="HHI"                value={fmtNum(hhi)}                  sub={hhiLabel} info="Herfindahl-Hirschman-Index: Summe der quadrierten Gewichte. < 1.000 = gut diversifiziert, > 2.500 = hoch konzentriert." />
        <KPICard title="Div. Grade"         value={divGrade}                     sub={hhiLabel} info="Note basierend auf dem HHI: A+ (< 500) bis D (> 2.500)." />
        <KPICard title="Top 5 Gewicht"      value={fmtPct(top5Weight)}           sub="Anteil am Depot" info="Anteil der 5 größten Positionen am Gesamtdepot." />
        <KPICard title="Broker"             value={String(brokerCount)}           sub={`${typCount} Typen · ${katCount} Kategorien`} info="Anzahl verschiedener Broker, Anlagetypen und Kategorien im Depot." />
        <KPICard title="Top 3 Div-Anteil"   value={`${fmtNum(top3DivPct)} %`} sub={top3DivContrib.map(p => p.symbol).join(', ')} info="Anteil der 3 größten Dividendenzahler an der Gesamtdividende." />
        <KPICard title="Fremdwährungs-Anteil" value={`${fmtNum(fremdwaehrungPct, 1)} %`} sub={`EUR: ${fmtNum(100 - fremdwaehrungPct, 1)} %`} info="Anteil des Depots in Fremdwährungen (nicht EUR). Höhere Werte bedeuten mehr Währungsrisiko, aber auch Diversifikation." />
      </div>

      {/* Dependency warning */}
      {top3DivPct > 50 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 p-4">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Einkommensabhängigkeit</p>
          <p className="text-xs text-amber-600/70 dark:text-amber-300/60">
            {top3DivContrib.map(p => p.symbol).join(', ')} liefern {fmtNum(top3DivPct)} % deiner Dividende.
            Bei einer Kürzung einer dieser Positionen würde dein Einkommen deutlich sinken.
          </p>
        </div>
      )}

      {/* Treemap */}
      <Card title="Depot-Übersicht – Gewichtung & Kategorie"
        sub="Größe = Depotwert · Farbe = Kategorie (Grün=Income · Blau=Growth · Gelb=High Yield · Cyan=Accumulation)">
        <div className="mt-3">
          <ResponsiveContainer width="100%" height={320}>
            <Treemap data={treemapData} dataKey="size" content={<TreemapContent />} isAnimationActive={false}>
              <Tooltip
                content={({ active: a, payload }) => {
                  if (!a || !payload?.length) return null;
                  const d = payload[0].payload as typeof treemapData[0];
                  return (
                    <div className="bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs shadow-xl">
                      <p className="font-semibold text-slate-800 dark:text-zinc-200">{d.name}</p>
                      <p className="text-slate-500 dark:text-zinc-400">{fmt(d.size)} · {fmtNum(d.portfolioWeight, 2)} %</p>
                      <p className="text-slate-400 dark:text-zinc-500">{d.kategorie}</p>
                    </div>
                  );
                }}
              />
            </Treemap>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {Object.entries(KATEGORIE_COLORS).map(([k, c]) => (
            <div key={k} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
              {k}
            </div>
          ))}
        </div>
      </Card>

      {/* Pie charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Nach Typ', data: byTyp },
          { title: 'Nach Kategorie', data: byKategorie },
          { title: 'Nach Broker', data: byBroker },
          { title: 'Nach Währung', data: byWaehrung },
        ].map(({ title, data }) => (
          <Card key={title} title={title}>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={68} innerRadius={32}
                  paddingAngle={2} strokeWidth={0}>
                  {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.85} />)}
                </Pie>
                <Tooltip content={(props) => <ChartTooltip {...props} formatter={(v) => fmt(v as number)} />} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        ))}
      </div>

      {/* Top positions bar */}
      <Card title="Top 15 Positionen nach Gewicht">
        <div className="mt-3">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sorted.slice(0, 15)} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
              <CartesianGrid {...GRID} horizontal={false} />
              <XAxis type="number" {...AXIS} tickFormatter={(v) => `${fmtNum(v, 1)} %`} />
              <YAxis type="category" dataKey="symbol" {...AXIS} width={52} />
              <Tooltip cursor={BAR_CURSOR} content={(props) => <ChartTooltip {...props} formatter={(v) => `${fmtNum(v as number, 2)} %`} />} />
              <Bar dataKey="portfolioWeight" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {sorted.slice(0, 15).map((p, i) => (
                  <Cell key={p.symbol} fill={p.portfolioWeight > 5 ? '#f59e0b' : PALETTE[i % PALETTE.length]} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Concentration warning */}
      {clumps.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 p-4">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">
            Klumpenrisiko – Positionen über 5 % Gewicht ({clumps.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {clumps.map((p) => (
              <span key={p.symbol} className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-full font-mono">
                {p.symbol} {fmtNum(p.portfolioWeight, 1)} %
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Full table */}
      <Card title="Alle Positionen – Gewichtung" pad={false}>
        <div className="px-5 pb-5">
          <SortableTable
            data={sorted}
            rowKey={(r) => r.symbol}
            filterKeys={['symbol', 'name', 'typ', 'kategorie', 'broker']}
            columns={[
              { key: 'symbol', label: 'Symbol', width: '80px',
                render: (v) => <span className="font-mono font-semibold text-xs text-slate-800 dark:text-zinc-200">{String(v)}</span> },
              { key: 'name', label: 'Name' },
              { key: 'portfolioWeight', label: 'Gewicht', align: 'right',
                render: (v) => (
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-20 h-1 bg-slate-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${(v as number) > 5 ? 'bg-amber-400' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(100, (v as number) / (sorted[0]?.portfolioWeight || 1) * 100)}%` }} />
                    </div>
                    <span className={`font-mono tabular-nums ${(v as number) > 5 ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}`}>
                      {fmtPct(v as number)}
                    </span>
                  </div>
                )},
              { key: 'wert',      label: 'Wert',     align: 'right', render: (v) => fmt(v as number) },
              { key: 'typ',       label: 'Typ',       align: 'center' },
              { key: 'kategorie', label: 'Kategorie' },
              { key: 'broker',    label: 'Broker',    align: 'center' },
              { key: 'prio',      label: 'Prio',      align: 'center' },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
