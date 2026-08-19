export default function Pagination({ page, limit, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-navy-100 px-4 py-3 text-sm">
      <p className="text-navy-500">
        Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
      </p>
      <div className="flex gap-1">
        <button
          className="btn-secondary px-3 py-1"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </button>
        <span className="px-3 py-1 text-navy-600">{page} / {totalPages}</span>
        <button
          className="btn-secondary px-3 py-1"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
