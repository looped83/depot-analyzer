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
import { computeTotals } from '../lib/calculations';
import { fmt } from '../lib/format';
import {
  LayoutDashboard, TrendingUp, BarChart2, PiggyBank,
  Calendar, Trophy, Lightbulb, LineChart,
  Download, Moon, Sun, Upload, FileSpreadsheet,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Depot', icon: <LayoutDashboard size={14} /> },
  { id: 'dividends', label: 'Dividenden', icon: <TrendingUp size={14} /> },
  { id: 'cagr', label: 'Wachstum', icon: <BarChart2 size={14} /> },
  { id: 'savings', label: 'Sparpläne', icon: <PiggyBank size={14} /> },
  { id: 'calendar', label: 'Kalender', icon: <Calendar size={14} /> },
  { id: 'rankings', label: 'Rankings', icon: <Trophy size={14} /> },
  { id: 'findings', label: 'Findings', icon: <Lightbulb size={14} /> },
  { id: 'projection', label: 'Ausblick', icon: <LineChart size={14} /> },
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

  const exportPDF = async () => {
    if (!contentRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: darkMode ? '#030712' : '#f9fafb',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.setFontSize(14);
      pdf.text(`Depot-Analyse – ${filename}`, 14, 12);
      pdf.setFontSize(9);
      pdf.text(`Erstellt am ${new Date().toLocaleDateString('de-DE')} | Gesamtwert: ${fmt(totals.totalWert)} | Depot-Yield: ${totals.weightedYield.toFixed(2)}%`, 14, 20);

      // Add the captured screenshot
      const startY = 25;
      const availHeight = pdf.internal.pageSize.getHeight() - startY - 10;
      const scaledHeight = Math.min(pdfHeight, availHeight);
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
    const a = document.createElement('a');
    a.href = url;
    a.download = `depot-analyse-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b dark:border-gray-800 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-center gap-3">
          <FileSpreadsheet size={20} className="text-blue-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate">Depot Analyzer</div>
            <div className="text-xs text-gray-500 truncate">{filename} · {positions.length} Positionen · {fmt(totals.totalWert)}</div>
          </div>

          {/* Quick KPIs */}
          <div className="hidden md:flex items-center gap-4 text-xs">
            <div><span className="opacity-50">Yield: </span><span className="font-semibold">{totals.weightedYield.toFixed(2)}%</span></div>
            <div><span className="opacity-50">Jährl. Div: </span><span className="font-semibold text-green-600 dark:text-green-400">{fmt(totals.totalAnnualDiv)}</span></div>
            <div><span className="opacity-50">Monatl. Ø: </span><span className="font-semibold">{fmt(totals.totalMonthlyDiv)}</span></div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Download size={12} /> CSV
            </button>
            <button
              onClick={exportPDF}
              disabled={exporting}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {exporting ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Download size={12} />}
              PDF
            </button>
            <button
              onClick={onToggleDark}
              className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              onClick={onReset}
              className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Neue Datei laden"
            >
              <Upload size={14} />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-screen-2xl mx-auto px-4 flex gap-1 overflow-x-auto pb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main ref={contentRef} className="max-w-screen-2xl mx-auto px-4 py-6">
        {activeTab === 'overview' && <OverviewTab positions={positions} />}
        {activeTab === 'dividends' && <DividendTab positions={positions} />}
        {activeTab === 'cagr' && <CAGRTab positions={positions} />}
        {activeTab === 'savings' && <SavingsTab positions={positions} />}
        {activeTab === 'calendar' && <CalendarTab positions={positions} />}
        {activeTab === 'rankings' && <RankingTab positions={positions} />}
        {activeTab === 'findings' && <FindingsTab positions={positions} />}
        {activeTab === 'projection' && <ProjectionTab positions={positions} />}
      </main>

      <footer className="max-w-screen-2xl mx-auto px-4 py-4 text-xs text-gray-400 text-center">
        Depot Analyzer – Rein informative Darstellung, keine Finanzberatung. Alle Daten stammen aus der hochgeladenen Excel-Datei.
      </footer>
    </div>
  );
}
