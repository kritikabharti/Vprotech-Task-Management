import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { FiSunrise, FiSunset, FiCheckCircle, FiClock, FiTrendingUp } from 'react-icons/fi';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import StatusBadge from '../../components/StatusBadge';
import { formatDateLabel, todayISO } from '../../utils/format';
import { toast } from 'react-toastify';

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

export default function EmployeeDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await axiosClient.get('/dashboard/employee');
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

  if (loading) return <LoadingSpinner full label="Loading your dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  const chartData = [
    { period: 'Today', Planned: data.today.plannedTasks, Completed: data.today.completedTasks },
    { period: 'This Week', Planned: data.weekly.plannedTasks, Completed: data.weekly.completedTasks },
    { period: 'This Month', Planned: data.monthly.plannedTasks, Completed: data.monthly.completedTasks },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FiSunrise} label="Morning Update" value={data.today.morningSubmitted ? 'Submitted' : 'Pending'} accent={data.today.morningSubmitted ? 'text-brandGreen-600' : 'text-amber-600'} />
        <StatCard icon={FiSunset} label="Evening Update" value={data.today.eveningSubmitted ? 'Submitted' : 'Pending'} accent={data.today.eveningSubmitted ? 'text-brandGreen-600' : 'text-amber-600'} />
        <StatCard icon={FiCheckCircle} label="Today Completed" value={`${data.today.completedTasks} / ${data.today.plannedTasks}`} />
        <StatCard icon={FiTrendingUp} label="Today Completion" value={`${data.today.completionPercentage}%`} />
      </div>

      {!data.today.morningSubmitted && (
        <div className="card p-4 bg-amber-50 border-amber-200 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-amber-800">You haven't submitted your morning plan for today yet.</p>
          <Link to="/employee/morning-update" className="btn-primary">Plan Today's Tasks</Link>
        </div>
      )}
      {data.today.morningSubmitted && !data.today.eveningSubmitted && (
        <div className="card p-4 bg-blue-50 border-blue-200 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-blue-800">Don't forget to record what you completed today.</p>
          <Link to="/employee/evening-update" className="btn-primary">Update Evening Progress</Link>
        </div>
      )}

      <div className="card p-5">
        <h3 className="font-semibold text-navy-800 mb-4">Morning Planned vs Evening Completed</h3>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Planned" fill="#87A6C7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Completed" fill="#5CB85C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-navy-800">Recent Tasks</h3>
          <Link to="/employee/my-tasks" className="text-sm text-navy-500 hover:text-navy-800 font-medium">
            View Full History →
          </Link>
        </div>
        {data.recentTasks.length === 0 ? (
          <p className="text-sm text-navy-400">No task history yet.</p>
        ) : (
          <div className="divide-y divide-navy-50">
            {data.recentTasks.map((r) => (
              <Link
                key={r._id}
                to={`/employee/my-tasks/${r._id}`}
                className="flex items-center justify-between py-3 hover:bg-navy-50/60 -mx-2 px-2 rounded"
              >
                <div>
                  <p className="text-sm font-medium text-navy-800">{formatDateLabel(r.taskDate)}</p>
                  <p className="text-xs text-navy-400">{r.summary.totalPlanned} planned · {r.summary.totalCompleted} completed</p>
                </div>
                <StatusBadge status={r.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
