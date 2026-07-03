import { describe, it, expect } from 'vitest';
import { calculateDerived } from '../calculations';
import {
  computeFreibetrag,
  computeHealthScore,
  computeStressTest,
  computeSnowballEffect,
  computeAchievements,
  generateRecommendations,
} from '../insights';
import { fmtNum } from '../format';
import { makePosition } from './testUtils';

/** Depot with a fixed annual dividend: wert 100.000 € at `yieldPct` %. */
const depotWithAnnualDiv = (annual: number) =>
  calculateDerived([makePosition({ wert: 100000, yield: annual / 1000 })]);

describe('computeFreibetrag', () => {
  it('stays tax-free below the 2.000 € allowance', () => {
    const info = computeFreibetrag(depotWithAnnualDiv(1500));
    expect(info.freibetrag).toBe(2000);
    expect(info.used).toBeCloseTo(1500);
    expect(info.remaining).toBeCloseTo(500);
    expect(info.taxable).toBe(0);
    expect(info.taxAmount).toBe(0);
  });

  it('taxes the amount above the allowance at 26,375 %', () => {
    const info = computeFreibetrag(depotWithAnnualDiv(3000));
    expect(info.used).toBe(2000);
    expect(info.remaining).toBe(0);
    expect(info.taxable).toBeCloseTo(1000);
    expect(info.taxAmount).toBeCloseTo(263.75);
  });
});

describe('computeHealthScore', () => {
  const depot = calculateDerived([
    makePosition({ symbol: 'A', wert: 5000, yield: 3, cagr5j: 8, prio: 'A', isin: 'X', ausschuettungsmonate: 'Jan | Apr | Jul | Okt', ratingScore: 60, sparbetrag: 100 }),
    makePosition({ symbol: 'B', wert: 5000, yield: 4, cagr5j: 5, prio: 'B', isin: 'Y', ausschuettungsmonate: 'Feb | Mai | Aug | Nov', ratingScore: 50 }),
    makePosition({ symbol: 'C', wert: 5000, yield: 2, cagr5j: 9, status: 'Pause' }),
  ]);

  it('returns 8 dimensions and an overall average', () => {
    const health = computeHealthScore(depot);
    expect(health.dimensions).toHaveLength(8);
    const avg = health.dimensions.reduce((s, d) => s + d.score, 0) / 8;
    expect(health.overall).toBeCloseTo(avg);
  });

  it('marks a dimension as good only at a true 100 and always provides tips', () => {
    // Invariant behind the Depot-Check "Tipp:" chips: anything below 100 must
    // surface an actionable tip, only a full score gets the all-good message.
    for (const d of computeHealthScore(depot).dimensions) {
      expect(d.isGood).toBe(d.score >= 100);
      expect(d.tips.length).toBeGreaterThan(0);
    }
  });
});

describe('computeStressTest', () => {
  it('cuts the top-5 dividend payers by the given percentage', () => {
    const depot = calculateDerived(
      // 6 positions, annual dividends 600/500/400/300/200/100 €
      [6, 5, 4, 3, 2, 1].map((y, i) =>
        makePosition({ symbol: `P${i}`, wert: 10000, yield: y })),
    );
    const result = computeStressTest(depot, 20);
    expect(result.currentAnnualDiv).toBeCloseTo(2100);
    expect(result.affectedSymbols).toEqual(['P0', 'P1', 'P2', 'P3', 'P4']);
    expect(result.lostIncome).toBeCloseTo(2000 * 0.2); // top 5 pay 2.000 €
    expect(result.stressedAnnualDiv).toBeCloseTo(2100 - 400);
  });
});

describe('computeSnowballEffect', () => {
  it('projects years+1 rows where reinvesting beats not reinvesting', () => {
    const depot = calculateDerived([makePosition({ wert: 50000, yield: 3 })]);
    const rows = computeSnowballEffect(depot, 20);
    expect(rows).toHaveLength(21);
    expect(rows[20].withReinvest).toBeGreaterThan(rows[20].withoutReinvest);
  });
});

describe('computeAchievements', () => {
  it('marks the Freibetrag achievement at 2.000 € annual dividend', () => {
    const reached = computeAchievements(depotWithAnnualDiv(2400));
    expect(reached.find((a) => a.id === 'freibetrag')?.reached).toBe(true);
    const notReached = computeAchievements(depotWithAnnualDiv(1000));
    const a = notReached.find((x) => x.id === 'freibetrag');
    expect(a?.reached).toBe(false);
    expect(a?.progress).toBeCloseTo(50);
  });
});

describe('generateRecommendations', () => {
  it('recommends starting a savings plan for unsaved Prio-A Aufbau positions', () => {
    const depot = calculateDerived([
      makePosition({ symbol: 'AAA', wert: 1000, yield: 3, prio: 'A', status: 'Aufbau', sparbetrag: 0 }),
    ]);
    const recs = generateRecommendations(depot);
    expect(recs.some((r) => r.id === 'spar-AAA' && r.priority === 'high')).toBe(true);
  });

  it('formats the locked capital of sell candidates with thousands separators', () => {
    const depot = calculateDerived([
      makePosition({ symbol: 'SEL', wert: 35272, yield: 3, status: 'Verkauf' }),
      makePosition({ symbol: 'OK', wert: 5000, yield: 3 }),
    ]);
    const rec = generateRecommendations(depot).find((r) => r.id === 'sell-pending');
    expect(rec).toBeDefined();
    expect(rec!.description).toContain(`${fmtNum(35272)} €`); // "35.272 €"
  });

  it('sorts recommendations by priority (high before medium before low)', () => {
    const depot = calculateDerived([
      makePosition({ symbol: 'AAA', wert: 1000, yield: 3, prio: 'A', status: 'Aufbau' }),
      makePosition({ symbol: 'BIG', wert: 100000, yield: 2, sparbetrag: 50 }), // overweight + saved
    ]);
    const recs = generateRecommendations(depot);
    const order = { high: 0, medium: 1, low: 2 } as const;
    const ranks = recs.map((r) => order[r.priority]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });
});
