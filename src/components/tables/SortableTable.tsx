import { useMemo, useState, type ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  /** Value used for sorting; defaults to row[key]. */
  sortValue?: (row: T) => number | string;
  align?: 'left' | 'right' | 'center';
  /** Hide the column below this breakpoint (column priority on small screens). */
  hide?: 'sm' | 'md' | 'lg';
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  pageSize?: number;
  /** Search string; matched case-insensitively against `filterKeys`. */
  filter?: string;
  filterKeys?: (keyof T)[];
  onRowClick?: (row: T) => void;
  sortable?: boolean;
}

const HIDE = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' } as const;
const ALIGN = { left: 'text-left', right: 'text-right tabular-nums', center: 'text-center' } as const;

const get = (row: unknown, key: string) => (row as Record<string, unknown>)[key];

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a ?? '').localeCompare(String(b ?? ''), 'de', { numeric: true });
}

/**
 * Sortable, paginated table. Built to sit flush inside a Card: the first column is sticky
 * while the rest scrolls horizontally, and low-priority columns can hide on small screens.
 */
export function SortableTable<T>({ data, columns, rowKey, pageSize = 25, filter = '', filterKeys, onRowClick, sortable = true }: Props<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q || !filterKeys) return data;
    return data.filter((row) => filterKeys.some((k) => String(get(row, k as string) ?? '').toLowerCase().includes(q)));
  }, [data, filter, filterKeys]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    const value = col?.sortValue ?? ((row: T) => get(row, sort.key) as number | string);
    return [...filtered].sort((a, b) => compare(value(a), value(b)) * sort.dir);
  }, [filtered, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  // Clamp: a shrinking search result must not leave the table on an empty page.
  const current = Math.min(page, pages - 1);
  const slice = sorted.slice(current * pageSize, (current + 1) * pageSize);

  const toggleSort = (col: Column<T>) => {
    // Numbers sort high → low first; text A → Z.
    const first = col.align === 'right' ? -1 : 1;
    setSort((s) => (s?.key === col.key ? { key: col.key, dir: (s.dir * -1) as 1 | -1 } : { key: col.key, dir: first }));
    setPage(0);
  };

  const cellClass = (col: Column<T>, i: number) =>
    `${ALIGN[col.align ?? 'left']} ${col.hide ? HIDE[col.hide] : ''} ${i === 0 ? 'sticky left-0 z-[1] bg-inherit' : ''}`;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-zinc-800 bg-zinc-900">
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={sort?.key === col.key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}
                  className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500 first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5 ${cellClass(col, i)}`}
                >
                  {sortable ? (
                    <button type="button" onClick={() => toggleSort(col)} className="inline-flex items-center gap-1 uppercase hover:text-zinc-300">
                      {col.label}
                      {sort?.key === col.key
                        ? sort.dir === 1 ? <ChevronUp size={11} /> : <ChevronDown size={11} />
                        : <ChevronsUpDown size={11} className="opacity-30" />}
                    </button>
                  ) : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={`border-b border-zinc-800/60 bg-zinc-900 last:border-0 ${onRowClick ? 'cursor-pointer outline-none hover:bg-[#1f1f23] focus-visible:bg-[#1f1f23]' : ''}`}
              >
                {columns.map((col, i) => (
                  <td key={col.key} className={`px-3 py-2.5 text-zinc-300 first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5 ${cellClass(col, i)}`}>
                    {col.render ? col.render(row) : String(get(row, col.key) ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
            {slice.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-zinc-500">Keine Einträge gefunden</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-zinc-800 px-4 py-2.5 text-xs text-zinc-500 sm:px-5">
          <span>{sorted.length} Einträge</span>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Vorherige Seite" disabled={current === 0} onClick={() => setPage(current - 1)} className="rounded-lg p-1.5 hover:bg-zinc-800 disabled:opacity-30">
              <ChevronLeft size={14} />
            </button>
            <span className="tabular-nums">Seite {current + 1} / {pages}</span>
            <button type="button" aria-label="Nächste Seite" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="rounded-lg p-1.5 hover:bg-zinc-800 disabled:opacity-30">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
