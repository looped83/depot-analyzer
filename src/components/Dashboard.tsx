import React, { useEffect, useRef, useState } from 'react';
import type { DepotPosition, TabId } from '../lib/types';
// All tabs load together as part of the Dashboard chunk (see App.tsx, which lazy-loads
// Dashboard itself). Splitting further, per-tab, caused a noticeable load flicker on every
// first tab visit since each tab pulled in the large shared recharts/d3 vendor code on
// demand; bundling them together means one wait right after upload, then instant switching.
import { OverviewTab } from './tabs/OverviewTab';
import { PerformanceTab } from './tabs/PerformanceTab';
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
import {
  LayoutDashboard, TrendingUp, BarChart2, PiggyBank,
  Calendar, Trophy, Lightbulb, LineChart,
  Download, Upload, PieChart, ShieldCheck,
  Target, Sliders, Star, HeartPulse, Sparkles, ChevronDown, Activity,
} from 'lucide-react';

interface Tab { id: TabId; label: string; icon: React.ReactNode }
interface TabGroup { id: string; label: string; icon: React.ReactNode; tabs: Tab[] }

// Tabs are grouped thematically into 5 top-level groups so the nav bar shows
// 5 items instead of 15; clicking a group opens a flyout with that group's tabs.
const TAB_GROUPS: TabGroup[] = [
  {
    id: 'depot', label: 'Depot', icon: <LayoutDashboard size={13} />,
    tabs: [
      { id: 'overview',    label: 'Übersicht',   icon: <LayoutDashboard size={13} /> },
      { id: 'performance', label: 'Performance', icon: <Activity size={13} /> },
      { id: 'rankings',    label: 'Rankings',    icon: <Trophy size={13} /> },
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

export function Dashboard({ positions, onReset }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  // Position is captured at click time (fixed positioning) so the flyout escapes the
  // group row's overflow-x-auto clipping — overflow-x: auto implicitly forces
  // overflow-y: auto too, which would otherwise clip an absolutely positioned dropdown.
  const [flyout, setFlyout] = useState<{ groupId: string; top: number; left: number } | null>(null);
  const activeGroup = TAB_GROUPS.find((g) => g.tabs.some((t) => t.id === activeTab)) ?? TAB_GROUPS[0];
  const flyoutGroup = flyout ? TAB_GROUPS.find((g) => g.id === flyout.groupId) : null;

  const navRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!flyout) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setFlyout(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [flyout]);

  const toggleGroup = (e: React.MouseEvent<HTMLButtonElement>, groupId: string) => {
    if (flyout?.groupId === groupId) { setFlyout(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    // Clamp to the viewport so the flyout (min-w-[190px]) can't be pushed off-screen
    // when its trigger sits near the right edge of a narrow (tablet/landscape) viewport.
    const left = Math.min(rect.left, window.innerWidth - 190 - 8);
    setFlyout({ groupId, top: rect.bottom + 4, left: Math.max(8, left) });
  };

  const exportCSV = () => {
    const headers = ['Symbol','Name','Status','Prio','Broker','Wert (€)','Kaufkurs (€)','Einstand (€)','Gewinn/Verlust (€)','Gewinn/Verlust %','Gewicht %','Yield %','CAGR 5J %','Jährl. Div. (€)','Monatl. Div. (€)','Div-Beitrag %','Chowder','Div-Score','Ausschüttungsfrequenz','Ausschüttungsmonate','Typ','Kategorie','ISIN','WKN'];
    const rows = positions.map((p) => [
      p.symbol, p.name, p.status, p.prio ?? '', p.broker,
      p.wert.toFixed(2), p.kaufkurs.toFixed(2), p.einstandswert.toFixed(2), p.gewinnVerlust.toFixed(2), p.gewinnVerlustPct.toFixed(2),
      p.portfolioWeight.toFixed(2), p.yield.toFixed(4), p.cagr5j.toFixed(2),
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
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-stretch gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="Depot Analyzer Logo" className="w-6 h-auto" />
            <span className="text-sm font-semibold text-white hidden sm:block">
              Depot Analyzer
            </span>
          </div>

          {/* Tab groups */}
          <div ref={navRef} className="relative flex-1 min-w-0">
            {/* Fading edges hint that the row scrolls horizontally once the 5 groups no
                longer fit — happens around the 768px tablet breakpoint, where the row is
                too narrow to show every label but not narrow enough to look obviously cramped. */}
            <div className="h-full flex items-stretch overflow-x-auto no-scrollbar [mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-12px),transparent)]">
              {TAB_GROUPS.map((group) => (
                <button
                  key={group.id}
                  onClick={(e) => toggleGroup(e, group.id)}
                  className={`flex items-center gap-1.5 px-4 text-xs font-medium whitespace-nowrap border-b-2 shrink-0 transition-all ${
                    activeGroup.id === group.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {group.icon}
                  {group.label}
                  <ChevronDown size={12} className={`transition-transform ${flyout?.groupId === group.id ? 'rotate-180' : ''}`} />
                </button>
              ))}
            </div>
            {flyout && flyoutGroup && (
              <div
                style={{ position: 'fixed', top: flyout.top, left: flyout.left }}
                className="z-50 min-w-[190px] rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl py-1"
              >
                {flyoutGroup.tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setFlyout(null); }}
                    className={`flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'text-blue-400 bg-zinc-800/60'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
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
      </header>

      {/* Page content */}
      <main className="max-w-screen-xl mx-auto px-6 py-8">
        {activeTab === 'overview'    && <OverviewTab    positions={positions} />}
        {activeTab === 'performance' && <PerformanceTab positions={positions} />}
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
