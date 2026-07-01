import React, { useMemo, useState } from 'react';
import type { DepotPosition, TabId } from '../lib/types';
// All tabs load together as part of the Dashboard chunk (see App.tsx, which lazy-loads
// Dashboard itself). Splitting further, per-tab, caused a noticeable load flicker on every
// first tab visit since each tab pulled in the large shared recharts/d3 vendor code on
// demand; bundling them together means one wait right after upload, then instant switching.
import { OverviewTab } from './tabs/OverviewTab';
import { DividendTab } from './tabs/DividendTab';
import { CAGRTab } from './tabs/CAGRTab';
import { SavingsTab } from './tabs/SavingsTab';
import { CalendarTab } from './tabs/CalendarTab';
import { RankingTab } from './tabs/RankingTab';
import { FindingsTab } from './tabs/FindingsTab';
import { ProjectionTab } from './tabs/ProjectionTab';
import { DiversificationTab } from './tabs/DiversificationTab';
import { SafetyTab } from './tabs/SafetyTab';
import { GoalTab } from './tabs/GoalTab';
import { RebalancingTab } from './tabs/RebalancingTab';
import { QualityTab } from './tabs/QualityTab';
import { DepotCheckTab } from './tabs/DepotCheckTab';
import { MotivationTab } from './tabs/MotivationTab';
import { computeTotals } from '../lib/calculations';
import { computeHealthScore } from '../lib/insights';
import { fmt, fmtPct, fmtNum } from '../lib/format';
import {
  LayoutDashboard, TrendingUp, BarChart2, PiggyBank,
  Calendar, Trophy, Lightbulb, LineChart,
  Download, Upload, PieChart, ShieldCheck,
  Target, Sliders, Star, HeartPulse, Sparkles,
} from 'lucide-react';

interface Tab { id: TabId; label: string; icon: React.ReactNode }
interface TabGroup { id: string; label: string; icon: React.ReactNode; tabs: Tab[] }

// Tabs are grouped thematically into 5 top-level groups so the nav bar shows
// 5 items instead of 15; the sub-tab row underneath reveals only the tabs of
// the currently active group.
const TAB_GROUPS: TabGroup[] = [
  {
    id: 'depot', label: 'Depot', icon: <LayoutDashboard size={13} />,
    tabs: [
      { id: 'overview', label: 'Übersicht', icon: <LayoutDashboard size={13} /> },
      { id: 'rankings', label: 'Rankings',  icon: <Trophy size={13} /> },
    ],
  },
  {
    id: 'dividends', label: 'Dividenden', icon: <TrendingUp size={13} />,
    tabs: [
      { id: 'dividends',  label: 'Analyse',    icon: <TrendingUp size={13} /> },
      { id: 'calendar',   label: 'Kalender',   icon: <Calendar size={13} /> },
      { id: 'motivation', label: 'Motivation', icon: <Sparkles size={13} /> },
    ],
  },
  {
    id: 'growth', label: 'Wachstum & Planung', icon: <LineChart size={13} />,
    tabs: [
      { id: 'cagr',       label: 'Wachstum',    icon: <BarChart2 size={13} /> },
      { id: 'savings',    label: 'Sparpläne',   icon: <PiggyBank size={13} /> },
      { id: 'projection', label: 'Ausblick',    icon: <LineChart size={13} /> },
      { id: 'goal',       label: 'Zielplanung', icon: <Target size={13} /> },
    ],
  },
  {
    id: 'analysis', label: 'Analyse & Risiko', icon: <ShieldCheck size={13} />,
    tabs: [
      { id: 'diversification', label: 'Diversifikation', icon: <PieChart size={13} /> },
      { id: 'safety',          label: 'Sicherheit',      icon: <ShieldCheck size={13} /> },
      { id: 'quality',         label: 'Qualität',        icon: <Star size={13} /> },
      { id: 'depot-check',     label: 'Depot-Check',     icon: <HeartPulse size={13} /> },
    ],
  },
  {
    id: 'actions', label: 'Empfehlungen', icon: <Lightbulb size={13} />,
    tabs: [
      { id: 'findings',     label: 'Findings',    icon: <Lightbulb size={13} /> },
      { id: 'rebalancing',  label: 'Rebalancing', icon: <Sliders size={13} /> },
    ],
  },
];

interface Props {
  positions: DepotPosition[];
  filename: string;
  onReset: () => void;
}

const Btn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
  >
    {children}
  </button>
);

