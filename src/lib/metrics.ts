import type { DepotPosition } from './types';
import { computeTotals, computeMonthlyCalendar, topDividendContributors } from './calculations';
import { computeHealthScore, computeFreibetrag, generateRecommendations, computeStressTest } from './insights';
import { generateFindings } from './findings';
import { riskTone, safetyScore } from './risk';
import { rebalanceRows, buyCandidates, type Strategy } from './rebalancing';

export type RiskRow = DepotPosition & { risk: ReturnType<typeof riskTone>; safety: number };

/**
 * All depot-wide derived data, computed lazily and at most once per upload.
 * Positions never change after parsing, so tabs share these results instead of
 * recomputing them on every (re)mount.
 */
export class DepotMetrics {
  readonly positions: DepotPosition[];
  #cache = new Map<string, unknown>();

  constructor(positions: DepotPosition[]) {
    this.positions = positions;
  }

  #memo<T>(key: string, fn: () => T): T {
    if (!this.#cache.has(key)) this.#cache.set(key, fn());
    return this.#cache.get(key) as T;
  }

  get active() { return this.#memo('active', () => this.positions.filter((p) => p.wert > 0)); }
  get bySymbol() { return this.#memo('bySymbol', () => new Map(this.positions.map((p) => [p.symbol, p]))); }
  get totals() { return this.#memo('totals', () => computeTotals(this.positions)); }
  get health() { return this.#memo('health', () => computeHealthScore(this.positions)); }
  get freibetrag() { return this.#memo('freibetrag', () => computeFreibetrag(this.positions)); }
  get calendar() { return this.#memo('calendar', () => computeMonthlyCalendar(this.positions)); }
  get recommendations() { return this.#memo('recs', () => generateRecommendations(this.positions)); }
  get findings() { return this.#memo('findings', () => generateFindings(this.positions)); }
  get top3Dividend() { return this.#memo('top3Div', () => topDividendContributors(this.active, 3)); }

  stress(cutPct: number) {
    return this.#memo(`stress${cutPct}`, () => computeStressTest(this.positions, cutPct));
  }

  /** Active positions sorted by weight, largest first. */
  get byWeight() {
    return this.#memo('byWeight', () => [...this.active].sort((a, b) => b.portfolioWeight - a.portfolioWeight));
  }

  /** Herfindahl-Hirschman index of the active positions (0–10.000). */
  get hhi() { return this.#memo('hhi', () => this.active.reduce((s, p) => s + p.portfolioWeight ** 2, 0)); }

  get top5Weight() {
    return this.#memo('top5', () => this.byWeight.slice(0, 5).reduce((s, p) => s + p.portfolioWeight, 0));
  }

  /** Weighted (by value) average of a per-position number across active positions. */
  weighted(key: 'cagr5j' | 'chowderScore' | 'dividendScore' | 'yield'): number {
    return this.#memo(`w-${key}`, () => {
      const total = this.totals.totalWert;
      return total > 0 ? this.active.reduce((s, p) => s + p[key] * (p.wert / total), 0) : 0;
    });
  }

  get riskRows(): RiskRow[] {
    return this.#memo('risk', () => this.active.map((p) => ({ ...p, risk: riskTone(p), safety: safetyScore(p) })));
  }

  /** Monthly cash-flow spread: average, coefficient of variation and gap months. */
  get cashflow() {
    return this.#memo('cashflow', () => {
      const cal = this.calendar;
      const avg = cal.reduce((s, m) => s + m.expectedIncome, 0) / 12;
      const sd = Math.sqrt(cal.reduce((s, m) => s + (m.expectedIncome - avg) ** 2, 0) / 12);
      const paying = cal.filter((m) => m.expectedIncome > 0);
      return {
        avg,
        cv: avg > 0 ? (sd / avg) * 100 : 0,
        best: cal.reduce((a, b) => (b.expectedIncome > a.expectedIncome ? b : a)),
        worst: paying.length ? paying.reduce((a, b) => (b.expectedIncome < a.expectedIncome ? b : a)) : undefined,
        monthsWithIncome: paying.length,
        weak: cal.filter((m) => m.expectedIncome > 0 && m.expectedIncome < avg * 0.5),
        empty: cal.filter((m) => m.expectedIncome === 0),
      };
    });
  }

  rebalance(strategy: Strategy) {
    return this.#memo(`reb-${strategy}`, () => rebalanceRows(this.active, strategy));
  }

  buyCandidates(strategy: Strategy = 'prio') {
    return this.#memo(`buy-${strategy}`, () => buyCandidates(this.rebalance(strategy)));
  }
}
