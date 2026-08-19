import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { FiUsers, FiUserCheck, FiGrid, FiSunrise, FiSunset, FiTrendingUp, FiAlertTriangle } from 'react-icons/fi';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';

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

const PIE_COLORS = ['#5CB85C', '#F59E0B', '#DC2626'];

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, monthlyRes] = await Promise.all([
        axiosClient.get('/dashboard/admin'),
        axiosClient.get('/reports/monthly', { params: { month: currentMonthValue() } }),
      ]);
      setStats(statsRes.data);
      setMonthly(monthlyRes.data);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load dashboard.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner full label="Loading dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!stats) return null;

  const deptChartData = Object.entries(monthly?.departmentSummary || {}).map(([name, v]) => ({
    department: name,
    Planned: v.planned,
    Completed: v.completed,
  }));

  const totals = (monthly?.summary || []).reduce(
    (acc, r) => {
      acc.completed += r.totalCompletedTasks;
      acc.partial += r.totalPartialTasks;
      acc.notCompleted += r.totalNotCompletedTasks;
      return acc;
    },
    { completed: 0, partial: 0, notCompleted: 0 }
  );
  const pieData = [
    { name: 'Completed', value: totals.completed },
    { name: 'Partial', value: totals.partial },
    { name: 'Not Completed', value: totals.notCompleted },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FiUsers} label="Total Employees" value={stats.totalEmployees} />
        <StatCard icon={FiUserCheck} label="Total Team Leads" value={stats.totalTeamLeads} />
        <StatCard icon={FiGrid} label="Total Departments" value={stats.totalDepartments} />
        <StatCard icon={FiTrendingUp} label="Overall Completion Today" value={`${stats.overallCompletionPercentage}%`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FiSunrise} label="Today's Morning Updates" value={stats.todayMorningUpdates} />
        <StatCard icon={FiSunset} label="Today's Evening Updates" value={stats.todayEveningUpdates} />
        <StatCard icon={FiAlertTriangle} label="Missing Morning" value={stats.employeesMissingMorning} accent="text-amber-600" />
        <StatCard icon={FiAlertTriangle} label="Missing Evening" value={stats.employeesMissingEvening} accent="text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-navy-800 mb-4">Department Performance (this month)</h3>
          {deptChartData.length === 0 ? (
            <p className="text-sm text-navy-400">No data yet this month.</p>
          ) : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={deptChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                  <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Planned" fill="#87A6C7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Completed" fill="#5CB85C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-navy-800 mb-4">Completed vs Partial vs Not Completed</h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-navy-400">No data yet this month.</p>
          ) : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
