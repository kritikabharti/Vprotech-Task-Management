import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  FiSave,
  FiSend,
  FiSunrise,
  FiCheckCircle,
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { todayISO } from '../../utils/format';

const STATUS_OPTIONS = [
  'Completed',
  'Partially Completed',
  'Not Completed',
];

// Keeps completion % and status roughly in sync.
function defaultPercentForStatus(status) {
  if (status === 'Completed') return 100;
  if (status === 'Not Completed') return 0;
  return 50;
}

export default function EveningTaskUpdate() {
  const [date, setDate] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [report, setReport] = useState(null);
  const [saving, setSaving] = useState(false);

  // NEW: controls the success screen
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      entries: [],
      remarks: '',
    },
  });

  const loadDay = useCallback(
    async (d) => {
      setLoading(true);
      setLoadError(null);

      // Reset success state whenever a different date is loaded.
      setSubmitted(false);

      try {
        const { data: res } = await axiosClient.get(
          '/tasks/day',
          {
            params: { date: d },
          }
        );

        const r = res.data.report;

        setReport(r);

        /*
         * If this date's evening update has already been submitted,
         * show the success screen instead of loading the form.
         */
        if (r?.status === 'evening_submitted') {
          setSubmitted(true);

          reset({
            entries: [],
            remarks: '',
          });

          return;
        }

        if (
          r &&
          r.morning &&
          r.morning.tasks &&
          r.morning.tasks.length > 0
        ) {
          const eveningByRef = new Map(
            (r.evening?.tasks || []).map((e) => [
              String(e.taskRef),
              e,
            ])
          );

          reset({
            entries: r.morning.tasks.map((t) => {
              const existing = eveningByRef.get(
                String(t._id)
              );

              return {
                taskRef: t._id,
                title: t.title,
                estimatedTimeMinutes:
                  t.estimatedTimeMinutes,

                status:
                  existing?.status || 'Completed',

                completionPercentage: existing
                  ? existing.completionPercentage
                  : 100,

                actualTimeSpentMinutes: existing
                  ? existing.actualTimeSpentMinutes
                  : t.estimatedTimeMinutes,

                remarks: existing?.remarks || '',
              };
            }),

            remarks: r.evening?.remarks || '',
          });
        } else {
          reset({
            entries: [],
            remarks: '',
          });
        }
      } catch (err) {
        const message =
          err.response?.data?.message ||
          'Failed to load tasks for this date.';

        setLoadError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [reset]
  );

  useEffect(() => {
    loadDay(date);
  }, [date, loadDay]);

  const entries = watch('entries') || [];

  /*
   * IMPORTANT:
   *
   * evening_submitted is NOT an editable state.
   *
   * Only these statuses allow the employee to enter
   * an evening update.
   */
  const locked =
    report &&
    ![
      'morning_submitted',
      'needs_correction',
    ].includes(report.status);

  const noMorningPlan =
    !loadError &&
    (!report ||
      !report.morning ||
      report.morning.tasks.length === 0);

  const onSave = async (values, submit) => {
    setSaving(true);

    try {
      const { data: res } =
        await axiosClient.post('/tasks/evening', {
          date,

          tasks: values.entries.map((e) => ({
            taskRef: e.taskRef,
            status: e.status,
            completionPercentage: Number(
              e.completionPercentage
            ),
            actualTimeSpentMinutes: Number(
              e.actualTimeSpentMinutes
            ),
            remarks: e.remarks,
          })),

          remarks: values.remarks,

          submit,
        });

      const updatedReport = res.data.report;

      setReport(updatedReport);

      if (submit) {
        /*
         * Clear form fields.
         */
        reset({
          entries: [],
          remarks: '',
        });

        /*
         * Immediately show success screen.
         */
        setSubmitted(true);

        toast.success(
          "Today's evening task submitted successfully!"
        );
      } else {
        toast.success('Draft saved.');
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          'Could not save evening update.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <h2 className="text-lg font-semibold text-navy-800">
            Evening Task Update
          </h2>

          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => {
              setDate(e.target.value);
              setSubmitted(false);
            }}
            className="input-field w-auto"
          />
        </div>

        <p className="text-sm text-navy-400">
          Your morning tasks for this date load automatically
          below.
        </p>
      </div>

      {/* Loading */}
      {loading ? (
        <LoadingSpinner label="Loading..." />

      ) : loadError ? (
        /* Error */
        <div className="card">
          <ErrorState
            message={loadError}
            onRetry={() => loadDay(date)}
          />
        </div>

      ) : noMorningPlan ? (
        /* No morning plan */
        <div className="card">
          <EmptyState
            icon={FiSunrise}
            title="No morning plan found for this date"
            description="Submit a morning update first — evening completion is always linked to that day's planned tasks."
            action={
              <Link
                to="/employee/morning-update"
                className="btn-primary"
              >
                Go to Morning Update
              </Link>
            }
          />
        </div>

      ) : submitted ||
        report?.status === 'evening_submitted' ? (
        /*
         * SUCCESS SCREEN
         */
        <div className="card p-8">
          <div className="flex flex-col items-center justify-center text-center py-10">

            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-5">
              <FiCheckCircle className="w-12 h-12 text-green-600" />
            </div>

            <h2 className="text-2xl font-semibold text-navy-800 mb-3">
              Evening Task Submitted Successfully
            </h2>

            <p className="text-navy-500 text-base mb-2">
              Today's evening task has been submitted
              successfully.
            </p>

            <p className="text-sm text-navy-400 mb-6">
              Date: {date}
            </p>

            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 text-green-700 text-sm font-medium">
              <FiCheckCircle className="w-4 h-4" />
              Evening update submitted
            </div>

          </div>
        </div>

      ) : locked ? (
        /*
         * Locked state
         */
        <div className="card p-5 bg-navy-50 text-sm text-navy-600 flex items-center justify-between">
          <span>
            Status:{' '}
            <StatusBadge status={report.status} />
          </span>
        </div>

      ) : (
        /*
         * EVENING FORM
         */
        <form className="space-y-3">

          {entries.map((entry, idx) => (
            <div
              key={entry.taskRef}
              className="card p-3"
            >
              <div className="flex items-center gap-2 flex-wrap">

                <p
                  className="font-medium text-navy-800 flex-1 min-w-[140px] truncate"
                  title={entry.title}
                >
                  {entry.title}
                </p>

                <select
                  className="input-field w-40 shrink-0"
                  {...register(
                    `entries.${idx}.status`
                  )}
                  onChange={(e) => {
                    setValue(
                      `entries.${idx}.status`,
                      e.target.value
                    );

                    setValue(
                      `entries.${idx}.completionPercentage`,
                      defaultPercentForStatus(
                        e.target.value
                      )
                    );
                  }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option
                      key={s}
                      value={s}
                    >
                      {s}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min={0}
                  max={100}
                  title="Completion %"
                  className="input-field w-20 shrink-0"
                  placeholder="%"
                  {...register(
                    `entries.${idx}.completionPercentage`,
                    {
                      min: 0,
                      max: 100,
                    }
                  )}
                />

                <input
                  type="number"
                  min={0}
                  title="Actual minutes spent"
                  className="input-field w-24 shrink-0"
                  placeholder={`${entry.estimatedTimeMinutes} min plan`}
                  {...register(
                    `entries.${idx}.actualTimeSpentMinutes`,
                    {
                      min: 0,
                    }
                  )}
                />

                <input
                  className="input-field w-40 shrink-0"
                  placeholder="Remarks (optional)"
                  {...register(
                    `entries.${idx}.remarks`
                  )}
                />

              </div>
            </div>
          ))}

          {/* Overall remarks */}
          <div className="card p-3">
            <textarea
              rows={2}
              className="input-field"
              placeholder="Overall remarks for today (optional)"
              {...register('remarks')}
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap gap-3 justify-end">

            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit((v) =>
                onSave(v, false)
              )}
              className="btn-secondary"
            >
              <FiSave className="h-4 w-4" />

              {saving
                ? 'Saving...'
                : 'Save Draft'}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit((v) =>
                onSave(v, true)
              )}
              className="btn-primary"
            >
              <FiSend className="h-4 w-4" />

              {saving
                ? 'Submitting...'
                : 'Submit Evening Update'}
            </button>

          </div>
        </form>
      )}
    </div>
  );
}