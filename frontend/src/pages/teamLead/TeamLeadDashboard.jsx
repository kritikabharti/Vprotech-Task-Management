import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  FiUsers,
  FiSunrise,
  FiSunset,
  FiCheckCircle,
  FiAlertTriangle,
  FiTrendingUp,
  FiClipboard,
  FiRefreshCw,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import DataTable from '../../components/DataTable';

function StatCard({
  icon: Icon,
  label,
  value,
  accent = 'text-navy-700',
}) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div
        className={`h-10 w-10 rounded-lg bg-navy-50 flex items-center justify-center ${accent}`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div>
        <p className="text-xs text-navy-400">
          {label}
        </p>

        <p className="text-xl font-semibold text-navy-800">
          {value ?? 0}
        </p>
      </div>
    </div>
  );
}

export default function TeamLeadDashboard() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: response } = await axiosClient.get(
        '/dashboard/team-lead'
      );

      setData(response?.data || {});
    } catch (err) {
      console.error(
        'Team Lead Dashboard Error:',
        err
      );

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.data?.message ||
        'Failed to load team dashboard.';

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <LoadingSpinner
        full
        label="Loading team dashboard..."
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={load}
      />
    );
  }

  if (!data) {
    return null;
  }

  const weeklyPerformance = Array.isArray(
    data.weeklyPerformance
  )
    ? data.weeklyPerformance
    : [];

  const monthlyPerformance = Array.isArray(
    data.monthlyPerformance
  )
    ? data.monthlyPerformance
    : [];

  const columns = [
    {
      key: 'employee',
      label: 'Employee',
      render: (row) => (
        <div>
          <p className="font-medium text-navy-800">
            {row?.employee?.fullName ||
              'Unknown Employee'}
          </p>

          {row?.employee?.employeeCode && (
            <p className="text-xs text-navy-400">
              {row.employee.employeeCode}
            </p>
          )}
        </div>
      ),
    },

    {
      key: 'planned',
      label: 'Planned',
      render: (row) =>
        row?.totalPlannedTasks ?? 0,
    },

    {
      key: 'completed',
      label: 'Completed',
      render: (row) =>
        row?.totalCompletedTasks ?? 0,
    },

    {
      key: 'completion',
      label: 'Completion %',
      render: (row) =>
        `${row?.overallCompletionPercentage ?? 0}%`,
    },

    {
      key: 'missingMorning',
      label: 'Missing Morning',
      render: (row) =>
        row?.missingMorningUpdates ?? 0,
    },

    {
      key: 'missingEvening',
      label: 'Missing Evening',
      render: (row) =>
        row?.missingEveningUpdates ?? 0,
    },
  ];

  const weeklyRows = weeklyPerformance.map(
    (row, index) => ({
      ...row,
      _id:
        row?.employee?._id ||
        row?.employee?.id ||
        `weekly-${index}`,
    })
  );

  const monthlyRows = monthlyPerformance.map(
    (row, index) => ({
      ...row,
      _id:
        row?.employee?._id ||
        row?.employee?.id ||
        `monthly-${index}`,
    })
  );

  return (
    <div className="space-y-6">

      {/* =====================================================
          QUICK ACTIONS
      ===================================================== */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">

          <div>
            <h3 className="font-semibold text-navy-800">
              Quick Actions
            </h3>

            <p className="text-sm text-navy-400 mt-1">
              Manage your team and assign work.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={() =>
                navigate('/team-lead/assign-task')
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-navy-700 text-white text-sm font-medium hover:bg-navy-800 transition"
            >
              <FiClipboard className="h-4 w-4" />
              Assign Task
            </button>

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-navy-200 text-navy-700 text-sm font-medium hover:bg-navy-50 disabled:opacity-50 transition"
            >
              <FiRefreshCw
                className={`h-4 w-4 ${
                  loading ? 'animate-spin' : ''
                }`}
              />
              Refresh
            </button>

          </div>
        </div>
      </div>

      {/* =====================================================
          MAIN STATISTICS
      ===================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <StatCard
          icon={FiUsers}
          label="Total Employees"
          value={data.totalEmployees}
        />

        <StatCard
          icon={FiSunrise}
          label="Morning Submitted Today"
          value={`${data.todayMorningSubmitted ?? 0} / ${
            data.totalEmployees ?? 0
          }`}
        />

        <StatCard
          icon={FiSunset}
          label="Evening Submitted Today"
          value={`${data.todayEveningSubmitted ?? 0} / ${
            data.totalEmployees ?? 0
          }`}
        />

        <StatCard
          icon={FiTrendingUp}
          label="Team Completion Today"
          value={`${data.teamCompletionPercentage ?? 0}%`}
        />

      </div>

      {/* =====================================================
          TASK STATISTICS
      ===================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <StatCard
          icon={FiCheckCircle}
          label="Completed Tasks Today"
          value={data.completedTasks}
          accent="text-brandGreen-600"
        />

        <StatCard
          icon={FiAlertTriangle}
          label="Pending Tasks Today"
          value={data.pendingTasks}
          accent="text-amber-600"
        />

      </div>

      {/* =====================================================
          WEEKLY PERFORMANCE
      ===================================================== */}
      <div className="card p-5">

        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-navy-800">
              Weekly Performance
            </h3>

            <p className="text-sm text-navy-400 mt-1">
              Employee performance for the last 7 days.
            </p>
          </div>

          <span className="text-sm text-navy-400">
            {weeklyRows.length} employee
            {weeklyRows.length !== 1 ? 's' : ''}
          </span>
        </div>

        <DataTable
          columns={columns}
          rows={weeklyRows}
          loading={loading}
          emptyTitle="No weekly data yet"
          emptyDescription="Employee performance will appear here once task activity is recorded."
        />

      </div>

      {/* =====================================================
          MONTHLY PERFORMANCE
      ===================================================== */}
      <div className="card p-5">

        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-navy-800">
              Monthly Performance
            </h3>

            <p className="text-sm text-navy-400 mt-1">
              Employee performance for the last 30 days.
            </p>
          </div>

          <span className="text-sm text-navy-400">
            {monthlyRows.length} employee
            {monthlyRows.length !== 1 ? 's' : ''}
          </span>
        </div>

        <DataTable
          columns={columns}
          rows={monthlyRows}
          loading={loading}
          emptyTitle="No monthly data yet"
          emptyDescription="Employee performance will appear here once task activity is recorded."
        />

      </div>

    </div>
  );
}