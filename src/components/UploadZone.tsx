import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet } from 'lucide-react';

interface Props {
  onFile: (file: File) => void;
  loading: boolean;
  error?: string;
}

export function UploadZone({ onFile, loading, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (f: File) => {
    if (f.name.endsWith('.xlsx') || f.name.endsWith('.xls')) {
      onFile(f);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-8">
      <div className="flex flex-col items-center gap-4 max-w-md w-full">
        <div className="flex items-center gap-3">
          <FileSpreadsheet size={40} className="text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Depot Analyzer</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Professionelle Dividenden-Depotanalyse</p>
          </div>
        </div>

        <div
          className={`w-full rounded-2xl border-2 border-dashed p-12 flex flex-col items-center gap-4 cursor-pointer transition-colors ${
            dragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:bg-gray-100 dark:hover:bg-gray-900'
          }`}
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
          <UploadCloud size={48} className="text-blue-500" />
          <div className="text-center">
            <p className="font-semibold text-gray-800 dark:text-gray-200">Excel-Datei hierher ziehen</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">oder klicken zum Auswählen (.xlsx)</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Datei wird analysiert...</span>
          </div>
        )}

        {error && (
          <div className="w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="text-xs text-gray-400 text-center space-y-1">
          <p>Erwartet wird ein "Depot"-Sheet mit den Spalten:</p>
          <p className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-300">
            Symbol, Name, Status, Prio, Broker, Wert (€), Yield %, CAGR 5J %, …
          </p>
        </div>
      </div>
    </div>
  );
}
