import type { DepotPosition } from './types';
import { computeTotals, computeMonthlyCalendar, computeProjection, topDividendContributors } from './calculations';

export interface HealthDimension {
  key: string;
  label: string;
  score: number;
  detail: string;
  tips: string[];
}

export interface ActionRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  effort: 'einfach' | 'mittel' | 'aufwändig';
  symbols?: string[];
}

export interface Achievement {
  id: string;
  label: string;
  description: string;
  icon: string;
  reached: boolean;
  progress: number;
  current: string;
  target: string;
}

export interface MotivationMetrics {
  netflixAbos: number;
  spotifyAbos: number;
  handyVertraege: number;
  autoLaden: number;
  urlaubsTage: number;
  lebensmittelTage: number;
  workHoursPerMonth: number;
  freedomDegree: number;
  dailyPassiveIncome: number;
}

export function computeHealthScore(positions: DepotPosition[]): {
  overall: number;
  dimensions: HealthDimension[];
} {
  const active = positions.filter(p => p.wert > 0);
  const calendar = computeMonthlyCalendar(positions);
  const totalWert = active.reduce((s, p) => s + p.wert, 0);
  const total = positions.length || 1;

  const hhi = active.reduce((s, p) => s + p.portfolioWeight ** 2, 0);
  const divScore = hhi < 500 ? 100 : hhi < 1000 ? 80 : hhi < 1500 ? 60 : hhi < 2500 ? 40 : 20;

  const payerCount = active.filter(p => p.yield > 0).length;
  const incomeStabilityScore = Math.min(100, payerCount * 5);

  const weightedCagr = totalWert > 0
    ? active.reduce((s, p) => s + p.cagr5j * (p.wert / totalWert), 0) : 0;
  const growthScore = weightedCagr >= 10 ? 100 : weightedCagr >= 7 ? 80
    : weightedCagr >= 5 ? 65 : weightedCagr >= 3 ? 45 : 25;

  const withYield = positions.filter(p => p.yield > 0).length;
  const withIsin = positions.filter(p => !!p.isin).length;
  const withPrio = positions.filter(p => !!p.prio).length;
  const withMonths = positions.filter(p => !!p.ausschuettungsmonate).length;
  const dataQuality = ((withYield / total + withIsin / total + withPrio / total + withMonths / total) / 4) * 100;

  const riskPositions = active.filter(p =>
    p.yield > 9 || (p.cagr5j < 0 && p.cagr5j !== 0) || p.status === 'Verkauf');
  const watchPositions = active.filter(p =>
    p.yield > 6.5 || (p.cagr5j > 0 && p.cagr5j < 2) || p.status === 'Beobachten');
  const riskPct = active.length > 0 ? (riskPositions.length / active.length) * 100 : 0;
  const watchPct = active.length > 0 ? (watchPositions.length / active.length) * 100 : 0;
  const riskScore = Math.max(0, 100 - riskPct * 5 - watchPct * 2);

  const aufbauWithSpar = positions.filter(p => p.status === 'Aufbau' && p.sparbetrag > 0).length;
  const aufbauTotal = positions.filter(p => p.status === 'Aufbau').length;
  const prioAWithSpar = positions.filter(p => p.prio === 'A' && p.sparbetrag > 0).length;
  const prioATotal = positions.filter(p => p.prio === 'A').length;
  const sparEfficiency = aufbauTotal > 0
    ? (aufbauWithSpar / aufbauTotal) * 60 + (prioATotal > 0 ? (prioAWithSpar / prioATotal) * 40 : 40)
    : 50;

  const monthlyIncomes = calendar.map(m => m.expectedIncome);
  const avgMonthly = monthlyIncomes.reduce((s, v) => s + v, 0) / 12;
  const variance = monthlyIncomes.reduce((s, v) => s + (v - avgMonthly) ** 2, 0) / 12;
  const cv = avgMonthly > 0 ? Math.sqrt(variance) / avgMonthly : 1;
  const cashflowScore = cv < 0.15 ? 100 : cv < 0.3 ? 80 : cv < 0.5 ? 60 : cv < 0.8 ? 40 : 20;

  const weightedChowder = totalWert > 0
    ? active.reduce((s, p) => s + p.chowderScore * (p.wert / totalWert), 0) : 0;
  const chowderScore = weightedChowder >= 15 ? 100 : weightedChowder >= 12 ? 85
    : weightedChowder >= 9 ? 65 : weightedChowder >= 6 ? 45 : 25;

  const dimensions: HealthDimension[] = [
    {
      key: 'diversification', label: 'Diversifikation', score: divScore,
      detail: `HHI: ${hhi.toFixed(0)} · ${active.length} aktive Positionen`,
      tips: divScore < 60
        ? ['Untergewichtete Positionen aufstocken', 'Neue Branchen/Regionen beimischen']
        : ['Gute Streuung beibehalten'],
    },
    {
      key: 'incomeStability', label: 'Einkommensstabilität', score: incomeStabilityScore,
      detail: `${payerCount} verschiedene Dividendenzahler`,
      tips: incomeStabilityScore < 60
        ? ['Mehr Dividendenzahler aufnehmen', 'Monatliche Zahler bevorzugen']
        : ['Stabile Einkommensbasis vorhanden'],
    },
    {
      key: 'growthPotential', label: 'Wachstumspotenzial', score: growthScore,
      detail: `Gewichteter CAGR: ${weightedCagr.toFixed(1)} %`,
      tips: growthScore < 60
        ? ['Positionen mit CAGR > 7 % aufstocken', 'Dividenden-Aristokraten in Betracht ziehen']
        : ['Solides Wachstum im Depot'],
    },
    {
      key: 'dataQuality', label: 'Datenqualität', score: dataQuality,
      detail: `${Math.round(dataQuality)} % der Felder befüllt`,
      tips: dataQuality < 80
        ? ['Fehlende ISINs nachtragen', 'Prioritäten für alle Positionen setzen', 'Ausschüttungsmonate ergänzen']
        : ['Gute Datenbasis vorhanden'],
    },
    {
      key: 'riskDistribution', label: 'Risikoverteilung', score: riskScore,
      detail: `${riskPositions.length} Risiko · ${watchPositions.length} Beobachten`,
      tips: riskScore < 60
        ? ['Risikopositionen prüfen und ggf. reduzieren', 'Yield-Trap-Positionen identifizieren']
        : ['Ausgewogene Risikoverteilung'],
    },
    {
      key: 'savingsEfficiency', label: 'Sparplan-Effizienz', score: sparEfficiency,
      detail: `${aufbauWithSpar}/${aufbauTotal} Aufbau-Positionen bespart`,
      tips: sparEfficiency < 60
        ? ['Sparpläne für Prio-A-Positionen einrichten', 'Übergewichtete Positionen nicht weiter besparen']
        : ['Sparpläne gut ausgerichtet'],
    },
    {
      key: 'cashflowSmoothness', label: 'Cashflow-Gleichmäßigkeit', score: cashflowScore,
      detail: `Variationskoeff.: ${(cv * 100).toFixed(0)} % · Ø ${avgMonthly.toFixed(0)} €/Monat`,
      tips: cashflowScore < 60
        ? ['Monatliche Zahler aufstocken', 'Quartalsweise Zahler mit verschiedenen Monaten kombinieren']
        : ['Gleichmäßiger Cashflow'],
    },
    {
      key: 'chowderQuality', label: 'Chowder-Qualität', score: chowderScore,
      detail: `Gewichteter Chowder: ${weightedChowder.toFixed(1)}`,
      tips: chowderScore < 60
        ? ['Positionen mit Chowder > 12 bevorzugen', 'Schwache Chowder-Werte durch bessere ersetzen']
        : ['Gute Yield/Growth-Balance'],
    },
  ];

  const overall = dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length;
  return { overall, dimensions };
}

