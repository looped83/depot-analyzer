import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (val: unknown, row: T) => React.ReactNode;
  sortFn?: (a: T, b: T) => number;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  filterKeys?: (keyof T)[];
  rowKey: (row: T) => string;
  /** Controlled filter value. When provided with onFilterChange, the internal search input is hidden. */
  filter?: string;
  onFilterChange?: (value: string) => void;
}

function get<T>(obj: T, key: string): unknown {
  return (obj as Record<string, unknown>)[key];
}

export function SortableTable<T>({ data, columns, pageSize = 25, filterKeys, rowKey, filter: controlledFilter, onFilterChange }: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [internalFilter, setInternalFilter] = useState('');
  const [page, setPage] = useState(0);

  const isControlled = onFilterChange != null;
  const activeFilter = isControlled ? (controlledFilter ?? '') : internalFilter;

  const filtered = useMemo(() => {
    if (!activeFilter.trim()) return data;
    const q = activeFilter.toLowerCase();
    return data.filter((row) => {
      const keys = filterKeys ?? (Object.keys(row as object) as (keyof T)[]);
      return keys.some((k) => String(get(row, k as string) ?? '').toLowerCase().includes(q));
    });
  }, [data, activeFilter, filterKeys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    return [...filtered].sort((a, b) => {
      const cmp = col?.sortFn
        ? col.sortFn(a, b)
        : String(get(a, sortKey) ?? '').localeCompare(String(get(b, sortKey) ?? ''), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, columns]);

  const pages = Math.ceil(sorted.length / pageSize);
  // Clamp instead of trusting `page`: a controlled filter (header search box) can
  // shrink the result set without going through the internal setPage(0) reset,
  // which would otherwise leave the table stuck on a now-empty page.
  const safePage = Math.min(page, Math.max(0, pages - 1));
  const slice = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(0);
  };

  return (
    <div className="flex flex-col gap-3">
      {filterKeys && !isControlled && (
        <input
          className="w-full max-w-xs text-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder-slate-300 dark:placeholder-zinc-600 text-slate-800 dark:text-zinc-200"
          placeholder="Suchen …"
          value={internalFilter}
          onChange={(e) => { setInternalFilter(e.target.value); setPage(0); }}
        />
      )}
      <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-zinc-800">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`px-4 py-3 text-xs font-medium text-slate-400 dark:text-zinc-500 cursor-pointer select-none whitespace-nowrap uppercase tracking-wider ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                  style={{ width: col.width }}
                  onClick={() => handleSort(String(col.key))}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key
                      ? sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
                      : <ChevronsUpDown size={11} className="opacity-25" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((row) => (
              <tr key={rowKey(row)} className="border-b border-slate-50 dark:border-zinc-800/60 last:border-0 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={`px-4 py-3 text-slate-700 dark:text-zinc-300 ${col.align === 'right' ? 'text-right tabular-nums' : col.align === 'center' ? 'text-center' : ''}`}
                  >
                    {col.render
                      ? col.render(get(row, String(col.key)), row)
                      : String(get(row, String(col.key)) ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
            {slice.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-300 dark:text-zinc-600 text-sm">
                  Keine Einträge gefunden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center gap-1.5 justify-end">
          <span className="text-xs text-slate-400 dark:text-zinc-500 mr-2">{sorted.length} Einträge</span>
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                safePage === i
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
