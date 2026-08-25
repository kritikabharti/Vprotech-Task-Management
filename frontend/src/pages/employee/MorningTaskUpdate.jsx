import {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';

import {
  useForm,
  useFieldArray,
} from 'react-hook-form';

import { toast } from 'react-toastify';

import {
  FiPlus,
  FiTrash2,
  FiSave,
  FiSend,
  FiCheckCircle,
  FiLock,
  FiAlertCircle,
} from 'react-icons/fi';

import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import { todayISO } from '../../utils/format';


/* ============================================================
   HELPERS
============================================================ */

/**
 * Creates a fresh empty task.
 */
const emptyTask = () => ({
  _id: '',
  title: '',
  description: '',
  priority: 'Medium',
  expectedCompletion: '',
  estimatedTimeHours: 1,
  remarks: '',
});


/**
 * Convert frontend hours -> backend minutes.
 *
 * Examples:
 * 1     = 60
 * 1.5   = 90
 * 2     = 120
 * 2.75  = 165
 */
function hoursToMinutes(hours) {
  const value = Number(hours);

  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.round(value * 60);
}


/**
 * Display friendly hours/minutes.
 */
function hoursHint(hours) {
  const value = Number(hours);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const totalMinutes = Math.round(value * 60);

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (m === 0) {
    return `${h} hour${h !== 1 ? 's' : ''}`;
  }

  if (h === 0) {
    return `${m} minutes`;
  }

  return `${h}h ${m}m`;
}


/**
 * Check whether selected date is today.
 */
function isToday(date) {
  return date === todayISO();
}


/**
 * 9:40 AM cutoff.
 *
 * IMPORTANT:
 * We only lock today's morning task editing after
 * 9:40 AM.
 *
 * Past dates are also considered locked.
 */
function isMorningTaskLocked(date) {
  const now = new Date();

  const selected = new Date(`${date}T00:00:00`);

  if (Number.isNaN(selected.getTime())) {
    return false;
  }

  const today = new Date();

  const selectedYear = selected.getFullYear();
  const selectedMonth = selected.getMonth();
  const selectedDay = selected.getDate();

  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();


  // ------------------------------------------------------------
  // Past date
  // ------------------------------------------------------------

  if (
    selectedYear < todayYear ||
    (
      selectedYear === todayYear &&
      selectedMonth < todayMonth
    ) ||
    (
      selectedYear === todayYear &&
      selectedMonth === todayMonth &&
      selectedDay < todayDay
    )
  ) {
    return true;
  }


  // ------------------------------------------------------------
  // Future date
  // ------------------------------------------------------------

  if (
    selectedYear > todayYear ||
    (
      selectedYear === todayYear &&
      selectedMonth > todayMonth
    ) ||
    (
      selectedYear === todayYear &&
      selectedMonth === todayMonth &&
      selectedDay > todayDay
    )
  ) {
    return false;
  }


  // ------------------------------------------------------------
  // TODAY
  // Lock exactly at 9:40 AM.
  // ------------------------------------------------------------

  const cutoff = new Date();

  cutoff.setHours(9, 40, 0, 0);

  return now >= cutoff;
}


/**
 * Format cutoff text.
 */
function cutoffLabel() {
  return '9:40 AM';
}


/* ============================================================
   COMPONENT
============================================================ */

export default function MorningTaskUpdate() {

  const [date, setDate] = useState(todayISO());

  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState(null);

  const [existingReport, setExistingReport] =
    useState(null);

  const [saving, setSaving] = useState(false);

  /**
   * Forces the cutoff timer to recalculate.
   */
  const [lockCheck, setLockCheck] =
    useState(Date.now());


  /* ============================================================
     FORM
  ============================================================ */

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
  } = useForm({
    defaultValues: {
      tasks: [emptyTask()],
      remarks: '',
      lateSubmissionReason: '',
    },
  });


  const {
    fields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: 'tasks',
  });


  const watchedTasks = watch('tasks');

  const lateSubmissionReason =
    watch('lateSubmissionReason');


  /* ============================================================
     LOCK STATUS
  ============================================================ */

  const morningLocked = useMemo(() => {

    void lockCheck;

    return isMorningTaskLocked(date);

  }, [date, lockCheck]);


  /**
   * Late submission is allowed ONLY for today's
   * 9:40 AM cutoff.
   *
   * For past dates we keep the form locked and do
   * not offer late submission.
   */
  const lateSubmissionAllowed =
    morningLocked &&
    isToday(date);


  /**
   * Has this report already been accepted as a late
   * submission (a valid reason was already given earlier
   * today)? Once true, the employee should be able to keep
   * editing and resubmitting for the rest of the day exactly
   * like a normal (on-time) submission - no more locking, no
   * more re-asking for a reason.
   */
  const alreadyAcceptedLate =
    existingReport?.isLateSubmission === true;


  /**
   * A reason is only required the FIRST time an employee goes
   * past the cutoff for a given day's report - not on every
   * subsequent edit once it's already been accepted.
   */
  const reasonRequired =
    lateSubmissionAllowed &&
    !alreadyAcceptedLate;


  /**
   * Before 9:40 AM:
   *     editable
   *
   * After 9:40 AM, first time, WITH an existing saved report:
   *     task fields locked (so the pre-deadline plan can't be
   *     rewritten after the fact)
   *     reason remains editable
   *
   * After 9:40 AM but there is NO saved report yet at all
   * (nothing was ever entered before the deadline):
   *     fields stay editable - there's nothing to protect by
   *     locking, and locking here would make it impossible to
   *     ever enter a first task or submit anything.
   *
   * After 9:40 AM, once a valid reason has already been
   * accepted for this report:
   *     fully editable again, same as before the cutoff
   */
  const canEditTasks =
    !morningLocked ||
    alreadyAcceptedLate ||
    !existingReport;


  /* ============================================================
     KEEP CLOCK UPDATED
  ============================================================ */

  useEffect(() => {

    const interval = setInterval(() => {

      setLockCheck(Date.now());

    }, 30000);

    return () => {
      clearInterval(interval);
    };

  }, []);


  /* ============================================================
     LOAD DAY
  ============================================================ */

  const loadDay = useCallback(
    async (selectedDate) => {

      setLoading(true);

      setLoadError(null);

      try {

        const { data: res } =
          await axiosClient.get(
            '/tasks/day',
            {
              params: {
                date: selectedDate,
              },
            }
          );

        const report =
          res?.data?.report || null;

        setExistingReport(report);


        if (
          report &&
          report.morning &&
          Array.isArray(
            report.morning.tasks
          ) &&
          report.morning.tasks.length > 0
        ) {

          reset({

            tasks:
              report.morning.tasks.map(
                (task) => ({

                  _id:
                    task._id || '',

                  title:
                    task.title || '',

                  description:
                    task.description || '',

                  priority:
                    task.priority ||
                    'Medium',

                  expectedCompletion:
                    task.expectedCompletion ||
                    '',

                  /**
                   * Database stores minutes.
                   * UI displays hours.
                   */
                  estimatedTimeHours:
                    Number(
                      task.estimatedTimeMinutes ||
                      0
                    ) / 60,

                  remarks:
                    task.remarks || '',

                })
              ),

            remarks:
              report.morning.remarks ||
              '',

            lateSubmissionReason:
              report.lateSubmissionReason ||
              '',

          });

        } else {

          reset({

            tasks: [
              emptyTask(),
            ],

            remarks: '',

            lateSubmissionReason: '',

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


  /* ============================================================
     REPORT STATUS
  ============================================================ */

  const submittedButEditable =
    existingReport?.status ===
    'morning_submitted';


  const approvedButEditable =
    existingReport?.status ===
    'approved';


  const reopenedForEdit =
    existingReport?.status ===
    'evening_submitted';


  /* ============================================================
     VALIDATE TASKS
  ============================================================ */

  const validateTasks = (values) => {

    if (
      !values.tasks ||
      values.tasks.length === 0
    ) {

      toast.error(
        'At least one task is required.'
      );

      return false;
    }


    for (const task of values.tasks) {

      if (
        !task.title ||
        !String(task.title).trim()
      ) {

        toast.error(
          'Every task must have a title.'
        );

        return false;
      }


      const hours =
        Number(
          task.estimatedTimeHours
        );


      if (
        !Number.isFinite(hours) ||
        hours <= 0
      ) {

        toast.error(
          'Estimated time must be greater than 0 hours.'
        );

        return false;
      }


      if (hours > 24) {

        toast.error(
          'Estimated time cannot be more than 24 hours.'
        );

        return false;
      }

    }


    return true;

  };


  /* ============================================================
     VALIDATE BEFORE SAVE / SUBMIT
  ============================================================ */

  const validateBeforeSave = (
    values,
    submit
  ) => {


    /**
     * ----------------------------------------------------------
     * LATE SUBMISSION
     * ----------------------------------------------------------
     *
     * This is the IMPORTANT FIX.
     *
     * Previously the code did:
     *
     * if (morningLocked) return false;
     *
     * That meant the late submit could NEVER work.
     *
     * Now:
     *
     * - Save Draft after 9:40 => blocked
     * - Editing tasks after 9:40 => blocked
     * - Submit after 9:40 => allowed WITH reason
     */

    if (morningLocked && !alreadyAcceptedLate) {

      if (!submit) {

        toast.error(
          `Morning tasks are locked after ${cutoffLabel()}.`
        );

        return false;

      }


      if (!lateSubmissionAllowed) {

        toast.error(
          'Late submission is not available for this date.'
        );

        return false;

      }


      const reason =
        String(
          values.lateSubmissionReason ||
          ''
        ).trim();


      if (!reason) {

        toast.error(
          `Please provide a reason for the late submission after ${cutoffLabel()}.`
        );

        return false;

      }


      if (reason.length < 5) {

        toast.error(
          'Late submission reason must contain at least 5 characters.'
        );

        return false;

      }

    }


    /**
     * Validate task data.
     */
    if (!validateTasks(values)) {
      return false;
    }


    return true;

  };


  /* ============================================================
     SAVE / SUBMIT
  ============================================================ */

  const onSave = async (
    values,
    submit
  ) => {

    if (
      !validateBeforeSave(
        values,
        submit
      )
    ) {
      return;
    }


    setSaving(true);


    try {

      /**
       * Convert frontend hours -> backend minutes.
       */
      const formattedTasks =
        values.tasks.map(
          (task) => ({

            _id:
              task._id ||
              undefined,

            title:
              String(
                task.title
              ).trim(),

            description:
              task.description ||
              '',

            priority:
              task.priority ||
              'Medium',

            expectedCompletion:
              task.expectedCompletion ||
              '',

            estimatedTimeMinutes:
              hoursToMinutes(
                task.estimatedTimeHours
              ),

            remarks:
              task.remarks ||
              '',

          })
        );


      /**
       * IMPORTANT:
       * Send the SAME field name that the
       * backend expects.
       */
      const lateReason =
        lateSubmissionAllowed
          ? String(
              values.lateSubmissionReason ||
              ''
            ).trim()
          : '';


      const { data: res } =
        await axiosClient.post(
          '/tasks/morning',
          {

            date,

            tasks:
              formattedTasks,

            remarks:
              values.remarks ||
              '',

            lateSubmissionReason:
              lateReason,

            submit,

          }
        );


      const report =
        res?.data?.report;


      if (!report) {

        throw new Error(
          'Server did not return the updated report.'
        );

      }


      setExistingReport(report);


      /**
       * Load server values back into form.
       */
      reset({

        tasks:
          (
            report.morning?.tasks ||
            []
          ).map(
            (task) => ({

              _id:
                task._id ||
                '',

              title:
                task.title ||
                '',

              description:
                task.description ||
                '',

              priority:
                task.priority ||
                'Medium',

              expectedCompletion:
                task.expectedCompletion ||
                '',

              estimatedTimeHours:
                Number(
                  task.estimatedTimeMinutes ||
                  0
                ) / 60,

              remarks:
                task.remarks ||
                '',

            })
          ),

        remarks:
          report.morning?.remarks ||
          '',

        lateSubmissionReason:
          report.lateSubmissionReason ||
          '',

      });


      toast.success(
        submit
          ? (
              lateSubmissionAllowed
                ? 'Late morning update submitted successfully!'
                : 'Morning tasks submitted successfully!'
            )
          : 'Draft saved successfully.'
      );


    } catch (err) {

      console.error(
        'Morning task save error:',
        err
      );

      toast.error(
        err.response?.data?.message ||
        err.message ||
        'Could not save morning tasks.'
      );

    } finally {

      setSaving(false);

    }

  };


  /* ============================================================
     TASK COUNT
  ============================================================ */

  const totalTasks =
    watchedTasks?.length || 0;


  /* ============================================================
     RENDER
  ============================================================ */

  return (

    <div className="max-w-4xl mx-auto space-y-5">


      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="card p-5">

        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">

          <h2 className="text-lg font-semibold text-navy-800">
            Morning Task Update
          </h2>


          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) =>
              setDate(
                e.target.value
              )
            }
            className="input-field w-auto"
          />

        </div>


        <p className="text-sm text-navy-400">
          Plan what you intend to work on today.
          Estimated task time is entered in hours.
        </p>


        {/* ====================================================
            CUTOFF MESSAGE
        ==================================================== */}

        {isToday(date) && (

          <div
            className={`mt-3 p-3 rounded-lg border flex items-start gap-2 text-sm ${
              morningLocked
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}
          >

            {morningLocked ? (

              <FiLock className="h-4 w-4 mt-0.5 shrink-0" />

            ) : (

              <FiCheckCircle className="h-4 w-4 mt-0.5 shrink-0" />

            )}


            <div>

              <p className="font-semibold">
                Morning submission cutoff: 9:40 AM
              </p>


              {morningLocked ? (

                <p className="mt-0.5">
                  Morning task fields are locked
                  because the 9:40 AM deadline has
                  passed. You can still submit the
                  morning update by providing a reason
                  below.
                </p>

              ) : (

                <p className="mt-0.5">
                  You can add, edit and submit morning
                  tasks normally until 9:40 AM.
                </p>

              )}

            </div>

          </div>

        )}

      </div>


      {/* ======================================================
          LOADING
      ====================================================== */}

      {loading ? (

        <LoadingSpinner label="Loading..." />

      ) : loadError ? (

        <div className="card">

          <ErrorState
            message={loadError}
            onRetry={() =>
              loadDay(date)
            }
          />

        </div>

      ) : (

        <form
          className="space-y-3"
          onSubmit={(e) =>
            e.preventDefault()
          }
        >


          {/* ==================================================
              SUBMITTED MESSAGE
          ================================================== */}

          {submittedButEditable &&
            !morningLocked && (

            <div className="card p-3 bg-green-50 border border-green-100 flex items-center gap-2 text-sm text-green-700">

              <FiCheckCircle className="h-4 w-4 shrink-0" />

              Submitted for review.
              You can still edit tasks or add
              more until your team lead reviews it.

            </div>

          )}


          {/* ==================================================
              APPROVED / EVENING MESSAGE
          ================================================== */}

          {(
            approvedButEditable ||
            reopenedForEdit
          ) &&
            !morningLocked && (

            <div className="card p-3 bg-amber-50 border border-amber-100 flex items-center gap-2 text-sm text-amber-700">

              <FiCheckCircle className="h-4 w-4 shrink-0" />

              {approvedButEditable
                ? 'This was already approved. Editing and resubmitting sends it back for review.'
                : 'Evening tasks were already submitted for this day. Editing the plan sends it back for review.'
              }

            </div>

          )}


          {/* ==================================================
              TASK HEADER
          ================================================== */}

          <div className="flex items-center justify-between">

            <p className="text-sm font-medium text-navy-700">

              Total Planned Tasks:{' '}

              <span className="text-navy-900 font-semibold">
                {totalTasks}
              </span>

            </p>


            <button
              type="button"
              disabled={
                saving ||
                !canEditTasks
              }
              onClick={() =>
                append(
                  emptyTask()
                )
              }
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >

              <FiPlus className="h-4 w-4" />

              Add Task

            </button>

          </div>


          {/* ==================================================
              TASK LIST
          ================================================== */}

          {fields.map(
            (field, idx) => (

            <div
              key={field.id}
              className="card p-3 space-y-2 relative"
            >

              <input
                type="hidden"
                {...register(
                  `tasks.${idx}._id`
                )}
              />


              {/* ================================================
                  MAIN ROW
              ================================================= */}

              <div className="flex items-center gap-2">

                <span className="text-xs font-semibold text-navy-400 shrink-0 w-6">
                  #{idx + 1}
                </span>


                {/* TITLE */}

                <input
                  readOnly={!canEditTasks}
                  className={`input-field flex-1 ${
                    !canEditTasks
                      ? 'bg-gray-100 cursor-not-allowed'
                      : ''
                  }`}
                  placeholder="Task title, e.g. Develop login API"
                  {...register(
                    `tasks.${idx}.title`,
                    {
                      required: true,
                    }
                  )}
                />


                {/* PRIORITY */}

                <select
                  className={`input-field w-28 shrink-0 ${
                    !canEditTasks
                      ? 'bg-gray-100 cursor-not-allowed pointer-events-none'
                      : ''
                  }`}
                  tabIndex={
                    canEditTasks
                      ? 0
                      : -1
                  }
                  {...register(
                    `tasks.${idx}.priority`
                  )}
                >

                  <option>
                    Low
                  </option>

                  <option>
                    Medium
                  </option>

                  <option>
                    High
                  </option>

                  <option>
                    Urgent
                  </option>

                </select>


                {/* HOURS */}

                <div className="shrink-0">

                  <div className="relative">

                    <input
                      type="number"
                      min="0.25"
                      max="24"
                      step="0.25"
                      readOnly={!canEditTasks}
                      title="Estimated hours"
                      className={`input-field w-28 pr-12 ${
                        !canEditTasks
                          ? 'bg-gray-100 cursor-not-allowed'
                          : ''
                      }`}
                      placeholder="Hours"
                      {...register(
                        `tasks.${idx}.estimatedTimeHours`,
                        {
                          required: true,
                          min: 0.25,
                        }
                      )}
                    />


                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-navy-400 pointer-events-none">
                      hrs
                    </span>

                  </div>


                  {hoursHint(
                    watchedTasks?.[idx]
                      ?.estimatedTimeHours
                  ) && (

                    <p className="text-[11px] text-navy-400 mt-0.5 text-center">

                      {hoursHint(
                        watchedTasks[idx]
                          .estimatedTimeHours
                      )}

                    </p>

                  )}

                </div>


                {/* DELETE */}

                {fields.length > 1 && (

                  <button
                    type="button"
                    disabled={
                      !canEditTasks ||
                      saving
                    }
                    onClick={() =>
                      remove(idx)
                    }
                    className="text-red-500 hover:text-red-700 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Remove task"
                  >

                    <FiTrash2 className="h-4 w-4" />

                  </button>

                )}

              </div>


              {/* ================================================
                  SECONDARY FIELDS
              ================================================= */}

              <div className="flex items-center gap-2 pl-8">

                <input
                  readOnly={!canEditTasks}
                  className={`input-field flex-1 ${
                    !canEditTasks
                      ? 'bg-gray-100 cursor-not-allowed'
                      : ''
                  }`}
                  placeholder="Description (optional)"
                  {...register(
                    `tasks.${idx}.description`
                  )}
                />


                <input
                  readOnly={!canEditTasks}
                  className={`input-field w-32 shrink-0 ${
                    !canEditTasks
                      ? 'bg-gray-100 cursor-not-allowed'
                      : ''
                  }`}
                  placeholder="Due by"
                  {...register(
                    `tasks.${idx}.expectedCompletion`
                  )}
                />


                <input
                  readOnly={!canEditTasks}
                  className={`input-field w-36 shrink-0 ${
                    !canEditTasks
                      ? 'bg-gray-100 cursor-not-allowed'
                      : ''
                  }`}
                  placeholder="Remarks (optional)"
                  {...register(
                    `tasks.${idx}.remarks`
                  )}
                />

              </div>

            </div>

          ))}


          {/* ==================================================
              OVERALL REMARKS
          ================================================== */}

          <div className="card p-3">

            <textarea
              rows={2}
              readOnly={!canEditTasks}
              className={`input-field ${
                !canEditTasks
                  ? 'bg-gray-100 cursor-not-allowed'
                  : ''
              }`}
              placeholder="Overall remarks for today's plan (optional)"
              {...register('remarks')}
            />

          </div>


          {/* ==================================================
              LATE SUBMISSION REASON
          ================================================== */}

          {reasonRequired && (

            <div className="card p-4 border border-amber-200 bg-amber-50">

              <div className="flex items-start gap-3">

                <FiAlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />


                <div className="flex-1">

                  <label className="block text-sm font-semibold text-amber-800 mb-1">

                    Reason for Late Submission
                    <span className="text-red-600 ml-1">
                      *
                    </span>

                  </label>


                  <p className="text-xs text-amber-700 mb-2">

                    The 9:40 AM deadline has passed.
                    Your task fields are locked.
                    Enter a reason and submit to unlock
                    editing again for the rest of today.

                  </p>


                  <textarea
                    rows={3}
                    className="input-field bg-white"
                    placeholder="Example: Late start due to unexpected internet connectivity issue."
                    {...register(
                      'lateSubmissionReason'
                    )}
                  />


                  {!String(
                    lateSubmissionReason ||
                    ''
                  ).trim() && (

                    <p className="text-xs text-red-500 mt-1">

                      Reason is required for late submission.

                    </p>

                  )}

                </div>

              </div>

            </div>

          )}


          {/* ==================================================
              ALREADY-ACCEPTED LATE SUBMISSION MESSAGE
          ================================================== */}

          {alreadyAcceptedLate && (

            <div className="card p-3 bg-green-50 border border-green-100 flex items-start gap-2 text-sm text-green-700">

              <FiCheckCircle className="h-4 w-4 shrink-0 mt-0.5" />

              <div>
                Your late submission reason was accepted
                {existingReport?.lateSubmissionReason
                  ? ` ("${existingReport.lateSubmissionReason}")`
                  : ''}
                . Task fields are unlocked - you can keep
                editing and resubmitting for the rest of today.
              </div>

            </div>

          )}


          {/* ==================================================
              PAST DATE MESSAGE
          ================================================== */}

          {morningLocked &&
            !isToday(date) && (

            <div className="card p-4 bg-gray-50 border border-gray-200 flex items-start gap-2 text-sm text-gray-600">

              <FiLock className="h-4 w-4 mt-0.5 shrink-0" />

              <div>

                <p className="font-semibold">
                  Morning update locked
                </p>

                <p className="mt-0.5">
                  Morning task entry is locked for
                  past dates.

                </p>

              </div>

            </div>

          )}


          {/* ==================================================
              BUTTONS
          ================================================== */}

          <div className="flex flex-wrap gap-3 justify-end">


            {/* SAVE DRAFT */}

            <button
              type="button"
              disabled={
                saving ||
                (morningLocked && !alreadyAcceptedLate)
              }
              onClick={handleSubmit(
                (values) =>
                  onSave(
                    values,
                    false
                  )
              )}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >

              <FiSave className="h-4 w-4" />

              Save Draft

            </button>


            {/* SUBMIT */}

            <button
              type="button"
              disabled={
                saving ||
                (
                  morningLocked &&
                  !alreadyAcceptedLate &&
                  (
                    !lateSubmissionAllowed ||
                    !String(
                      lateSubmissionReason ||
                      ''
                    ).trim()
                  )
                )
              }
              onClick={handleSubmit(
                (values) =>
                  onSave(
                    values,
                    true
                  )
              )}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >

              <FiSend className="h-4 w-4" />


              {reasonRequired ? (

                <>
                  Submit Late Morning Update
                </>

              ) : existingReport ? (

                <>
                  Update Submission
                </>

              ) : (

                <>
                  Submit Morning Update
                </>

              )}

            </button>

          </div>

        </form>

      )}

    </div>

  );

}