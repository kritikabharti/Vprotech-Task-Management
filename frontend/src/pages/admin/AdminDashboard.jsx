import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import {
  FiUsers,
  FiUserCheck,
  FiGrid,
  FiSunrise,
  FiSunset,
  FiTrendingUp,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
} from 'react-icons/fi';

import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';

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

const PIE_COLORS = [
  '#5CB85C',
  '#F59E0B',
  '#DC2626',
];

function currentMonthValue() {
  const d = new Date();

  return `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, '0')}`;
}

function extractApiData(response) {
  /**
   * Your sendSuccess response is normally:
   *
   * {
   *   success: true,
   *   message: "...",
   *   data: {...}
   * }
   *
   * axios response is:
   *
   * response.data.data
   *
   * This helper also safely handles APIs that
   * return the payload directly.
   */
  return (
    response?.data?.data ??
    response?.data ??
    {}
  );
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
      const [
        statsRes,
        monthlyRes,
      ] = await Promise.all([
        axiosClient.get('/dashboard/admin'),

        axiosClient.get('/reports/monthly', {
          params: {
            month: currentMonthValue(),
          },
        }),
      ]);

      const statsData =
        extractApiData(statsRes);

      const monthlyData =
        extractApiData(monthlyRes);

      console.log(
        'ADMIN DASHBOARD:',
        statsData
      );

      console.log(
        'ADMIN MONTHLY:',
        monthlyData
      );

      setStats(statsData);
      setMonthly(monthlyData);
    } catch (err) {
      console.error(
        'Admin dashboard error:',
        err
      );

      const message =
        err.response?.data?.message ||
        'Failed to load dashboard.';

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
        label="Loading dashboard..."
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

  if (!stats) {
    return null;
  }

  /**
   * Monthly department chart.
   *
   * Supports:
   * {
   *   departmentSummary: {
   *     Technical: {
   *       planned: 10,
   *       completed: 8
   *     }
   *   }
   * }
   */
  const departmentSummary =
    monthly?.departmentSummary || {};

  const deptChartData = Object.entries(
    departmentSummary
  ).map(([name, value]) => ({
    department: name,
    Planned: Number(value?.planned || 0),
    Completed: Number(
      value?.completed || 0
    ),
  }));

  /**
   * Monthly summary.
   */
  const monthlySummary =
    Array.isArray(monthly?.summary)
      ? monthly.summary
      : [];

  const totals = monthlySummary.reduce(
    (acc, report) => {
      acc.completed += Number(
        report?.totalCompletedTasks || 0
      );

      acc.partial += Number(
        report?.totalPartialTasks || 0
      );

      acc.notCompleted += Number(
        report?.totalNotCompletedTasks || 0
      );

      return acc;
    },
    {
      completed: 0,
      partial: 0,
      notCompleted: 0,
    }
  );

  /**
   * If the monthly API doesn't return summary data,
   * do not create a fake chart.
   */
  const pieData = [
    {
      name: 'Completed',
      value: totals.completed,
    },
    {
      name: 'Partial',
      value: totals.partial,
    },
    {
      name: 'Not Completed',
      value: totals.notCompleted,
    },
  ].filter(
    (item) => item.value > 0
  );

  const completionPercentage =
    Number(
      stats.overallCompletionPercentage
    ) || 0;

  const plannedTasks =
    Number(stats.plannedTasks) || 0;

  const completedTasks =
    Number(stats.completedTasks) || 0;

  const pendingTasks =
    Number(stats.pendingTasks) ||
    Math.max(
      0,
      plannedTasks - completedTasks
    );

  return (
    <div className="space-y-6">

      {/* =========================
          TOP STATISTICS
      ========================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <StatCard
          icon={FiUsers}
          label="Total Employees"
          value={stats.totalEmployees || 0}
        />

        <StatCard
          icon={FiUserCheck}
          label="Total Team Leads"
          value={stats.totalTeamLeads || 0}
        />

        <StatCard
          icon={FiGrid}
          label="Total Departments"
          value={stats.totalDepartments || 0}
        />

        <StatCard
          icon={FiTrendingUp}
          label="Overall Completion Today"
          value={`${completionPercentage}%`}
        />

      </div>

      {/* =========================
          TODAY'S UPDATES
      ========================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <StatCard
          icon={FiSunrise}
          label="Today's Morning Updates"
          value={
            stats.todayMorningUpdates || 0
          }
        />

        <StatCard
          icon={FiSunset}
          label="Today's Evening Updates"
          value={
            stats.todayEveningUpdates || 0
          }
        />

        <StatCard
          icon={FiAlertTriangle}
          label="Missing Morning"
          value={
            stats.employeesMissingMorning || 0
          }
          accent="text-amber-600"
        />

        <StatCard
          icon={FiAlertTriangle}
          label="Missing Evening"
          value={
            stats.employeesMissingEvening || 0
          }
          accent="text-amber-600"
        />

      </div>

      {/* =========================
          TASK STATISTICS
      ========================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <StatCard
          icon={FiGrid}
          label="Today's Planned Tasks"
          value={plannedTasks}
        />

        <StatCard
          icon={FiCheckCircle}
          label="Today's Completed Tasks"
          value={completedTasks}
          accent="text-green-600"
        />

        <StatCard
          icon={FiClock}
          label="Today's Pending Tasks"
          value={pendingTasks}
          accent="text-amber-600"
        />

      </div>

      {/* =========================
          CHARTS
      ========================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Department Performance */}
        <div className="card p-5 lg:col-span-2">

          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-navy-800">
                Department Performance
              </h3>

              <p className="text-xs text-navy-400 mt-1">
                Current month
              </p>
            </div>
          </div>

          {deptChartData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center">
              <div className="text-center">
                <FiGrid className="h-10 w-10 text-navy-200 mx-auto mb-3" />

                <p className="text-sm font-medium text-navy-600">
                  No department data available
                </p>

                <p className="text-xs text-navy-400 mt-1">
                  Data will appear when employees submit tasks.
                </p>
              </div>
            </div>
          ) : (
            <div
              style={{
                width: '100%',
                height: 280,
              }}
            >
              <ResponsiveContainer>
                <BarChart
                  data={deptChartData}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#EEF2F7"
                  />

                  <XAxis
                    dataKey="department"
                    tick={{
                      fontSize: 12,
                    }}
                  />

                  <YAxis
                    tick={{
                      fontSize: 12,
                    }}
                    allowDecimals={false}
                  />

                  <Tooltip />

                  <Legend />

                  <Bar
                    dataKey="Planned"
                    fill="#87A6C7"
                    radius={[
                      4,
                      4,
                      0,
                      0,
                    ]}
                  />

                  <Bar
                    dataKey="Completed"
                    fill="#5CB85C"
                    radius={[
                      4,
                      4,
                      0,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

        </div>

        {/* Completion Pie */}
        <div className="card p-5">

          <h3 className="font-semibold text-navy-800">
            Task Completion
          </h3>

          <p className="text-xs text-navy-400 mt-1 mb-4">
            Current month
          </p>

          {pieData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center">
              <div className="text-center">
                <FiTrendingUp className="h-10 w-10 text-navy-200 mx-auto mb-3" />

                <p className="text-sm font-medium text-navy-600">
                  No task data available
                </p>

                <p className="text-xs text-navy-400 mt-1">
                  The chart will appear after task updates.
                </p>
              </div>
            </div>
          ) : (
            <div
              style={{
                width: '100%',
                height: 280,
              }}
            >
              <ResponsiveContainer>
                <PieChart>

                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {pieData.map(
                      (entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={
                            PIE_COLORS[
                              index %
                                PIE_COLORS.length
                            ]
                          }
                        />
                      )
                    )}
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