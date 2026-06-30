# Handover – depot-analyzer

**Datum:** 2026-06-30
**Branch:** `claude/data-insights-recommendations-172j1m`
**Repo:** `looped83/depot-analyzer`
**Build:** `npx tsc --noEmit` → 0 Fehler · `npx eslint .` → 0 Fehler · `npm run build` → erfolgreich

---

## Update (gleicher Tag, Folgepass): npm audit + Mobile/Responsive

### npm audit
- **vite-Finding war kein Major-Upgrade nötig** (anders als im ursprünglichen Handover vermutet): `npm audit fix` hat `vite` 8.0.15 → 8.1.2 gehoben (reines Patch-Release, kein Rolldown-Migrationsrisiko). Beide High-Severity-Findings dadurch behoben.
- **xlsx** weiterhin ungefixt: Gepatchte Version (0.19.3+) existiert nur über `cdn.sheetjs.com`, nicht über npm – SheetJS pflegt das npm-Paket nicht mehr. Nutzer-Entscheidung: **so belassen** (Risiko gering, da nur lokal hochgeladene Dateien geparst werden). Falls das nochmal aufkommt: Optionen waren (a) so lassen, (b) auf CDN-Bezug wechseln (Supply-Chain-Trust-Frage), (c) Alternative Library (z. B. exceljs) prüfen.

### Mobile/Responsive – echter Bug gefunden und behoben: Dark-Only Mode war kaputt
Tailwind v4 bindet `dark:` standardmäßig an `prefers-color-scheme`, **nicht** an eine CSS-Klasse. Es fehlte `@custom-variant dark (&:where(.dark, .dark *));` in `index.css`. Das von `App.tsx` per JS gesetzte `.dark` auf `<html>` hatte dadurch **keine Wirkung** auf die ~20 Komponenten mit `dark:`-Klassen (500+ Stellen) – die App fiel auf Systemen mit hellem OS-Theme in einen kaputten Light/Dark-Mix zurück (nur hart codierte `bg-zinc-950`-Stellen wie `Dashboard.tsx` blieben dunkel). **Fix:** `@custom-variant dark (&:where(.dark, .dark *));` direkt nach `@import "tailwindcss";` ergänzt. Verifiziert mit Playwright bei `colorScheme: 'light'`.

