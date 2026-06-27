import type { ReactNode } from 'react';
import { Card } from '@bestapp/ui';
import { cardClass, tableBodyRowClass, tableHeaderClass, tableHeadCellClass, tableWrapperClass } from '../styles';

export type TableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  render?: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
};

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyState
}: DataTableProps<T>) {
  if (!data.length) {
    return <>{emptyState ?? null}</>;
  }

  return (
    <Card className={`${cardClass} ${tableWrapperClass} overflow-hidden p-0`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className={tableHeaderClass}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`${tableHeadCellClass} ${column.className ?? ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80 bg-white/95">
            {data.map((row) => (
              <tr
                key={rowKey(row)}
                className={`${tableBodyRowClass} ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-3 text-sm text-slate-700 ${column.className ?? ''}`}>
                    {column.render ? column.render(row) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
