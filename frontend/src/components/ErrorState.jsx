import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';

// Distinct from EmptyState: EmptyState means "the request succeeded and
// there's genuinely nothing here." ErrorState means "the request failed
// and we don't actually know what's here." Conflating the two (silently
// falling back to an empty-state message when a fetch throws) makes a
// broken page look like an empty one - that's the bug this fixes.
export default function ErrorState({ message = "Couldn't load this data.", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <FiAlertCircle className="h-10 w-10 text-red-300" />
      <div>
        <p className="font-semibold text-navy-700">Something went wrong</p>
        <p className="text-sm text-navy-400 mt-1 max-w-sm">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary">
          <FiRefreshCw className="h-4 w-4" /> Retry
        </button>
      )}
    </div>
  );
}
