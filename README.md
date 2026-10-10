# Depot Analyzer

A local, client-side web tool for analyzing a dividend stock portfolio ("Depot"). Upload an Excel file with your positions and get a full dashboard of dividend, growth, risk, and quality metrics — no data ever leaves your browser.

The UI is in German; this README describes the app in English.

## Quick start

```bash
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser.

Other scripts:

```bash
npm run build    # type-check + production build
npm run lint     # ESLint
npm test         # unit tests (Vitest) for the calculation/insights/findings logic
npm run preview  # preview the production build locally
```

## How it works

1. Drag & drop (or select) an `.xlsx` file on the upload screen. The parsed depot is kept in `sessionStorage`, so a reload or the back button keeps it, but it is gone once the browser tab is closed.
2. The parser looks for a sheet named **"Depot"** (falls back to the first sheet) and auto-detects the header row.
3. Columns are matched by (case-insensitive) substring, so a few common naming variants are accepted automatically, e.g. `Kaufkurs` / `Kaufpreis` / `Einstandskurs` for the purchase price, or `Stückzahl` / `Bestand` for the share count.
4. All derived metrics (dividend score, chowder score, P&L, portfolio weights, etc.) are computed client-side from the raw columns — nothing is uploaded to a server.

Expected columns (header names, order doesn't matter):

`Symbol, Name, Status, Prio, Broker, Stückzahl, Kaufkurs, Wert (€), Yield %, CAGR 5J %, Sparbetrag (€), Rating, Ausschüttungsfrequenz, Ausschüttungsmonate, FreqScore, ISIN, WKN, Typ, Kategorie`

Only `Symbol` is strictly required; everything else has a sensible fallback (e.g. missing `Status` defaults to `Aufbau`, missing `Kaufkurs`/`Stückzahl` just disables the P&L-dependent parts of the Performance tab).

## Dashboard tabs

Tabs are grouped into 5 thematic nav groups:

| Group | Tab | Content |
|---|---|---|
| **Depot** | Übersicht (Overview) | Total value, weights, concentration risk, breakdown charts by broker/category/type, top-10 table |
| | Performance | Cost basis vs. current value, gain/loss (€ and %), top winners/losers |
| | Rankings | Top lists: dividend score, yield, CAGR, Chowder, dividend contribution, positions to review |
| **Dividenden** | Analyse (Analysis) | Yield breakdown, dividend contribution, income vs. growth split, tax/allowance tracker |
| | Kalender (Calendar) | Monthly cash-flow calendar, payout months Jan–Dec |
| | Motivation | Passive-income framing (subscriptions/bills covered), freedom degree, reinvestment snowball |
| **Wachstum & Planung** | Wachstum (Growth) | CAGR ranking, yield-vs-CAGR positioning matrix, Chowder score |
| | Sparpläne (Savings plans) | Savings-plan distribution by broker/cycle, efficiency score |
| | Ausblick (Projection) | 5-year projection with editable assumptions and 3 scenarios (conservative/realistic/optimistic) |
| | Zielplanung (Goal) | Target monthly dividend income, progress, milestones, scenario comparison |
| **Analyse & Risiko** | Diversifikation | Weight/category treemap, HHI concentration score, currency exposure |
| | Sicherheit (Safety) | Risk classification per position, dividend-cut stress test |
| | Qualität (Quality) | Data completeness, priority/rating coverage, weighted dividend-quality score |
| | Depot-Check | Overall health score across 8 weighted dimensions, radar chart, actionable recommendations |
| **Empfehlungen** | Hinweise (Findings) | Auto-generated, natural-language findings, filterable by severity |
| | Rebalancing | Target vs. actual weights and the app's single buy recommendation (1.000 € tranches) |

## Navigation & interaction

- Desktop: the five groups sit in the header, each opening a flyout with its tabs. Mobile: a bottom bar with the five groups plus a segmented control with the group's tabs under the page title.
- The active tab lives in the URL hash (`#/calendar`), so reload, deep links and the browser back button work.
- Every position (table row, bar list entry, chip, chart point) opens the same detail sheet.
- Each topic has one home tab; other tabs show a compact teaser card that jumps there (e.g. tax → Analyse, stress test → Sicherheit, buy candidates → Rebalancing).
- Projection assumptions (monthly investment, dividend growth, price growth, reinvest) are shared by Ausblick, Zielplanung, Sparpläne and Motivation.

