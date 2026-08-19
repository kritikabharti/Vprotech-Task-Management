export function toISODate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 10);
}

export function todayISO() {
  return toISODate(new Date());
}

export function formatDateLabel(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export function minutesToHours(mins) {
  if (mins === undefined || mins === null) return '0h 0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}

export function roleLabel(role) {
  return { admin: 'Administrator', team_lead: 'Team Lead', employee: 'Employee' }[role] || role;
}
