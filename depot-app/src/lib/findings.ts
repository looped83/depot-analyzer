import type { DepotPosition } from './types';
import { computeTotals, computeMonthlyCalendar } from './calculations';

export interface Finding {
  id: string;
  category: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  detail: string;
  symbols?: string[];
}

export function generateFindings(positions: DepotPosition[]): Finding[] {
  const findings: Finding[] = [];
  const totals = computeTotals(positions);
  const calendar = computeMonthlyCalendar(positions);

  // Sort by wert for convenience
  const byWert = [...positions].sort((a, b) => b.wert - a.wert);
  const byScore = [...positions].sort((a, b) => b.dividendScore - a.dividendScore);
  const byYield = [...positions].sort((a, b) => b.yield - a.yield);
  const byCagr = [...positions].sort((a, b) => b.cagr5j - a.cagr5j);
  const active = positions.filter((p) => p.wert > 0);

  // Konzentrationsrisiko Top 5
  const top5Weight = byWert.slice(0, 5).reduce((s, p) => s + p.portfolioWeight, 0);
  const top10Weight = byWert.slice(0, 10).reduce((s, p) => s + p.portfolioWeight, 0);
  const top5Names = byWert.slice(0, 5).map((p) => `${p.symbol} (${p.portfolioWeight.toFixed(1)}%)`);

  if (top5Weight > 50) {
    findings.push({
      id: 'concentration-top5',
      category: 'warning',
      title: 'Hohe Konzentration: Top 5 Positionen',
      detail: `Deine Top 5 Positionen machen ${top5Weight.toFixed(1)}% des Gesamtdepots aus. Das ist ein erhöhtes Klumpenrisiko. Erwäge, besonders große Positionen nicht weiter zu besparen und untergewichtete Qualitätspositionen aufzubauen.`,
      symbols: byWert.slice(0, 5).map((p) => p.symbol),
    });
  } else {
    findings.push({
      id: 'concentration-top5',
      category: 'info',
      title: 'Konzentration: Top 5 Positionen',
      detail: `Deine Top 5 Positionen (${top5Names.join(', ')}) machen ${top5Weight.toFixed(1)}% des Depots aus. Top 10 zusammen: ${top10Weight.toFixed(1)}%.`,
      symbols: byWert.slice(0, 5).map((p) => p.symbol),
    });
  }

  // Stärkste Einkommensbringer
  const top3Div = [...active].sort((a, b) => b.annualDividend - a.annualDividend).slice(0, 3);
  findings.push({
    id: 'top-income',
    category: 'success',
    title: 'Stärkste Einkommensbringer',
    detail: `${top3Div.map((p) => `${p.name} (${p.annualDividend.toFixed(0)} €/Jahr, ${p.yield.toFixed(2)}% Yield)`).join(' | ')}. Diese drei Positionen generieren zusammen ${top3Div.reduce((s, p) => s + p.annualDividend, 0).toFixed(0)} € jährliche Dividende.`,
    symbols: top3Div.map((p) => p.symbol),
  });

  // Beste Wachstumswerte nach CAGR
  const top3Cagr = active.filter((p) => p.cagr5j > 0).sort((a, b) => b.cagr5j - a.cagr5j).slice(0, 3);
  if (top3Cagr.length > 0) {
    findings.push({
      id: 'top-growth',
      category: 'success',
      title: 'Stärkste Wachstumswerte (CAGR 5J)',
      detail: `${top3Cagr.map((p) => `${p.name} (CAGR: ${p.cagr5j.toFixed(1)}%)`).join(' | ')}.`,
      symbols: top3Cagr.map((p) => p.symbol),
    });
  }

  // Schwächste Werte nach Dividend Score
  const worst3 = byScore.filter((p) => p.wert > 0).slice(-3);
  if (worst3.length > 0) {
    findings.push({
      id: 'weak-score',
      category: 'warning',
      title: 'Positionen mit schwachem Dividend Score',
      detail: `${worst3.map((p) => `${p.name} (Score: ${p.dividendScore})`).join(' | ')}. Diese Positionen sollten genauer analysiert werden.`,
      symbols: worst3.map((p) => p.symbol),
    });
  }

  // Yield > 6%
  const highYield = active.filter((p) => p.yield > 6);
  if (highYield.length > 0) {
    findings.push({
      id: 'high-yield',
      category: 'warning',
      title: `${highYield.length} Position(en) mit Yield > 6%`,
      detail: `Hohe Yields können auf Substanzverzehr oder erhöhtes Risiko hinweisen: ${highYield.map((p) => `${p.symbol} (${p.yield.toFixed(1)}%)`).join(', ')}. Prüfe die Dividendenkontinuität.`,
      symbols: highYield.map((p) => p.symbol),
    });
  }

  // CAGR < 3% (aber > 0)
  const lowCagr = active.filter((p) => p.cagr5j > 0 && p.cagr5j < 3);
  if (lowCagr.length > 0) {
    findings.push({
      id: 'low-cagr',
      category: 'warning',
      title: `${lowCagr.length} Position(en) mit schwachem Dividendenwachstum (CAGR < 3%)`,
      detail: `${lowCagr.map((p) => `${p.symbol} (${p.cagr5j.toFixed(1)}%)`).join(', ')}. Niedriges Dividendenwachstum kann die reale Kaufkraft des Einkommens langfristig erodieren.`,
      symbols: lowCagr.map((p) => p.symbol),
    });
  }

  // Positionen mit Yield = 0 oder CAGR = 0
  const zeroData = positions.filter((p) => p.wert > 0 && (p.yield === 0 || p.cagr5j === 0));
  if (zeroData.length > 0) {
    const zeroYield = zeroData.filter((p) => p.yield === 0).map((p) => p.symbol);
    const zeroCagr = zeroData.filter((p) => p.cagr5j === 0).map((p) => p.symbol);
    findings.push({
      id: 'zero-data',
      category: 'danger',
      title: 'Fehlende Daten: Yield oder CAGR = 0',
      detail: `${zeroYield.length > 0 ? `Yield = 0: ${zeroYield.join(', ')}. ` : ''}${zeroCagr.length > 0 ? `CAGR = 0: ${zeroCagr.join(', ')}.` : ''}. Diese Werte sollten überprüft werden, da sie die Analysequalität beeinflussen.`,
      symbols: zeroData.map((p) => p.symbol),
    });
  }

  // Hoher Wert, niedriger Score
  const highValueLowScore = active
    .filter((p) => p.portfolioWeight > 5 && p.dividendScore < 50)
    .sort((a, b) => b.portfolioWeight - a.portfolioWeight);
  if (highValueLowScore.length > 0) {
    findings.push({
      id: 'high-value-low-score',
      category: 'warning',
      title: 'Große Positionen mit niedrigem Dividend Score',
      detail: `${highValueLowScore.map((p) => `${p.name} (Gewicht: ${p.portfolioWeight.toFixed(1)}%, Score: ${p.dividendScore})`).join(' | ')}. Diese Positionen binden viel Kapital, liefern aber unterdurchschnittliche Scores.`,
      symbols: highValueLowScore.map((p) => p.symbol),
    });
  }

  // Monate mit schwachem Cashflow
  const avgMonthlyIncome = calendar.reduce((s, m) => s + m.expectedIncome, 0) / 12;
  const weakMonths = calendar.filter((m) => m.expectedIncome < avgMonthlyIncome * 0.5);
  if (weakMonths.length > 0) {
    findings.push({
      id: 'weak-months',
      category: 'info',
      title: `${weakMonths.length} Monat(e) mit unterdurchschnittlichem Cashflow`,
      detail: `${weakMonths.map((m) => m.label).join(', ')} haben weniger als 50% des monatlichen Durchschnitts (Ø ${avgMonthlyIncome.toFixed(0)} €). Erwäge monatliche Zahler hinzuzufügen, um den Cashflow zu glätten.`,
    });
  }

  // Broker-Konzentration
  const brokerMap = new Map<string, number>();
  for (const p of positions) {
    brokerMap.set(p.broker, (brokerMap.get(p.broker) ?? 0) + p.wert);
  }
  const dominantBroker = [...brokerMap.entries()].sort((a, b) => b[1] - a[1]);
  if (dominantBroker[0] && (dominantBroker[0][1] / totals.totalWert) > 0.6) {
    findings.push({
      id: 'broker-concentration',
      category: 'info',
      title: `Brokerkonzentration: ${dominantBroker[0][0]}`,
      detail: `${((dominantBroker[0][1] / totals.totalWert) * 100).toFixed(1)}% deines Depots liegen bei ${dominantBroker[0][0]}. Eine Verteilung auf mehrere Broker kann die Plattformabhängigkeit reduzieren.`,
    });
  }

  // Positionen mit Prio A, die nicht bespart werden
  const prioAUnderSaved = positions.filter(
    (p) => p.prio === 'A' && p.status === 'Aufbau' && p.sparbetrag === 0
  );
  if (prioAUnderSaved.length > 0) {
    findings.push({
      id: 'prio-a-unsaved',
      category: 'warning',
      title: 'Prio-A-Positionen ohne aktiven Sparplan',
      detail: `${prioAUnderSaved.map((p) => p.symbol).join(', ')} haben Priorität A, werden aber nicht bespart. Prüfe, ob dies beabsichtigt ist.`,
      symbols: prioAUnderSaved.map((p) => p.symbol),
    });
  }

  // Sparplan-Check: Hohe Gewichtung + weiter bespart
  const overweightSaved = positions.filter(
    (p) => p.portfolioWeight > 8 && p.sparbetrag > 0 && p.wert > 0
  );
  if (overweightSaved.length > 0) {
    findings.push({
      id: 'overweight-saved',
      category: 'info',
      title: 'Übergewichtete Positionen werden weiter bespart',
      detail: `${overweightSaved.map((p) => `${p.symbol} (${p.portfolioWeight.toFixed(1)}%, ${p.sparbetrag}€/Zyklus)`).join(' | ')}. Diese Positionen haben bereits ein hohes Gewicht – prüfe, ob die Sparpläne weiterhin sinnvoll sind.`,
      symbols: overweightSaved.map((p) => p.symbol),
    });
  }

  // Kategorie-Konzentration
  const katMap = new Map<string, number>();
  for (const p of positions) {
    katMap.set(p.kategorie, (katMap.get(p.kategorie) ?? 0) + p.wert);
  }
  const dominant = [...katMap.entries()].sort((a, b) => b[1] - a[1])[0];
  if (dominant && (dominant[1] / totals.totalWert) > 0.5) {
    findings.push({
      id: 'category-concentration',
      category: 'info',
      title: `Kategoriekonzentration: ${dominant[0]}`,
      detail: `${((dominant[1] / totals.totalWert) * 100).toFixed(1)}% des Depots entfallen auf die Kategorie "${dominant[0]}". Eine breitere Streuung könnte die Balance zwischen Einkommen und Wachstum verbessern.`,
    });
  }

  return findings;
}
