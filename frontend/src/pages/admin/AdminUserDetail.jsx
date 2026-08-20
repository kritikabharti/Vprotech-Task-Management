import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiUser } from 'react-icons/fi';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { formatDateLabel, roleLabel, resolveAssetUrl } from '../../utils/format';

export default function AdminUserDetail() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: userRes } = await axiosClient.get(`/users/${id}`);
        setUser(userRes.data.user);

        if (userRes.data.user.role === 'employee') {
          const { data: taskRes } = await axiosClient.get('/tasks', { params: { employeeId: id, limit: 15 } });
          setReports(taskRes.data.reports);
        } else if (userRes.data.user.role === 'team_lead') {
          const { data: teamRes } = await axiosClient.get('/users', { params: { role: 'employee', teamLead: id, limit: 100 } });
          setTeamMembers(teamRes.data.users);
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load user details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <LoadingSpinner full label="Loading user..." />;
  if (!user) return null;

  const taskColumns = [
    { key: 'taskDate', label: 'Date', render: (r) => formatDateLabel(r.taskDate) },
    { key: 'planned', label: 'Planned', render: (r) => r.summary.totalPlanned },
    { key: 'completed', label: 'Completed', render: (r) => r.summary.totalCompleted },
    { key: 'completionPercentage', label: 'Completion %', render: (r) => `${r.summary.completionPercentage}%` },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const teamColumns = [
    { key: 'employeeCode', label: 'ID' },
    { key: 'fullName', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <Link to="/admin/employees" className="inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800">
        <FiArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="card p-6 flex items-center gap-5">
        <div className="h-16 w-16 rounded-full bg-navy-100 flex items-center justify-center overflow-hidden shrink-0">
          {user.profileImage ? <img src={resolveAssetUrl(user.profileImage)} alt="" className="h-full w-full object-cover" /> : <FiUser className="h-7 w-7 text-navy-400" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-navy-800 text-lg">{user.fullName}</p>
            <StatusBadge status={user.status} />
          </div>
          <p className="text-sm text-navy-400">{user.employeeCode} · {roleLabel(user.role)} · {user.designation || '-'}</p>
          <p className="text-sm text-navy-400">{user.email}{user.phone ? ` · ${user.phone}` : ''}</p>
          <p className="text-sm text-navy-400">
            Department: {user.department?.name || 'Unassigned'}
            {user.role === 'employee' && ` · Team Lead: ${user.teamLead?.fullName || 'Unassigned'}`}
          </p>
        </div>
      </div>

      {user.role === 'employee' && (
        <div className="card p-5">
          <h3 className="font-semibold text-navy-800 mb-4">Recent Task History</h3>
          <DataTable columns={taskColumns} rows={reports} onRowClick={(r) => navigate(`/admin/review/${r._id}`)} emptyTitle="No task history yet" />
        </div>
      )}

      {user.role === 'team_lead' && (
        <div className="card p-5">
          <h3 className="font-semibold text-navy-800 mb-4">Assigned Employees ({teamMembers.length})</h3>
          <DataTable columns={teamColumns} rows={teamMembers} onRowClick={(r) => navigate(`/admin/users/${r._id}`)} emptyTitle="No employees assigned yet" />
        </div>
      )}
    </div>
  );
}
