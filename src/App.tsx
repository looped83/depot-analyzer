import React, { useState, useEffect } from 'react';
import { UploadZone } from './components/UploadZone';
import { Dashboard } from './components/Dashboard';
import { parseExcel } from './lib/parser';
import { calculateDerived } from './lib/calculations';
import type { DepotPosition } from './lib/types';

export default function App() {
  const [positions, setPositions] = useState<DepotPosition[] | null>(null);
  const [filename, setFilename] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('depot-dark') === 'true' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try { localStorage.setItem('depot-dark', String(darkMode)); } catch {}
  }, [darkMode]);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError('');
    try {
      const raw = await parseExcel(file);
      if (raw.length === 0) throw new Error('Keine Positionen in der Datei gefunden.');
      const derived = calculateDerived(raw);
      setPositions(derived);
      setFilename(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Verarbeiten der Datei.');
    } finally {
      setLoading(false);
    }
  };

  if (positions) {
    return (
      <Dashboard
        positions={positions}
        filename={filename}
        onReset={() => setPositions(null)}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
      />
    );
  }

  return (
    <UploadZone onFile={handleFile} loading={loading} error={error} />
  );
}
