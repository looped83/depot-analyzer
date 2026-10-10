import { describe, it, expect } from 'vitest';
import { calculateDerived } from '../calculations';
import { riskTone, safetyScore, isDividendTrap, YIELD_HIGH, YIELD_RISK } from '../risk';
import { fieldCoverage, positionCompleteness } from '../quality';
import { rebalanceRows, buyCandidates } from '../rebalancing';
import { scoreTone, scoreLabel } from '../score';
import { DepotMetrics } from '../metrics';
import { rowsToPositions } from '../parser';
import { makePosition } from './testUtils';

describe('scoreTone / scoreLabel', () => {
  it('uses one scale for every 0–100 score', () => {
    expect([90, 75, 74, 50, 49, 25, 24].map(scoreTone)).toEqual(['success', 'success', 'info', 'info', 'warning', 'warning', 'danger']);
    expect(scoreLabel(60)).toBe('Solide');
  });
});

describe('risk', () => {
  it('classifies by status, yield and growth', () => {
    expect(riskTone(makePosition({ status: 'Verkauf', yield: 3, cagr5j: 8 }))).toBe('danger');
    expect(riskTone(makePosition({ yield: YIELD_RISK + 0.1, cagr5j: 8 }))).toBe('danger');
    expect(riskTone(makePosition({ yield: 3, cagr5j: -1 }))).toBe('danger');
    expect(riskTone(makePosition({ yield: YIELD_HIGH + 0.1, cagr5j: 8 }))).toBe('warning');
    expect(riskTone(makePosition({ yield: 3, cagr5j: 1 }))).toBe('warning');
    expect(riskTone(makePosition({ status: 'Beobachten', yield: 3, cagr5j: 8 }))).toBe('warning');
    expect(riskTone(makePosition({ yield: 3, cagr5j: 8 }))).toBe('success');
  });

  it('flags high yield without growth as a dividend trap', () => {
    expect(isDividendTrap(makePosition({ yield: 8, cagr5j: 1 }))).toBe(true);
    expect(isDividendTrap(makePosition({ yield: 8, cagr5j: 5 }))).toBe(false);
    expect(isDividendTrap(makePosition({ yield: 4, cagr5j: 1 }))).toBe(false);
  });

  it('keeps the safety score within 0–100', () => {
    expect(safetyScore(makePosition({ yield: 3, cagr5j: 10, prio: 'A' }))).toBe(90);
    expect(safetyScore(makePosition({ yield: 12, cagr5j: -3, prio: 'E', status: 'Verkauf' }))).toBe(0);
  });
});

describe('quality', () => {
  it('weights the five data fields to 100 %', () => {
    const full = makePosition({ yield: 3, isin: 'US0', prio: 'A', ausschuettungsmonate: 'Jan', ratingScore: 50 });
    expect(positionCompleteness(full)).toBe(100);
    expect(positionCompleteness(makePosition())).toBe(0);
  });

  it('reports per-field coverage and its average', () => {
    const cov = fieldCoverage([makePosition({ yield: 3 }), makePosition()]);
    expect(cov.fields.find((f) => f.label === 'Yield')?.pct).toBe(50);
    expect(cov.avg).toBe(10);
  });
});

describe('rebalancing', () => {
  const depot = calculateDerived([
    makePosition({ symbol: 'BIG', wert: 8000, prio: 'B', status: 'Aufbau' }),
    makePosition({ symbol: 'A1', wert: 1000, prio: 'A', status: 'Aufbau' }),
    makePosition({ symbol: 'SELL', wert: 1000, prio: 'A', status: 'Verkauf' }),
  ]);

  it('derives prio-weighted targets that sum to 100 %', () => {
    const rows = rebalanceRows(depot, 'prio');
    expect(rows.reduce((s, r) => s + r.targetPct, 0)).toBeCloseTo(100);
    expect(rows[0].deltaPct).toBeGreaterThan(rows[rows.length - 1].deltaPct);
  });

  it('only suggests underweight positions in build-up', () => {
    const buy = buyCandidates(rebalanceRows(depot, 'prio')).map((r) => r.symbol);
    expect(buy).toEqual(['A1']); // SELL is underweight too, but marked for sale
  });
});

describe('DepotMetrics', () => {
  it('computes shared results once and reuses them', () => {
    const m = new DepotMetrics(calculateDerived([makePosition({ wert: 1000, yield: 4, ausschuettungsmonate: 'Jan|Jul' })]));
    expect(m.totals).toBe(m.totals);
    expect(m.cashflow.monthsWithIncome).toBe(2);
    expect(m.cashflow.empty).toHaveLength(10);
  });
});

describe('rowsToPositions', () => {
  it('finds the header row and accepts column aliases', () => {
    const rows = [
      ['Mein Depot'],
      ['Symbol', 'Name', 'Wert (€)', 'Yield %', 'Bestand', 'Kaufpreis', 'Zyklus'],
      ['ABC', 'Alpha', 1000, 3.5, 10, 90, null],
      [null, 'Summe', 1000, null, null, null, null],
    ];
    const [p, ...rest] = rowsToPositions(rows);
    expect(rest).toHaveLength(0);
    expect(p).toMatchObject({ symbol: 'ABC', name: 'Alpha', wert: 1000, yield: 3.5, stueckzahl: 10, kaufkurs: 90, zyklus: null, status: 'Aufbau' });
  });

  it('rejects a sheet without a Symbol column', () => {
    expect(() => rowsToPositions([['Name', 'Wert'], ['Alpha', 1]])).toThrow(/Symbol/);
  });
});
