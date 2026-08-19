import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiUsers, FiSunrise, FiSunset, FiCheckCircle, FiAlertTriangle, FiTrendingUp } from 'react-icons/fi';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import DataTable from '../../components/DataTable';

function StatCard({ icon: Icon, label, value, accent = 'text-navy-700' }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg bg-navy-50 flex items-center justify-center ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-navy-400">{label}</p>
        <p className="text-xl font-semibold text-navy-800">{value}</p>
      </div>
    </div>
  );
}

export default function TeamLeadDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await axiosClient.get('/dashboard/team-lead');
      setData(res.data);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load dashboard.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner full label="Loading team dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  const columns = [
    { key: 'employee', label: 'Employee', render: (r) => r.employee?.fullName },
    { key: 'planned', label: 'Planned', render: (r) => r.totalPlannedTasks },
    { key: 'completed', label: 'Completed', render: (r) => r.totalCompletedTasks },
    { key: 'completion', label: 'Completion %', render: (r) => `${r.overallCompletionPercentage}%` },
    { key: 'missingMorning', label: 'Missing Morning', render: (r) => r.missingMorningUpdates },
    { key: 'missingEvening', label: 'Missing Evening', render: (r) => r.missingEveningUpdates },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FiUsers} label="Total Employees" value={data.totalEmployees} />
        <StatCard icon={FiSunrise} label="Morning Submitted Today" value={`${data.todayMorningSubmitted} / ${data.totalEmployees}`} />
        <StatCard icon={FiSunset} label="Evening Submitted Today" value={`${data.todayEveningSubmitted} / ${data.totalEmployees}`} />
        <StatCard icon={FiTrendingUp} label="Team Completion Today" value={`${data.teamCompletionPercentage}%`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard icon={FiCheckCircle} label="Completed Tasks Today" value={data.completedTasks} accent="text-brandGreen-600" />
        <StatCard icon={FiAlertTriangle} label="Pending Tasks Today" value={data.pendingTasks} accent="text-amber-600" />
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-navy-800 mb-4">Weekly Performance (last 7 days)</h3>
        <DataTable
          columns={columns}
          rows={data.weeklyPerformance.map((r) => ({ ...r, _id: r.employee?._id }))}
          emptyTitle="No weekly data yet"
        />
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-navy-800 mb-4">Monthly Performance (last 30 days)</h3>
        <DataTable
          columns={columns}
          rows={data.monthlyPerformance.map((r) => ({ ...r, _id: r.employee?._id }))}
          emptyTitle="No monthly data yet"
        />
      </div>
    </div>
  );
}
