import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import type { DepotPosition } from '../../lib/types';
import { computeMonthlyCalendar, parsePaymentMonths } from '../../lib/calculations';
import { KPICard } from '../KPICard';
import { fmt } from '../../lib/format';

interface Props { positions: DepotPosition[] }

export function CalendarTab({ positions }: Props) {
  const calendar = computeMonthlyCalendar(positions);
  const avgIncome = calendar.reduce((s, m) => s + m.expectedIncome, 0) / 12;
  const maxMonth = calendar.reduce((m, c) => c.expectedIncome > m.expectedIncome ? c : m);
  const minMonth = calendar.filter((m) => m.expectedIncome > 0).reduce((m, c) => c.expectedIncome < m.expectedIncome ? c : m);
  const totalAnnual = calendar.reduce((s, m) => s + m.expectedIncome, 0);

  const colorByIncome = (income: number) => {
    if (income === 0) return '#e5e7eb';
    if (income < avgIncome * 0.5) return '#f97316';
    if (income < avgIncome * 0.8) return '#f59e0b';
    if (income > avgIncome * 1.3) return '#10b981';
    return '#3b82f6';
  };

  // Frequency breakdown
  const monthly = positions.filter((p) => p.ausschuettungsfrequenz === 'monatlich' && p.wert > 0);
  const quarterly = positions.filter((p) => p.ausschuettungsfrequenz === 'quartalsweise' && p.wert > 0);
  const annual = positions.filter((p) => p.ausschuettungsfrequenz === 'jährlich' && p.wert > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Jährl. Gesamtdividende" value={fmt(totalAnnual)} sub="Aus Cashflow-Analyse" color="green" />
        <KPICard title="Bester Monat" value={maxMonth.label} sub={fmt(maxMonth.expectedIncome)} color="teal" />
        <KPICard title="Schwächster Monat" value={minMonth?.label ?? '—'} sub={minMonth ? fmt(minMonth.expectedIncome) : '—'} color="yellow" />
        <KPICard title="Ø Monatlicher Cashflow" value={fmt(avgIncome)} sub="Dividende / 12" color="blue" />
      </div>

      {/* Frequency Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Monatliche Zahler', items: monthly, color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
          { label: 'Quartalsweise Zahler', items: quarterly, color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
          { label: 'Jährliche Zahler', items: annual, color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' },
        ].map(({ label, items, color }) => (
          <div key={label} className={`rounded-xl border p-4 ${color}`}>
            <div className="text-xs font-semibold uppercase opacity-60 mb-1">{label}</div>
            <div className="text-2xl font-bold">{items.length}</div>
            <div className="text-xs opacity-60 mt-1">
              {items.map((p) => p.symbol).join(', ') || '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Monthly cashflow bar chart */}
      <div className="rounded-xl border dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold mb-1">Erwarteter Cashflow je Monat</h3>
        <p className="text-xs text-gray-500 mb-3">
          Orange = unterdurchschnittlich (&lt;50% Ø), Gelb = leicht unter Ø, Grün = über Ø.
          Ø-Linie = {fmt(avgIncome)}/Monat.
        </p>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={calendar} margin={{ bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `${v.toFixed(0)}€`} tick={{ fontSize: 11 }} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg px-3 py-2 text-xs shadow-lg">
                    <p className="font-bold">{label}</p>
                    <p>{fmt(d.expectedIncome)}</p>
                    <p className="opacity-60">{d.positions.length} Zahler: {d.positions.slice(0, 6).join(', ')}{d.positions.length > 6 ? ' …' : ''}</p>
                  </div>
                );
              }}
            />
            <ReferenceLine y={avgIncome} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Ø', position: 'right', fontSize: 11 }} />
            <Bar dataKey="expectedIncome" radius={[4, 4, 0, 0]}>
              {calendar.map((entry, i) => <Cell key={i} fill={colorByIncome(entry.expectedIncome)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly calendar grid */}
      <div className="rounded-xl border dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold mb-3">Dividendenkalender – Zahler je Monat</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {calendar.map((month) => (
            <div
              key={month.month}
              className={`rounded-lg border p-3 ${
                month.expectedIncome === 0 ? 'border-gray-200 dark:border-gray-700 opacity-50' :
                month.expectedIncome < avgIncome * 0.5 ? 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10' :
                month.expectedIncome > avgIncome * 1.3 ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10' :
                'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10'
              }`}
            >
              <div className="text-xs font-bold uppercase opacity-60">{month.label}</div>
              <div className="text-lg font-bold mt-0.5">{fmt(month.expectedIncome)}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {month.positions.slice(0, 8).map((sym) => (
                  <span key={sym} className="text-xs bg-white/60 dark:bg-gray-700/60 px-1.5 py-0.5 rounded">{sym}</span>
                ))}
                {month.positions.length > 8 && (
                  <span className="text-xs opacity-60">+{month.positions.length - 8}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
