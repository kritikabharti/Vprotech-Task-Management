const STYLES = {
  Completed: 'bg-brandGreen-500/10 text-brandGreen-600 border-brandGreen-500/30',
  'Partially Completed': 'bg-amber-100 text-amber-700 border-amber-300',
  'Not Completed': 'bg-red-100 text-red-700 border-red-300',
  Submitted: 'bg-brandGreen-500/10 text-brandGreen-600 border-brandGreen-500/30',
  Missing: 'bg-red-100 text-red-700 border-red-300',
  draft: 'bg-navy-100 text-navy-600 border-navy-200',
  morning_submitted: 'bg-blue-100 text-blue-700 border-blue-300',
  evening_submitted: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  approved: 'bg-brandGreen-500/10 text-brandGreen-600 border-brandGreen-500/30',
  needs_correction: 'bg-red-100 text-red-700 border-red-300',
  Low: 'bg-navy-100 text-navy-600 border-navy-200',
  Medium: 'bg-blue-100 text-blue-700 border-blue-300',
  High: 'bg-amber-100 text-amber-700 border-amber-300',
  Urgent: 'bg-red-100 text-red-700 border-red-300',
  active: 'bg-brandGreen-500/10 text-brandGreen-600 border-brandGreen-500/30',
  inactive: 'bg-navy-100 text-navy-500 border-navy-200',
};

const LABELS = {
  draft: 'Draft',
  morning_submitted: 'Morning Submitted',
  evening_submitted: 'Evening Submitted',
  approved: 'Approved',
  needs_correction: 'Needs Correction',
};

export default function StatusBadge({ status }) {
  const style = STYLES[status] || 'bg-navy-100 text-navy-600 border-navy-200';
  const label = LABELS[status] || status;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${style}`}>
      {label}
    </span>
  );
}
