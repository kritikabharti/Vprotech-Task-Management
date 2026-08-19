export default function LoadingSpinner({ label = 'Loading...', full = false }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-navy-500 ${full ? 'min-h-[60vh]' : 'py-10'}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-200 border-t-navy-700" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
