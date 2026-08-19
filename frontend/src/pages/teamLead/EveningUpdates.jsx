import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosClient from '../../api/axiosClient';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { todayISO } from '../../utils/format';

export default function EveningUpdates() {
  const [date, setDate] = useState(todayISO());
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: res } = await axiosClient.get('/tasks', { params: { from: date, to: date, limit: 100 } });
        setReports(res.data.reports.filter((r) => ['evening_submitted', 'approved', 'needs_correction'].includes(r.status)));
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load evening updates.');
      } finally {
        setLoading(false);
      }
    })();
  }, [date]);

  const columns = [
    { key: 'employee', label: 'Employee', render: (r) => r.employee?.fullName },
    { key: 'planned', label: 'Planned', render: (r) => r.summary.totalPlanned },
    { key: 'completed', label: 'Completed', render: (r) => r.summary.totalCompleted },
    { key: 'partial', label: 'Partial', render: (r) => r.summary.totalPartial },
    { key: 'notCompleted', label: 'Not Completed', render: (r) => r.summary.totalNotCompleted },
    { key: 'completionPercentage', label: 'Completion %', render: (r) => `${r.summary.completionPercentage}%` },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-5">
      <div className="card p-4 flex items-center gap-3">
        <label className="label m-0">Date</label>
        <input type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} className="input-field w-auto" />
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-navy-800 mb-4">Evening Completion Details — {date}</h3>
        <DataTable
          columns={columns}
          rows={reports}
          loading={loading}
          onRowClick={(r) => navigate(`/team-lead/review/${r._id}`)}
          emptyTitle="No evening submissions yet"
          emptyDescription="Employees who submit an evening update for this date will appear here."
        />
      </div>
    </div>
  );
}