export function generateRecommendations(positions: DepotPosition[]): ActionRecommendation[] {
  const recommendations: ActionRecommendation[] = [];
  const active = positions.filter(p => p.wert > 0);
  const totals = computeTotals(positions);
  const calendar = computeMonthlyCalendar(positions);

  const prioANoSpar = positions.filter(p => p.prio === 'A' && p.status === 'Aufbau' && p.sparbetrag === 0);
  for (const p of prioANoSpar) {
    const estDiv = 50 * 12 * (p.yield / 100);
    recommendations.push({
      id: `spar-${p.symbol}`, priority: 'high',
      title: `Sparplan für ${p.symbol} starten`,
      description: `${p.name} hat Prio A und ist im Aufbau, wird aber nicht bespart.`,
      impact: `+${estDiv.toFixed(0)} €/Jahr Dividende (bei 50 €/Monat)`,
      effort: 'einfach', symbols: [p.symbol],
    });
  }

  const overweightSaved = active.filter(p => p.portfolioWeight > 8 && p.sparbetrag > 0);
  for (const p of overweightSaved) {
    recommendations.push({
      id: `overweight-${p.symbol}`, priority: 'medium',
      title: `Sparplan ${p.symbol} pausieren`,
      description: `${p.name} hat ${p.portfolioWeight.toFixed(1)} % Gewicht und wird weiter mit ${p.sparbetrag} €/Zyklus bespart. Kapital in untergewichtete Prio-A-Positionen umlenken.`,
      impact: 'Bessere Diversifikation, Risikoreduktion',
      effort: 'einfach', symbols: [p.symbol],
    });
  }

  const avgMonthly = calendar.reduce((s, m) => s + m.expectedIncome, 0) / 12;
  const weakMonths = calendar.filter(m => m.expectedIncome < avgMonthly * 0.5);
  if (weakMonths.length > 0) {
    recommendations.push({
      id: 'weak-months', priority: 'medium',
      title: `Cashflow-Lücken schließen (${weakMonths.map(m => m.label).join(', ')})`,
      description: `${weakMonths.length} Monate unter 50 % des Ø-Cashflows. Monatliche oder quartalsweise Zahler mit passenden Monaten füllen die Lücken.`,
      impact: 'Gleichmäßigerer monatlicher Cashflow',
      effort: 'mittel',
    });
  }

  const traps = active.filter(p => p.yield > 6 && p.cagr5j < 2 && p.cagr5j >= 0);
  if (traps.length > 0) {
    recommendations.push({
      id: 'dividend-traps', priority: 'high',
      title: 'Mögliche Dividend Traps prüfen',
      description: `${traps.map(p => p.symbol).join(', ')} haben hohe Yields (>6 %) aber kaum Dividendenwachstum. Das kann auf eine bevorstehende Kürzung hindeuten.`,
      impact: 'Risikominimierung, Kapitalschutz',
      effort: 'mittel', symbols: traps.map(p => p.symbol),
    });
  }

  const verkauf = active.filter(p => p.status === 'Verkauf');
  if (verkauf.length > 0) {
    const verkaufWert = verkauf.reduce((s, p) => s + p.wert, 0);
    recommendations.push({
      id: 'sell-pending', priority: 'high',
      title: 'Verkaufskandidaten umsetzen',
      description: `${verkauf.length} Positionen zum Verkauf markiert. Gebundenes Kapital: ${verkaufWert.toFixed(0)} €.`,
      impact: `${verkaufWert.toFixed(0)} € frei für Reinvestment`,
      effort: 'mittel', symbols: verkauf.map(p => p.symbol),
    });
  }

  const topCandidates = positions
    .filter(p => p.wert === 0 && p.prio && ['A', 'B'].includes(p.prio))
    .sort((a, b) => b.dividendScore - a.dividendScore).slice(0, 3);
  if (topCandidates.length > 0) {
    recommendations.push({
      id: 'buy-candidates', priority: 'medium',
      title: 'Top-Kandidaten ins Depot aufnehmen',
      description: `${topCandidates.map(p => `${p.symbol} (Prio ${p.prio})`).join(', ')} stehen auf der Watchlist mit hoher Priorität.`,
      impact: 'Portfolio-Diversifikation verbessern',
      effort: 'mittel', symbols: topCandidates.map(p => p.symbol),
    });
  }

  const missingData = positions.filter(p => p.wert > 0 && (!p.prio || !p.ausschuettungsmonate || p.yield === 0));
  if (missingData.length > 3) {
    recommendations.push({
      id: 'data-quality', priority: 'low',
      title: 'Datenqualität verbessern',
      description: `${missingData.length} aktive Positionen haben unvollständige Daten. Vollständige Daten verbessern alle Analysen.`,
      impact: 'Genauere Analysen und Empfehlungen',
      effort: 'einfach', symbols: missingData.slice(0, 5).map(p => p.symbol),
    });
  }

  if (totals.totalSparbetrag > 0 && totals.totalSparbetrag < totals.totalWert * 0.005) {
    recommendations.push({
      id: 'increase-savings', priority: 'low',
      title: 'Sparrate erhöhen',
      description: `Die aktuelle Sparrate (${totals.totalSparbetrag} €/Zyklus) beträgt weniger als 0,5 % des Depotwerts. Eine höhere Rate beschleunigt den Vermögensaufbau erheblich.`,
      impact: 'Schnellerer Vermögensaufbau durch Zinseszins',
      effort: 'mittel',
    });
  }

  if (totals.totalMonthlyDiv > 50) {
    recommendations.push({
      id: 'reinvest-dividends', priority: 'low',
      title: 'Dividenden systematisch reinvestieren',
      description: `Mit ${totals.totalMonthlyDiv.toFixed(0)} € monatlicher Dividende lohnt sich die systematische Wiederanlage. Der Schneeball-Effekt verstärkt das Wachstum exponentiell.`,
      impact: 'Zinseszins-Effekt auf Dividenden',
      effort: 'einfach',
    });
  }

  const { top: top3DivContrib, pct: top3Pct } = topDividendContributors(active, 3);
  if (top3Pct > 50) {
    recommendations.push({
      id: 'income-concentration', priority: 'medium',
      title: 'Einkommensabhängigkeit reduzieren',
      description: `Top 3 Positionen (${top3DivContrib.map(p => p.symbol).join(', ')}) liefern ${top3Pct.toFixed(0)} % der gesamten Dividende. Mehr Diversifikation bei den Dividendenzahlern senkt das Ausfallrisiko.`,
      impact: 'Stabileres Einkommen bei Dividendenkürzungen',
      effort: 'mittel', symbols: top3DivContrib.map(p => p.symbol),
    });
  }

  const prioOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return recommendations.sort((a, b) => (prioOrder[a.priority] ?? 99) - (prioOrder[b.priority] ?? 99));
}

