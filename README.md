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
npm run preview  # preview the production build locally
```

## How it works

1. Drag & drop (or select) an `.xlsx` file on the upload screen.
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
| | Rankings | 9 transparent, explainable rankings (income, growth, safety, quality, hidden gems, …) |
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
| **Empfehlungen** | Findings | Auto-generated, natural-language findings (concentration, outliers, weak scores, …) |
| | Rebalancing | Underweight/overweight positions, budget-based buy recommendations in tranches |

## Analysis logic

- **Dividend Score**: `40% normalized yield + 40% normalized CAGR + 10% payout-frequency score + 10% priority/status` (yield and CAGR are normalized relative to the min/max within your own portfolio)
- **Chowder Score**: `Yield + CAGR 5J` (unweighted)
- **HHI** (Herfindahl-Hirschman-Index): sum of squared portfolio weights — `< 1.000` is well diversified, `> 2.500` is highly concentrated
- **Health Score** (Depot-Check): weighted average across 8 dimensions — diversification, income stability, growth potential, data quality, risk distribution, savings-plan efficiency, cash-flow smoothness, chowder quality
- **Tax/Freibetrag**: German capital-gains tax model, 2.000 € annual allowance (married/jointly assessed), 26,375 % flat tax (KapESt + SolZ) above it

All calculations are estimates based purely on the uploaded data and general assumptions — **not financial advice**, and costs/taxes beyond the flat-rate model above are not accounted for.

## Tech stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 (dark mode only, no toggle)
- Recharts for charts
- SheetJS (xlsx) for Excel parsing

The initial bundle only ships the upload screen; the dashboard (all tabs), Recharts, and the xlsx parser are code-split and loaded on demand (lazy-loaded after upload / on first file selection).

## Project structure

```
src/
├── lib/
│   ├── types.ts          # Core TypeScript types (DepotPosition, etc.)
│   ├── parser.ts         # Excel parsing + column auto-detection
│   ├── calculations.ts   # Derived metrics (scores, P&L, weights, …)
│   ├── insights.ts       # Health score, recommendations, stress test, freibetrag
│   ├── findings.ts       # Auto-generated natural-language findings
│   ├── chartTheme.ts     # Shared Recharts theme constants
│   └── format.ts         # de-DE number/currency formatting
└── components/
    ├── UploadZone.tsx
    ├── Dashboard.tsx      # Header, grouped nav + flyout, tab routing
    ├── Card.tsx           # Card, StatusBadge, PrioBadge, PageHeading, InfoTip
    ├── KPICard.tsx
    ├── ChartTooltip.tsx
    ├── tables/
    │   └── SortableTable.tsx
    └── tabs/
        ├── OverviewTab.tsx
        ├── PerformanceTab.tsx
        ├── RankingTab.tsx
        ├── DividendTab.tsx
        ├── CalendarTab.tsx
        ├── MotivationTab.tsx
        ├── CAGRTab.tsx
        ├── SavingsTab.tsx
        ├── ProjectionTab.tsx
        ├── GoalTab.tsx
        ├── DiversificationTab.tsx
        ├── SafetyTab.tsx
        ├── QualityTab.tsx
        ├── DepotCheckTab.tsx
        ├── FindingsTab.tsx
        └── RebalancingTab.tsx
```

## Deployment

Pushes to `main` are built and deployed to GitHub Pages automatically (`.github/workflows/deploy.yml`). `vite.config.ts` sets the base path to `/depot-analyzer/` in CI and `/` locally — any new hardcoded reference to a file in `public/` from inside a component must be prefixed with `import.meta.env.BASE_URL` instead of a literal `/…` path, or it will 404 on Pages.

## Disclaimer

This application is for informational purposes only and does **not** constitute financial advice. All calculations are based solely on the uploaded data and general assumptions; taxes and costs beyond the flat-rate model described above are not considered.
