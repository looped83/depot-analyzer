import { describe, it, expect } from 'vitest';
import { calculateDerived } from '../calculations';
import { generateFindings } from '../findings';
import { fmtNum } from '../format';
import { makePosition } from './testUtils';

const byId = (findings: ReturnType<typeof generateFindings>, id: string) =>
  findings.find((f) => f.id === id);

describe('generateFindings', () => {
  it('flags top-5 concentration above 50 % as a warning, otherwise info', () => {
    const concentrated = calculateDerived([
      makePosition({ symbol: 'BIG', wert: 90000, yield: 3 }),
      makePosition({ symbol: 'SML', wert: 10000, yield: 3 }),
    ]);
    expect(byId(generateFindings(concentrated), 'concentration-top5')?.category).toBe('warning');

    const spread = calculateDerived(
      Array.from({ length: 20 }, (_, i) =>
        makePosition({ symbol: `P${i}`, wert: 1000, yield: 3 })),
    );
    expect(byId(generateFindings(spread), 'concentration-top5')?.category).toBe('info');
  });

  it('lists positions with yield above 6 % as potential risks', () => {
    const depot = calculateDerived([
      makePosition({ symbol: 'HIGH', wert: 1000, yield: 8 }),
      makePosition({ symbol: 'NORM', wert: 1000, yield: 3 }),
    ]);
    const finding = byId(generateFindings(depot), 'high-yield');
    expect(finding?.symbols).toEqual(['HIGH']);
  });

  it('reports the exceeded Sparerpauschbetrag with formatted tax amount', () => {
    // 100.000 € at 3 % → 3.000 € dividend → 1.000 € taxable → 263,75 € tax
    const depot = calculateDerived([makePosition({ wert: 100000, yield: 3 })]);
    const finding = byId(generateFindings(depot), 'freibetrag-exceeded');
    expect(finding).toBeDefined();
    expect(finding!.detail).toContain(`${fmtNum(3000)} €`); // "3.000 €" incl. separator
    expect(finding!.detail).toContain(`${fmtNum(263.75)} €`);
    expect(byId(generateFindings(depot), 'freibetrag-near')).toBeUndefined();
  });

  it('reports the allowance as nearly used between 80 % and 100 %', () => {
    const depot = calculateDerived([makePosition({ wert: 100000, yield: 1.8 })]); // 1.800 €
    const findings = generateFindings(depot);
    expect(byId(findings, 'freibetrag-near')?.category).toBe('success');
    expect(byId(findings, 'freibetrag-exceeded')).toBeUndefined();
  });

  it('celebrates 3+ monthly payers', () => {
    const depot = calculateDerived([
      ...['M1', 'M2', 'M3'].map((s) =>
        makePosition({ symbol: s, wert: 1000, yield: 4, ausschuettungsfrequenz: 'monatlich' })),
      makePosition({ symbol: 'Q1', wert: 1000, yield: 3 }),
    ]);
    const finding = byId(generateFindings(depot), 'monthly-payers');
    expect(finding?.category).toBe('success');
    expect(finding?.symbols).toEqual(['M1', 'M2', 'M3']);
  });

  it('flags Prio-A Aufbau positions without a savings plan', () => {
    const depot = calculateDerived([
      makePosition({ symbol: 'AAA', wert: 1000, yield: 3, prio: 'A', status: 'Aufbau', sparbetrag: 0 }),
      makePosition({ symbol: 'BBB', wert: 1000, yield: 3, prio: 'A', status: 'Aufbau', sparbetrag: 50 }),
    ]);
    const finding = byId(generateFindings(depot), 'prio-a-unsaved');
    expect(finding?.symbols).toEqual(['AAA']);
  });
});
