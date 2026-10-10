import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';

interface Props {
  onFile: (file: File) => void;
  loading: boolean;
  error?: string;
}

export function UploadZone({ onFile, loading, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [typeError, setTypeError] = useState('');

  const handleFile = (f: File) => {
    if (/\.xlsx$/i.test(f.name)) { setTypeError(''); onFile(f); }
    else setTypeError(`„${f.name}“ ist keine .xlsx-Datei. Bitte die Excel-Datei deines Depots wählen.`);
  };
  const shownError = typeError || error;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-10 text-center">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="mx-auto mb-4 h-12 w-12" />
        <h1 className="text-lg font-semibold tracking-tight text-white">Depot Analyzer</h1>
        <p className="mt-2 text-sm text-zinc-400">Lade deine Excel-Datei hoch und erhalte eine vollständige Depotanalyse.</p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        className={`group w-full max-w-md rounded-3xl border-2 border-dashed px-8 py-12 transition-colors sm:py-14 ${
          dragging ? 'border-blue-400 bg-blue-950/30' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
        }`}
      >
        <span className="flex flex-col items-center gap-4">
          <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${dragging ? 'bg-blue-900/50' : 'bg-zinc-800'}`}>
            <UploadCloud size={24} className={dragging ? 'text-blue-400' : 'text-zinc-400 group-hover:text-blue-400'} />
          </span>
          <span className="text-sm font-medium text-zinc-200">{dragging ? 'Datei loslassen …' : 'Datei hierher ziehen'}</span>
          <span className="-mt-3 text-xs text-zinc-500">oder <span className="text-blue-400">tippen zum Auswählen</span></span>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />

      {loading && (
        <div role="status" className="mt-6 flex items-center gap-2.5 text-sm text-zinc-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          Wird analysiert …
        </div>
      )}

      {shownError && (
        <div role="alert" className="mt-4 w-full max-w-md rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {shownError}
        </div>
      )}

      <p className="mt-10 max-w-xs text-center text-xs leading-relaxed text-zinc-600">
        Erwartet ein Sheet „Depot“ mit Spalten wie Symbol, Name, Wert, Yield, CAGR 5J. Die Datei bleibt in deinem Browser.
      </p>
    </main>
  );
}
