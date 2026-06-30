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

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

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
      />
    );
  }

  return (
    <UploadZone onFile={handleFile} loading={loading} error={error} />
  );
}