### Mobile/Responsive – Layout-Bugs (alle mit Playwright bei 375px verifiziert und gefixt)
- `OverviewTab.tsx` „Depotwert je Broker"-Chart: `YAxis width={30}` zu schmal für Broker-Namen wie „Scalable Capital" → abgeschnitten zu „blic"/„ital" – **trat auch auf Desktop auf**, kein reiner Mobile-Bug. Fix: `width={100}`.
- `DividendTab.tsx` Steuer-Box: `grid-cols-4` ließ „Steuerpflichtig" mit der Nachbarspalte kollidieren auf 375px. Fix: `grid-cols-2 sm:grid-cols-4`.
- `SavingsTab.tsx` Zukunftsprojektion: gleiches Problem, aber mit fett/groß gesetzten Eurobeträgen → auf Mobile komplett unleserlicher Textmatsch. Fix: `grid-cols-2 sm:grid-cols-4`.
- `ProjectionTab.tsx` + `GoalTab.tsx` Annahmen-Regler: `<input type="range">` hat eine intrinsische Mindestbreite (~129px), die `flex-1` ohne `min-w-0` nicht überschreiben kann (klassisches Flexbox-Gotcha) → Regler liefen auf 2-spaltigem Mobile-Grid in die Nachbarspalte über, Werte wurden abgeschnitten/überlappten. Fix: `min-w-0` zur Range-Input-Klasse ergänzt. **Pitfall für künftige Slider:** `flex-1` auf `<input type="range">` braucht praktisch immer `min-w-0` daneben.
- `Card.tsx`: `title` + `headerRight` (Suchbox) saßen immer in einer Zeile (`flex items-center justify-between`) – bei langen Titeln (z. B. „Dividendenanalyse – Alle Positionen") plus fixer `w-36`-Suchbox wurde der Titel auf Mobile auf wenige Zeichen abgeschnitten. Fix: `flex-col sm:flex-row` – Titel und Suchbox stapeln sich jetzt auf schmalen Screens statt sich zu quetschen. Generischer Fix in der Card-Komponente, betrifft alle `headerRight`-Nutzer.
- `DepotCheckTab.tsx` Dimensionen-Radar: `PolarAngleAxis`-Labels (lange Komposita wie „Einkommensstabilität", „Cashflow-Gleichmäßigkeit") wurden bei `outerRadius="70%"` auf **Tablet UND Mobile** am Card-Rand abgeschnitten. Fix zweigleisig: (1) neue `radarShortLabel`-Map in `DepotCheckTab.tsx` zeigt im Radar nur Kurzform (z. B. „Einkommen" statt „Einkommensstabilität") – volle Bezeichnung bleibt in „Qualitätsdimensionen im Detail" darunter sichtbar; (2) `outerRadius` von 70 % auf 62 % reduziert für mehr Label-Randraum. Reines Radius-Verkleinern allein reichte nicht aus (getestet bis 42 %, immer noch vereinzeltes Clipping bei sehr langen Wörtern) – Label kürzen war der robustere Hebel.
- `FindingsTab.tsx` „1.000 € Tranchen"-Box: Bei langen ETF-Namen (z. B. „iShares Core MSCI World UCITS ETF USD (Acc)") überlappte der Name-Text mit dem Prio-Badge/Prozentwert rechts (`"Acc22,2%"` verschmolzen) – auf allen Breakpoints, nicht nur Mobile. Ursache: `truncate` saß auf einem reinen `<span>` ohne eigenen Block-Formatierungskontext (Geschwister-Element davor war ebenfalls ein bloßes inline `<span>`, kein Flex-Container) – `text-overflow: ellipsis` greift so nicht. Fix: Symbol+Name-Wrapper selbst zu `flex items-baseline gap-1.5` gemacht, Symbol-Span `shrink-0`, Name-Span bleibt `truncate` (wird durch den Flex-Kontext automatisch blockifiziert, dadurch greift die Ellipsis-Kürzung korrekt). **Pitfall:** `truncate` auf einem `<span>` funktioniert nur zuverlässig, wenn der Span entweder selbst `block`/`p` ist mit definierter Breite, oder direktes Kind eines Flex-/Grid-Containers ist (CSS blockifiziert Flex-/Grid-Items automatisch). Bei zwei nebeneinanderstehenden inline `<span>`s in einem normalen `<div>` greift es nicht. `RankingTab.tsx`/`RebalancingTab.tsx` haben ähnliche Patterns, dort aber strukturell korrekt (Flex-Item bzw. `<p>` mit definierter Breite) – beim Stichprobentest mit Test-ETF-Namen keine Probleme gefunden.

**Test-Methodik:** Kein vorhandenes Playwright-Setup im Projekt – Chromium liegt aber unter `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` vor, Playwright-Paket ist global installiert (`NODE_PATH=$(npm root -g) node …`). Alle 14 Tabs wurden bei 375px (Mobile) per Skript durchgeklickt + gescreenshottet, dabei wurden Console-Errors mitgeloggt (keine gefunden). Testdatei wurde synthetisch mit 5 Positionen erzeugt (kein Sample-XLSX im Repo vorhanden).

**Noch nicht geprüft:** Tablet-Breakpoint (768px) nur stichprobenartig, nicht für jeden Tab einzeln durchgeklickt. Landscape-Orientierung auf Mobile nicht getestet.

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
| xlsx | 0.18.5 |

Sprache der UI: Deutsch (`de-DE` Formatierung via `Intl.NumberFormat`).
**Nur Dark Mode** – kein Light-Mode mehr, kein Toggle (siehe unten).
`jspdf` / `html2canvas` wurden entfernt (PDF-Export-Feature existiert nicht mehr).

---

## Was seit dem letzten Handover gemacht wurde

Chronologisch, neueste zuerst sind unten in der Commit-Liste. Zusammengefasst:

### 1. Code-Qualitäts-Pass (Bugfixing / Clean Code / Green Code)