export function Dashboard({ positions, filename, onReset }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const totals = useMemo(() => computeTotals(positions), [positions]);
  const health = useMemo(() => computeHealthScore(positions), [positions]);
  const activeGroup = TAB_GROUPS.find((g) => g.tabs.some((t) => t.id === activeTab)) ?? TAB_GROUPS[0];

  const exportCSV = () => {
    const headers = ['Symbol','Name','Status','Prio','Broker','Wert (€)','Gewicht %','Yield %','CAGR 5J %','Jährl. Div. (€)','Monatl. Div. (€)','Div-Beitrag %','Chowder','Div-Score','Ausschüttungsfrequenz','Ausschüttungsmonate','Typ','Kategorie','ISIN','WKN'];
    const rows = positions.map((p) => [
      p.symbol, p.name, p.status, p.prio ?? '', p.broker,
      p.wert.toFixed(2), p.portfolioWeight.toFixed(2), p.yield.toFixed(4), p.cagr5j.toFixed(2),
      p.annualDividend.toFixed(2), p.monthlyDividend.toFixed(2), p.dividendContribution.toFixed(2),
      p.chowderScore.toFixed(1), p.dividendScore, p.ausschuettungsfrequenz, p.ausschuettungsmonate,
      p.typ, p.kategorie, p.isin, p.wkn,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: `depot-analyse-${new Date().toISOString().slice(0, 10)}.csv` }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">D</span>
            </div>
            <span className="text-sm font-semibold text-white hidden sm:block">
              Depot Analyzer
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-700 hidden sm:block" />

          {/* File info */}
          <span className="text-xs text-zinc-500 truncate hidden sm:block max-w-[160px]">
            {filename}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Live KPIs */}
          <div className="hidden lg:flex items-center gap-5 text-xs">
            <div className="text-center">
              <div className="text-zinc-500">Depotwert</div>
              <div className="font-semibold text-zinc-200">{fmt(totals.totalWert)}</div>
            </div>
            <div className="h-6 w-px bg-zinc-800" />
            <div className="text-center">
              <div className="text-zinc-500">Yield</div>
              <div className="font-semibold text-emerald-400">{fmtPct(totals.weightedYield)}</div>
            </div>
            <div className="h-6 w-px bg-zinc-800" />
            <div className="text-center">
              <div className="text-zinc-500">Dividende / Jahr</div>
              <div className="font-semibold text-zinc-200">{fmt(totals.totalAnnualDiv)}</div>
            </div>
            <div className="h-6 w-px bg-zinc-800" />
            <div className="text-center">
              <div className="text-zinc-500">Ø / Monat</div>
              <div className="font-semibold text-zinc-200">{fmt(totals.totalMonthlyDiv)}</div>
            </div>
            <div className="h-6 w-px bg-zinc-800" />
            <div className="text-center">
              <div className="text-zinc-500">Health</div>
              <div className={`font-semibold ${health.overall >= 70 ? 'text-emerald-400' : health.overall >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {fmtNum(health.overall)}
              </div>
            </div>
          </div>

          <div className="flex-1 hidden lg:block" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Btn onClick={exportCSV}><Download size={12} />CSV</Btn>
            <button
              onClick={onReset}
              title="Neue Datei laden"
              className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-800 transition-colors"
            >
              <Upload size={14} />
            </button>
          </div>
        </div>

        {/* Tab groups */}
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="flex gap-0 overflow-x-auto no-scrollbar">
            {TAB_GROUPS.map((group) => (
              <button
                key={group.id}
                onClick={() => setActiveTab(group.tabs[0].id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                  activeGroup.id === group.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {group.icon}
                {group.label}
              </button>
            ))}
          </div>
          {/* Sub-tabs of the active group */}
          <div className="flex gap-0 overflow-x-auto no-scrollbar border-t border-zinc-800/60">
            {activeGroup.tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-medium whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-blue-400 text-blue-300'
                    : 'border-transparent text-zinc-600 hover:text-zinc-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-screen-xl mx-auto px-6 py-8">
        {activeTab === 'overview'   && <OverviewTab   positions={positions} />}
        {activeTab === 'dividends'  && <DividendTab   positions={positions} />}
        {activeTab === 'cagr'       && <CAGRTab        positions={positions} />}
        {activeTab === 'savings'    && <SavingsTab     positions={positions} />}
        {activeTab === 'calendar'   && <CalendarTab    positions={positions} />}
        {activeTab === 'rankings'   && <RankingTab     positions={positions} />}
        {activeTab === 'findings'   && <FindingsTab    positions={positions} />}
        {activeTab === 'depot-check'     && <DepotCheckTab      positions={positions} />}
        {activeTab === 'motivation'      && <MotivationTab      positions={positions} />}
        {activeTab === 'projection'      && <ProjectionTab      positions={positions} />}
        {activeTab === 'diversification' && <DiversificationTab positions={positions} />}
        {activeTab === 'safety'          && <SafetyTab          positions={positions} />}
        {activeTab === 'goal'            && <GoalTab            positions={positions} />}
        {activeTab === 'rebalancing'     && <RebalancingTab     positions={positions} />}
        {activeTab === 'quality'         && <QualityTab         positions={positions} />}
      </main>

      <footer className="max-w-screen-xl mx-auto px-6 py-6 text-xs text-zinc-600 text-center">
        Depot Analyzer · Rein informative Darstellung, keine Finanzberatung.
      </footer>
    </div>
  );
}
