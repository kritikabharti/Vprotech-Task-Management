import { useEffect, useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'react-toastify';
import { FiPlus, FiTrash2, FiSave, FiSend, FiCheckCircle } from 'react-icons/fi';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import { todayISO } from '../../utils/format';

// A factory, not a shared object: emptyTask() must return a NEW object
// each call, or multiple "blank" task rows could end up sharing the
// same underlying object reference.
const emptyTask = () => ({ title: '', description: '', priority: 'Medium', expectedCompletion: '', estimatedTimeMinutes: 60, remarks: '' });

export default function MorningTaskUpdate() {
  const [date, setDate] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [existingReport, setExistingReport] = useState(null);
  const [saving, setSaving] = useState(false);

  const { register, control, handleSubmit, reset, watch } = useForm({
    defaultValues: { tasks: [emptyTask()], remarks: '' },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'tasks' });
  const watchedTasks = watch('tasks');

  const loadDay = useCallback(async (d) => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data: res } = await axiosClient.get('/tasks/day', { params: { date: d } });
      const report = res.data.report;
      setExistingReport(report);
      if (report && report.morning.tasks.length > 0) {
        reset({
          tasks: report.morning.tasks.map((t) => ({
            title: t.title,
            description: t.description,
            priority: t.priority,
            expectedCompletion: t.expectedCompletion,
            estimatedTimeMinutes: t.estimatedTimeMinutes,
            remarks: t.remarks,
          })),
          remarks: report.morning.remarks || '',
        });
      } else {
        reset({ tasks: [emptyTask()], remarks: '' });
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

  // Already submitted (morning_submitted) is intentionally still editable -
  // it matches the backend, which keeps accepting edits/add-more-tasks until
  // the report moves past review (approved) or the day's evening update has
  // been filed (evening_submitted), at which point the plan is finalized.
  const submittedButEditable = existingReport?.status === 'morning_submitted';
  const locked = !!existingReport && !['draft', 'needs_correction', 'morning_submitted'].includes(existingReport.status);

  const onSave = async (values, submit) => {
    setSaving(true);
    try {
      const { data: res } = await axiosClient.post('/tasks/morning', {
        date,
        tasks: values.tasks.map((t) => ({ ...t, estimatedTimeMinutes: Number(t.estimatedTimeMinutes) })),
        remarks: values.remarks,
        submit,
      });
      setExistingReport(res.data.report);
      // Re-populate the form with what the server actually saved, rather
      // than clearing it - the whole point of this update is that the
      // employee can keep editing / add more tasks right after submitting.
      reset({
        tasks: res.data.report.morning.tasks.map((t) => ({
          title: t.title,
          description: t.description,
          priority: t.priority,
          expectedCompletion: t.expectedCompletion,
          estimatedTimeMinutes: t.estimatedTimeMinutes,
          remarks: t.remarks,
        })),
        remarks: res.data.report.morning.remarks || '',
      });
      toast.success(submit ? 'Morning tasks submitted!' : 'Draft saved.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save morning tasks.');
    } finally {
      setSaving(false);
    }
  };

  const totalTasks = watchedTasks?.length || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <h2 className="text-lg font-semibold text-navy-800">Morning Task Update</h2>
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="input-field w-auto"
          />
        </div>
        <p className="text-sm text-navy-400">Plan what you intend to work on today. Total tasks are calculated automatically.</p>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading..." />
      ) : loadError ? (
        <div className="card"><ErrorState message={loadError} onRetry={() => loadDay(date)} /></div>
      ) : locked ? (
        <div className="card p-5 bg-navy-50 text-sm text-navy-600">
          Morning tasks for this date are locked (status: <strong>{existingReport.status.replace('_', ' ')}</strong>) and can no longer be edited.
        </div>
      ) : (
        <form className="space-y-3">
          {submittedButEditable && (
            <div className="card p-3 bg-green-50 border border-green-100 flex items-center gap-2 text-sm text-green-700">
              <FiCheckCircle className="h-4 w-4 shrink-0" />
              Submitted for review. You can still edit tasks or add more until your team lead reviews it.
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-navy-700">Total Planned Tasks: <span className="text-navy-900 font-semibold">{totalTasks}</span></p>
            <button type="button" onClick={() => append(emptyTask())} className="btn-secondary">
              <FiPlus className="h-4 w-4" /> Add Task
            </button>
          </div>

          {fields.map((field, idx) => (
            <div key={field.id} className="card p-3 space-y-2 relative">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-navy-400 shrink-0 w-6">#{idx + 1}</span>
                <input
                  className="input-field flex-1"
                  placeholder="Task title, e.g. Develop login API"
                  {...register(`tasks.${idx}.title`, { required: true })}
                />
                <select className="input-field w-28 shrink-0" {...register(`tasks.${idx}.priority`)}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Urgent</option>
                </select>
                <input
                  type="number"
                  min={0}
                  title="Estimated minutes"
                  className="input-field w-24 shrink-0"
                  placeholder="Mins"
                  {...register(`tasks.${idx}.estimatedTimeMinutes`, { required: true, min: 0 })}
                />
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(idx)} className="text-red-500 hover:text-red-700 shrink-0" aria-label="Remove task">
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 pl-8">
                <input className="input-field flex-1" placeholder="Description (optional)" {...register(`tasks.${idx}.description`)} />
                <input className="input-field w-32 shrink-0" placeholder="Due by" {...register(`tasks.${idx}.expectedCompletion`)} />
                <input className="input-field w-36 shrink-0" placeholder="Remarks (optional)" {...register(`tasks.${idx}.remarks`)} />
              </div>
            </div>
          ))}

          <div className="card p-3">
            <textarea rows={2} className="input-field" placeholder="Overall remarks for today's plan (optional)" {...register('remarks')} />
          </div>

          <div className="flex flex-wrap gap-3 justify-end">
            <button type="button" disabled={saving} onClick={handleSubmit((v) => onSave(v, false))} className="btn-secondary">
              <FiSave className="h-4 w-4" /> Save Draft
            </button>
            <button type="button" disabled={saving} onClick={handleSubmit((v) => onSave(v, true))} className="btn-primary">
              <FiSend className="h-4 w-4" /> {submittedButEditable ? 'Update Submission' : 'Submit Morning Update'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
