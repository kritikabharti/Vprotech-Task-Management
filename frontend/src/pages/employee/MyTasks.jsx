import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosClient from '../../api/axiosClient';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';
import StatusBadge from '../../components/StatusBadge';
import { formatDateLabel } from '../../utils/format';

export default function MyTasks() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const limit = 10;
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: res } = await axiosClient.get('/tasks', {
          params: { page, limit, status: status || undefined, from: from || undefined, to: to || undefined },
        });
        setReports(res.data.reports);
        setTotal(res.meta.total);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load task history.');
      } finally {
        setLoading(false);
      }
    })();
  }, [page, status, from, to]);

  const columns = [
    { key: 'taskDate', label: 'Date', render: (r) => formatDateLabel(r.taskDate) },
    { key: 'planned', label: 'Planned', render: (r) => r.summary.totalPlanned },
    { key: 'completed', label: 'Completed', render: (r) => r.summary.totalCompleted },
    { key: 'partial', label: 'Partial', render: (r) => r.summary.totalPartial },
    { key: 'notCompleted', label: 'Not Completed', render: (r) => r.summary.totalNotCompleted },
    { key: 'completionPercentage', label: 'Completion %', render: (r) => `${r.summary.completionPercentage}%` },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">From</label>
          <input type="date" className="input-field" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input-field" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input-field" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="morning_submitted">Morning Submitted</option>
            <option value="evening_submitted">Evening Submitted</option>
            <option value="approved">Approved</option>
            <option value="needs_correction">Needs Correction</option>
          </select>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          rows={reports}
          loading={loading}
          onRowClick={(r) => navigate(`/employee/my-tasks/${r._id}`)}
          emptyTitle="No task history found"
          emptyDescription="Adjust your filters or check back after submitting a morning update."
        />
        <Pagination page={page} limit={limit} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
