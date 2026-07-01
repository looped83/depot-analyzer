import React, { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';

interface Props {
  onFile: (file: File) => void;
  loading: boolean;
  error?: string;
}

export function UploadZone({ onFile, loading, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (f: File) => {
    if (f.name.endsWith('.xlsx') || f.name.endsWith('.xls')) onFile(f);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col items-center justify-center px-6">
      {/* Wordmark */}
      <div className="mb-12 text-center">
        <img src="/favicon.svg" alt="Depot Analyzer Logo" className="w-12 h-auto mx-auto mb-4" />
        <span className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
          Depot Analyzer
        </span>
        <p className="mt-3 text-sm text-slate-400 dark:text-zinc-500">
          Lade deine Excel-Datei hoch und erhalte eine vollständige Depotanalyse.
        </p>
      </div>

      {/* Drop zone */}
      <div
        className={`w-full max-w-md rounded-3xl border-2 border-dashed transition-all duration-200 cursor-pointer group
          ${dragging
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30 scale-[1.02]'
            : 'border-slate-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-zinc-500 bg-slate-50 dark:bg-zinc-900'
          }`}
        style={{ padding: '56px 40px' }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
            dragging ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-white dark:bg-zinc-800 shadow-sm'
          }`}>
            <UploadCloud size={24} className={dragging ? 'text-blue-500' : 'text-slate-400 dark:text-zinc-500 group-hover:text-blue-400'} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">
              {dragging ? 'Datei loslassen …' : 'Datei hierher ziehen'}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">
              oder <span className="text-blue-500 hover:underline">klicken zum Auswählen</span> · .xlsx
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="mt-6 flex items-center gap-2.5 text-sm text-slate-500 dark:text-zinc-400">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Wird analysiert …
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 w-full max-w-md text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 rounded-2xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Footer hint */}
      <p className="mt-10 text-xs text-slate-300 dark:text-zinc-600 text-center max-w-xs leading-relaxed">
        Erwartet ein „Depot"-Sheet mit Spalten wie Symbol, Name, Broker, Wert (€), Yield %, CAGR 5J % u. a.
      </p>
    </div>
  );
}
