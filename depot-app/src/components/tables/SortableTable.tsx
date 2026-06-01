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
}

function get<T>(obj: T, key: string): unknown {
  return (obj as Record<string, unknown>)[key];
}

export function SortableTable<T>({ data, columns, pageSize = 25, filterKeys, rowKey }: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!filter.trim()) return data;
    const q = filter.toLowerCase();
    return data.filter((row) => {
      const keys = filterKeys ?? (Object.keys(row as object) as (keyof T)[]);
      return keys.some((k) => String(get(row, k as string) ?? '').toLowerCase().includes(q));
    });
  }, [data, filter, filterKeys]);

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
  const slice = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  return (
    <div className="flex flex-col gap-2">
      {filterKeys && (
        <input
          className="w-full max-w-sm border rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
          placeholder="Suchen..."
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(0); }}
        />
      )}
      <div className="overflow-x-auto rounded-xl border dark:border-gray-700">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 text-left">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`px-3 py-2 font-semibold cursor-pointer select-none whitespace-nowrap border-b dark:border-gray-700 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
                  style={{ width: col.width }}
                  onClick={() => handleSort(String(col.key))}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    ) : (
                      <ChevronsUpDown size={12} className="opacity-30" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b dark:border-gray-700/50 last:border-0">
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={`px-3 py-2 ${col.align === 'right' ? 'text-right tabular-nums' : col.align === 'center' ? 'text-center' : ''}`}
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
                <td colSpan={columns.length} className="px-3 py-6 text-center text-gray-400">Keine Einträge gefunden</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center gap-2 justify-end text-sm">
          <span className="text-gray-500">{sorted.length} Einträge</span>
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`w-7 h-7 rounded ${page === i ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
