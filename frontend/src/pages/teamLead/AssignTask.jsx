import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiSend, FiRefreshCw } from 'react-icons/fi';

import axiosClient from '../../api/axiosClient';
import { todayISO } from '../../utils/format';

export default function AssignTask() {
  const [date, setDate] = useState(todayISO());
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [employeeId, setEmployeeId] = useState('');

  const [task, setTask] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    expectedCompletion: '',
    estimatedTimeMinutes: '',
    remarks: '',
  });

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

  const handleChange = (event) => {
    const { name, value } = event.target;

    setTask((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setEmployeeId('');

    setTask({
      title: '',
      description: '',
      priority: 'Medium',
      expectedCompletion: '',
      estimatedTimeMinutes: '',
      remarks: '',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!employeeId) {
      toast.error('Please select an employee.');
      return;
    }

    if (!task.title.trim()) {
      toast.error('Task title is required.');
      return;
    }

    if (
      task.estimatedTimeMinutes === '' ||
      Number(task.estimatedTimeMinutes) < 0
    ) {
      toast.error('Enter a valid estimated time.');
      return;
    }

    setSubmitting(true);

    try {
      /*
       * We create/update the employee's morning report
       * using the existing POST /tasks/morning endpoint.
       *
       * First fetch the employee's existing report for the date.
       */
      let existingTasks = [];

      try {
        const dayResponse = await axiosClient.get(
          '/tasks/day',
          {
            params: {
              date,
              employeeId,
            },
          }
        );

        const dayData =
          dayResponse?.data?.data ??
          dayResponse?.data ??
          {};

        const report = dayData?.report;

        if (report?.morning?.tasks) {
          existingTasks = report.morning.tasks;
        }
      } catch (error) {
        /*
         * If there is no report yet, continue with an empty task list.
         */
        if (error?.response?.status !== 404) {
          throw error;
        }
      }

      const newTask = {
        title: task.title.trim(),
        description: task.description.trim(),
        priority: task.priority,
        expectedCompletion:
          task.expectedCompletion.trim(),
        estimatedTimeMinutes:
          Number(task.estimatedTimeMinutes),
        remarks: task.remarks.trim(),
      };

      const updatedTasks = [
        ...existingTasks.map((item) => ({
          _id: item._id,
          title: item.title,
          description: item.description || '',
          priority: item.priority || 'Medium',
          expectedCompletion:
            item.expectedCompletion || '',
          estimatedTimeMinutes:
            item.estimatedTimeMinutes || 0,
          remarks: item.remarks || '',
        })),
        newTask,
      ];

      await axiosClient.post('/tasks/morning', {
        date,
        employeeId,
        tasks: updatedTasks,
        remarks: '',
        submit: true,
      });

      toast.success(
        'Task assigned successfully.'
      );

      resetForm();
    } catch (err) {
      console.error('Assign task error:', err);

      toast.error(
        err?.response?.data?.message ||
          'Failed to assign task.'
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
              Assign a new task to an employee for a
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

          {/* Employee */}
          <div>
            <label className="label">
              Employee
            </label>

            <select
              value={employeeId}
              onChange={(event) =>
                setEmployeeId(event.target.value)
              }
              className="input-field"
              disabled={loadingEmployees}
              required
            >
              <option value="">
                {loadingEmployees
                  ? 'Loading employees...'
                  : 'Select employee'}
              </option>

              {employees.map((employee) => (
                <option
                  key={employee._id || employee.id}
                  value={
                    employee._id || employee.id
                  }
                >
                  {employee.fullName ||
                    employee.name ||
                    'Unknown Employee'}
                  {employee.employeeCode
                    ? ` (${employee.employeeCode})`
                    : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="md:col-span-2">
            <label className="label">
              Task Title
            </label>

            <input
              type="text"
              name="title"
              value={task.title}
              onChange={handleChange}
              className="input-field"
              placeholder="Enter task title"
              required
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="label">
              Description
            </label>

            <textarea
              name="description"
              value={task.description}
              onChange={handleChange}
              className="input-field min-h-[100px]"
              placeholder="Describe the task..."
            />
          </div>

          {/* Priority */}
          <div>
            <label className="label">
              Priority
            </label>

            <select
              name="priority"
              value={task.priority}
              onChange={handleChange}
              className="input-field"
            >
              <option value="Low">
                Low
              </option>

              <option value="Medium">
                Medium
              </option>

              <option value="High">
                High
              </option>

              <option value="Urgent">
                Urgent
              </option>
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
              name="estimatedTimeMinutes"
              value={task.estimatedTimeMinutes}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g. 120"
              required
            />
          </div>

          {/* Expected Completion */}
          <div>
            <label className="label">
              Expected Completion
            </label>

            <input
              type="text"
              name="expectedCompletion"
              value={task.expectedCompletion}
              onChange={handleChange}
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
              name="remarks"
              value={task.remarks}
              onChange={handleChange}
              className="input-field"
              placeholder="Optional remarks"
            />
          </div>

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

            {submitting
              ? 'Assigning...'
              : 'Assign Task'}
          </button>

        </div>

      </form>
    </div>
  );
}