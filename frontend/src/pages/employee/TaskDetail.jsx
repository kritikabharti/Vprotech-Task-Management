import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiArrowLeft,
  FiClock,
  FiMessageSquare,
  FiAlertCircle,
} from 'react-icons/fi';

import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import {
  formatDateLabel,
  minutesToHours,
} from '../../utils/format';

export default function TaskDetail() {
  const { id } = useParams();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadTaskDetails = async () => {
      if (!id) {
        setError('Task report ID is missing.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = await axiosClient.get(`/tasks/${id}`);

        const data = response?.data;

        const loadedReport =
          data?.data?.report ||
          data?.report ||
          null;

        if (!loadedReport) {
          throw new Error('Task report was not found.');
        }

        if (mounted) {
          setReport(loadedReport);
        }
      } catch (err) {
        console.error('Task detail error:', err);

        const message =
          err?.response?.data?.message ||
          err?.message ||
          'Failed to load task details.';

        if (mounted) {
          setError(message);
          toast.error(message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTaskDetails();

    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <LoadingSpinner
        full
        label="Loading task details..."
      />
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <Link
          to="/employee/my-tasks"
          className="inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800"
        >
          <FiArrowLeft className="h-4 w-4" />
          Back to My Tasks
        </Link>

        <div className="card p-6">
          <div className="flex items-start gap-3 text-red-600">
            <FiAlertCircle className="h-5 w-5 mt-0.5 shrink-0" />

            <div>
              <h2 className="font-semibold text-navy-800">
                Unable to load task details
              </h2>

              <p className="text-sm text-red-600 mt-1">
                {error}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card p-6 text-center">
          <p className="text-navy-500">
            No task report found.
          </p>

          <Link
            to="/employee/my-tasks"
            className="inline-flex items-center gap-1 mt-4 text-sm text-blue-600 hover:text-blue-800"
          >
            <FiArrowLeft className="h-4 w-4" />
            Back to My Tasks
          </Link>
        </div>
      </div>
    );
  }

  const morningTasks =
    Array.isArray(report?.morning?.tasks)
      ? report.morning.tasks
      : [];

  const eveningTasks =
    Array.isArray(report?.evening?.tasks)
      ? report.evening.tasks
      : [];

  const reviewHistory =
    Array.isArray(report?.reviewHistory)
      ? report.reviewHistory
      : [];

  const eveningByRef = new Map(
    eveningTasks.map((task) => [
      String(task?.taskRef || ''),
      task,
    ])
  );

  const summary = report?.summary || {
    totalPlanned: morningTasks.length,
    totalCompleted: 0,
    completionPercentage: 0,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* BACK BUTTON */}
      <Link
        to="/employee/my-tasks"
        className="inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800"
      >
        <FiArrowLeft className="h-4 w-4" />
        Back to My Tasks
      </Link>


      {/* REPORT HEADER */}
      <div className="card p-5 flex flex-wrap items-center justify-between gap-3">

        <div>
          <h2 className="text-lg font-semibold text-navy-800">
            {formatDateLabel(report.taskDate)}
          </h2>

          <p className="text-sm text-navy-400 mt-1">
            {summary.totalPlanned || 0} planned
            {' · '}
            {summary.totalCompleted || 0} completed
            {' · '}
            {summary.completionPercentage || 0}% overall
          </p>
        </div>

        <StatusBadge
          status={report.status || 'draft'}
        />
      </div>


      {/* TASKS */}
      <div className="card p-5">

        <h3 className="font-semibold text-navy-800 mb-4">
          Planned vs Completed Tasks
        </h3>

        {morningTasks.length === 0 ? (
          <div className="border border-navy-100 rounded-lg p-5 text-center text-sm text-navy-400">
            No planned tasks found for this date.
          </div>
        ) : (
          <div className="space-y-3">

            {morningTasks.map((task, index) => {

              const taskId =
                task?._id ||
                `task-${index}`;

              const evening =
                eveningByRef.get(
                  String(task?._id || '')
                );

              return (
                <div
                  key={taskId}
                  className="border border-navy-100 rounded-lg p-4"
                >

                  {/* TASK TITLE + STATUS */}
                  <div className="flex flex-wrap items-start justify-between gap-2">

                    <div className="min-w-0">

                      <p className="font-medium text-navy-800">
                        {task?.title || 'Untitled Task'}
                      </p>

                      {task?.description && (
                        <p className="text-sm text-navy-400 mt-0.5">
                          {task.description}
                        </p>
                      )}

                    </div>


                    <div className="flex items-center gap-2 shrink-0">

                      {task?.priority && (
                        <StatusBadge
                          status={task.priority}
                        />
                      )}

                      {evening && (
                        <StatusBadge
                          status={
                            evening.status ||
                            'pending'
                          }
                        />
                      )}

                    </div>

                  </div>


                  {/* TASK INFORMATION */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">

                    {/* EXPECTED */}
                    <div>
                      <p className="text-xs text-navy-400">
                        Expected By
                      </p>

                      <p className="text-navy-700">
                        {task?.expectedCompletion || '—'}
                      </p>
                    </div>


                    {/* ESTIMATED */}
                    <div>
                      <p className="text-xs text-navy-400">
                        Estimated Time
                      </p>

                      <p className="text-navy-700 flex items-center gap-1">
                        <FiClock className="h-3.5 w-3.5" />

                        {task?.estimatedTimeMinutes != null
                          ? minutesToHours(
                              task.estimatedTimeMinutes
                            )
                          : '—'}
                      </p>
                    </div>


                    {/* COMPLETION */}
                    {evening && (
                      <div>
                        <p className="text-xs text-navy-400">
                          Completion
                        </p>

                        <p className="text-navy-700">
                          {evening.completionPercentage ?? 0}%
                        </p>
                      </div>
                    )}


                    {/* ACTUAL TIME */}
                    {evening && (
                      <div>
                        <p className="text-xs text-navy-400">
                          Actual Time
                        </p>

                        <p className="text-navy-700 flex items-center gap-1">
                          <FiClock className="h-3.5 w-3.5" />

                          {evening.actualTimeSpentMinutes != null
                            ? minutesToHours(
                                evening.actualTimeSpentMinutes
                              )
                            : '—'}
                        </p>
                      </div>
                    )}

                  </div>


                  {/* TASK REMARKS */}
                  {task?.remarks && (
                    <p className="text-sm text-navy-500 mt-2 italic">
                      "{task.remarks}"
                    </p>
                  )}


                  {/* EVENING REMARKS */}
                  {evening?.remarks && (
                    <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-100">

                      <p className="text-xs font-medium text-navy-400 mb-1">
                        Evening Remarks
                      </p>

                      <p className="text-sm text-navy-600 italic">
                        "{evening.remarks}"
                      </p>

                    </div>
                  )}

                </div>
              );
            })}

          </div>
        )}

      </div>


      {/* OVERALL MORNING REMARKS */}
      {report?.morning?.remarks && (
        <div className="card p-5">

          <h3 className="font-semibold text-navy-800 mb-2">
            Morning Remarks
          </h3>

          <p className="text-sm text-navy-500">
            {report.morning.remarks}
          </p>

        </div>
      )}


      {/* LATE SUBMISSION REASON */}
      {report?.morning?.lateSubmissionReason && (
        <div className="card p-5 border border-amber-200 bg-amber-50">

          <h3 className="font-semibold text-amber-800 mb-2">
            Late Submission Reason
          </h3>

          <p className="text-sm text-amber-700">
            {report.morning.lateSubmissionReason}
          </p>

        </div>
      )}


      {/* REVIEW HISTORY */}
      {reviewHistory.length > 0 && (
        <div className="card p-5">

          <h3 className="font-semibold text-navy-800 mb-4 flex items-center gap-2">
            <FiMessageSquare className="h-4 w-4" />
            Team Lead Remarks
          </h3>

          <div className="space-y-3">

            {reviewHistory.map((history, index) => (

              <div
                key={history._id || index}
                className="flex items-start gap-3 text-sm"
              >

                <StatusBadge
                  status={
                    history.action === 'approved'
                      ? 'approved'
                      : 'needs_correction'
                  }
                />

                <div>

                  <p className="text-navy-700">
                    {history.remark ||
                      'No remark provided.'}
                  </p>

                  <p className="text-xs text-navy-400 mt-0.5">

                    {history.stage === 'morning'
                      ? 'Morning review'
                      : 'Evening review'}

                    {' · '}

                    {history.reviewedBy?.fullName ||
                      'Team Lead'}

                    {' · '}

                    {history.reviewedAt
                      ? new Date(
                          history.reviewedAt
                        ).toLocaleString()
                      : 'Date unavailable'}

                  </p>

                </div>

              </div>

            ))}

          </div>

        </div>
      )}

    </div>
  );
}