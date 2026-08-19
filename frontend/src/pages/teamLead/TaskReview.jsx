import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiArrowLeft,
  FiCheck,
  FiX,
  FiClock,
  FiMessageSquare,
} from 'react-icons/fi';

import axiosClient from '../../api/axiosClient';
import useAuth from '../../hooks/useAuth';
import DataTable from '../../components/DataTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import { formatDateLabel, minutesToHours } from '../../utils/format';


/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */

function unwrapResponse(response) {
  return response?.data?.data ?? response?.data ?? {};
}

function getReports(response) {
  const payload = unwrapResponse(response);

  if (Array.isArray(payload?.reports)) {
    return payload.reports;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
}

function getReport(response) {
  const payload = unwrapResponse(response);

  if (payload?.report) {
    return payload.report;
  }

  return payload;
}


/* ---------------------------------------------------------
   Review Queue
--------------------------------------------------------- */

function ReviewQueue() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [morningRes, eveningRes] = await Promise.all([
        axiosClient.get('/tasks', {
          params: {
            status: 'morning_submitted',
            limit: 50,
          },
        }),

        axiosClient.get('/tasks', {
          params: {
            status: 'evening_submitted',
            limit: 50,
          },
        }),
      ]);

      const morningReports = getReports(morningRes);
      const eveningReports = getReports(eveningRes);

      const combined = [
        ...morningReports,
        ...eveningReports,
      ].sort(
        (a, b) =>
          new Date(b?.taskDate || 0) -
          new Date(a?.taskDate || 0)
      );

      setReports(combined);
    } catch (err) {
      console.error('Review Queue Error:', err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.data?.message ||
        'Failed to load review queue.';

      setError(message);
      setReports([]);

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    {
      key: 'employee',
      label: 'Employee',
      render: (row) =>
        row?.employee?.fullName || 'Unknown Employee',
    },

    {
      key: 'taskDate',
      label: 'Date',
      render: (row) =>
        row?.taskDate
          ? formatDateLabel(row.taskDate)
          : '-',
    },

    {
      key: 'stage',
      label: 'Awaiting',
      render: (row) =>
        row?.status === 'morning_submitted'
          ? 'Morning Review'
          : row?.status === 'evening_submitted'
            ? 'Evening Review'
            : '-',
    },

    {
      key: 'planned',
      label: 'Planned',
      render: (row) =>
        row?.summary?.totalPlanned ??
        row?.totalPlanned ??
        0,
    },

    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge
          status={row?.status || 'pending'}
        />
      ),
    },
  ];

  const handleRowClick = (row) => {
    const id = row?._id || row?.id;

    if (!id) {
      toast.error('Unable to open this report.');
      return;
    }

    navigate(`/team-lead/review/${id}`);
  };

  return (
    <div className="card p-5">

      <h3 className="font-semibold text-navy-800 mb-4">
        Pending Review ({reports.length})
      </h3>

      <DataTable
        columns={columns}
        rows={reports}
        loading={loading}
        error={error}
        onRetry={load}
        onRowClick={handleRowClick}
        emptyTitle="Nothing awaiting review"
        emptyDescription="Morning and evening submissions from your team will appear here."
      />

    </div>
  );
}


/* ---------------------------------------------------------
   Review Detail
--------------------------------------------------------- */