export function computeMotivationMetrics(positions: DepotPosition[]): MotivationMetrics {
  const totals = computeTotals(positions);
  const annualDiv = totals.totalAnnualDiv;
  const monthlyDiv = totals.totalMonthlyDiv;

  const NETFLIX = 13.99;
  const SPOTIFY = 11.99;
  const HANDY = 30;
  const AUTO_LADEN = 25;
  const URLAUB = 100;
  const LEBENSMITTEL = 15;
  const MIN_WAGE = 12.82;
  const LIVING = 2000;

  return {
    netflixAbos: monthlyDiv / NETFLIX,
    spotifyAbos: monthlyDiv / SPOTIFY,
    handyVertraege: monthlyDiv / HANDY,
    autoLaden: monthlyDiv / AUTO_LADEN,
    urlaubsTage: annualDiv / URLAUB,
    lebensmittelTage: annualDiv / LEBENSMITTEL,
    workHoursPerMonth: monthlyDiv / MIN_WAGE,
    freedomDegree: (monthlyDiv / LIVING) * 100,
    dailyPassiveIncome: annualDiv / 365,
  };
}

export function computeAchievements(positions: DepotPosition[]): Achievement[] {
  const totals = computeTotals(positions);
  const active = positions.filter(p => p.wert > 0);
  const calendar = computeMonthlyCalendar(positions);
  const monthsWithIncome = calendar.filter(m => m.expectedIncome > 0).length;
  const monthlyPayers = active.filter(p => p.ausschuettungsfrequenz === 'monatlich').length;
  const prioACount = active.filter(p => p.prio === 'A').length;
  const brokers = new Set(active.map(p => p.broker)).size;

  return [
    {
      id: 'first-100-monthly', label: '100 € / Monat',
      description: 'Erste 100 € monatliche Dividende',
      icon: '🎯',
      reached: totals.totalMonthlyDiv >= 100,
      progress: Math.min(100, (totals.totalMonthlyDiv / 100) * 100),
      current: `${totals.totalMonthlyDiv.toFixed(0)} €`, target: '100 €',
    },
    {
      id: 'first-250-monthly', label: '250 € / Monat',
      description: '250 € monatliche Dividende',
      icon: '💪',
      reached: totals.totalMonthlyDiv >= 250,
      progress: Math.min(100, (totals.totalMonthlyDiv / 250) * 100),
      current: `${totals.totalMonthlyDiv.toFixed(0)} €`, target: '250 €',
    },
    {
      id: 'first-500-monthly', label: '500 € / Monat',
      description: '500 € monatliche Dividende',
      icon: '🚀',
      reached: totals.totalMonthlyDiv >= 500,
      progress: Math.min(100, (totals.totalMonthlyDiv / 500) * 100),
      current: `${totals.totalMonthlyDiv.toFixed(0)} €`, target: '500 €',
    },
    {
      id: 'first-1000-monthly', label: '1.000 € / Monat',
      description: '1.000 € monatliche Dividende – ein Meilenstein!',
      icon: '🏆',
      reached: totals.totalMonthlyDiv >= 1000,
      progress: Math.min(100, (totals.totalMonthlyDiv / 1000) * 100),
      current: `${totals.totalMonthlyDiv.toFixed(0)} €`, target: '1.000 €',
    },
    {
      id: 'twelve-months', label: '12 Monate Cashflow',
      description: 'In jedem Monat Dividende erhalten',
      icon: '📅',
      reached: monthsWithIncome >= 12,
      progress: (monthsWithIncome / 12) * 100,
      current: `${monthsWithIncome} Monate`, target: '12 Monate',
    },
    {
      id: 'ten-positions', label: '10 Positionen',
      description: '10 aktive Positionen im Depot',
      icon: '📊',
      reached: active.length >= 10,
      progress: Math.min(100, (active.length / 10) * 100),
      current: `${active.length}`, target: '10',
    },
    {
      id: 'twenty-positions', label: '20 Positionen',
      description: '20 aktive Positionen im Depot',
      icon: '🎲',
      reached: active.length >= 20,
      progress: Math.min(100, (active.length / 20) * 100),
      current: `${active.length}`, target: '20',
    },
    {
      id: 'depot-10k', label: '10k € Depot',
      description: 'Depotwert über 10.000 €',
      icon: '💰',
      reached: totals.totalWert >= 10000,
      progress: Math.min(100, (totals.totalWert / 10000) * 100),
      current: `${(totals.totalWert / 1000).toFixed(1)}k`, target: '10k',
    },
    {
      id: 'depot-50k', label: '50k € Depot',
      description: 'Depotwert über 50.000 €',
      icon: '💎',
      reached: totals.totalWert >= 50000,
      progress: Math.min(100, (totals.totalWert / 50000) * 100),
      current: `${(totals.totalWert / 1000).toFixed(1)}k`, target: '50k',
    },
    {
      id: 'depot-100k', label: '100k € Depot',
      description: 'Depotwert über 100.000 €',
      icon: '👑',
      reached: totals.totalWert >= 100000,
      progress: Math.min(100, (totals.totalWert / 100000) * 100),
      current: `${(totals.totalWert / 1000).toFixed(1)}k`, target: '100k',
    },
    {
      id: 'monthly-payers-5', label: '5 Monatszahler',
      description: '5 monatliche Dividendenzahler',
      icon: '🔄',
      reached: monthlyPayers >= 5,
      progress: Math.min(100, (monthlyPayers / 5) * 100),
      current: `${monthlyPayers}`, target: '5',
    },
    {
      id: 'freibetrag', label: 'Freibetrag',
      description: '2.000 € Sparerpauschbetrag ausgeschöpft (verheiratet)',
      icon: '🏛️',
      reached: totals.totalAnnualDiv >= 2000,
      progress: Math.min(100, (totals.totalAnnualDiv / 2000) * 100),
      current: `${totals.totalAnnualDiv.toFixed(0)} €`, target: '2.000 €/Jahr',
    },
    {
      id: 'prio-a-five', label: '5 Prio-A',
      description: '5 Kernpositionen mit Prio A',
      icon: '⭐',
      reached: prioACount >= 5,
      progress: Math.min(100, (prioACount / 5) * 100),
      current: `${prioACount}`, target: '5',
    },
    {
      id: 'multi-broker', label: 'Multi-Broker',
      description: 'Depot auf 2+ Broker verteilt',
      icon: '🏦',
      reached: brokers >= 2,
      progress: Math.min(100, (brokers / 2) * 100),
      current: `${brokers}`, target: '2+',
    },
  ];
}

