import type { DepotPosition, MonthlyIncome, ProjectionParams } from './types';

// Month name mapping for German month names
const MONTH_MAP: Record<string, number[]> = {
  jan: [1], feb: [2], mär: [3], mar: [3], apr: [4], mai: [5],
  jun: [6], jul: [7], aug: [8], sep: [9], okt: [10], nov: [11], dez: [12],
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

export function parsePaymentMonths(monate: string): number[] {
  if (!monate) return [];
  if (/jeden monat/i.test(monate)) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const found: number[] = [];
  // Split on | or , or space
  const parts = monate.split(/[\|,]+/).map((p) => p.trim().toLowerCase());
  for (const part of parts) {
    for (const [key, months] of Object.entries(MONTH_MAP)) {
      if (part.startsWith(key)) {
        found.push(...months);
        break;
      }
    }
  }
  return [...new Set(found)].sort((a, b) => a - b);
}

/**
 * Dividend Score = 40% norm. Yield + 40% norm. CAGR + 10% FreqScore (norm) + 10% Priorität/Status
 */
export function computeDividendScore(
  yieldPct: number,
  cagr: number,
  freqScore: number,
  prio: string | null,
  status: string,
  allYields: number[],
  allCagrs: number[],
  maxFreq: number
): number {
  if (allYields.length === 0 || allCagrs.length === 0) return 0;

  const yieldMin = Math.min(...allYields);
  const yieldMax = Math.max(...allYields);
  const cagrMin = Math.min(...allCagrs);
  const cagrMax = Math.max(...allCagrs);

  const normYield = yieldMax === yieldMin ? 0.5 : (yieldPct - yieldMin) / (yieldMax - yieldMin);
  const normCagr = cagrMax === cagrMin ? 0.5 : (cagr - cagrMin) / (cagrMax - cagrMin);
  const normFreq = maxFreq > 0 ? freqScore / maxFreq : 0;

  // Prio score: A=1.0, B=0.75, C=0.5, D=0.25, null=0.4
  const prioMap: Record<string, number> = { A: 1.0, B: 0.75, C: 0.5, D: 0.25, E: 0.1 };
  const prioScore = prio ? (prioMap[prio] ?? 0.4) : 0.4;

  // Status modifier
  const statusMod = status === 'Aufbau' ? 1.0 : status === 'Erledigt' ? 0.85 : status === 'Beobachten' ? 0.7 : 0.6;

  const raw = 0.4 * normYield + 0.4 * normCagr + 0.1 * normFreq + 0.1 * prioScore;
  return Math.min(100, Math.round(raw * statusMod * 100));
}

export function calculateDerived(positions: DepotPosition[]): DepotPosition[] {
  // Only positions with wert > 0 for portfolio weight calculation
  const totalWert = positions.reduce((s, p) => s + p.wert, 0);
  const totalAnnualDiv = positions.reduce((s, p) => s + p.wert * (p.yield / 100), 0);

  const allYields = positions.map((p) => p.yield);
  const allCagrs = positions.map((p) => p.cagr5j);
  const maxFreq = 3;

  return positions.map((p) => {
    const annualDividend = p.wert * (p.yield / 100);
    const monthlyDividend = annualDividend / 12;
    const portfolioWeight = totalWert > 0 ? (p.wert / totalWert) * 100 : 0;
    const dividendContribution = totalAnnualDiv > 0 ? (annualDividend / totalAnnualDiv) * 100 : 0;
    const chowderScore = p.yield + p.cagr5j;
    const dividendScore = computeDividendScore(
      p.yield, p.cagr5j, p.freqScore, p.prio, p.status,
      allYields, allCagrs, maxFreq
    );

    return {
      ...p,
      annualDividend,
      monthlyDividend,
      portfolioWeight,
      dividendContribution,
      chowderScore,
      dividendScore,
    };
  });
}

export function computeTotals(positions: DepotPosition[]) {
  const totalWert = positions.reduce((s, p) => s + p.wert, 0);
  const totalAnnualDiv = positions.reduce((s, p) => s + p.annualDividend, 0);
  const totalMonthlyDiv = totalAnnualDiv / 12;
  const weightedYield = totalWert > 0 ? (totalAnnualDiv / totalWert) * 100 : 0;
  const totalSparbetrag = positions.reduce((s, p) => s + p.sparbetrag, 0);
  const avgCagr = positions.filter(p => p.cagr5j > 0).reduce((s, p, _, a) => s + p.cagr5j / a.length, 0);

  return {
    totalWert,
    totalAnnualDiv,
    totalMonthlyDiv,
    weightedYield,
    totalSparbetrag,
    avgCagr,
    positionCount: positions.length,
  };
}

export function computeMonthlyCalendar(positions: DepotPosition[]): MonthlyIncome[] {
  const calendar: MonthlyIncome[] = MONTH_NAMES.map((label, i) => ({
    month: i + 1,
    label,
    expectedIncome: 0,
    positions: [],
  }));

  for (const p of positions) {
    if (p.wert <= 0 || p.yield <= 0) continue;
    const payMonths = parsePaymentMonths(p.ausschuettungsmonate);
    if (payMonths.length === 0) continue;

    const incomePerPayment = p.annualDividend / payMonths.length;

    for (const m of payMonths) {
      if (m < 1 || m > 12) continue;
      calendar[m - 1].expectedIncome += incomePerPayment;
      calendar[m - 1].positions.push(p.symbol);
    }
  }

  return calendar;
}

export function computeProjection(
  positions: DepotPosition[],
  params: ProjectionParams,
  years: number
): { year: number; portfolioValue: number; annualDividend: number; cumSavings: number }[] {
  const { dividendGrowthRate, monthlySavings, reinvest, capitalGrowthRate } = params;
  const totals = computeTotals(positions);

  let portfolioValue = totals.totalWert;
  let annualDividend = totals.totalAnnualDiv;
  const results = [];

  for (let y = 0; y <= years; y++) {
    results.push({
      year: new Date().getFullYear() + y,
      portfolioValue: Math.round(portfolioValue),
      annualDividend: Math.round(annualDividend),
      cumSavings: Math.round(y * 12 * monthlySavings),
    });

    if (y < years) {
      const savingsAdded = monthlySavings * 12;
      const divGrowth = annualDividend * (dividendGrowthRate / 100);
      const reinvestedDiv = reinvest ? annualDividend : 0;

      portfolioValue = portfolioValue * (1 + capitalGrowthRate / 100)
        + savingsAdded
        + reinvestedDiv;

      annualDividend = (annualDividend + divGrowth)
        + savingsAdded * (totals.weightedYield / 100);
    }
  }

  return results;
}

