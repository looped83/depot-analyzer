import { useState } from 'react';
import type { DepotPosition } from '../../lib/types';
import { useDepot } from '../../lib/depotContext';
import { Card } from '../ui/Card';
import { SearchInput } from '../ui/Controls';
import { SortableTable, type Column } from './SortableTable';

type Row = Pick<DepotPosition, 'symbol' | 'name'>;

interface Props<T extends Row> {
  title: string;
  sub?: string;
  info?: string;
  id?: string;
  data: T[];
  /** Columns after the fixed "Position" column. */
  columns: Column<T>[];
  /** Extra fields the search matches besides symbol and name. */
  searchKeys?: (keyof T)[];
  pageSize?: number;
}

/**
 * Card + search + table for position lists. Every table starts with the same
 * Symbol/Name column and opens the position detail sheet on row click.
 */
export function PositionTable<T extends Row>({ title, sub, info, id, data, columns, searchKeys = [], pageSize }: Props<T>) {
  const { openPosition } = useDepot();
  const [search, setSearch] = useState('');

  const positionCol: Column<T> = {
    key: 'symbol',
    label: 'Position',
    render: (r) => (
      <div className="w-28 sm:w-56">
        <div className="font-mono text-xs font-semibold text-zinc-100">{r.symbol}</div>
        <div className="truncate text-xs text-zinc-500">{r.name}</div>
      </div>
    ),
  };

  return (
    <Card id={id} title={title} sub={sub} info={info} flush action={<SearchInput value={search} onChange={setSearch} />}>
      <SortableTable
        data={data}
        rowKey={(r) => r.symbol}
        columns={[positionCol, ...columns]}
        filter={search}
        filterKeys={['symbol', 'name', ...searchKeys] as (keyof T)[]}
        onRowClick={(r) => openPosition(r.symbol)}
        pageSize={pageSize}
      />
    </Card>
  );
}