## Analysis logic

- **Dividend Score**: `40% normalized yield + 40% normalized CAGR + 10% payout-frequency score + 10% priority/status` (yield and CAGR are normalized relative to the min/max within your own portfolio)
- **Chowder Score**: `Yield + CAGR 5J` (unweighted)
- **HHI** (Herfindahl-Hirschman-Index): sum of squared portfolio weights — `< 1.000` is well diversified, `> 2.500` is highly concentrated
- **One score scale** for every 0–100 score (health score and its dimensions, quality, safety, dividend score): ≥ 75 sehr gut, ≥ 50 solide, ≥ 25 ausbaufähig, below that kritisch.
- **Risk thresholds** (`lib/risk.ts`, used everywhere): yield > 6,5 % = watch, > 9 % = risk, CAGR < 2 % = weak growth, weight > 5 % = cluster risk.
- **Buy candidates** (`lib/rebalancing.ts`): positions in build-up (`Aufbau`) furthest below their (priority-weighted) target weight – the one rule behind every buy suggestion in the app.
- **Health Score** (Depot-Check): average across 8 dimensions — diversification, income stability, growth potential, data quality, risk distribution, savings-plan efficiency, cash-flow smoothness, chowder quality
- **Tax/Freibetrag**: German capital-gains tax model, 2.000 € annual allowance (married/jointly assessed), 26,375 % flat tax (KapESt + SolZ) above it

All calculations are estimates based purely on the uploaded data and general assumptions — **not financial advice**, and costs/taxes beyond the flat-rate model above are not accounted for.

## Tech stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 (dark mode only, no toggle)
- Recharts for charts
- read-excel-file for Excel parsing (`.xlsx`)

The initial bundle only ships the upload screen; the dashboard (all tabs), Recharts, and the Excel parser are code-split and loaded on demand. Simple bars, donuts and progress bars are plain HTML/SVG instead of chart-library components, chart animations are off, and depot-wide metrics are computed once per upload (`lib/metrics.ts`) instead of on every tab switch.

## Project structure

```
src/
├── lib/
│   ├── types.ts          # Core types (DepotPosition, TabId, …)
│   ├── parser.ts         # Excel parsing + column auto-detection (rowsToPositions is pure/testable)
│   ├── calculations.ts   # Derived per-position metrics, totals, calendar, projection
│   ├── metrics.ts        # DepotMetrics: lazily cached depot-wide results shared by all tabs
│   ├── insights.ts       # Health score, recommendations, stress test, Freibetrag, motivation
│   ├── findings.ts       # Natural-language findings
│   ├── risk.ts           # Yield/CAGR/weight thresholds, risk class, safety score
│   ├── quality.ts        # Data completeness per field and position
│   ├── rebalancing.ts    # Target weights and buy candidates
│   ├── score.ts          # Shared 0–100 scale and tone (color) tokens
│   ├── nav.ts            # Tab groups, labels, icons
│   ├── depotContext.ts   # React context: metrics, navigation, detail sheet, assumptions
│   ├── chartTheme.ts     # Validated chart palette and axis/grid tokens
│   └── format.ts         # de-DE number/currency formatting
└── components/
    ├── UploadZone.tsx
    ├── Dashboard.tsx      # Header + flyout (desktop), bottom bar (mobile), hash routing
    ├── PositionSheet.tsx  # Position detail (native <dialog>)
    ├── AssumptionFields.tsx
    ├── ui/                # Design system: Card, KPICard, MiniStat, Callout, Chip, Bars,
    │                      # Badges, Controls, Donut, ChartTooltip
    ├── tables/
    │   ├── SortableTable.tsx   # sticky first column, column priority per breakpoint
    │   └── PositionTable.tsx   # Card + search + table for position lists
    └── tabs/              # 16 tabs, one file each
```

## Deployment

Pushes to `main` are built and deployed to GitHub Pages automatically (`.github/workflows/deploy.yml`). `vite.config.ts` sets the base path to `/depot-analyzer/` in CI and `/` locally — any new hardcoded reference to a file in `public/` from inside a component must be prefixed with `import.meta.env.BASE_URL` instead of a literal `/…` path, or it will 404 on Pages.

## Disclaimer

This application is for informational purposes only and does **not** constitute financial advice. All calculations are based solely on the uploaded data and general assumptions; taxes and costs beyond the flat-rate model described above are not considered.
