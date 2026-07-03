import { describe, it, expect } from 'vitest';
import {
  ASSUMED_MONTHLY_INVESTMENT,
  parsePaymentMonths,
  computeDividendScore,
  calculateDerived,
  computeTotals,
  computeMonthlyCalendar,
  computeProjection,
  topDividendContributors,
  type ScoreRanges,
} from '../calculations';
import { makePosition } from './testUtils';

describe('ASSUMED_MONTHLY_INVESTMENT', () => {
  it('is the documented 4.200 € (3× 1.000 € Einmalkäufe + 1.200 € Sparpläne)', () => {
    expect(ASSUMED_MONTHLY_INVESTMENT).toBe(4200);
  });
});

describe('parsePaymentMonths', () => {
  it('returns [] for empty input', () => {
    expect(parsePaymentMonths('')).toEqual([]);
  });

  it('expands "Jeden Monat" to all 12 months', () => {
    expect(parsePaymentMonths('Jeden Monat')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('parses pipe-separated German month names', () => {
    expect(parsePaymentMonths('Mär | Jun | Sep | Dez')).toEqual([3, 6, 9, 12]);
    expect(parsePaymentMonths('Feb | Mai | Aug | Nov')).toEqual([2, 5, 8, 11]);
  });

  it('parses comma-separated month names', () => {
    expect(parsePaymentMonths('Jan, Apr, Jul, Okt')).toEqual([1, 4, 7, 10]);
  });

  it('matches full month names by prefix', () => {
    expect(parsePaymentMonths('Januar | März | Dezember')).toEqual([1, 3, 12]);
  });

  it('dedupes and sorts', () => {
    expect(parsePaymentMonths('Dez | Jan | Jan')).toEqual([1, 12]);
  });

  it('ignores unknown tokens', () => {
    expect(parsePaymentMonths('Foo | Mai')).toEqual([5]);
  });
});

describe('computeDividendScore', () => {
  const ranges: ScoreRanges = { yieldMin: 0, yieldMax: 10, cagrMin: 0, cagrMax: 10 };
  const best = (status: string) =>
    computeDividendScore(10, 10, 3, 'A', status, ranges, 3);

  it('scores a best-in-depot Prio-A Aufbau position at 100', () => {
    // normYield 1 + normCagr 1 + freq 3/3 + prio A → raw 1.0, Aufbau modifier 1.0
    expect(best('Aufbau')).toBe(100);
  });

  it('applies the documented status modifiers', () => {
    expect(best('Erledigt')).toBe(85);
    expect(best('Pause')).toBe(85); // holding, not a sell signal
    expect(best('Beobachten')).toBe(70);
    expect(best('Verkauf')).toBe(60);
  });

  it('gives unknown statuses a neutral fallback instead of the Verkauf penalty', () => {
    const unknown = best('Irgendwas');
    expect(unknown).toBe(75);
    expect(unknown).toBeGreaterThan(best('Verkauf'));
  });

  it('falls back to 0.5 normalization when all yields/CAGRs are equal', () => {
    const flat: ScoreRanges = { yieldMin: 3, yieldMax: 3, cagrMin: 5, cagrMax: 5 };
    // raw = 0.4*0.5 + 0.4*0.5 + 0.1*0 + 0.1*0.4 (prio null) = 0.44 → Aufbau → 44
    expect(computeDividendScore(3, 5, 0, null, 'Aufbau', flat, 3)).toBe(44);
  });

  it('ranks prios A > B > C > D > E with otherwise identical inputs', () => {
    const scoreFor = (prio: string | null) =>
      computeDividendScore(5, 5, 2, prio, 'Aufbau', ranges, 3);
    const [a, b, c, d, e] = ['A', 'B', 'C', 'D', 'E'].map(scoreFor);
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
    expect(c).toBeGreaterThan(d);
    expect(d).toBeGreaterThan(e);
  });
});

describe('calculateDerived', () => {
  it('returns [] for an empty depot', () => {
    expect(calculateDerived([])).toEqual([]);
  });

  it('computes dividend fields from wert and yield', () => {
    const [p] = calculateDerived([makePosition({ wert: 10000, yield: 3 })]);
    expect(p.annualDividend).toBe(300);
    expect(p.monthlyDividend).toBe(25);
  });

  it('computes chowder score as yield + cagr5j', () => {
    const [p] = calculateDerived([makePosition({ wert: 100, yield: 4.5, cagr5j: 7.5 })]);
    expect(p.chowderScore).toBe(12);
  });

  it('portfolio weights and dividend contributions each sum to 100 %', () => {
    const derived = calculateDerived([
      makePosition({ symbol: 'A', wert: 6000, yield: 2 }),
      makePosition({ symbol: 'B', wert: 3000, yield: 4 }),
      makePosition({ symbol: 'C', wert: 1000, yield: 6 }),
    ]);
    const weightSum = derived.reduce((s, p) => s + p.portfolioWeight, 0);
    const contribSum = derived.reduce((s, p) => s + p.dividendContribution, 0);
    expect(weightSum).toBeCloseTo(100);
    expect(contribSum).toBeCloseTo(100);
    expect(derived[0].portfolioWeight).toBe(60);
  });

  it('computes cost basis and P&L when Kaufkurs/Stückzahl are present', () => {
    const [p] = calculateDerived([
      makePosition({ wert: 1200, stueckzahl: 10, kaufkurs: 100 }),
    ]);
    expect(p.einstandswert).toBe(1000);
    expect(p.aktuellerKurs).toBe(120);
    expect(p.gewinnVerlust).toBe(200);
    expect(p.gewinnVerlustPct).toBe(20);
  });

  it('guards P&L fields when no cost basis exists (stueckzahl 0)', () => {
    const [p] = calculateDerived([makePosition({ wert: 1200 })]);
    expect(p.einstandswert).toBe(0);
    expect(p.aktuellerKurs).toBe(0);
    expect(p.gewinnVerlust).toBe(0);
    expect(p.gewinnVerlustPct).toBe(0);
  });
});

describe('computeTotals', () => {
  it('returns zeros for an empty depot without dividing by zero', () => {
    const t = computeTotals([]);
    expect(t.totalWert).toBe(0);
    expect(t.weightedYield).toBe(0);
    expect(t.avgCagr).toBe(0);
    expect(t.positionCount).toBe(0);
  });

  it('computes value-weighted yield', () => {
    const derived = calculateDerived([
      makePosition({ wert: 9000, yield: 2 }),
      makePosition({ wert: 1000, yield: 12 }),
    ]);
    const t = computeTotals(derived);
    // (9000*0.02 + 1000*0.12) / 10000 = 3 %
    expect(t.weightedYield).toBeCloseTo(3);
    expect(t.totalAnnualDiv).toBeCloseTo(300);
    expect(t.totalMonthlyDiv).toBeCloseTo(25);
  });

  it('averages CAGR only over positions with cagr5j > 0', () => {
    const derived = calculateDerived([
      makePosition({ wert: 100, cagr5j: 10 }),
      makePosition({ wert: 100, cagr5j: 6 }),
      makePosition({ wert: 100, cagr5j: 0 }),
    ]);
    expect(computeTotals(derived).avgCagr).toBeCloseTo(8);
  });
});

describe('computeMonthlyCalendar', () => {
  it('always returns 12 months with German labels', () => {
    const calendar = computeMonthlyCalendar([]);
    expect(calendar).toHaveLength(12);
    expect(calendar[0].label).toBe('Jan');
    expect(calendar[11].label).toBe('Dez');
    expect(calendar.every((m) => m.expectedIncome === 0)).toBe(true);
  });

  it('splits the annual dividend evenly across the payment months', () => {
    const derived = calculateDerived([
      makePosition({ wert: 10000, yield: 4, ausschuettungsmonate: 'Mär | Jun | Sep | Dez' }),
    ]);
    const calendar = computeMonthlyCalendar(derived);
    expect(calendar[2].expectedIncome).toBeCloseTo(100); // 400 € / 4 payments
    expect(calendar[2].positions).toEqual(['TST']);
    expect(calendar[0].expectedIncome).toBe(0);
  });

  it('skips positions without value, yield, or parseable months', () => {
    const derived = calculateDerived([
      makePosition({ wert: 0, yield: 4, ausschuettungsmonate: 'Jan' }),
      makePosition({ wert: 1000, yield: 0, ausschuettungsmonate: 'Jan' }),
      makePosition({ wert: 1000, yield: 4, ausschuettungsmonate: '' }),
    ]);
    const calendar = computeMonthlyCalendar(derived);
    expect(calendar.every((m) => m.expectedIncome === 0)).toBe(true);
  });
});

describe('computeProjection', () => {
  const depot = calculateDerived([makePosition({ wert: 100000, yield: 3, cagr5j: 5 })]);
  const params = { dividendGrowthRate: 5, monthlySavings: 1000, reinvest: true, capitalGrowthRate: 6 };

  it('starts year 0 at the current depot state and calendar year', () => {
    const [first] = computeProjection(depot, params, 5);
    expect(first.year).toBe(new Date().getFullYear());
    expect(first.portfolioValue).toBe(100000);
    expect(first.annualDividend).toBe(3000);
    expect(first.cumSavings).toBe(0);
  });

  it('returns years + 1 rows and accumulates savings linearly', () => {
    const rows = computeProjection(depot, params, 5);
    expect(rows).toHaveLength(6);
    expect(rows[5].cumSavings).toBe(5 * 12 * 1000);
  });

  it('grows the portfolio faster with dividend reinvestment than without', () => {
    const withR = computeProjection(depot, params, 10);
    const withoutR = computeProjection(depot, { ...params, reinvest: false }, 10);
    expect(withR[10].portfolioValue).toBeGreaterThan(withoutR[10].portfolioValue);
  });
});

describe('topDividendContributors', () => {
  it('returns the top n contributors and their combined share', () => {
    const derived = calculateDerived([
      makePosition({ symbol: 'BIG', wert: 10000, yield: 6 }),   // 600 €
      makePosition({ symbol: 'MID', wert: 10000, yield: 3 }),   // 300 €
      makePosition({ symbol: 'SML', wert: 10000, yield: 1 }),   // 100 €
    ]);
    const { top, pct } = topDividendContributors(derived, 2);
    expect(top.map((p) => p.symbol)).toEqual(['BIG', 'MID']);
    expect(pct).toBeCloseTo(90); // 900 € of 1.000 €
  });
});
