import { useState } from 'react';
import { toast } from 'react-toastify';
import { FiDownload, FiFileText } from 'react-icons/fi';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
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

export default function Reports() {
  const [tab, setTab] = useState('daily');
  const [date, setDate] = useState(todayISO());
  const [weekStart, setWeekStart] = useState(todayISO());
  const [month, setMonth] = useState(currentMonthValue());
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState(null);

  const paramsForTab = () => {
    if (tab === 'daily') return { date };
    if (tab === 'weekly') return { weekStart };
    if (tab === 'monthly') return { month };
    return { from, to };
  };

  const runReport = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data: res } = await axiosClient.get(`/reports/${tab}`, { params: paramsForTab() });
      setResult(res.data);
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
      link.download = `${tab}-report.${format === 'excel' ? 'xlsx' : 'pdf'}`;
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

  const summaryRow = tab === 'daily' ? result?.details?.[0] : result?.summary?.[0];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="card p-1 flex flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setResult(null); }}
            className={`flex-1 min-w-[100px] rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-navy-700 text-white' : 'text-navy-500 hover:bg-navy-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card p-4 flex flex-wrap items-end gap-3">
        {tab === 'daily' && (
          <div>
            <label className="label">Date</label>
            <input type="date" max={todayISO()} className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        )}
        {tab === 'weekly' && (
          <div>
            <label className="label">Any date in the week</label>
            <input type="date" max={todayISO()} className="input-field" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
          </div>
        )}
        {tab === 'monthly' && (
          <div>
            <label className="label">Month</label>
            <input type="month" className="input-field" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
        )}
        {tab === 'custom' && (
          <>
            <div>
              <label className="label">From</label>
              <input type="date" max={todayISO()} className="input-field" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">To</label>
              <input type="date" max={todayISO()} className="input-field" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </>
        )}

        <button onClick={runReport} className="btn-primary">Generate Report</button>
        {result && (
          <div className="flex gap-2 ml-auto">
            <button onClick={() => handleExport('excel')} disabled={exporting} className="btn-secondary">
              <FiDownload className="h-4 w-4" /> Excel
            </button>
            <button onClick={() => handleExport('pdf')} disabled={exporting} className="btn-secondary">
              <FiFileText className="h-4 w-4" /> PDF
            </button>
          </div>
        )}
      </div>

      {loading && <LoadingSpinner label="Generating report..." />}

      {!loading && result && (
        <div className="card p-5">
          {tab === 'daily' ? (
            !summaryRow ? (
              <EmptyState title="No report data" description="No submission found for this date." />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <Stat label="Planned" value={summaryRow.morningTaskCount} />
                <Stat label="Completed" value={summaryRow.completedCount} />
                <Stat label="Partial" value={summaryRow.partialCount} />
                <Stat label="Not Completed" value={summaryRow.notCompletedCount} />
                <Stat label="Completion %" value={`${summaryRow.completionPercentage}%`} />
                <Stat label="Evening Status" value={summaryRow.eveningStatus} />
              </div>
            )
          ) : !summaryRow ? (
            <EmptyState title="No report data" description="No submissions found in this range." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <Stat label="Working Days" value={summaryRow.workingDays} />
              <Stat label="Planned Tasks" value={summaryRow.totalPlannedTasks} />
              <Stat label="Completed Tasks" value={summaryRow.totalCompletedTasks} />
              <Stat label="Completion %" value={`${summaryRow.overallCompletionPercentage}%`} />
              <Stat label="Avg Daily %" value={`${summaryRow.averageDailyCompletion}%`} />
              <Stat label="Est. Hours" value={summaryRow.totalEstimatedHours} />
              <Stat label="Actual Hours" value={summaryRow.totalActualHours} />
              <Stat label="Missing Morning" value={summaryRow.missingMorningUpdates} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="border border-navy-100 rounded-lg p-3">
      <p className="text-xs text-navy-400">{label}</p>
      <p className="text-lg font-semibold text-navy-800">{value}</p>
    </div>
  );
}
