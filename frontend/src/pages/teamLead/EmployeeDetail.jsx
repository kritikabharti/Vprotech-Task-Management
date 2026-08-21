import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiArrowLeft,
  FiUser,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiCalendar,
} from 'react-icons/fi';

import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import { formatDateLabel, resolveAssetUrl } from '../../utils/format';

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadEmployee = async () => {
      setLoading(true);

      try {
        const [employeeResponse, reportsResponse] =
          await Promise.all([
            axiosClient.get(`/users/${id}`),

            axiosClient.get('/tasks', {
              params: {
                employeeId: id,
                limit: 100,
              },
            }),
          ]);

        if (!mounted) return;

        const employeeData =
          employeeResponse?.data?.user ||
          employeeResponse?.data?.data?.user ||
          null;

        const reportData =
          reportsResponse?.data?.reports ||
          reportsResponse?.data?.data?.reports ||
          [];

        setEmployee(employeeData);
        setReports(Array.isArray(reportData) ? reportData : []);
      } catch (err) {
        if (!mounted) return;

        console.error('Employee Detail Error:', err);

        const message =
          err?.response?.data?.message ||
          err?.response?.data?.data?.message ||
          'Failed to load employee details.';

        toast.error(message);

        setEmployee(null);
        setReports([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (id) {
      loadEmployee();
    }

    return () => {
      mounted = false;
    };
  }, [id]);

  // ---------------------------------------------------------
  // FLATTEN ALL MORNING TASKS FROM ALL DAILY REPORTS
  // ---------------------------------------------------------

  const tasks = useMemo(() => {
    const result = [];

    reports.forEach((report) => {
      const morningTasks = Array.isArray(report?.morning?.tasks)
        ? report.morning.tasks
        : [];

      const eveningTasks = Array.isArray(report?.evening?.tasks)
        ? report.evening.tasks
        : [];

      const eveningMap = new Map(
        eveningTasks.map((task) => [
          String(task?.taskRef || task?._id || ''),
          task,
        ])
      );

      morningTasks.forEach((task, index) => {
        const taskId =
          task?._id ||
          task?.id ||
          `${report?._id}-${index}`;

        const completion =
          eveningMap.get(String(task?._id || ''));

        result.push({
          ...task,

          // Unique frontend ID
          frontendId: `${report?._id}-${taskId}`,

          // Parent daily report
          reportId: report?._id,

          // Employee
          employee: report?.employee,

          // Date of task
          taskDate: report?.taskDate,

          // Daily report status
          reportStatus: report?.status,

          // Evening completion information
          completion: completion || null,

          completionStatus:
            completion?.status || 'Pending',

          completionPercentage:
            completion?.completionPercentage ?? 0,

          actualTimeSpentMinutes:
            completion?.actualTimeSpentMinutes ?? 0,

          completionRemarks:
            completion?.remarks || '',
        });
      });
    });

    // Newest task dates first
    return result.sort(
      (a, b) =>
        new Date(b.taskDate || 0) -
        new Date(a.taskDate || 0)
    );
  }, [reports]);

  // ---------------------------------------------------------
  // STATISTICS
  // ---------------------------------------------------------

  const statistics = useMemo(() => {
    const total = tasks.length;

    const completed = tasks.filter(
      (task) =>
        task.completionStatus === 'Completed'
    ).length;

    const partial = tasks.filter(
      (task) =>
        task.completionStatus === 'Partially Completed'
    ).length;

    const notCompleted = tasks.filter(
      (task) =>
        task.completionStatus === 'Not Completed'
    ).length;

    const pending = tasks.filter(
      (task) =>
        !task.completion ||
        task.completionStatus === 'Pending'
    ).length;

    return {
      total,
      completed,
      partial,
      notCompleted,
      pending,
    };
  }, [tasks]);

  // ---------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------

  if (loading) {
    return (
      <LoadingSpinner
        full
        label="Loading employee..."
      />
    );
  }

  // ---------------------------------------------------------
  // NOT FOUND
  // ---------------------------------------------------------

  if (!employee) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card p-6">
          <p className="text-navy-500">
            Employee details could not be loaded.
          </p>

          <Link
            to="/team-lead/employees"
            className="inline-flex items-center gap-2 mt-4 text-sm text-navy-600 hover:text-navy-900"
          >
            <FiArrowLeft />
            Back to My Employees
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* ---------------------------------------------------
          BACK
      --------------------------------------------------- */}
      <Link
        to="/team-lead/employees"
        className="inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800"
      >
        <FiArrowLeft className="h-4 w-4" />
        Back to My Employees
      </Link>

      {/* ---------------------------------------------------
          EMPLOYEE PROFILE
      --------------------------------------------------- */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center gap-5">

          <div className="h-20 w-20 rounded-full bg-navy-100 flex items-center justify-center overflow-hidden shrink-0">
            {employee.profileImage ? (
              <img
                src={resolveAssetUrl(employee.profileImage)}
                alt={employee.fullName || 'Employee'}
                className="h-full w-full object-cover"
              />
            ) : (
              <FiUser className="h-8 w-8 text-navy-400" />
            )}
          </div>

          <div className="flex-1 min-w-[250px]">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-navy-800 text-xl">
                {employee.fullName}
              </h2>

              <StatusBadge
                status={employee.status || 'active'}
              />
            </div>

            <p className="text-sm text-navy-400 mt-1">
              {employee.employeeCode || '-'}
              {' · '}
              {employee.designation || 'Employee'}
            </p>

            <p className="text-sm text-navy-400 mt-1">
              {employee.email || '-'}
              {employee.phone
                ? ` · ${employee.phone}`
                : ''}
            </p>

            {employee.department?.name && (
              <p className="text-sm text-navy-400 mt-1">
                Department: {employee.department.name}
              </p>
            )}

            {employee.joiningDate && (
              <p className="text-sm text-navy-400 mt-1">
                Joining Date:{' '}
                {formatDateLabel(employee.joiningDate)}
              </p>
            )}
          </div>

        </div>
      </div>

      {/* ---------------------------------------------------
          STATISTICS
      --------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-navy-100 flex items-center justify-center">
              <FiFileText className="h-5 w-5 text-navy-600" />
            </div>

            <div>
              <p className="text-sm text-navy-400">
                Total Tasks
              </p>
              <p className="text-2xl font-semibold text-navy-800">
                {statistics.total}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-green-100 flex items-center justify-center">
              <FiCheckCircle className="h-5 w-5 text-green-600" />
            </div>

            <div>
              <p className="text-sm text-navy-400">
                Completed
              </p>
              <p className="text-2xl font-semibold text-navy-800">
                {statistics.completed}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-yellow-100 flex items-center justify-center">
              <FiClock className="h-5 w-5 text-yellow-600" />
            </div>

            <div>
              <p className="text-sm text-navy-400">
                Pending
              </p>
              <p className="text-2xl font-semibold text-navy-800">
                {statistics.pending}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-blue-100 flex items-center justify-center">
              <FiCalendar className="h-5 w-5 text-blue-600" />
            </div>

            <div>
              <p className="text-sm text-navy-400">
                Reports
              </p>
              <p className="text-2xl font-semibold text-navy-800">
                {reports.length}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* ---------------------------------------------------
          TASKS
      --------------------------------------------------- */}
      <div className="card">

        <div className="p-5 border-b border-navy-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-navy-800 text-lg">
              Employee Tasks
            </h3>

            <p className="text-sm text-navy-400 mt-1">
              All planned tasks assigned to {employee.fullName}
            </p>
          </div>

          <span className="text-sm text-navy-400">
            {tasks.length}{' '}
            {tasks.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>

        {tasks.length === 0 ? (
          <div className="p-12 text-center">
            <FiFileText className="h-12 w-12 mx-auto text-navy-300" />

            <h4 className="mt-4 font-semibold text-navy-700">
              No tasks found
            </h4>

            <p className="text-sm text-navy-400 mt-1">
              This employee has no planned tasks in
              the available daily reports.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-navy-100">

            {tasks.map((task) => (
              <div
                key={task.frontendId}
                className="p-5 hover:bg-navy-50 transition"
              >

                <div className="flex flex-wrap items-start justify-between gap-4">

                  <div className="flex-1 min-w-[250px]">

                    <div className="flex flex-wrap items-center gap-2">

                      <h4 className="font-semibold text-navy-800">
                        {task.title || 'Untitled Task'}
                      </h4>

                      {task.priority && (
                        <StatusBadge
                          status={task.priority}
                        />
                      )}

                    </div>

                    {task.description && (
                      <p className="text-sm text-navy-500 mt-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-navy-400">

                      <span>
                        Date:{' '}
                        {task.taskDate
                          ? formatDateLabel(task.taskDate)
                          : '-'}
                      </span>

                      {task.estimatedTimeMinutes !==
                        undefined && (
                        <span>
                          Estimated:{' '}
                          {task.estimatedTimeMinutes} min
                        </span>
                      )}

                      {task.expectedCompletion && (
                        <span>
                          Expected:{' '}
                          {task.expectedCompletion}
                        </span>
                      )}

                    </div>

                  </div>

                  <div className="flex flex-col items-end gap-2">

                    <StatusBadge
                      status={
                        task.completionStatus ||
                        'Pending'
                      }
                    />

                    {task.completion && (
                      <span className="text-xs text-navy-400">
                        {task.completionPercentage}% complete
                      </span>
                    )}

                  </div>

                </div>

                {/* Completion information */}
                {task.completion && (
                  <div className="mt-4 bg-navy-50 rounded-lg p-4">

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">

                      <div>
                        <p className="text-xs text-navy-400">
                          Completion
                        </p>

                        <p className="font-medium text-navy-700">
                          {task.completionPercentage}%
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-navy-400">
                          Actual Time
                        </p>

                        <p className="font-medium text-navy-700">
                          {task.actualTimeSpentMinutes}{' '}
                          minutes
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-navy-400">
                          Report Status
                        </p>

                        <StatusBadge
                          status={
                            task.reportStatus ||
                            'pending'
                          }
                        />
                      </div>

                    </div>

                    {task.completionRemarks && (
                      <div className="mt-3">
                        <p className="text-xs text-navy-400">
                          Employee Remarks
                        </p>

                        <p className="text-sm text-navy-600 mt-1">
                          {task.completionRemarks}
                        </p>
                      </div>
                    )}

                  </div>
                )}

                {/* Open daily report */}
                {task.reportId && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/team-lead/review/${task.reportId}`
                        )
                      }
                      className="text-sm font-medium text-navy-600 hover:text-navy-900"
                    >
                      View full daily report →
                    </button>
                  </div>
                )}

              </div>
            ))}

          </div>
        )}

      </div>
    </div>
  );
}