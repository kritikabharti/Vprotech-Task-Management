import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosClient from '../../api/axiosClient';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { todayISO } from '../../utils/format';

export default function AdminEveningUpdates() {
  const [date, setDate] = useState(todayISO());
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axiosClient.get('/departments', { params: { limit: 100, status: 'active' } }).then(({ data: res }) => setDepartments(res.data.departments)).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: res } = await axiosClient.get('/tasks', { params: { from: date, to: date, department: department || undefined, limit: 200 } });
        setReports(res.data.reports.filter((r) => ['evening_submitted', 'approved', 'needs_correction'].includes(r.status)));
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load evening updates.');
      } finally {
        setLoading(false);
      }
    })();
  }, [date, department]);

  const columns = [
    { key: 'employee', label: 'Employee', render: (r) => r.employee?.fullName },
    { key: 'department', label: 'Department', render: (r) => r.department?.name || '-' },
    { key: 'completed', label: 'Completed', render: (r) => r.summary.totalCompleted },
    { key: 'partial', label: 'Partial', render: (r) => r.summary.totalPartial },
    { key: 'notCompleted', label: 'Not Completed', render: (r) => r.summary.totalNotCompleted },
    { key: 'completionPercentage', label: 'Completion %', render: (r) => `${r.summary.completionPercentage}%` },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-5">
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <label className="label m-0">Date</label>
        <input type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} className="input-field w-auto" />
        <label className="label m-0">Department</label>
        <select className="input-field w-auto" value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-navy-800 mb-4">Evening Completion Details — {date}</h3>
        <DataTable columns={columns} rows={reports} loading={loading} onRowClick={(r) => navigate(`/admin/review/${r._id}`)} emptyTitle="No evening submissions yet" />
      </div>
    </div>
  );
}
