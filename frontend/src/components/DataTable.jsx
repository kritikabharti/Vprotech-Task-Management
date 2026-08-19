import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import LoadingSpinner from './LoadingSpinner';
import { FiInbox } from 'react-icons/fi';

// columns: [{ key, label, render?: (row) => node, className? }]
// error: pass an error message string (or true) when the fetch that
// feeds `rows` failed, so a broken page shows "something went wrong"
// instead of silently rendering the same empty-state as "no data yet".
export default function DataTable({
  columns, rows, loading, error, onRetry,
  emptyTitle = 'No records found', emptyDescription, rowKey = '_id', onRowClick,
}) {
  if (loading) return <LoadingSpinner label="Loading data..." />;
  if (error) {
    return <ErrorState message={typeof error === 'string' ? error : undefined} onRetry={onRetry} />;
  }
  if (!rows || rows.length === 0) {
    return <EmptyState icon={FiInbox} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-navy-100 bg-navy-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-500">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 whitespace-nowrap">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row[rowKey]}
              className={`border-b border-navy-50 hover:bg-navy-50/60 ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 align-middle ${col.className || ''}`}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