- **Bugfixes:** leere-Array-Guards in `computeDividendScore` (`calculations.ts`) und im Monats-Kalender-Loop (Bounds-Check `m < 1 || m > 12`), Sortier-Fallback für unbekannte Priority-Strings in `insights.ts`, sicheres `reduce` auf evtl. leerem Array in `CalendarTab.tsx`.
- **Memoization:** `computeProjection` (teuer – 30-Jahres-Projektion) war in `ProjectionTab.tsx` und `GoalTab.tsx` mehrfach pro Render direkt im JSX (teils in IIFEs) aufgerufen worden → alle in `useMemo` extrahiert. `MotivationTab.tsx`, `CalendarTab.tsx`, `FindingsTab.tsx`, `Dashboard.tsx` ebenfalls memoized (`computeTotals`, `computeHealthScore` liefen vorher bei jedem Tab-Wechsel neu).
- **Dead Code entfernt**, u. a. `data1`/`data3` in `ProjectionTab.tsx` (Duplikate von `data5[1]`/`data5[3]`).
- **Duplikate konsolidiert:** neuer Helper `topDividendContributors(positions, n)` in `calculations.ts` ersetzt 4 identische „Top-N-Dividenden-Anteil"-Implementierungen (`findings.ts`, `insights.ts`, `FindingsTab.tsx`, `DiversificationTab.tsx`). `SafetyTab.tsx` nutzt jetzt `computeStressTest()` aus `insights.ts` statt einer eigenen Inline-Variante; `riskLevel`/`safetyScore` werden dort nur noch einmal berechnet statt doppelt.
- **Bundle-Size:** `jspdf` + `html2canvas` (~34 MB node_modules, mehrere hundert KB Bundle) waren seit Entfernen des PDF-Exports ungenutzt → entfernt.

### 2. UI-Überarbeitung (Depot- & Dividenden-Tab)

- **Dark-Only Mode:** `document.documentElement.classList.add('dark')` permanent in `App.tsx`, Toggle-State und -Button entfernt. Alle `dark:`-Klassen bleiben im Quellcode bestehen (gelten jetzt immer), Light-Mode-Klassen wurden **nicht** überall entfernt (nur der Umschalt-Mechanismus).
- PDF-Export-Button im Header entfernt, „Nächste Schritte"-Block aus `OverviewTab.tsx` entfernt, „Aktionen"-Button aus `Dashboard.tsx`-Header entfernt.
- `Card.tsx`: neuer `headerRight`-Slot für Header-Inhalte rechtsbündig (z. B. Suchfelder).
- `SortableTable.tsx`: kontrollierbare Filter-Props (`filter`, `onFilterChange`) – wenn gesetzt, wird das interne Suchfeld ausgeblendet und stattdessen der externe State genutzt.
- Suchfelder bei „Alle Positionen" (OverviewTab) und „Dividendenanalyse" (DividendTab) in die obere rechte Box-Ecke verschoben (via `headerRight`).
- Info-Tooltips (`InfoTip`) bei „Top 5 Konzentration" und „Top 10 Gewichtung" ergänzt.
- „Income vs. Growth" (DividendTab) als Split-Proportions-Balken neu gestaltet; „Chowder Champions" als gerankte Liste mit Progress-Bars statt einfacher Tabelle.

### 3. ESLint-Fehler (alle 13 behoben)

- **2× echte Bugs** (`react-hooks/static-components`): `Btn` (Dashboard.tsx) und `TreemapContent`/`kategorieColors` (DiversificationTab.tsx) wurden bei **jedem Render neu erzeugt** statt einmalig außerhalb der Komponente definiert zu werden – das resettet React-internen Komponenten-State unnötig bei jedem Re-Render. Beide nach Modul-Ebene verschoben.
- **10× unused vars/imports** entfernt (u. a. `top10Weight`, `divGradeColor` in DiversificationTab; `totalSpar`/`inBalance`/`maxDeviation` in RebalancingTab; `active` in SavingsTab; `byYield`/`byCagr` in findings.ts; `totals` in `computeHealthScore`).
- **1× unnecessary regex escape** in `calculations.ts` (`/[\|,]+/` → `/[|,]+/`).

### 4. Weitere Bugfixes (Folgepass nach unreviewten Tabs)

- **`QualityTab.tsx`:** Division-durch-Null-Risiko bei leerem Depot (`withPrio / all.length` etc. ohne Guard) – mit `(x || 1)`-Pattern abgesichert, konsistent zum Rest der Codebase. War durch den Upload-Check in `App.tsx` maskiert, aber `Dashboard.tsx` validiert nie erneut → latenter Bug.
- **`parser.ts`:** Wenn keine Spalte „Symbol" im Header gefunden wird (`col('symbol') === -1`), wurden früher **alle Zeilen stillschweigend übersprungen** (`row[-1]` → `undefined`, kein Crash). Jetzt wird sofort eine klare Fehlermeldung geworfen statt der generischen „Keine Positionen gefunden".
- **`RankingTab.tsx`:** toter No-op-Ternary `fmt(p.wert === 0 ? 0 : p.wert)` → `fmt(p.wert)`.

### 5. Lazy Loading – inkl. eines Produktions-Bugs und Kurskorrektur

