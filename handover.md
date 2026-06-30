# Handover – depot-analyzer

**Datum:** 2026-06-30
**Branch:** `claude/data-insights-recommendations-172j1m`
**Repo:** `looped83/depot-analyzer`
**Build:** `npx tsc --noEmit` → 0 Fehler

---

## Tech Stack

| Technologie | Version |
|---|---|
| React | 19.2 |
| TypeScript | 6.0 |
| Vite | 8 |
| Tailwind CSS | v4 |
| Recharts | 3.8.1 |
| lucide-react | 1.17 |
| xlsx / jspdf / html2canvas | aktuelle Versionen |

Sprache der UI: Deutsch (`de-DE` Formatierung via `Intl.NumberFormat`).

---

## Was in dieser Session gemacht wurde

### Feature-Entwicklung (frühere Commits auf diesem Branch)

- `MotivationTab.tsx` neu angelegt – Gamification, Meilensteine, Streaks
- `DepotCheckTab.tsx` neu angelegt – strukturierter Depot-Gesundheits-Check
- `insights.ts` komplett neu (507 Zeilen) – `computeHealthScore`, `generateRecommendations`, `computeFreibetrag`, `computeAchievements`
- `findings.ts` stark erweitert – regelbasierte Findings-Engine mit Kategorien `danger / warning / info / success`
- Alle 13 bestehenden Tabs mit tieferen Analysen, Effizienz-Scores und Handlungsempfehlungen angereichert
- Einheitliches Chart-Design via `src/lib/chartTheme.ts` (`PALETTE`, `AXIS`, `GRID`, `BAR_CURSOR`) sitewide ausgerollt
- Freibetrag überall auf **2.000 €** (verheiratet / gemeinsam veranlagt) angehoben
- Dunkelmodus-Tooltips, Slider-Units, Zielplanung mit 2.000 €-Preset

### Clean-Code & Bug-Fixing (letzte 3 Commits)

**Commit `54def39` – Build-Fehler behoben:**
- `RebalancingTab.tsx` und `DiversificationTab.tsx`: `BAR_CURSOR` fehlte im Import → `Cannot find name 'BAR_CURSOR'` Build-Fehler

**Commit `59da450` – Dead Code & Inkonsistenz:**
- `OverviewTab.tsx`: lokale doppelte `PALETTE`-Konstante durch Import aus `chartTheme` ersetzt
- `calculations.ts`: unbenutzte `normalize()`-Funktion und toten Export entfernt
- `WatchlistTab.tsx`: komplett gelöscht (Tab war aus Dashboard entfernt, Datei war orphaned)
- `insights.ts`: `computeAchievements` Freibetrag-Meilenstein von 1.000 € → 2.000 € korrigiert

**Commit `570c6cc` – Round-2 Clean-up:**
- `findings.ts` Zeile 114: Doppel-Punkt-Bug in `zero-data`-Detail-String behoben (`...join(', ')}.` + `. Diese...` → korrekt getrennt)
- `findings.ts`: `FREIBETRAG = 2000` als Named Constant extrahiert (war als Magic Number `1000` / `800` verstreut)
- `format.ts`: unbenutzter Export `fmtInt` entfernt (funktional identisch mit `fmtNum(v, 0)`)
- `types.ts`: unbenutzte Interfaces `ProjectionScenario` und `RankingEntry` entfernt
- `KPICard.tsx`: unbenutztes `color`-Prop aus `Props`-Interface entfernt (war deklariert, aber nie destrukturiert oder angewendet)
- `OverviewTab.tsx`: `aggregateBy(positions,'broker')` wurde doppelt aufgerufen (einmal für `data=`, einmal für `Cell`-Mapping) → Ergebnis einmalig in `byBroker` gespeichert

---

## Aktueller Zustand der wichtigsten Dateien

### `src/lib/`

