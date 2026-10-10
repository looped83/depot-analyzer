import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, TrendingUp, BarChart2, PiggyBank, Calendar, Trophy, Lightbulb,
  LineChart, PieChart, ShieldCheck, Target, Sliders, Star, HeartPulse, Sparkles, Activity,
} from 'lucide-react';
import type { TabId } from './types';

export interface NavTab { id: TabId; label: string; icon: LucideIcon }
export interface NavGroup { id: string; label: string; short: string; icon: LucideIcon; tabs: NavTab[] }

// 16 tabs in 5 groups. `short` is the label in the mobile bottom bar.
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'depot', label: 'Depot', short: 'Depot', icon: LayoutDashboard,
    tabs: [
      { id: 'overview', label: 'Übersicht', icon: LayoutDashboard },
      { id: 'performance', label: 'Performance', icon: Activity },
      { id: 'rankings', label: 'Rankings', icon: Trophy },
    ],
  },
  {
    id: 'dividends', label: 'Dividenden', short: 'Dividenden', icon: TrendingUp,
    tabs: [
      { id: 'dividends', label: 'Analyse', icon: TrendingUp },
      { id: 'calendar', label: 'Kalender', icon: Calendar },
      { id: 'motivation', label: 'Motivation', icon: Sparkles },
    ],
  },
  {
    id: 'growth', label: 'Wachstum & Planung', short: 'Planung', icon: LineChart,
    tabs: [
      { id: 'cagr', label: 'Wachstum', icon: BarChart2 },
      { id: 'savings', label: 'Sparpläne', icon: PiggyBank },
      { id: 'projection', label: 'Ausblick', icon: LineChart },
      { id: 'goal', label: 'Zielplanung', icon: Target },
    ],
  },
  {
    id: 'analysis', label: 'Analyse & Risiko', short: 'Risiko', icon: ShieldCheck,
    tabs: [
      { id: 'diversification', label: 'Diversifikation', icon: PieChart },
      { id: 'safety', label: 'Sicherheit', icon: ShieldCheck },
      { id: 'quality', label: 'Qualität', icon: Star },
      { id: 'depot-check', label: 'Depot-Check', icon: HeartPulse },
    ],
  },
  {
    id: 'actions', label: 'Empfehlungen', short: 'Aktionen', icon: Lightbulb,
    tabs: [
      { id: 'findings', label: 'Hinweise', icon: Lightbulb },
      { id: 'rebalancing', label: 'Rebalancing', icon: Sliders },
    ],
  },
];

export const groupOf = (tab: TabId): NavGroup =>
  NAV_GROUPS.find((g) => g.tabs.some((t) => t.id === tab)) ?? NAV_GROUPS[0];

export const tabLabel = (tab: TabId): string =>
  groupOf(tab).tabs.find((t) => t.id === tab)?.label ?? '';

export const isTabId = (v: string): v is TabId => NAV_GROUPS.some((g) => g.tabs.some((t) => t.id === v));