export function computeSnowballEffect(positions: DepotPosition[], years = 20): {
  year: number;
  withReinvest: number;
  withoutReinvest: number;
  dividendWith: number;
  dividendWithout: number;
}[] {
  const totals = computeTotals(positions);
  const params = {
    dividendGrowthRate: 5,
    monthlySavings: totals.totalSparbetrag,
    capitalGrowthRate: 6,
  };

  const withR = computeProjection(positions, { ...params, reinvest: true }, years);
  const withoutR = computeProjection(positions, { ...params, reinvest: false }, years);

  return withR.map((w, i) => ({
    year: w.year,
    withReinvest: w.portfolioValue,
    withoutReinvest: withoutR[i]?.portfolioValue ?? 0,
    dividendWith: w.annualDividend,
    dividendWithout: withoutR[i]?.annualDividend ?? 0,
  }));
}

export function computeStressTest(positions: DepotPosition[], cutPct: number): {
  currentAnnualDiv: number;
  stressedAnnualDiv: number;
  lostIncome: number;
  affectedSymbols: string[];
} {
  const active = positions.filter(p => p.wert > 0);
  const sorted = [...active].sort((a, b) => b.annualDividend - a.annualDividend);
  const top5 = sorted.slice(0, 5);
  const currentAnnualDiv = active.reduce((s, p) => s + p.annualDividend, 0);
  const top5Div = top5.reduce((s, p) => s + p.annualDividend, 0);
  const lostIncome = top5Div * (cutPct / 100);

  return {
    currentAnnualDiv,
    stressedAnnualDiv: currentAnnualDiv - lostIncome,
    lostIncome,
    affectedSymbols: top5.map(p => p.symbol),
  };
}

export function computeFreibetrag(positions: DepotPosition[]): {
  annualDiv: number;
  freibetrag: number;
  used: number;
  remaining: number;
  taxable: number;
  taxAmount: number;
} {
  const totals = computeTotals(positions);
  const freibetrag = 2000;
  const used = Math.min(totals.totalAnnualDiv, freibetrag);
  const taxable = Math.max(0, totals.totalAnnualDiv - freibetrag);
  const taxAmount = taxable * 0.26375;

  return {
    annualDiv: totals.totalAnnualDiv,
    freibetrag,
    used,
    remaining: Math.max(0, freibetrag - totals.totalAnnualDiv),
    taxable,
    taxAmount,
  };
}
