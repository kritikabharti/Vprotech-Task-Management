import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiDownload, FiFileText } from 'react-icons/fi';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { todayISO } from '../../utils/format';

const TABS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'custom', label: 'Custom Range' },
];

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const SUMMARY_COLUMNS = [
  { key: 'employee', label: 'Employee', render: (r) => r.employee?.fullName },
  { key: 'workingDays', label: 'Working Days' },
  { key: 'totalPlannedTasks', label: 'Planned' },
  { key: 'totalCompletedTasks', label: 'Completed' },
  { key: 'totalPartialTasks', label: 'Partial' },
  { key: 'totalNotCompletedTasks', label: 'Not Completed' },
  { key: 'overallCompletionPercentage', label: 'Completion %', render: (r) => `${r.overallCompletionPercentage}%` },
  { key: 'missingMorningUpdates', label: 'Missing Morning' },
  { key: 'missingEveningUpdates', label: 'Missing Evening' },
];

const DAILY_COLUMNS = [
  { key: 'employee', label: 'Employee', render: (r) => r.employee?.fullName },
  { key: 'morningTaskCount', label: 'Planned' },
  { key: 'completedCount', label: 'Completed' },
  { key: 'partialCount', label: 'Partial' },
  { key: 'notCompletedCount', label: 'Not Completed' },
  { key: 'completionPercentage', label: 'Completion %', render: (r) => `${r.completionPercentage}%` },
  { key: 'eveningStatus', label: 'Evening', render: (r) => <StatusBadge status={r.eveningStatus} /> },
];

export default function TeamLeadReports() {
  const [tab, setTab] = useState('daily');
  const [date, setDate] = useState(todayISO());
  const [weekStart, setWeekStart] = useState(todayISO());
  const [month, setMonth] = useState(currentMonthValue());
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [employeeId, setEmployeeId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [rows, setRows] = useState(null);

  useEffect(() => {
    axiosClient.get('/users', { params: { role: 'employee', limit: 100 } })
      .then(({ data: res }) => setEmployees(res.data.users))
      .catch(() => {});
  }, []);

  const paramsForTab = () => {
    const base = { employeeId: employeeId || undefined };
    if (tab === 'daily') return { ...base, date };
    if (tab === 'weekly') return { ...base, weekStart };
    if (tab === 'monthly') return { ...base, month };
    return { ...base, from, to };
  };

  const runReport = async () => {
    setLoading(true);
    setRows(null);
    try {
      const { data: res } = await axiosClient.get(`/reports/${tab}`, { params: paramsForTab() });
      setRows(tab === 'daily' ? res.data.details : res.data.summary);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const res = await axiosClient.get('/reports/export', {
        params: { type: tab, format, ...paramsForTab() },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${tab}-team-report.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to export report.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card p-1 flex flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setRows(null); }}
            className={`flex-1 min-w-[100px] rounded-md px-3 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'bg-navy-700 text-white' : 'text-navy-500 hover:bg-navy-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card p-4 flex flex-wrap items-end gap-3">
        {tab === 'daily' && (
          <div><label className="label">Date</label><input type="date" max={todayISO()} className="input-field" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        )}
        {tab === 'weekly' && (
          <div><label className="label">Any date in week</label><input type="date" max={todayISO()} className="input-field" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} /></div>
        )}
        {tab === 'monthly' && (
          <div><label className="label">Month</label><input type="month" className="input-field" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
        )}
        {tab === 'custom' && (
          <>
            <div><label className="label">From</label><input type="date" max={todayISO()} className="input-field" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><label className="label">To</label><input type="date" max={todayISO()} className="input-field" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </>
        )}
        <div>
          <label className="label">Employee</label>
          <select className="input-field" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">All My Employees</option>
            {employees.map((e) => <option key={e._id} value={e._id}>{e.fullName}</option>)}
          </select>
        </div>

        <button onClick={runReport} className="btn-primary">Generate Report</button>
        {rows && (
          <div className="flex gap-2 ml-auto">
            <button onClick={() => handleExport('excel')} disabled={exporting} className="btn-secondary"><FiDownload className="h-4 w-4" /> Excel</button>
            <button onClick={() => handleExport('pdf')} disabled={exporting} className="btn-secondary"><FiFileText className="h-4 w-4" /> PDF</button>
          </div>
        )}
      </div>

      {loading && <LoadingSpinner label="Generating report..." />}

      {!loading && rows && (
        <div className="card p-5">
          <DataTable
            columns={tab === 'daily' ? DAILY_COLUMNS : SUMMARY_COLUMNS}
            rows={rows.map((r, i) => ({ ...r, _id: r.employee?._id || i }))}
            emptyTitle="No report data"
            emptyDescription="No submissions found for this selection."
          />
        </div>
      )}
    </div>
  );
}
