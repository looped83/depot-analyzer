# Depot Analyzer

Ein professionelles lokales Web-Tool für die Analyse eines Dividenden-Depots.

## Schnellstart

```bash
cd depot-app
npm install
npm run dev
```

Dann im Browser öffnen: **http://localhost:5173**

## Features

### Upload & Parsing
- Drag & Drop oder Dateiauswahl für `.xlsx`-Dateien
- Erwartet ein Sheet namens **"Depot"** mit den Spalten:
  `Zyklus, Symbol, Name, Status, Prio, Broker, Wert (€), Yield %, CAGR 5J %, Sparbetrag (€), Rating, Ausschüttungsfrequenz, Ausschüttungsmonate, FreqScore, ISIN, WKN, Typ, Kategorie`
- Robuste Validierung fehlender und leerer Werte

### Dashboard-Tabs

| Tab | Inhalt |
|-----|--------|
| **Depot** | Gesamtwert, Gewichtungen, Konzentrationsrisiko, Charts nach Broker/Kategorie/Typ, Top-10-Tabelle |
| **Dividenden** | Yield-Analyse, Dividendenbeiträge, Income vs. Growth, Ausreißer |
| **Wachstum** | CAGR-Ranking, Yield-vs-CAGR-Matrix, Chowder Score, Quadranten-Analyse |
| **Sparpläne** | Sparplan-Verteilung, Broker- & Zyklus-Analyse, Rebalancing-Hinweise |
| **Kalender** | Monatlicher Cashflow-Kalender, Dividendenkalender Jan–Dez |
| **Rankings** | 9 transparente Rankings mit erklärbaren Scores |
| **Findings** | Automatisch generierte Hinweise in natürlicher Sprache |
| **Ausblick** | 5-Jahres-Projektion mit editierbaren Annahmen und 3 Szenarien |

### Analyse-Features
- **Dividend Score**: `40% norm. Yield + 40% norm. CAGR + 10% FreqScore + 10% Prio/Status`
- **Chowder Score**: `Yield + CAGR 5J`
- Konzentrationsrisiko Top 5 / Top 10
- Monatlicher Cashflow-Kalender
- Yield-vs-CAGR-Positionierungsmatrix
- Automatische Findings (Klumpen, Ausreißer, schwache Scores, etc.)

### Export
- **PDF**: Screenshot des aktuellen Tabs als PDF
- **CSV**: Alle Positionen mit berechneten Kennzahlen

### Technologie
- React 19 + TypeScript + Vite
- Tailwind CSS v4 (Dark Mode)
- Recharts für Charts
- SheetJS (xlsx) für Excel-Parsing
- jsPDF + html2canvas für PDF-Export

## Projektstruktur

```
src/
├── lib/
│   ├── types.ts          # TypeScript-Typen
│   ├── parser.ts         # Excel-Parser
│   ├── calculations.ts   # Berechnungslogik (separat testbar)
│   ├── findings.ts       # Automatische Findings
│   └── format.ts         # Zahlenformatierung
└── components/
    ├── UploadZone.tsx
    ├── Dashboard.tsx
    ├── KPICard.tsx
    ├── tables/
    │   └── SortableTable.tsx
    └── tabs/
        ├── OverviewTab.tsx
        ├── DividendTab.tsx
        ├── CAGRTab.tsx
        ├── SavingsTab.tsx
        ├── CalendarTab.tsx
        ├── RankingTab.tsx
        ├── FindingsTab.tsx
        └── ProjectionTab.tsx
```

## Hinweis

Diese Anwendung dient rein zur Information und stellt **keine Finanzberatung** dar.
Alle Berechnungen basieren auf den hochgeladenen Daten. Steuern und Kosten sind nicht berücksichtigt.
