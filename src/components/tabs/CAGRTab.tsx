import React from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Label,
  BarChart, Bar, Cell,
} from 'recharts';
import type { DepotPosition } from '../../lib/types';
import { SortableTable } from '../tables/SortableTable';
import { KPICard } from '../KPICard';
import { fmtPct, fmt } from '../../lib/format';

interface Props { positions: DepotPosition[] }

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f97316'];

export function CAGRTab({ positions }: Props) {
  const active = positions.filter((p) => p.wert > 0 && (p.cagr5j > 0 || p.yield > 0));
  const byCagr = [...active].sort((a, b) => b.cagr5j - a.cagr5j);
  const byChowder = [...active].sort((a, b) => b.chowderScore - a.chowderScore);

  const avgCagr = active.filter((p) => p.cagr5j > 0).reduce((s, p, _, a) => s + p.cagr5j / a.length, 0);
  const avgYield = active.reduce((s, p, _, a) => s + p.yield / a.length, 0);
  const avgChowder = active.reduce((s, p, _, a) => s + p.chowderScore / a.length, 0);

  // Quadrants: High Yield + Low CAGR vs Low Yield + High CAGR
  const highYieldLowGrowth = active.filter((p) => p.yield > avgYield && p.cagr5j > 0 && p.cagr5j < avgCagr);
  const lowYieldHighGrowth = active.filter((p) => p.yield < avgYield && p.cagr5j >= avgCagr);
  const stars = active.filter((p) => p.yield >= avgYield && p.cagr5j >= avgCagr);

  const scatterData = active.map((p) => ({
    x: p.yield,
    y: p.cagr5j,
    z: Math.max(4, Math.sqrt(p.wert / 100)),
    symbol: p.symbol,
    name: p.name,
    chowder: p.chowderScore,
  }));

  const top10Chowder = byChowder.slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <KPICard title="Ø CAGR 5J (aktive)" value={fmtPct(avgCagr)} sub="Ø Dividendenwachstum" color="blue" />
        <KPICard title="Ø Yield (aktive)" value={fmtPct(avgYield)} sub="Ø Ausschüttungsrendite" color="green" />
        <KPICard title="Ø Chowder Score" value={avgChowder.toFixed(1)} sub="Yield + CAGR" color="purple" />
      </div>

      {/* Scatter Yield vs CAGR */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200 mb-1">Yield vs. CAGR – Positionierungsmatrix</h3>
        <p className="text-xs text-gray-500 mb-3">Oben rechts = Ideal (hoher Yield + starkes Wachstum). Punktgröße ~ Depotwert.</p>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="x" name="Yield %" type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${v}%`}>
              <Label value="Yield %" position="insideBottom" offset={-10} fontSize={11} />
            </XAxis>
            <YAxis dataKey="y" name="CAGR 5J %" type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${v}%`}>
              <Label value="CAGR 5J %" position="insideLeft" angle={-90} offset={10} fontSize={11} />
            </YAxis>
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-lg">
                    <p className="font-bold">{d.symbol} – {d.name}</p>
                    <p>Yield: {d.x.toFixed(2)}% | CAGR: {d.y.toFixed(2)}%</p>
                    <p>Chowder: {d.chowder.toFixed(1)}</p>
                  </div>
                );
              }}
            />
            <ReferenceLine x={avgYield} stroke="#94a3b8" strokeDasharray="4 4" />
            <ReferenceLine y={avgCagr} stroke="#94a3b8" strokeDasharray="4 4" />
            <Scatter data={scatterData} fill="#3b82f6" fillOpacity={0.7} r={5} />
          </ScatterChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-center">
          <div className="rounded bg-green-50 dark:bg-green-900/20 p-2">
            <div className="font-semibold text-green-700 dark:text-green-300">⭐ Stars ({stars.length})</div>
            <div className="text-gray-500">Hoch Yield + Hoch CAGR</div>
            <div className="mt-1 truncate">{stars.map((p) => p.symbol).join(', ')}</div>
          </div>
          <div className="rounded bg-blue-50 dark:bg-blue-900/20 p-2">
            <div className="font-semibold text-blue-700 dark:text-blue-300">📈 Wachstum ({lowYieldHighGrowth.length})</div>
            <div className="text-gray-500">Niedrig Yield + Hoch CAGR</div>
            <div className="mt-1 truncate">{lowYieldHighGrowth.map((p) => p.symbol).join(', ')}</div>
          </div>
          <div className="rounded bg-yellow-50 dark:bg-yellow-900/20 p-2">
            <div className="font-semibold text-yellow-700 dark:text-yellow-300">⚠️ Einkommens-Falle ({highYieldLowGrowth.length})</div>
            <div className="text-gray-500">Hoch Yield + Niedrig CAGR</div>
            <div className="mt-1 truncate">{highYieldLowGrowth.map((p) => p.symbol).join(', ')}</div>
          </div>
        </div>
      </div>

      {/* Chowder Chart */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200 mb-1">Top 10 Chowder Score (Yield + CAGR)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={top10Chowder} margin={{ bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} />
            <XAxis dataKey="symbol" tick={{ fontSize: 11, fill: '#94a3b8' }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${v.toFixed(0)}`} />
            <Tooltip formatter={(v: unknown) => [(v as number).toFixed(1), 'Chowder Score']} />
            <Bar dataKey="chowderScore" radius={[4, 4, 0, 0]}>
              {top10Chowder.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Full CAGR Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200 mb-4">CAGR & Wachstums-Ranking</h3>
        <SortableTable
          data={byCagr}
          rowKey={(r) => r.symbol}
          filterKeys={['symbol', 'name', 'typ', 'kategorie']}
          columns={[
            { key: 'symbol', label: 'Symbol', width: '80px' },
            { key: 'name', label: 'Name' },
            { key: 'cagr5j', label: 'CAGR 5J %', align: 'right', render: (v) => (
              <div className="flex items-center gap-2 justify-end">
                <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (v as number) / (byCagr[0]?.cagr5j || 1) * 100)}%` }} />
                </div>
                <span className={`font-mono ${(v as number) < 3 && (v as number) > 0 ? 'text-orange-500' : ''}`}>{fmtPct(v as number)}</span>
              </div>
            )},
            { key: 'yield', label: 'Yield %', align: 'right', render: (v) => fmtPct(v as number) },
            { key: 'chowderScore', label: 'Chowder', align: 'right', render: (v) => (
              <span className={`font-mono font-semibold ${(v as number) >= 12 ? 'text-green-600 dark:text-green-400' : (v as number) >= 8 ? 'text-blue-600' : 'text-gray-500'}`}>
                {(v as number).toFixed(1)}
              </span>
            )},
            { key: 'wert', label: 'Wert (€)', align: 'right', render: (v) => fmt(v as number) },
            { key: 'typ', label: 'Typ', align: 'center' },
            { key: 'kategorie', label: 'Kategorie' },
          ]}
        />
      </div>
    </div>
  );
}