| Datei | Zustand |
|---|---|
| `types.ts` | Sauber – `DepotPosition`, `ProjectionParams`, `MonthlyIncome`, `TabId` |
| `format.ts` | Sauber – `fmt`, `fmtPct`, `fmtNum` (kein Dead Code mehr) |
| `calculations.ts` | Sauber – `parsePaymentMonths`, `computeDividendScore`, `calculateDerived`, `computeTotals`, `computeMonthlyCalendar`, `computeProjection` |
| `chartTheme.ts` | Sauber – `PALETTE`, `AXIS`, `GRID`, `BAR_CURSOR` |
| `insights.ts` | Vollständig – Health Score, Empfehlungen, Freibetrag (2.000 €), Achievements |
| `findings.ts` | Vollständig – Regelbasierte Findings mit Named Constant `FREIBETRAG = 2000` |
| `parser.ts` | Unverändert – CSV/XLSX-Parser |

### `src/components/tabs/`

15 aktive Tab-Komponenten (WatchlistTab entfernt):

```
OverviewTab, DividendTab, CAGRTab, SavingsTab, CalendarTab,
RankingTab, FindingsTab, DepotCheckTab, MotivationTab,
ProjectionTab, DiversificationTab, SafetyTab, GoalTab,
RebalancingTab, QualityTab
```

### `src/components/`

- `KPICard.tsx` – Kein ungenutztes `color`-Prop mehr
- `Card.tsx`, `ChartTooltip.tsx`, `SortableTable` – unverändert

---

## Fachliche Domänen-Konventionen

- **Freibetrag:** 2.000 € (verheiratet / gemeinsam veranlagt) – gilt in `findings.ts`, `insights.ts`, `GoalTab.tsx`
- **Steuer:** Kapitalertragsteuer + SolZ = **26,375 %** flat
- **Dividend Score:** 40 % normierter Yield + 40 % normierter CAGR + 10 % Frequenz-Score + 10 % Priorität/Status
- **Chowder Score:** `yield + cagr5j` (einfach, ungewichtet)
- **HHI:** Summe der quadrierten Portfolio-Gewichte; < 1.000 = gut, > 2.500 = hoch konzentriert
- **Ausschüttungsfrequenz Scores:** monatlich = 3, quartalsweise = 2, jährlich = 1 (implizit via `freqScore`)
- Alle Geldwerte in **EUR**, alle Prozente als Prozent-Zahl (z.B. `2.24` für 2,24 %)
- **Status-Werte:** `Aufbau`, `Erledigt`, `Beobachten`, `Verkauf`
- **Prio-Werte:** `A`, `B`, `C`, `D`, `E`, `null`

---

## Offene Punkte / mögliche nächste Schritte

1. **Tests:** Keine Unit-Tests vorhanden. Kritische Logik in `calculations.ts` und `findings.ts` wäre ein guter Einstieg (insbesondere `computeDividendScore`, `parsePaymentMonths`, Freibetrag-Logik).
2. **PR erstellen:** Der aktuelle Branch `claude/data-insights-recommendations-172j1m` ist noch nicht als Pull Request gegen `main` geöffnet.
3. **Deployment:** GitHub Pages auto-deployt bei Merge auf `main`.
4. **`parser.ts`:** Noch nicht im Rahmen dieser Session geprüft – könnte weitere Aufräumarbeiten vertragen.
5. **`DepotCheckTab.tsx`:** Wurde neu angelegt, aber noch nicht im gleichen Maß wie andere Tabs poliert.
6. **Responsive Mobile:** Wurde nicht explizit getestet, Tailwind-Klassen sind vorhanden aber ungeprüft auf kleinen Viewports.

---

## Wichtige Muster / Pitfalls

- `BAR_CURSOR` **muss** in jeden Tab importiert werden, der einen `<Tooltip cursor={...}>` auf einem BarChart hat – fehlt er, entsteht ein weißes Rechteck beim Hover (war der ursprüngliche Build-Fehler in dieser Session).
- `aggregateBy()` ist lokal in `OverviewTab` definiert; `groupBy()` ist lokal in `DiversificationTab` – **nicht** aus `calculations.ts`. Sollte eine dritte Komponente dasselbe brauchen, wäre eine Auslagerung in eine Util-Datei sinnvoll.
- `fmtNum(v, 0)` ersetzt vollständig das entfernte `fmtInt` – bei Suche/Replace beachten.
- Recharts 3.x erwartet `isAnimationActive={false}` auf Treemap explizit, sonst gibt es Performance-Warnungen.