**Architektur jetzt (Stand HEAD):**
- `App.tsx`: `Dashboard` wird per `React.lazy()` erst geladen, wenn eine Datei hochgeladen wurde (vorher: Upload-Screen lud bereits das komplette Dashboard + alle Tabs + Recharts + xlsx mit).
- `App.tsx`: `parseExcel` (und damit `xlsx`, ~114 KB gzip) wird per dynamischem `import()` erst beim tatsächlichen Datei-Upload geladen, nicht beim initialen Seitenaufruf.
- `Dashboard.tsx`: **alle 15 Tabs werden wieder statisch/eager importiert** (kein Per-Tab-`React.lazy()` mehr – siehe „Wichtige Pitfalls" unten, warum das zurückgebaut wurde).
- `vite.config.ts`: `manualChunks` bündelt Recharts + alle seine Vendor-Abhängigkeiten (`@reduxjs/toolkit`, `react-redux`, `immer`, `reselect`, alle `d3-*`-Module, `victory-vendor` etc.) explizit in einen gemeinsamen `charts-vendor`-Chunk.

**Aktuelle Chunk-Größen (`npm run build`):**
| Chunk | Größe (gzip) | Lädt wann |
|---|---|---|
| `index-*.js` (Entry/Upload-Screen) | ~61 KB | sofort |
| `Dashboard-*.js` (alle 15 Tabs) | ~42 KB | nach Datei-Upload |
| `charts-vendor-*.js` (Recharts + Redux + d3) | ~128 KB | nach Datei-Upload (parallel zu Dashboard) |
| `parser-*.js` (xlsx) | ~114 KB | beim Datei-Upload (parallel) |

Effekt: Initial-Bundle (Upload-Screen) ist von ursprünglich ~344 KB gzip auf ~61 KB gzip gesunken. Nach dem einmaligen Datei-Upload (wo ohnehin eine kurze Wartezeit erwartet wird) sind **alle** Tabs sofort verfügbar – kein Netzwerk-Request mehr beim Tab-Wechsel.

---

## Wichtige Muster / Pitfalls

- **Per-Tab-Lazy-Loading wurde bewusst verworfen:** Ein früherer Zwischenstand splittete jeden der 15 Tabs einzeln via `React.lazy()`. Das führte zu zwei Problemen:
  1. **Produktions-Crash** `"n is not a function"` beim Öffnen von `DepotCheckTab` (RadarChart) auf GitHub Pages. Ursache: Recharts 3.x bündelt intern Redux (`@reduxjs/toolkit`, `react-redux`, `immer`, `reselect`) und mehrere `d3-*`-Module mit zirkulären Referenzen untereinander. Rollups automatisches Chunk-Splitting über 14 separate dynamische Import-Boundaries hat diese zusammengehörigen Module über mehrere Chunks verstreut, teils an unpassende Chunks wie `KPICard.tsx` oder `chartTheme.ts` angehängt → Chunk A referenzierte eine Funktion aus Chunk B, bevor dieser fertig initialisiert war. **Fix:** `manualChunks` in `vite.config.ts` (siehe oben) – falls weitere Lazy-Loading-Boundaries eingeführt werden, **unbedingt diese Konfiguration beibehalten oder erneut prüfen.**
  2. **Spürbare Ladeverzögerung** beim ersten Klick auf jeden Tab, selbst mit Hintergrund-Prefetch nach dem ersten Render (auf gedrosselten Verbindungen reichte die Zeit bis zum Tab-Klick nicht aus, um den 128 KB großen `charts-vendor`-Chunk fertig zu laden). Deshalb zurückgebaut auf einen einzigen Lazy-Boundary auf Dashboard-Ebene (alle Tabs eager innerhalb von `Dashboard.tsx`).
  - **Lektion für künftige Optimierungsversuche:** Falls erneut über granulareres Code-Splitting nachgedacht wird, immer mit `vite preview` (nicht `vite dev`) und idealerweise gedrosselter Netzwerksimulation testen – der Dev-Server zeigt Chunking-Bugs nicht, da er unbundled ESM ausliefert.
- `BAR_CURSOR` **muss** in jeden Tab importiert werden, der einen `<Tooltip cursor={...}>` auf einem BarChart hat – fehlt er, entsteht ein weißes Rechteck beim Hover.
- `aggregateBy()` ist lokal in `OverviewTab` definiert; `groupBy()` ist lokal in `DiversificationTab` – **nicht** aus `calculations.ts`. Sollte eine dritte Komponente dasselbe brauchen, wäre eine Auslagerung in eine Util-Datei sinnvoll.
- Recharts 3.x erwartet `isAnimationActive={false}` auf Treemap explizit, sonst gibt es Performance-Warnungen.
- `Card.tsx` hat jetzt einen `headerRight`-Slot; `SortableTable` kann kontrolliert (`filter`/`onFilterChange`) oder unkontrolliert (eigener interner State) betrieben werden – beim Hinzufügen neuer Tabellen-Suchfelder im Header diesem Muster folgen.

---

## Fachliche Domänen-Konventionen (unverändert)

- **Freibetrag:** 2.000 € (verheiratet / gemeinsam veranlagt) – gilt in `findings.ts`, `insights.ts`, `GoalTab.tsx`
- **Steuer:** Kapitalertragsteuer + SolZ = **26,375 %** flat
- **Dividend Score:** 40 % normierter Yield + 40 % normierter CAGR + 10 % Frequenz-Score + 10 % Priorität/Status
- **Chowder Score:** `yield + cagr5j` (einfach, ungewichtet)
- **HHI:** Summe der quadrierten Portfolio-Gewichte; < 1.000 = gut, > 2.500 = hoch konzentriert
- **Ausschüttungsfrequenz Scores:** monatlich = 3, quartalsweise = 2, jährlich = 1 (implizit via `freqScore`)
- Alle Geldwerte in **EUR**, alle Prozente als Prozent-Zahl (z. B. `2.24` für 2,24 %)
- **Status-Werte:** `Aufbau`, `Erledigt`, `Beobachten`, `Verkauf`
- **Prio-Werte:** `A`, `B`, `C`, `D`, `E`, `null`

---

## Offene Punkte / mögliche nächste Schritte

1. **Tests:** Weiterhin keine Unit-Tests vorhanden. Kritische Logik in `calculations.ts`, `findings.ts`, `insights.ts` wäre ein guter Einstieg.
2. **PR erstellen:** Der Branch `claude/data-insights-recommendations-172j1m` ist noch nicht als Pull Request gegen `main` geöffnet. Der Produktions-Crash-Report kam von der live GitHub-Pages-Seite (`looped83.github.io/depot-analyzer`), die vermutlich von `main` deployt wird – die Fixes in diesem Branch sind also noch **nicht live**, bis gemerged wird.
3. ~~`npm audit` – 2 offene High-Severity-Findings~~ → **erledigt für vite** (Patch-Update, kein Major nötig), **`xlsx` bewusst offen gelassen** (kein npm-Fix verfügbar, Risiko als gering eingeschätzt). Details siehe Update-Abschnitt oben.
4. ~~Mobile/Responsive: weiterhin nicht explizit getestet.~~ → **Erledigt:** alle 14 Tabs bei 375px durchgetestet, 5 Bugs gefunden und gefixt (siehe Update-Abschnitt oben). Tablet-Breakpoint nur stichprobenartig geprüft, Landscape nicht getestet.
5. ~~`DepotCheckTab.tsx`: UI-Politur nicht explizit geprüft.~~ → **Erledigt:** dedizierter Deep-Dive auf Desktop/Tablet/Mobile. Ein Bug gefunden und gefixt (Radar-Chart-Labels abgeschnitten auf Tablet+Mobile, siehe Update-Abschnitt oben). Rest der Tab-Inhalte (Gauge, Stresstest, Freibetrag-Tracker, Empfehlungslisten) sah auf allen drei Breakpoints sauber aus.
6. **Tablet-Breakpoint (768px) und Landscape-Mobile:** nicht systematisch getestet, nur Dashboard-Übersicht stichprobenartig.

---

## Commit-Historie dieser Session (neueste zuerst)

```
581aa1c fix: npm audit vite patch, force dark mode via Tailwind v4 custom-variant, mobile layout overlaps
9595e95 docs: update handover.md with code quality, lint, lazy-loading and bugfix work
1b81966 perf: drop per-tab lazy loading, keep only the Dashboard-level split
16a45a1 fix: production crash "n is not a function" caused by chart vendor code splitting across lazy-loaded tabs
806c347 fix: guard QualityTab against empty-depot NaN, surface missing Symbol column
7e8bf83 perf: code-split tabs and defer xlsx parser via lazy loading
3beabab fix: resolve all 13 ESLint errors
80b8d33 perf: remove unused PDF deps, memoize Dashboard/Findings, dedupe stress-test logic
c238dbb feat: dark-only mode, UI cleanup and visual improvements
c135e30 fix: restore Search import in RankingTab — used in Underweight section
a26a6cc fix: bugfixes, dead code removal and memoization for heavy projection tabs
```