function ReviewDetail({ id }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modal, setModal] = useState(null);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const load = useCallback(async () => {
    if (!id) {
      setError('Report ID is missing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axiosClient.get(
        `/tasks/${id}`
      );

      const reportData = getReport(response);

      if (!reportData || !reportData._id) {
        throw new Error('Report data was not found.');
      }

      setReport(reportData);
    } catch (err) {
      console.error('Review Detail Error:', err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.data?.message ||
        err?.message ||
        'Failed to load report.';

      setError(message);
      setReport(null);

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);


  /* -------------------------------------------------------
     Submit Review
  ------------------------------------------------------- */

  const submitReview = async () => {
    if (!modal) return;

    if (
      modal === 'needs_correction' &&
      !remark.trim()
    ) {
      toast.error(
        'A remark is required when returning for correction.'
      );
      return;
    }

    setSubmitting(true);

    try {
      await axiosClient.patch(
        `/tasks/${id}/review`,
        {
          action: modal,
          remark: remark.trim(),
        }
      );

      toast.success(
        modal === 'approved'
          ? 'Report approved.'
          : 'Report returned for correction.'
      );

      setModal(null);
      setRemark('');

      await load();
    } catch (err) {
      console.error('Submit Review Error:', err);

      toast.error(
        err?.response?.data?.message ||
        err?.response?.data?.data?.message ||
        'Could not submit review.'
      );
    } finally {
      setSubmitting(false);
    }
  };


  /* -------------------------------------------------------
     Loading / Error
  ------------------------------------------------------- */

  if (loading) {
    return (
      <LoadingSpinner
        full
        label="Loading report..."
      />
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-5">

        <Link
          to="/team-lead/review"
          className="inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800"
        >
          <FiArrowLeft className="h-4 w-4" />
          Back to Review Queue
        </Link>

        <div className="card">
          <ErrorState
            message={error}
            onRetry={load}
          />
        </div>

      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card p-5">
          <p className="text-navy-500">
            Report not found.
          </p>
        </div>
      </div>
    );
  }


  /* -------------------------------------------------------
     Safe report data
  ------------------------------------------------------- */

  const morningTasks = Array.isArray(
    report?.morning?.tasks
  )
    ? report.morning.tasks
    : [];

  const eveningTasks = Array.isArray(
    report?.evening?.tasks
  )
    ? report.evening.tasks
    : [];

  const reviewHistory = Array.isArray(
    report?.reviewHistory
  )
    ? report.reviewHistory
    : [];

  const eveningByRef = new Map(
    eveningTasks
      .filter(Boolean)
      .map((task) => [
        String(task?.taskRef ?? task?._id ?? ''),
        task,
      ])
  );

  const awaitingReview = [
    'morning_submitted',
    'evening_submitted',
  ].includes(report?.status);

  // A team lead's own self-submitted report shows up in this same queue
  // (see backend taskController.listReports) but can only be reviewed
  // by Admin, never by the team lead themselves - the server enforces
  // this too, so hiding the buttons here is UX only, not the real guard.
  const { user } = useAuth();
  const isOwnSubmission = !!report?.employee?._id && !!user?._id && String(report.employee._id) === String(user._id);


  /* -------------------------------------------------------
     Render
  ------------------------------------------------------- */

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Back */}
      <Link
        to="/team-lead/review"
        className="inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800"
      >
        <FiArrowLeft className="h-4 w-4" />
        Back to Review Queue
      </Link>


      {/* Report Header */}
      <div className="card p-5 flex flex-wrap items-center justify-between gap-3">

        <div>
          <h2 className="text-lg font-semibold text-navy-800">
            {report?.employee?.fullName ||
              'Unknown Employee'}

            {' — '}

            {report?.taskDate
              ? formatDateLabel(report.taskDate)
              : '-'}
          </h2>

          <p className="text-sm text-navy-400 mt-1">
            {report?.summary?.totalPlanned ?? 0}
            {' '}planned ·{' '}

            {report?.summary?.totalCompleted ?? 0}
            {' '}completed ·{' '}

            {report?.summary?.completionPercentage ?? 0}
            % overall
          </p>
        </div>

        <StatusBadge
          status={report?.status || 'pending'}
        />

      </div>


      {/* Planned vs Completed */}
      <div className="card p-5">

        <h3 className="font-semibold text-navy-800 mb-4">
          Planned vs Completed Tasks
        </h3>

        {morningTasks.length === 0 ? (
          <p className="text-sm text-navy-400">
            No planned tasks found for this report.
          </p>
        ) : (
          <div className="space-y-3">

            {morningTasks.map((task, index) => {

              const taskId =
                task?._id ||
                task?.id ||
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

                  <div className="flex flex-wrap items-start justify-between gap-2">

                    <div>
                      <p className="font-medium text-navy-800">
                        {task?.title ||
                          'Untitled Task'}
                      </p>

                      {task?.description && (
                        <p className="text-sm text-navy-400 mt-0.5">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">

                      {task?.priority && (
                        <StatusBadge
                          status={task.priority}
                        />
                      )}

                      {evening && (
                        <StatusBadge
                          status={
                            evening?.status ||
                            'pending'
                          }
                        />
                      )}

                    </div>

                  </div>


                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">

                    <div>
                      <p className="text-xs text-navy-400">
                        Estimated
                      </p>

                      <p className="text-navy-700 flex items-center gap-1">
                        <FiClock className="h-3.5 w-3.5" />

                        {minutesToHours(
                          task?.estimatedTimeMinutes || 0
                        )}
                      </p>
                    </div>


                    {evening && (
                      <>
                        <div>
                          <p className="text-xs text-navy-400">
                            Completion
                          </p>

                          <p className="text-navy-700">
                            {evening?.completionPercentage ?? 0}%
                          </p>
                        </div>


                        <div>
                          <p className="text-xs text-navy-400">
                            Actual Time
                          </p>

                          <p className="text-navy-700 flex items-center gap-1">
                            <FiClock className="h-3.5 w-3.5" />

                            {minutesToHours(
                              evening?.actualTimeSpentMinutes || 0
                            )}
                          </p>
                        </div>
                      </>
                    )}

                  </div>


                  {evening?.remarks && (
                    <p className="text-sm text-navy-500 mt-2 italic">
                      "{evening.remarks}"
                    </p>
                  )}

                </div>
              );
            })}

          </div>
        )}

      </div>


      {/* Review History */}
      {reviewHistory.length > 0 && (
        <div className="card p-5">

          <h3 className="font-semibold text-navy-800 mb-4 flex items-center gap-2">
            <FiMessageSquare className="h-4 w-4" />
            Review History
          </h3>

          <div className="space-y-3">

            {reviewHistory.map((history, index) => (
              <div
                key={history?._id || index}
                className="flex items-start gap-3 text-sm"
              >

                <StatusBadge
                  status={
                    history?.action === 'approved'
                      ? 'approved'
                      : 'needs_correction'
                  }
                />

                <div>

                  <p className="text-navy-700">
                    {history?.remark ||
                      'No remark provided.'}
                  </p>

                  <p className="text-xs text-navy-400 mt-0.5">
                    {history?.stage || 'Review'} review
                    {' · '}
                    {history?.reviewedAt
                      ? new Date(
                          history.reviewedAt
                        ).toLocaleString()
                      : '-'}
                  </p>

                </div>

              </div>
            ))}

          </div>

        </div>
      )}


      {/* Review Buttons */}
      {awaitingReview && isOwnSubmission && (
        <div className="card p-4 bg-navy-50 text-sm text-navy-600">
          This is your own submission — an Admin will review it, not you.
        </div>
      )}
      {awaitingReview && !isOwnSubmission && (
        <div className="flex flex-wrap gap-3 justify-end">

          <button
            type="button"
            className="btn-danger"
            onClick={() =>
              setModal('needs_correction')
            }
          >
            <FiX className="h-4 w-4" />
            Return for Correction
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              setModal('approved')
            }
          >
            <FiCheck className="h-4 w-4" />
            Approve
          </button>

        </div>
      )}


      {/* Review Modal */}
      <Modal
        open={!!modal}
        onClose={() => {
          if (!submitting) {
            setModal(null);
            setRemark('');
          }
        }}
        title={
          modal === 'approved'
            ? 'Approve this report?'
            : 'Return for correction'
        }
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setModal(null);
                setRemark('');
              }}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="button"
              className={
                modal === 'approved'
                  ? 'btn-primary'
                  : 'btn-danger'
              }
              onClick={submitReview}
              disabled={submitting}
            >
              {submitting
                ? 'Submitting...'
                : modal === 'approved'
                  ? 'Approve'
                  : 'Return'}
            </button>
          </>
        }
      >

        <div>

          <label className="label">
            Remark{' '}

            {modal === 'needs_correction' && (
              <span className="text-red-500">
                (required)
              </span>
            )}
          </label>

          <textarea
            rows={3}
            className="input-field"
            value={remark}
            onChange={(event) =>
              setRemark(event.target.value)
            }
            placeholder="Add a note for the employee..."
            disabled={submitting}
          />

        </div>

      </Modal>

    </div>
  );
}


/* ---------------------------------------------------------
   Main Component
--------------------------------------------------------- */

export default function TaskReview() {
  const { id } = useParams();

  return id ? (
    <ReviewDetail id={id} />
  ) : (
    <ReviewQueue />
  );
}