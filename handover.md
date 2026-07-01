# Handover – depot-analyzer

**Datum:** 2026-07-01
**Branch:** `claude/tablet-landscape-breakpoint-mqnf8j` (PR #39, offen gegen `main`)
**Repo:** `looped83/depot-analyzer`
**Build:** `npx tsc --noEmit` → 0 Fehler · `npx eslint .` → 0 Fehler · `npm run build` → erfolgreich

---

## Update (2026-07-01, neuester Stand): Tablet/Landscape-Breakpoint, Favicon-Logo, Seiten-Titel, schlanker Header, Suchfeld-Konsistenz, echter Datenbug

Ein Session mit vielen kleinen bis mittelgroßen Einzelaufträgen, alle auf einem Branch (`claude/tablet-landscape-breakpoint-mqnf8j` → PR #39, noch offen). Jede Änderung wurde per Playwright gegen eine synthetische Testdatei **und** gegen eine echte, vom Nutzer hochgeladene Depot-XLSX verifiziert (Screenshots vor/nach, Console-Error-Check über alle 16 Tabs).

### 1. Tablet-Breakpoint (768px) & Landscape-Mobile – Audit + gezielte Fixes
Erst ein Read-only-Audit-Subagent über alle Tab-Komponenten, dann jeden gemeldeten Verdachtsfall **einzeln im Browser nachgestellt** (375/768/812×375/1440px) statt blind allen Verdachtsfällen zu vertrauen – mehrere vom Audit gemeldete „Probleme" (z. B. 3-spaltige Grids ohne Breakpoint in CAGR-/Safety-/Projection-Tab) erwiesen sich bei echtem Rendering als unauffällig und wurden **nicht** angefasst, um den Diff klein zu halten. Tatsächlich bestätigte und gefixte Bugs:
- **Nav-Gruppen-Zeile:** Bei 768px passen die 5 Gruppen-Labels nicht mehr vollständig, die Zeile scrollt horizontal ohne jeden visuellen Hinweis – ein Label wurde hart am Rand abgeschnitten. Fix: `[mask-image:linear-gradient(...)]` als Scroll-Fade an beiden Rändern.
- **Flyout-Dropdown:** `left: rect.left` war nicht an den Viewport geklemmt – auf schmaleren Tablet-/Landscape-Breiten konnte das Flyout (`min-w-[190px]`) rechts über den Rand hinausragen. Fix: `left` wird jetzt auf `window.innerWidth - 190 - 8` geklemmt.
- **`FindingsTab.tsx`** KPI-Zeile: `grid-cols-4` ganz ohne Breakpoint → auf schmalen Phones (375px) gequetscht/umgebrochen. Fix: `grid-cols-2 sm:grid-cols-4`.
- **`QualityTab.tsx`** Chart-Karten-Grid: `grid-cols-2` ganz ohne Breakpoint → Karten-Titel wie „Dividenden-Score Verteilung" wurden bei 375px per `truncate` abgeschnitten. Fix: `grid-cols-1 sm:grid-cols-2`.

**Test-Setup-Hinweis:** Kein `playwright`-Package im Projekt, aber global installiert (`/opt/node22/lib/node_modules/playwright`) – ESM-Module-Resolution findet es nur, wenn das Skript direkt aus diesem Verzeichnis heraus läuft (`cd /opt/node22/lib/node_modules && node script.mjs`), `NODE_PATH` allein reicht bei ESM nicht. Testdatei wurde per Node-Skript mit dem `xlsx`-Package synthetisch erzeugt (kein Sample im Repo).

### 2. Favicon als Logo (Upload-Screen + Header) – inkl. eines echten Deployment-Bugs
- `UploadZone.tsx`: Platzhalter-blaues „D"-Quadrat durch `public/favicon.svg` ersetzt, zentriert über der „Depot Analyzer"-Überschrift (vorher inline daneben).
- `Dashboard.tsx`-Header: gleiche Ersetzung (blaues „D" → Favicon).
- **Bug gefunden & gefixt:** Beide Stellen nutzten zunächst `src="/favicon.svg"` (hart kodierter Root-Pfad). Die App deployt auf GitHub Pages aber unter `/depot-analyzer/` (`vite.config.ts` → `base`). Vite schreibt Asset-Pfade in `index.html` automatisch für den `base`-Wert um, **aber nicht** rohe String-Literale in JSX/TSX – das Icon zeigte auf Pages daher ein kaputtes Bild-Symbol (Fragezeichen), lokal im Dev-Server (`base: '/'`) aber fielt es nicht auf. Fix: `src={`${import.meta.env.BASE_URL}favicon.svg`}` an beiden Stellen. Verifiziert durch Produktions-Build mit `GITHUB_ACTIONS=true` + Auslieferung unter einem `/depot-analyzer/`-Unterpfad via `http-server`.
- **Wichtiger Merksatz für künftige Asset-Referenzen:** Jede neue hart kodierte `/…`-Pfadangabe auf eine Datei aus `public/` in einer `.tsx`-Datei (nicht `index.html`) muss `import.meta.env.BASE_URL` voranstellen, sonst bricht sie auf GitHub Pages.
- Nebenbei: „ · .xlsx"-Hinweistext im Upload-Dropzone-Text entfernt (separater kleiner Auftrag).

### 3. Seiten-Titel über den Kacheln (alle 16 Tabs)
Neue `PageHeading`-Komponente in `Card.tsx` (`<h1 className="text-xl font-semibold …">`), in jedem der 16 Tabs als erstes Element vor dem KPI-Grid eingefügt (bei `PerformanceTab.tsx` zusätzlich im Empty-State-Zweig, da der early-return sonst ganz ohne Titel dastünde). Titel orientieren sich an den bestehenden Nav-Flyout-Labels, mit einer Ausnahme: `DividendTab` hieß im Flyout nur „Analyse" – als alleinstehende `<h1>` zu unspezifisch, daher zunächst „Dividenden-Analyse" gewählt, auf expliziten Nutzerwunsch später wieder zurück auf „Analyse" (siehe Abschnitt 5).

### 4. Header-Redesign: einzeilig, schlanker
Auftrag: Trennstrich, XLSX-Dateiname und die 5-Werte-KPI-Leiste (Depotwert/Yield/Dividende/Monat/Health) sollten weg, Navigation soll in die freigewordene Zeile rücken.
- `Dashboard.tsx`-Header von zwei Zeilen (KPI-Leiste + darunter Nav-Zeile) auf **eine** Zeile umgebaut: Logo | Nav-Gruppen (flex-1, `items-stretch` damit die `border-b-2`-Active-Unterstreichung weiter am Zeilenboden sitzt) | Aktionen (CSV, Reset).
- Damit wurden `totals`/`health` (`useMemo`) sowie die Imports `computeTotals`, `computeHealthScore`, `fmt`/`fmtPct`/`fmtNum` in `Dashboard.tsx` ungenutzt → entfernt.
- `filename`-Prop komplett durchgängig entfernt (`Dashboard.tsx` Props-Interface, `App.tsx` State `filename`/`setFilename` und die JSX-Prop-Übergabe) statt es unbenutzt liegen zu lassen.

### 5. Kleinteilige UI-Korrekturen (mehrere Tabs, ein Auftrag)
- `DividendTab.tsx`: `PageHeading`-Titel „Dividenden-Analyse" → „Analyse" (siehe Abschnitt 3). „Steuer & Sparerpauschbetrag"-Balken von einfarbig auf Gradient umgestellt (`bg-gradient-to-r from-blue-500 via-emerald-500 to-emerald-400` bzw. Amber-Variante bei ausgeschöpftem Freibetrag), Vorbild war der Freiheitsgrad-Balken in `MotivationTab.tsx`.
- `CAGRTab.tsx`: Die drei „Stars/Wachstum/Einkommens-Falle"-Kacheln unter der Yield-vs-CAGR-Matrix hatten nur Hintergrundfarbe, keinen Rahmen → `border`-Klasse (passend zur jeweiligen Akzentfarbe) ergänzt, analog zum bereits bestehenden Muster in `FindingsTab.tsx`.

### 6. Suchfeld-Position seitenweit vereinheitlicht
Auftrag: Suchfeld im CAGR-Tab soll wie im Dashboard/Overview-Tab positioniert sein – **und generell überall so**. Bisher gab es zwei Muster nebeneinander: (a) `SortableTable`s eigenes internes Suchfeld (volle Breite, oberhalb der Tabelle) und (b) ein kontrolliertes Suchfeld im `Card`-`headerRight`-Slot (kompakt, neben dem Karten-Titel), Muster (b) aber nur in `OverviewTab`/`DividendTab`/`PerformanceTab`. Alle übrigen Tabs mit Tabellen-Suche (`CAGRTab`, `DiversificationTab`, `QualityTab`, `RebalancingTab`, `SafetyTab`, `SavingsTab`) auf Muster (b) umgestellt: je ein lokaler `useState`, `filter`/`onFilterChange` an `SortableTable` durchgereicht, Suchfeld in `headerRight`. Damit haben jetzt **alle 9 Tabs mit Tabellen-Suche** exakt dasselbe Muster.

### 7. Echter Datenbug: „Schlechte Qualität trotz vollständiger Datei"
Nutzer meldete schlechte Werte im Qualitäts-Tab trotz augenscheinlich vollständiger XLSX – zunächst mit `AskUserQuestion` nachgefragt statt blind zu raten, da „zwei neue Felder" zu unspezifisch war, um ohne Rateversuche gezielt zu fixen. Nutzer lud danach die echte Datei hoch (48 Positionen).
- **Root Cause gefunden:** Die Datei nutzt einen Status **„Pause"** (12 von 48 Positionen) zusätzlich zu den vier bekannten Status-Werten (`Aufbau`/`Erledigt`/`Beobachten`/`Verkauf`). `computeDividendScore()` (`calculations.ts`) hatte einen Status-Modifier-Ternary, dessen **letzter `:`-Zweig sowohl „Verkauf" als auch jeden unbekannten String** auf denselben harten 0,6-Faktor abbildete – „Pause"-Positionen wurden also trotz 100 % vollständiger Daten (Yield, ISIN, Prio, Ausschüttungsmonate, Rating) genauso hart abgewertet wie ein aktives Verkaufssignal.
- **Fix:** `statusModMap`-Lookup mit explizitem Eintrag `Pause: 0.85` (wie „Erledigt" behandelt – hält die Position, baut nicht aktiv auf) und einem neutralen Fallback `0.75` für jeden anderen/zukünftigen unbekannten Status, statt der bisherigen impliziten Verkauf-Härte.
- **Nebenbug im selben Aufwasch:** `StatusBadge` (`Card.tsx`) hatte für unbekannte Status-Strings einen Fallback **ohne** `dark:`-Variante (`bg-slate-100 text-slate-500`) – in der (permanent aktiven) Dark-Mode-UI erschien „Pause" dadurch als helles Light-Mode-Badge auf dunklem Hintergrund. Fix: expliziter `Pause`-Eintrag + `dark:`-fähiger Fallback.
- **`parser.ts`:** Auf Nutzerhinweis „Bestand = Stückzahl" zusätzlich `'bestand'` als Alias-Substring für die Stückzahl-Spalte ergänzt (die hochgeladene Datei nutzte zwar schon „Stückzahl" direkt, aber der Nutzer kündigte an, dass andere Exporte „Bestand" heißen).
- **Verifiziert** mit einem Node-Skript, das Parser- und Scoring-Logik 1:1 nachbildet und gegen die echte Datei rechnet: Gewichteter D-Score steigt von 28,7 → 31,3, Ø-Score der Pause-Positionen von 20,8 → 29,6, Gesamt-Note im Qualitäts-Tab ist jetzt korrekt „A" (83/100) mit „Gewichteter D-Score" als einzigem (legitim relativ berechneten) Schwachpunkt – keine Datenvollständigkeits-Probleme mehr.

**Noch nicht geprüft:** PR #39 ist zum Zeitpunkt dieses Handover-Updates noch **offen**, nicht gemerged. CI/Review-Status vor Merge prüfen.

---

## Update (2026-07-01, davor, undokumentiert nachgetragen): Browser-Tab-Titel, Performance-Chart-Split, Kaufkurs/Kaufpreis-Parserfix

Drei PRs (#36, #37, #38) aus der Session direkt vor der oben beschriebenen, die im vorherigen Handover-Stand nicht dokumentiert wurden:

- **PR #36:** `parser.ts` `col('kaufkurs')` matchte nur einen einzelnen exakten Substring – bei einer echten Nutzerdatei mit Spaltenname „Kaufpreis" statt „Kaufkurs" schlug der Match fehl, `kaufkurs` defaultete auf `0`, `einstandswert` wurde für alle Positionen `0`, und `PerformanceTab.tsx` zeigte deshalb fälschlich den „keine Kaufkurs-Daten"-Leerzustand. Fix: `col()`-Aufruf akzeptiert jetzt mehrere Kandidaten-Substrings (`'kaufkurs', 'kaufpreis', 'einstandskurs', 'einstandspreis'`), zusätzlich `'stueckzahl'` (ASCII) als Alias neben `'stückzahl'`.
- **PR #37:** `PerformanceTab.tsx`-Chart von einem einzelnen gemischten Balkendiagramm in zwei Karten „Top Gewinner"/„Top Verlierer" nebeneinander (gestapelt auf Mobile) aufgeteilt, je auf die 10 größten Gewinne/Verluste gedeckelt mit „Top N von M"-Hinweis.
- **PR #38:** Browser-Tab-Titel war noch der Vite-Scaffold-Platzhalter („Vite + React + TS") – in `index.html` auf „Depot Analyzer – Dividenden & Performance" gesetzt (passend zur bereits vorhandenen `<meta name="description">`).

---

## Update (2026-07-01): Navigation-Umbau, Performance-Tab, CSV-Export

Vier PRs, alle einzeln gegen `main` erstellt und **alle vier gemerged** (#31–#34).

### Navigation: 15 flache Tabs → 5 thematische Gruppen mit Flyout (PR #31, #32)
Auslöser: Nutzer-Feedback, dass die Navigation mit 15 Top-Level-Tabs zu unübersichtlich war (horizontales Scrollen nötig, gerade auf Mobile).

- **`Dashboard.tsx`:** `TABS`-Array durch `TAB_GROUPS` ersetzt – 5 Gruppen (`depot`, `dividends`, `growth`, `analysis`, `actions`), jede mit 2–4 der bisherigen 15 Tabs. Alle `TabId`s und Tab-Inhalte unverändert, nur die Navigations-Struktur ist neu:
  - **Depot**: Übersicht, Performance (neu, siehe unten), Rankings
  - **Dividenden**: Analyse, Kalender, Motivation
  - **Wachstum & Planung**: Wachstum, Sparpläne, Ausblick, Zielplanung
  - **Analyse & Risiko**: Diversifikation, Sicherheit, Qualität, Depot-Check
  - **Empfehlungen**: Findings, Rebalancing
- Erster Wurf (PR #31) zeigte die Sub-Tabs der aktiven Gruppe permanent in einer zweiten Zeile unter den Gruppen-Pills. Auf Nutzer-Feedback hin („gefällt visuell nicht") in PR #32 zu einem **Klick-Flyout** umgebaut: Sub-Tabs erscheinen nur noch als Dropdown, wenn eine Gruppe angeklickt wird, und schließen sich bei Auswahl oder Klick außerhalb wieder.
- **Bug gefunden & gefixt (PR #32):** Das Flyout wird mit `position: fixed` gerendert (Koordinaten aus `getBoundingClientRect()` der Gruppen-Schaltfläche zum Klick-Zeitpunkt) – **nicht** `position: absolute` innerhalb der Gruppen-Zeile. Grund: Die Gruppen-Zeile hat `overflow-x-auto` für horizontales Scrollen auf Mobile; das zwingt den Browser laut CSS-Spec implizit zu `overflow-y: auto`, was ein absolut positioniertes Flyout abgeschnitten hätte (verifiziert per `getComputedStyle`).
- **Zweiter Bug gefunden & gefixt (PR #32):** Ein erster Ansatz schloss das Flyout zusätzlich bei jedem `scroll`-Event, um seine Position synchron zu halten. Das führte dazu, dass ein Klick auf eine (teilweise) außerhalb des sichtbaren Bereichs liegende Gruppen-Schaltfläche das Flyout **im selben Tick wieder schloss**: Der Browser scrollt fokussierte Elemente automatisch ins Sichtfeld, was ein `scroll`-Event auslöst – und genau das hat den eigenen Close-Handler direkt nach dem Öffnen erneut getriggert. Fix: Scroll/Resize-Auto-Close entfernt, nur noch Klick-außerhalb schließt das Flyout (Standard-Pattern für Dropdown-Menüs).

### Neues Feature: Kaufkurs-Tracking & Performance-Tab (PR #33)
Bisher gab es keine Möglichkeit, Einstandspreise oder Gewinn/Verlust zu erfassen – `DepotPosition` kannte nur den aktuellen Marktwert (`wert`), keinen Kaufkurs.

- **`types.ts`:** `DepotPosition` um `stueckzahl` (Anzahl gehaltener Anteile) und `kaufkurs` (Kaufpreis pro Anteil, €) erweitert, dazu 4 neue berechnete Felder: `einstandswert`, `aktuellerKurs`, `gewinnVerlust`, `gewinnVerlustPct`. Neue `TabId`: `'performance'`.
- **`parser.ts`:** Zwei neue optionale Spalten (`col('stückzahl')`, `col('kaufkurs')`) – fehlen sie in der Excel-Datei, defaulten beide auf `0` (bestehendes Verhalten für fehlende Spalten, kein Crash).
- **`calculations.ts` (`calculateDerived`):** `einstandswert = kaufkurs * stueckzahl`, `aktuellerKurs = wert / stueckzahl` (Guard bei `stueckzahl === 0`), `gewinnVerlust`/`gewinnVerlustPct` nur berechnet wenn `einstandswert > 0`, sonst `0`.
- **Neuer Tab `PerformanceTab.tsx`** (einsortiert in die Gruppe „Depot"): KPIs (Einstandswert, aktueller Wert, Gewinn/Verlust €+%, Gewinner/Verlierer-Anzahl), grün/rot eingefärbtes Balkendiagramm je Position, sortierbare Tabelle mit Kaufkurs/aktuellem Kurs/Einstand/Wert/G&V. Positionen ohne Kaufkurs+Stückzahl werden aus der P&L-Rechnung ausgeschlossen und in einer Warnbox gezählt. **Leerer State:** Hat keine einzige Position Kostenbasis-Daten, zeigt der Tab einen Hinweistext statt eines leeren/kaputt wirkenden Charts.
- Mit Playwright gegen eine synthetische Datei mit gemischten Daten (4 Positionen mit Kaufkurs, 1 ohne) verifiziert – KPI-Summen, Chart-Farben und Tabellenwerte manuell nachgerechnet und abgeglichen. Alle 16 Tabs nach der Datenmodell-Änderung durchgeklickt, keine Console-Errors.

### CSV-Export erweitert (PR #34)
`Dashboard.tsx` → `exportCSV()`: neue Spalten `Kaufkurs (€)`, `Einstand (€)`, `Gewinn/Verlust (€)`, `Gewinn/Verlust %` direkt nach `Wert (€)` ergänzt, damit der Export zum Performance-Tab passt. Per Playwright-Download verifiziert (Werte stimmen exakt mit Performance-Tab überein, fehlender Kaufkurs exportiert korrekt als `0.00`).

**Noch nicht geprüft:** Der neue Performance-Tab (breite Tabelle mit 6 Zahlen-Spalten) wurde noch nicht explizit bei 375px auf Mobile-Layout-Bugs getestet (nur die Flyout-Navigation selbst wurde auf Mobile verifiziert) – gleiches Muster wie frühere Tabellen-Overflow-Bugs in anderen Tabs ist hier denkbar.

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
- **Kein Abstand zwischen Card-Header (Titel/Suchfeld) und Tabelleninhalt** bei allen `pad={false}`-Cards (10 Stellen in 8 Tabs: CAGRTab, DiversificationTab, DividendTab ×2, OverviewTab ×2, QualityTab, RebalancingTab, SafetyTab, SavingsTab). Ursache: `Card.tsx`-Header hat `pb-0` (bewusst eng für den `sub`-Text-Fall), und alle Konsumenten wickeln ihren Tabelleninhalt bei `pad={false}` in `px-5 pb-5` **ohne** `pt` – macht zusammen 0px Abstand. Am auffälligsten beim Suchfeld in „Alle Positionen" (Depot-Tab), das direkt auf dem Tabellenkopf saß. Fix: `pt-3` zu allen 10 betroffenen Content-Wrappern ergänzt (nicht an `Card.tsx` selbst, da `pb-0` dort für Cards mit `sub`-Text weiterhin sinnvoll ist).

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
- **Einstandswert / Gewinn-Verlust:** `einstandswert = kaufkurs * stueckzahl`; `gewinnVerlust = wert - einstandswert` nur wenn `einstandswert > 0`, sonst `0` (Position ohne Kaufkurs-Daten). `aktuellerKurs = wert / stueckzahl` (Guard bei `stueckzahl === 0`).
- **Ausschüttungsfrequenz Scores:** monatlich = 3, quartalsweise = 2, jährlich = 1 (implizit via `freqScore`)
- Alle Geldwerte in **EUR**, alle Prozente als Prozent-Zahl (z. B. `2.24` für 2,24 %)
- **Status-Werte:** `Aufbau`, `Erledigt`, `Pause`, `Beobachten`, `Verkauf` (Typ ist `| string`, also offen für weitere Werte – siehe „Status-Modifier"-Fix im Update-Abschnitt oben, jeder unbekannte Status bekommt seit dem Fix einen neutralen Fallback statt der „Verkauf"-Härte)
- **Prio-Werte:** `A`, `B`, `C`, `D`, `E`, `null`

---

## Offene Punkte / mögliche nächste Schritte

1. **Tests:** Weiterhin keine Unit-Tests vorhanden. Kritische Logik in `calculations.ts`, `findings.ts`, `insights.ts` wäre ein guter Einstieg.
2. ~~PR erstellen: Branch noch nicht als Pull Request gegen `main` geöffnet.~~ → **Erledigt:** Seit dem 2026-06-30-Handover wurden 8 PRs (#27–#34) gegen `main` erstellt und alle gemerged. Der Stand auf `main` ist damit aktuell (inkl. Navigation-Umbau, Performance-Tab, CSV-Export).
3. ~~`npm audit` – 2 offene High-Severity-Findings~~ → **erledigt für vite** (Patch-Update, kein Major nötig), **`xlsx` bewusst offen gelassen** (kein npm-Fix verfügbar, Risiko als gering eingeschätzt). Details siehe Update-Abschnitt oben.
4. ~~Mobile/Responsive: weiterhin nicht explizit getestet.~~ → **Erledigt:** alle 14 Tabs bei 375px durchgetestet, 5 Bugs gefunden und gefixt (siehe Update-Abschnitt oben). Tablet-Breakpoint nur stichprobenartig geprüft, Landscape nicht getestet.
5. ~~`DepotCheckTab.tsx`: UI-Politur nicht explizit geprüft.~~ → **Erledigt:** dedizierter Deep-Dive auf Desktop/Tablet/Mobile. Ein Bug gefunden und gefixt (Radar-Chart-Labels abgeschnitten auf Tablet+Mobile, siehe Update-Abschnitt oben). Rest der Tab-Inhalte (Gauge, Stresstest, Freibetrag-Tracker, Empfehlungslisten) sah auf allen drei Breakpoints sauber aus.
6. ~~Tablet-Breakpoint (768px) und Landscape-Mobile: nicht systematisch getestet.~~ → **Erledigt** (siehe Update-Abschnitt oben): gezielter Audit + Browser-Verifikation bei 375/768/812×375/1440px, 4 bestätigte Bugs gefixt (Nav-Scroll-Affordance, Flyout-Clamping, FindingsTab- und QualityTab-Grid).
7. **Neuer Performance-Tab noch nicht auf Mobile-Layout-Bugs geprüft:** Die Tabelle hat 6 Zahlen-Spalten (Kaufkurs, Kurs aktuell, Einstand, Wert, G/V €, G/V %) – bei 375px potenziell zu breit/gequetscht. Wurde beim Tablet/Landscape-Audit nicht explizit mit abgedeckt (Fokus lag auf den dort gemeldeten Verdachtsfällen).
8. **CSV-Export-Konsumenten prüfen:** Falls der Nutzer die exportierte CSV in Excel/Sheets weiterverarbeitet, wurden die 4 neuen Spalten (Kaufkurs, Einstand, G/V €, G/V %) bisher nur automatisiert per Playwright-Download verifiziert, nicht manuell in einer Tabellenkalkulation geöffnet.
9. **PR #39 noch offen:** Alle Änderungen aus dem obersten Update-Abschnitt (Tablet/Landscape, Favicon, Seiten-Titel, Header-Redesign, Suchfeld-Konsistenz, Status-Modifier-Fix) liegen auf `claude/tablet-landscape-breakpoint-mqnf8j`, PR #39 ist erstellt aber noch nicht gemerged.
10. **Relative Normierung des Dividend Score:** `computeDividendScore` normiert Yield/CAGR relativ zum Min/Max des eigenen Depots (`normYield`/`normCagr`). Bei einer echten Nutzerdatei getestet: Der gewichtete D-Score landet dadurch strukturell oft im 25–35er-Bereich, selbst wenn andere Qualitätsdimensionen bei 100 % liegen – kein Bug, aber ein Design-Aspekt, den man im Hinterkopf behalten sollte, falls Nutzer erneut „schlechte Qualität trotz guter Daten" melden. Eine absolute (statt rein relative) Skalierung wäre eine mögliche künftige Verbesserung, aber ein Scope-/Produktentscheid, kein Bugfix.

---

## Commit-Historie dieser Session (neueste zuerst)

```
ea0943a fix: don't penalize unrecognized position status as if it were "Verkauf"
1280339 feat: rename Analyse title, gradient tax bar, bordered CAGR tiles, consistent search field
da59b26 feat: slim header, fix radar decimals, add improvement tips, align search field
a7342f6 feat: add page title heading above tiles on every tab
8496f92 feat: use favicon icon in dashboard header instead of blue "D" box
ecb48a3 fix: logo shows broken image on GitHub Pages deployment
79228c6 fix: remove " · .xlsx" hint from upload dropzone text
218171a feat: use favicon as centered logo above heading on upload screen
4c7b69b fix: responsive issues at tablet (768px) and landscape mobile widths
```

Davor, aus der vorherigen (undokumentierten) Session – siehe „Update (davor, undokumentiert nachgetragen)" oben:

```
b7964fc fix: set proper browser tab title (was Vite scaffold placeholder) (#38)
92b0963 refactor: split Performance tab chart into Top Gewinner/Verlierer (#37)
f8ac743 fix: Performance tab stays empty when the cost-basis column is named "Kaufpreis" instead of "Kaufkurs" (#36)
```

Davor, aus der Navigation/Performance/CSV-Session:

```
8677f19 feat: add Kaufkurs and Gewinn/Verlust columns to CSV export
7eb1a88 feat: add Kaufkurs/Stückzahl columns and a Performance tab
c8e51ee refactor: turn always-visible sub-tab row into a click-triggered flyout
c9ccc4f feat: group navigation tabs into 5 thematic categories
c59484e docs: note search-box/table spacing fix in handover.md
203f97a fix: zero gap between Card header (title/search box) and table content
f5ec4e9 fix: long ETF names overlap with prio badge in FindingsTab tranchen list
b5c9aaa fix: radar chart axis labels clipped on tablet and mobile in DepotCheckTab
7fff8d1 docs: update handover.md with npm audit and mobile/responsive findings
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
