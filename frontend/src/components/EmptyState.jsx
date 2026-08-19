export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      {Icon && <Icon className="h-10 w-10 text-navy-200" />}
      <div>
        <p className="font-semibold text-navy-700">{title}</p>
        {description && <p className="text-sm text-navy-400 mt-1 max-w-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
