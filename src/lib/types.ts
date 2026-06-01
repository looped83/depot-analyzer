export interface DepotPosition {
  zyklus: number | null;
  symbol: string;
  name: string;
  status: 'Aufbau' | 'Erledigt' | 'Beobachten' | 'Verkauf' | string;
  prio: 'A' | 'B' | 'C' | 'D' | null;
  broker: string;
  wert: number;
  yield: number;       // Yield % (raw decimal or percentage – stored as percent, e.g. 2.24)
  cagr5j: number;      // CAGR 5J % stored as percent e.g. 9.42
  sparbetrag: number;
  rating: string;      // emoji string e.g. "🟢 62"
  ratingScore: number; // extracted numeric score
  ausschuettungsfrequenz: 'monatlich' | 'quartalsweise' | 'jährlich' | string;
  ausschuettungsmonate: string;
  freqScore: number;
  isin: string;
  wkn: string;
  typ: 'Aktie' | 'ETF' | 'BDC' | 'ETP' | string;
  kategorie: 'Income' | 'Growth' | 'High Yield' | 'Accumulation' | string;

  // Computed fields
  annualDividend: number;     // wert * yield / 100
  monthlyDividend: number;    // annualDividend / 12
  portfolioWeight: number;    // wert / totalWert
  dividendContribution: number; // annualDividend / totalAnnualDividend
  dividendScore: number;      // composite score 0-100
  chowderScore: number;       // yield + cagr5j
}

export interface ProjectionParams {
  dividendGrowthRate: number;    // % per year, e.g. 5
  monthlySavings: number;        // € per month
  reinvest: boolean;
  capitalGrowthRate: number;     // % per year
}

export interface ProjectionScenario {
  label: string;
  dividendGrowthRate: number;
  capitalGrowthRate: number;
}

export interface MonthlyIncome {
  month: number; // 1-12
  label: string;
  expectedIncome: number;
  positions: string[];
}

export interface RankingEntry {
  symbol: string;
  name: string;
  value: number;
  score?: number;
  label?: string;
}

export type TabId =
  | 'overview'
  | 'dividends'
  | 'cagr'
  | 'savings'
  | 'calendar'
  | 'rankings'
  | 'findings'
  | 'projection'
  | 'diversification'
  | 'safety'
  | 'watchlist'
  | 'goal'
  | 'rebalancing'
  | 'quality';
