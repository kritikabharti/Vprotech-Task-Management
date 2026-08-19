import { FiX } from 'react-icons/fi';

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-900/50" onClick={onClose} />
      <div className={`relative w-full ${widths[size]} rounded-lg bg-white shadow-xl max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
          <h3 className="font-semibold text-navy-800">{title}</h3>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-700" aria-label="Close">
            <FiX className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
        {footer && <div className="border-t border-navy-100 px-5 py-3 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
