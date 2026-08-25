import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiSend, FiRefreshCw, FiPlus, FiTrash2 } from 'react-icons/fi';

import axiosClient from '../../api/axiosClient';
import { todayISO } from '../../utils/format';

// A factory, not a shared object: emptyTask() must return a NEW object
// each call, or multiple "blank" task rows could end up sharing the
// same underlying object reference.
const emptyTask = () => ({
  title: '',
  description: '',
  priority: 'Medium',
  expectedCompletion: '',
  estimatedTimeMinutes: '',
  remarks: '',
});

export default function AssignTask() {
  const [date, setDate] = useState(todayISO());
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Multiple employees can now be selected at once, not just one.
  const [employeeIds, setEmployeeIds] = useState([]);

  // Multiple tasks can now be built up and assigned in a single go.
  const [tasks, setTasks] = useState([emptyTask()]);

  const loadEmployees = async () => {
    setLoadingEmployees(true);

    try {
      const response = await axiosClient.get('/users', {
        params: {
          role: 'employee',
          status: 'active',
          limit: 100,
        },
      });

      const data = response?.data?.data ?? response?.data ?? {};

      const list =
        data?.users ||
        data?.employees ||
        data?.results ||
        [];

      setEmployees(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Load employees error:', err);

      toast.error(
        err?.response?.data?.message ||
          'Failed to load employees.'
      );

      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const toggleEmployee = (id) => {
    setEmployeeIds((previous) =>
      previous.includes(id)
        ? previous.filter((existing) => existing !== id)
        : [...previous, id]
    );
  };

  const toggleSelectAllEmployees = () => {
    setEmployeeIds((previous) =>
      previous.length === employees.length
        ? []
        : employees.map((e) => e._id || e.id)
    );
  };

  const updateTask = (index, field, value) => {
    setTasks((previous) =>
      previous.map((task, i) =>
        i === index ? { ...task, [field]: value } : task
      )
    );
  };

  const addTaskRow = () => {
    setTasks((previous) => [...previous, emptyTask()]);
  };

  const removeTaskRow = (index) => {
    setTasks((previous) =>
      previous.length > 1
        ? previous.filter((_, i) => i !== index)
        : previous
    );
  };

  const resetForm = () => {
    setEmployeeIds([]);
    setTasks([emptyTask()]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (employeeIds.length === 0) {
      toast.error('Please select at least one employee.');
      return;
    }

    const cleanedTasks = tasks
      .map((t) => ({ ...t, title: t.title.trim() }))
      .filter((t) => t.title);

    if (cleanedTasks.length === 0) {
      toast.error('Please enter at least one task with a title.');
      return;
    }

    for (const t of cleanedTasks) {
      if (
        t.estimatedTimeMinutes === '' ||
        Number(t.estimatedTimeMinutes) <= 0
      ) {
        toast.error(
          `Enter a valid estimated time for "${t.title}".`
        );
        return;
      }
    }

    setSubmitting(true);

    try {
      // Assign every task to every selected employee using the
      // existing single-task assignment endpoint - it already
      // handles per-task notifications, audit logging, and the
      // "can't edit a finalized report" check correctly, so we
      // just call it once per (employee, task) combination.
      //
      // Tasks for the SAME employee are sent one at a time (not in
      // parallel): each call reads-modifies-writes that employee's
      // one report document for the day, so firing them all at once
      // could race and drop a task. Different employees don't share
      // a document, so those requests can run concurrently.
      const assignAllTasksForEmployee = async (employeeId) => {
        const outcomes = [];
        for (const t of cleanedTasks) {
          try {
            await axiosClient.post('/tasks/assign', {
              date,
              employeeId,
              title: t.title,
              description: t.description.trim(),
              priority: t.priority,
              expectedCompletion: t.expectedCompletion.trim(),
              estimatedTimeMinutes: Number(t.estimatedTimeMinutes),
              remarks: t.remarks.trim(),
            });
            outcomes.push({ status: 'fulfilled' });
          } catch (error) {
            outcomes.push({ status: 'rejected', reason: error });
          }
        }
        return outcomes;
      };

      const perEmployeeResults = await Promise.all(
        employeeIds.map(assignAllTasksForEmployee)
      );

      const results = perEmployeeResults.flat();

      const failed = results.filter((r) => r.status === 'rejected');
      const succeeded = results.length - failed.length;

      if (failed.length === 0) {
        toast.success(
          `${succeeded} task${succeeded === 1 ? '' : 's'} assigned successfully.`
        );
        resetForm();
      } else if (succeeded === 0) {
        const firstError =
          failed[0]?.reason?.response?.data?.message ||
          'Failed to assign tasks.';
        toast.error(firstError);
      } else {
        toast.warning(
          `${succeeded} of ${results.length} task assignments succeeded. ${failed.length} failed - check the affected employees and try again.`
        );
      }
    } catch (err) {
      console.error('Assign task error:', err);

      toast.error(
        err?.response?.data?.message ||
          'Failed to assign tasks.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">

          <div>
            <h2 className="text-xl font-semibold text-navy-800">
              Assign Task
            </h2>

            <p className="text-sm text-navy-400 mt-1">
              Assign one or more tasks to one or more employees for a
              specific working day.
            </p>
          </div>

          <button
            type="button"
            onClick={loadEmployees}
            disabled={loadingEmployees}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-700 hover:bg-navy-50 disabled:opacity-50"
          >
            <FiRefreshCw
              className={
                loadingEmployees
                  ? 'h-4 w-4 animate-spin'
                  : 'h-4 w-4'
              }
            />

            Refresh
          </button>

        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="card p-5 space-y-5"
      >

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Date */}
          <div>
            <label className="label">
              Task Date
            </label>

            <input
              type="date"
              max={todayISO()}
              value={date}
              onChange={(event) =>
                setDate(event.target.value)
              }
              className="input-field"
              required
            />
          </div>

          {/* Employees (multi-select) */}
          <div>
            <div className="flex items-center justify-between">
              <label className="label mb-0">
                Employees
              </label>

              <button
                type="button"
                onClick={toggleSelectAllEmployees}
                disabled={loadingEmployees || employees.length === 0}
                className="text-xs text-navy-500 hover:text-navy-800 font-medium disabled:opacity-50"
              >
                {employeeIds.length === employees.length && employees.length > 0
                  ? 'Clear all'
                  : 'Select all'}
              </button>
            </div>

            <div className="input-field h-32 overflow-y-auto py-2 space-y-1">
              {loadingEmployees ? (
                <p className="text-sm text-navy-400">Loading employees...</p>
              ) : employees.length === 0 ? (
                <p className="text-sm text-navy-400">No active employees found.</p>
              ) : (
                employees.map((employee) => {
                  const id = employee._id || employee.id;
                  return (
                    <label
                      key={id}
                      className="flex items-center gap-2 text-sm text-navy-700 cursor-pointer py-0.5"
                    >
                      <input
                        type="checkbox"
                        checked={employeeIds.includes(id)}
                        onChange={() => toggleEmployee(id)}
                        className="h-4 w-4 rounded border-navy-300"
                      />
                      {employee.fullName || employee.name || 'Unknown Employee'}
                      {employee.employeeCode ? ` (${employee.employeeCode})` : ''}
                    </label>
                  );
                })
              )}
            </div>

            {employeeIds.length > 0 && (
              <p className="text-xs text-navy-400 mt-1">
                {employeeIds.length} employee{employeeIds.length === 1 ? '' : 's'} selected
              </p>
            )}
          </div>

        </div>

        {/* Tasks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="label mb-0">
              Tasks
            </label>

            <button
              type="button"
              onClick={addTaskRow}
              className="inline-flex items-center gap-1 text-sm text-navy-600 hover:text-navy-900 font-medium"
            >
              <FiPlus className="h-4 w-4" /> Add Task
            </button>
          </div>

          {tasks.map((task, idx) => (
            <div
              key={idx}
              className="border border-navy-100 rounded-lg p-4 space-y-3 relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-navy-400">
                  Task #{idx + 1}
                </span>

                {tasks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTaskRow(idx)}
                    className="text-red-500 hover:text-red-700"
                    aria-label="Remove task"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Title */}
                <div className="md:col-span-2">
                  <label className="label">
                    Task Title
                  </label>

                  <input
                    type="text"
                    value={task.title}
                    onChange={(e) => updateTask(idx, 'title', e.target.value)}
                    className="input-field"
                    placeholder="Enter task title"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="label">
                    Description
                  </label>

                  <textarea
                    value={task.description}
                    onChange={(e) => updateTask(idx, 'description', e.target.value)}
                    className="input-field min-h-[80px]"
                    placeholder="Describe the task..."
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="label">
                    Priority
                  </label>

                  <select
                    value={task.priority}
                    onChange={(e) => updateTask(idx, 'priority', e.target.value)}
                    className="input-field"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                {/* Estimated Time */}
                <div>
                  <label className="label">
                    Estimated Time (minutes)
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={task.estimatedTimeMinutes}
                    onChange={(e) => updateTask(idx, 'estimatedTimeMinutes', e.target.value)}
                    className="input-field"
                    placeholder="e.g. 120"
                  />
                </div>

                {/* Expected Completion */}
                <div>
                  <label className="label">
                    Expected Completion
                  </label>

                  <input
                    type="text"
                    value={task.expectedCompletion}
                    onChange={(e) => updateTask(idx, 'expectedCompletion', e.target.value)}
                    className="input-field"
                    placeholder="e.g. By 4 PM / EOD"
                  />
                </div>

                {/* Remarks */}
                <div>
                  <label className="label">
                    Remarks
                  </label>

                  <input
                    type="text"
                    value={task.remarks}
                    onChange={(e) => updateTask(idx, 'remarks', e.target.value)}
                    className="input-field"
                    placeholder="Optional remarks"
                  />
                </div>

              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-navy-100">

          <button
            type="button"
            onClick={resetForm}
            disabled={submitting}
            className="px-4 py-2 rounded-lg border border-navy-200 text-sm text-navy-700 hover:bg-navy-50 disabled:opacity-50"
          >
            Clear
          </button>

          <button
            type="submit"
            disabled={submitting || loadingEmployees}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-navy-700 text-white text-sm font-medium hover:bg-navy-800 disabled:opacity-50"
          >
            <FiSend className="h-4 w-4" />

            {submitting ? 'Assigning...' : 'Assign Tasks'}
          </button>

        </div>

      </form>
    </div>
  );
}
