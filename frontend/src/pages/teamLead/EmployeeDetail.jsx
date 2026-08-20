import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiUser } from 'react-icons/fi';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { formatDateLabel, resolveAssetUrl } from '../../utils/format';

export default function EmployeeDetail() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [empRes, taskRes] = await Promise.all([
          axiosClient.get(`/users/${id}`),
          axiosClient.get('/tasks', { params: { employeeId: id, limit: 15 } }),
        ]);
        setEmployee(empRes.data.user);
        setReports(taskRes.data.reports);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load employee details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <LoadingSpinner full label="Loading employee..." />;
  if (!employee) return null;

  const columns = [
    { key: 'taskDate', label: 'Date', render: (r) => formatDateLabel(r.taskDate) },
    { key: 'planned', label: 'Planned', render: (r) => r.summary.totalPlanned },
    { key: 'completed', label: 'Completed', render: (r) => r.summary.totalCompleted },
    { key: 'completionPercentage', label: 'Completion %', render: (r) => `${r.summary.completionPercentage}%` },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <Link to="/team-lead/employees" className="inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800">
        <FiArrowLeft className="h-4 w-4" /> Back to My Employees
      </Link>

      <div className="card p-6 flex items-center gap-5">
        <div className="h-16 w-16 rounded-full bg-navy-100 flex items-center justify-center overflow-hidden shrink-0">
          {employee.profileImage ? <img src={resolveAssetUrl(employee.profileImage)} alt="" className="h-full w-full object-cover" /> : <FiUser className="h-7 w-7 text-navy-400" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-navy-800 text-lg">{employee.fullName}</p>
            <StatusBadge status={employee.status} />
          </div>
          <p className="text-sm text-navy-400">{employee.employeeCode} · {employee.designation || 'Employee'}</p>
          <p className="text-sm text-navy-400">{employee.email}{employee.phone ? ` · ${employee.phone}` : ''}</p>
          {employee.department?.name && <p className="text-sm text-navy-400">Department: {employee.department.name}</p>}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-navy-800 mb-4">Recent Task History</h3>
        <DataTable columns={columns} rows={reports} onRowClick={(r) => navigate(`/team-lead/review/${r._id}`)} emptyTitle="No task history yet" />
      </div>
    </div>
  );
}
