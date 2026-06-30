import React, { useState, useRef } from 'react';
import type { DepotPosition, TabId } from '../lib/types';
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
import { computeHealthScore, generateRecommendations } from '../lib/insights';
import { fmt, fmtPct, fmtNum } from '../lib/format';
import {
  LayoutDashboard, TrendingUp, BarChart2, PiggyBank,
  Calendar, Trophy, Lightbulb, LineChart,
  Download, Moon, Sun, Upload, PieChart, ShieldCheck,
  Target, Sliders, Star, HeartPulse, Sparkles,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Tab { id: TabId; label: string; icon: React.ReactNode }

const TABS: Tab[] = [
  { id: 'overview',   label: 'Depot',      icon: <LayoutDashboard size={13} /> },
  { id: 'dividends',  label: 'Dividenden', icon: <TrendingUp size={13} /> },
  { id: 'cagr',       label: 'Wachstum',   icon: <BarChart2 size={13} /> },
  { id: 'savings',    label: 'Sparpläne',  icon: <PiggyBank size={13} /> },
  { id: 'calendar',   label: 'Kalender',   icon: <Calendar size={13} /> },
  { id: 'rankings',   label: 'Rankings',   icon: <Trophy size={13} /> },
  { id: 'findings',   label: 'Findings',   icon: <Lightbulb size={13} /> },
  { id: 'depot-check',     label: 'Depot-Check',     icon: <HeartPulse   size={13} /> },
  { id: 'motivation',      label: 'Motivation',      icon: <Sparkles     size={13} /> },
  { id: 'projection',      label: 'Ausblick',        icon: <LineChart    size={13} /> },
  { id: 'diversification', label: 'Diversifikation', icon: <PieChart     size={13} /> },
  { id: 'safety',          label: 'Sicherheit',      icon: <ShieldCheck  size={13} /> },
  { id: 'goal',            label: 'Zielplanung',     icon: <Target       size={13} /> },
  { id: 'rebalancing',     label: 'Rebalancing',     icon: <Sliders      size={13} /> },
  { id: 'quality',         label: 'Qualität',        icon: <Star         size={13} /> },
];

interface Props {
  positions: DepotPosition[];
  filename: string;
  onReset: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
}

export function Dashboard({ positions, filename, onReset, darkMode, onToggleDark }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [exporting, setExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const totals = computeTotals(positions);
  const health = computeHealthScore(positions);
  const recommendations = generateRecommendations(positions);
  const urgentCount = recommendations.filter(r => r.priority === 'high').length;

  const exportPDF = async () => {
    if (!contentRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: darkMode ? '#09090b' : '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.setFontSize(12);
      pdf.text(`Depot-Analyse – ${filename}`, 14, 12);
      pdf.setFontSize(8);
      pdf.text(`${new Date().toLocaleDateString('de-DE')} · ${fmt(totals.totalWert)} · Yield ${fmtPct(totals.weightedYield)}`, 14, 19);
      const startY = 24;
      const scaledHeight = Math.min(pdfHeight, pdf.internal.pageSize.getHeight() - startY - 8);
      pdf.addImage(imgData, 'PNG', 0, startY, pdfWidth, scaledHeight);
      pdf.save(`depot-analyse-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error('PDF export failed', e);
    } finally {
      setExporting(false);
    }
  };

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

  const Btn = ({ onClick, children, primary, disabled }: { onClick: () => void; children: React.ReactNode; primary?: boolean; disabled?: boolean }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${
        primary
          ? 'bg-blue-600 hover:bg-blue-700 text-white'
          : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-slate-100 dark:border-zinc-800">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">D</span>
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-white hidden sm:block">
              Depot Analyzer
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-700 hidden sm:block" />

          {/* File info */}
          <span className="text-xs text-slate-400 dark:text-zinc-500 truncate hidden sm:block max-w-[160px]">
            {filename}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Live KPIs */}
          <div className="hidden lg:flex items-center gap-5 text-xs">
            <div className="text-center">
              <div className="text-slate-400 dark:text-zinc-500">Depotwert</div>
              <div className="font-semibold text-slate-800 dark:text-zinc-200">{fmt(totals.totalWert)}</div>
            </div>
            <div className="h-6 w-px bg-slate-100 dark:bg-zinc-800" />
            <div className="text-center">
              <div className="text-slate-400 dark:text-zinc-500">Yield</div>
              <div className="font-semibold text-emerald-600 dark:text-emerald-400">{fmtPct(totals.weightedYield)}</div>
            </div>
            <div className="h-6 w-px bg-slate-100 dark:bg-zinc-800" />
            <div className="text-center">
              <div className="text-slate-400 dark:text-zinc-500">Dividende / Jahr</div>
              <div className="font-semibold text-slate-800 dark:text-zinc-200">{fmt(totals.totalAnnualDiv)}</div>
            </div>
            <div className="h-6 w-px bg-slate-100 dark:bg-zinc-800" />
            <div className="text-center">
              <div className="text-slate-400 dark:text-zinc-500">Ø / Monat</div>
              <div className="font-semibold text-slate-800 dark:text-zinc-200">{fmt(totals.totalMonthlyDiv)}</div>
            </div>
            <div className="h-6 w-px bg-slate-100 dark:bg-zinc-800" />
            <div className="text-center">
              <div className="text-slate-400 dark:text-zinc-500">Health</div>
              <div className={`font-semibold ${health.overall >= 70 ? 'text-emerald-600 dark:text-emerald-400' : health.overall >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {fmtNum(health.overall)}
              </div>
            </div>
            {urgentCount > 0 && (
              <>
                <div className="h-6 w-px bg-slate-100 dark:bg-zinc-800" />
                <button onClick={() => setActiveTab('depot-check')} className="text-center hover:opacity-80 transition-opacity">
                  <div className="text-red-400 dark:text-red-500">Aktionen</div>
                  <div className="font-semibold text-red-600 dark:text-red-400">{urgentCount}</div>
                </button>
              </>
            )}
          </div>

          <div className="flex-1 hidden lg:block" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Btn onClick={exportCSV}><Download size={12} />CSV</Btn>
            <Btn onClick={exportPDF} primary disabled={exporting}>
              {exporting
                ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                : <Download size={12} />}
              PDF
            </Btn>
            <button
              onClick={onToggleDark}
              className="p-1.5 rounded-lg text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              onClick={onReset}
              title="Neue Datei laden"
              className="p-1.5 rounded-lg text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Upload size={14} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="flex gap-0 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'
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
      <main ref={contentRef} className="max-w-screen-xl mx-auto px-6 py-8">
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

      <footer className="max-w-screen-xl mx-auto px-6 py-6 text-xs text-slate-300 dark:text-zinc-600 text-center">
        Depot Analyzer · Rein informative Darstellung, keine Finanzberatung.
      </footer>
    </div>
  );
}
