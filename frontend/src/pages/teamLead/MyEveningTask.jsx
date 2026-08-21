import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { FiSave, FiSend, FiSunrise, FiCheckCircle, FiEdit2 } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import { todayISO, minutesToHours } from '../../utils/format';

const STATUS_OPTIONS = ['Completed', 'Partially Completed', 'Not Completed'];

function defaultPercentForStatus(status) {
  if (status === 'Completed') return 100;
  if (status === 'Not Completed') return 0;
  return 50;
}

export default function MyEveningTask() {
  const [date, setDate] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [report, setReport] = useState(null);
  const [saving, setSaving] = useState(false);

  // When today's evening update is already submitted (or approved),
  // default to showing the success summary instead of the form -
  // editTasks flips back to the editable form, since the backend keeps
  // accepting edits at any status now (an edit after approval sends the
  // report back to evening_submitted for re-review).
  const [editTasks, setEditTasks] = useState(false);

  const { register, handleSubmit, reset, setValue, watch } = useForm({ defaultValues: { entries: [], remarks: '' } });

  const loadDay = useCallback(async (d) => {
    setLoading(true);
    setLoadError(null);
    setEditTasks(false);
    try {
      const { data: res } = await axiosClient.get('/tasks/day', { params: { date: d } });
      const r = res.data.report;
      setReport(r);

      if (r && r.morning && r.morning.tasks.length > 0) {
        const eveningByRef = new Map((r.evening?.tasks || []).map((e) => [String(e.taskRef), e]));
        reset({
          entries: r.morning.tasks.map((t) => {
            const existing = eveningByRef.get(String(t._id));
            return {
              taskRef: t._id,
              title: t.title,
              estimatedTimeMinutes: t.estimatedTimeMinutes,
              status: existing?.status || 'Completed',
              completionPercentage: existing ? existing.completionPercentage : 100,
              actualTimeSpentMinutes: existing ? existing.actualTimeSpentMinutes : t.estimatedTimeMinutes,
              remarks: existing?.remarks || '',
            };
          }),
          remarks: r.evening?.remarks || '',
        });
      } else {
        reset({ entries: [], remarks: '' });
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load tasks for this date.';
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [reset]);

  useEffect(() => { loadDay(date); }, [date, loadDay]);

  const entries = watch('entries') || [];
  const noMorningPlan = !loadError && (!report || !report.morning || report.morning.tasks.length === 0);

  // Editable at every status now (see taskController.submitEveningTasks) -
  // editing after 'approved' sends the report back to evening_submitted
  // for a fresh review.
  const isApproved = report?.status === 'approved';
  const isSubmitted = report?.status === 'evening_submitted';
  const showSuccessSummary = (isSubmitted || isApproved) && !editTasks;

  const onSave = async (values, submit) => {
    setSaving(true);
    try {
      const { data: res } = await axiosClient.post('/tasks/evening', {
        date,
        tasks: values.entries.map((e) => ({
          taskRef: e.taskRef,
          status: e.status,
          completionPercentage: Number(e.completionPercentage),
          actualTimeSpentMinutes: Number(e.actualTimeSpentMinutes),
          remarks: e.remarks,
        })),
        remarks: values.remarks,
        submit,
      });
      setReport(res.data.report);
      if (submit) {
        setEditTasks(false);
        toast.success("Today's evening task submitted successfully!");
      } else {
        toast.success('Draft saved.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save evening update.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <h2 className="text-lg font-semibold text-navy-800">My Evening Task</h2>
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="input-field w-auto"
          />
        </div>
        <p className="text-sm text-navy-400">Your morning tasks for this date load automatically below.</p>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading..." />
      ) : loadError ? (
        <div className="card"><ErrorState message={loadError} onRetry={() => loadDay(date)} /></div>
      ) : noMorningPlan ? (
        <div className="card">
          <EmptyState
            icon={FiSunrise}
            title="No morning plan found for this date"
            description="Submit your morning update first — evening completion is always linked to that day's planned tasks."
            action={<Link to="/team-lead/my-morning-task" className="btn-primary">Go to My Morning Task</Link>}
          />
        </div>
      ) : showSuccessSummary ? (
        <div className="card p-8">
          <div className="flex flex-col items-center justify-center text-center py-10">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-5">
              <FiCheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-navy-800 mb-3">
              {isApproved ? 'Evening Update Approved' : 'Evening Task Submitted'}
            </h2>
            <p className="text-navy-500 text-base mb-2">
              {isApproved
                ? "Today's evening update has been reviewed and approved."
                : "Today's evening task has been submitted successfully."}
            </p>
            <p className="text-sm text-navy-400 mb-6">Date: {date}</p>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 text-green-700 text-sm font-medium">
                <FiCheckCircle className="w-4 h-4" /> {isApproved ? 'Approved' : 'Evening update submitted'}
              </span>
              <button onClick={() => setEditTasks(true)} className="btn-secondary">
                <FiEdit2 className="h-4 w-4" /> Edit / Add More Tasks
              </button>
            </div>
            {isApproved && (
              <p className="text-xs text-amber-600 mt-3">Editing an approved update sends it back for review.</p>
            )}
            <p className="text-xs text-navy-400 mt-4">
              Forgot to plan something? <Link to="/team-lead/my-morning-task" className="text-navy-600 underline">Add it to My Morning Task</Link> first, then it'll appear here.
            </p>
          </div>
        </div>
      ) : (
        <form className="space-y-3">
          {isSubmitted && (
            <div className="card p-3 bg-green-50 border border-green-100 flex items-center gap-2 text-sm text-green-700">
              <FiCheckCircle className="h-4 w-4 shrink-0" />
              Already submitted — you're editing your submission. Save to update it.
            </div>
          )}
          {isApproved && (
            <div className="card p-3 bg-amber-50 border border-amber-100 flex items-center gap-2 text-sm text-amber-700">
              <FiCheckCircle className="h-4 w-4 shrink-0" />
              This was already approved. Editing and resubmitting sends it back for review.
            </div>
          )}

          {entries.map((entry, idx) => (
            <div key={entry.taskRef} className="card p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex-1 min-w-[140px]">
                  <p className="font-medium text-navy-800 truncate" title={entry.title}>{entry.title}</p>
                  <p className="text-[11px] text-navy-400">Planned: {minutesToHours(entry.estimatedTimeMinutes)}</p>
                </div>
                <select
                  className="input-field w-40 shrink-0"
                  {...register(`entries.${idx}.status`)}
                  onChange={(e) => {
                    setValue(`entries.${idx}.status`, e.target.value);
                    setValue(`entries.${idx}.completionPercentage`, defaultPercentForStatus(e.target.value));
                  }}
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input
                  type="number"
                  min={0}
                  max={100}
                  title="Completion %"
                  className="input-field w-20 shrink-0"
                  placeholder="%"
                  {...register(`entries.${idx}.completionPercentage`, { min: 0, max: 100 })}
                />
                <div className="shrink-0">
                  <input
                    type="number"
                    min={0}
                    title="Actual minutes spent"
                    className="input-field w-24"
                    placeholder={`${entry.estimatedTimeMinutes} min plan`}
                    {...register(`entries.${idx}.actualTimeSpentMinutes`, { min: 0 })}
                  />
                  <p className="text-[11px] text-navy-400 mt-0.5 text-center">
                    {minutesToHours(entries[idx]?.actualTimeSpentMinutes)}
                  </p>
                </div>
                <input className="input-field w-40 shrink-0" placeholder="Remarks (optional)" {...register(`entries.${idx}.remarks`)} />
              </div>
            </div>
          ))}

          <div className="card p-3">
            <textarea rows={2} className="input-field" placeholder="Overall remarks for today (optional)" {...register('remarks')} />
          </div>

          <div className="flex flex-wrap gap-3 justify-end">
            <button type="button" disabled={saving} onClick={handleSubmit((v) => onSave(v, false))} className="btn-secondary">
              <FiSave className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button type="button" disabled={saving} onClick={handleSubmit((v) => onSave(v, true))} className="btn-primary">
              <FiSend className="h-4 w-4" /> {saving ? 'Submitting...' : (report?.status ? 'Update Submission' : 'Submit Evening Update')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
