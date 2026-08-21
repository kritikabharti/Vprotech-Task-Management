


const mongoose = require('mongoose');

const DailyTaskReport = require('../models/DailyTaskReport');
const User = require('../models/User');

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');

const {
  recomputeSummary,
  toCalendarDate,
} = require('../services/taskCalculations');

const { logAction } = require('../services/auditService');

const {
  notify,
  notifyMany,
} = require('../services/notificationService');






/* ============================================================
   HELPERS
============================================================ */

/**
 * Resolves which employee's data a request may touch.
 *
 * Employee:
 *   - Can only access their own reports.
 *
 * Team Lead:
 *   - Without employeeId => own reports.
 *   - With employeeId => only employees assigned to them.
 *
 * Admin:
 *   - Can access any employee.
 */
async function resolveTargetEmployee(reqUser, requestedEmployeeId) {
  if (!reqUser) {
    throw new ApiError(401, 'Authentication required.');
  }

  // ------------------------------------------------------------
  // Employee
  // ------------------------------------------------------------

  if (reqUser.role === 'employee') {
    if (
      requestedEmployeeId &&
      String(requestedEmployeeId) !== String(reqUser._id)
    ) {
      throw new ApiError(
        403,
        'You can only manage your own tasks.'
      );
    }

    return reqUser;
  }

  // ------------------------------------------------------------
  // Team Lead
  // ------------------------------------------------------------

  if (reqUser.role === 'team_lead') {
    // No employeeId = Team Lead's own report
    if (!requestedEmployeeId) {
      return reqUser;
    }

    const target = await User.findById(requestedEmployeeId);

    if (!target || target.role !== 'employee') {
      throw new ApiError(404, 'Employee not found.');
    }

    if (
      !target.teamLead ||
      String(target.teamLead) !== String(reqUser._id)
    ) {
      throw new ApiError(
        403,
        'You can only manage employees assigned to you.'
      );
    }

    return target;
  }

  // ------------------------------------------------------------
  // Admin
  // ------------------------------------------------------------

  if (reqUser.role === 'admin') {
    if (!requestedEmployeeId) {
      throw new ApiError(
        400,
        'employeeId is required.'
      );
    }

    const target = await User.findById(requestedEmployeeId);

    if (!target || target.role !== 'employee') {
      throw new ApiError(404, 'Employee not found.');
    }

    return target;
  }

  throw new ApiError(403, 'You are not allowed to access tasks.');
}


/**
 * Checks whether the requested user can access a report.
 *
 * Employee:
 *   Own report only.
 *
 * Team Lead:
 *   - Their assigned employees
 *   - Their own reports
 *
 * Admin:
 *   Any employee report.
 */
async function assertReportInScope(reqUser, report) {
  if (!reqUser) {
    throw new ApiError(401, 'Authentication required.');
  }

  if (!report) {
    throw new ApiError(404, 'Report not found.');
  }

  const reportEmployeeId = String(report.employee);

  // ------------------------------------------------------------
  // Employee
  // ------------------------------------------------------------

  if (reqUser.role === 'employee') {
    if (reportEmployeeId !== String(reqUser._id)) {
      throw new ApiError(
        403,
        'You can only access your own task reports.'
      );
    }

    return true;
  }

  // ------------------------------------------------------------
  // Team Lead
  // ------------------------------------------------------------

  if (reqUser.role === 'team_lead') {
    // Team Lead can access their own report
    if (reportEmployeeId === String(reqUser._id)) {
      return true;
    }

    const employee = await User.findById(report.employee)
      .select('role teamLead');

    if (!employee || employee.role !== 'employee') {
      throw new ApiError(
        403,
        'This report does not belong to an employee.'
      );
    }

    if (
      !employee.teamLead ||
      String(employee.teamLead) !== String(reqUser._id)
    ) {
      throw new ApiError(
        403,
        'You can only access reports of employees assigned to you.'
      );
    }

    return true;
  }

  // ------------------------------------------------------------
  // Admin
  // ------------------------------------------------------------

  if (reqUser.role === 'admin') {
    return true;
  }

  throw new ApiError(
    403,
    'You are not allowed to access this report.'
  );
}


/**
 * Notify the appropriate reviewers after a morning/evening
 * submission.
 *
 * For an employee:
 *   Notify their Team Lead.
 *
 * For a Team Lead:
 *   Notify Admins.
 *
 * Admin:
 *   No higher-level reviewer.
 */
async function notifyReviewers(
  employee,
  message,
  type,
  report
) {
  if (!employee) {
    return;
  }

  const recipients = [];

  // ------------------------------------------------------------
  // Employee -> Team Lead
  // ------------------------------------------------------------

  if (
    employee.role === 'employee' &&
    employee.teamLead
  ) {
    recipients.push(String(employee.teamLead));
  }

  // ------------------------------------------------------------
  // Team Lead -> Admin
  // ------------------------------------------------------------

  if (employee.role === 'team_lead') {
    const admins = await User.find({
      role: 'admin',
      status: 'active',
    }).select('_id');

    admins.forEach((admin) => {
      recipients.push(String(admin._id));
    });
  }

  // Remove duplicate recipients
  const uniqueRecipients = [
    ...new Set(recipients),
  ];

  if (uniqueRecipients.length === 0) {
    return;
  }

  await Promise.all(
    uniqueRecipients.map((recipient) =>
      notify({
        recipient,
        message,
        type,
        relatedRecord: report?._id,
        relatedModel: 'DailyTaskReport',
      })
    )
  );
}


/* ============================================================
   ASSIGN TASK
   POST /api/tasks/assign
============================================================ */

const assignTask = asyncHandler(async (req, res) => {
  const {
    date,
    employeeId,
    title,
    description,
    priority,
    estimatedTimeMinutes,
    expectedCompletion,
    remarks,
  } = req.body;

  if (!date) {
    throw new ApiError(
      400,
      'Task date is required.'
    );
  }

  if (!employeeId) {
    throw new ApiError(
      400,
      'Employee is required.'
    );
  }

  if (!title || !String(title).trim()) {
    throw new ApiError(
      400,
      'Task title is required.'
    );
  }

  if (
    estimatedTimeMinutes === undefined ||
    estimatedTimeMinutes === null ||
    Number.isNaN(Number(estimatedTimeMinutes)) ||
    Number(estimatedTimeMinutes) <= 0
  ) {
    throw new ApiError(
      400,
      'Estimated time must be greater than 0 minutes.'
    );
  }

  const taskDate = toCalendarDate(date);

  if (!taskDate) {
    throw new ApiError(
      400,
      'Invalid task date.'
    );
  }

  // ------------------------------------------------------------
  // Find employee
  // ------------------------------------------------------------

  const employee = await User.findById(employeeId);

  if (!employee) {
    throw new ApiError(
      404,
      'Employee not found.'
    );
  }

  if (employee.role !== 'employee') {
    throw new ApiError(
      400,
      'Task can only be assigned to an employee.'
    );
  }

  if (employee.status !== 'active') {
    throw new ApiError(
      400,
      'Cannot assign task to an inactive employee.'
    );
  }

  if (!employee.department) {
    throw new ApiError(
      400,
      'Employee has no department assigned.'
    );
  }

  // ------------------------------------------------------------
  // Permission
  // ------------------------------------------------------------

  if (
    !['admin', 'team_lead'].includes(req.user.role)
  ) {
    throw new ApiError(
      403,
      'You are not allowed to assign tasks.'
    );
  }

  // Team Lead can only assign to their employees
  if (req.user.role === 'team_lead') {
    if (
      !employee.teamLead ||
      String(employee.teamLead) !== String(req.user._id)
    ) {
      throw new ApiError(
        403,
        'You can only assign tasks to employees assigned to you.'
      );
    }
  }

  // ------------------------------------------------------------
  // Find/create report
  // ------------------------------------------------------------

  let report = await DailyTaskReport.findOne({
    employee: employee._id,
    taskDate,
  });

  if (!report) {
    report = new DailyTaskReport({
      employee: employee._id,
      department: employee.department,
      teamLead: employee.teamLead,
      taskDate,
      morning: {
        tasks: [],
        remarks: '',
      },
    });
  }

  // ------------------------------------------------------------
  // Prevent editing finalized reports
  // ------------------------------------------------------------

  const blockedStatuses = [
    'evening_submitted',
    'approved',
  ];

  if (blockedStatuses.includes(report.status)) {
    throw new ApiError(
      400,
      `Cannot assign a task because this report is already ${report.status.replace(
        '_',
        ' '
      )}.`
    );
  }

  // ------------------------------------------------------------
  // Add task
  // ------------------------------------------------------------

  report.morning.tasks.push({
    _id: new mongoose.Types.ObjectId(),
    title: String(title).trim(),
    description: description || '',
    priority: priority || 'Medium',
    expectedCompletion: expectedCompletion || '',
    estimatedTimeMinutes: Number(
      estimatedTimeMinutes
    ),
    remarks: remarks || '',
  });

  if (
    !report.status ||
    report.status === 'draft'
  ) {
    report.status = 'draft';
  }

  recomputeSummary(report);

  await report.save();

  // ------------------------------------------------------------
  // Audit
  // ------------------------------------------------------------

  await logAction({
    user: req.user,
    action: 'task_assigned',
    module: 'Task',
    description:
      `"${String(title).trim()}" assigned to ${employee.fullName} for ${date}`,
    req,
  });

  // ------------------------------------------------------------
  // Notify employee
  // ------------------------------------------------------------

  await notify({
    recipient: employee._id,
    message:
      `A new task "${String(title).trim()}" has been assigned to you for ${date} by ${req.user.fullName}.`,
    type: 'report_info',
    relatedRecord: report._id,
    relatedModel: 'DailyTaskReport',
  });

  sendSuccess(
    res,
    201,
    'Task assigned successfully.',
    {
      report,
      task:
        report.morning.tasks[
          report.morning.tasks.length - 1
        ],
    }
  );
});


/* ============================================================
   SUBMIT MORNING TASKS
   POST /api/tasks/morning
============================================================ */

const submitMorningTasks = asyncHandler(
  async (req, res) => {
    const {
      date,
      tasks,
      remarks,
      employeeId,
      submit,
    } = req.body;

    if (!date) {
      throw new ApiError(
        400,
        'Date is required.'
      );
    }

    if (
      !Array.isArray(tasks) ||
      tasks.length === 0
    ) {
      throw new ApiError(
        400,
        'At least one planned task is required.'
      );
    }

    const employee =
      await resolveTargetEmployee(
        req.user,
        employeeId
      );

    if (!employee.department) {
      throw new ApiError(
        400,
        'Employee has no department assigned; cannot log tasks.'
      );
    }

    const taskDate =
      toCalendarDate(date);

    if (!taskDate) {
      throw new ApiError(
        400,
        'Invalid date.'
      );
    }

    // ------------------------------------------------------------
    // Validate tasks
    // ------------------------------------------------------------

    for (const t of tasks) {
      if (
        !t.title ||
        !String(t.title).trim()
      ) {
        throw new ApiError(
          400,
          'Each task requires a title.'
        );
      }

      if (
        t.estimatedTimeMinutes ===
          undefined ||
        t.estimatedTimeMinutes === null ||
        Number.isNaN(
          Number(t.estimatedTimeMinutes)
        ) ||
        Number(t.estimatedTimeMinutes) <= 0
      ) {
        throw new ApiError(
          400,
          'Each task requires estimatedTimeMinutes greater than 0.'
        );
      }
    }

    // ------------------------------------------------------------
    // Find/create report
    // ------------------------------------------------------------

    let report =
      await DailyTaskReport.findOne({
        employee: employee._id,
        taskDate,
      });

    const previousStatus =
      report?.status || null;

    const wasAdvanced =
      previousStatus &&
      [
        'evening_submitted',
        'approved',
      ].includes(previousStatus);

    if (!report) {
      report = new DailyTaskReport({
        employee: employee._id,
        department: employee.department,
        teamLead: employee.teamLead,
        taskDate,
      });
    }

    // ------------------------------------------------------------
    // Preserve existing task IDs
    // ------------------------------------------------------------

    const existingIds =
      new Set(
        (report.morning.tasks || [])
          .map((t) => String(t._id))
      );

    report.morning.tasks =
      tasks.map((t) => ({
        _id:
          t._id &&
          existingIds.has(String(t._id))
            ? t._id
            : new mongoose.Types.ObjectId(),

        title: String(t.title).trim(),

        description:
          t.description || '',

        priority:
          t.priority || 'Medium',

        expectedCompletion:
          t.expectedCompletion || '',

        estimatedTimeMinutes:
          Number(
            t.estimatedTimeMinutes
          ),

        remarks:
          t.remarks || '',
      }));

    report.morning.remarks =
      remarks || '';

    // ------------------------------------------------------------
    // Remove orphan evening entries
    // ------------------------------------------------------------

    const currentTaskIds =
      new Set(
        report.morning.tasks.map(
          (t) => String(t._id)
        )
      );

    report.evening.tasks =
      (
        report.evening.tasks || []
      ).filter((e) =>
        currentTaskIds.has(
          String(e.taskRef)
        )
      );

    // ------------------------------------------------------------
    // Submit
    // ------------------------------------------------------------

    if (submit) {
      report.morning.submittedAt =
        new Date();

      report.status =
        'morning_submitted';
    }

    recomputeSummary(report);

    await report.save();

    // ------------------------------------------------------------
    // Audit + notification
    // ------------------------------------------------------------

    if (submit) {
      await logAction({
        user: req.user,
        action:
          'morning_task_submitted',
        module: 'Task',
        description:
          `${employee.fullName} - ${date}`,
        req,
      });

      const message =
        wasAdvanced
          ? `${employee.fullName} edited and re-submitted their morning update for ${date} (was previously ${previousStatus.replace(
              '_',
              ' '
            )}).`
          : `${employee.fullName} submitted their morning update for ${date}.`;

      await notifyReviewers(
        employee,
        message,
        'morning_submitted',
        report
      );
    } else {
      await logAction({
        user: req.user,
        action:
          'morning_task_saved_draft',
        module: 'Task',
        description:
          `${employee.fullName} - ${date}`,
        req,
      });
    }

    sendSuccess(
      res,
      200,
      submit
        ? 'Morning tasks submitted'
        : 'Morning tasks saved',
      { report }
    );
  }
);


/* ============================================================
   SUBMIT EVENING TASKS
   POST /api/tasks/evening
============================================================ */

const submitEveningTasks = asyncHandler(
  async (req, res) => {
    const {
      date,
      tasks,
      remarks,
      employeeId,
      submit,
    } = req.body;

    if (!date) {
      throw new ApiError(
        400,
        'Date is required.'
      );
    }

    if (
      !Array.isArray(tasks) ||
      tasks.length === 0
    ) {
      throw new ApiError(
        400,
        'At least one evening update is required.'
      );
    }

    const employee =
      await resolveTargetEmployee(
        req.user,
        employeeId
      );

    const taskDate =
      toCalendarDate(date);

    if (!taskDate) {
      throw new ApiError(
        400,
        'Invalid date.'
      );
    }

    const report =
      await DailyTaskReport.findOne({
        employee: employee._id,
        taskDate,
      });

    if (
      !report ||
      !report.morning ||
      !report.morning.tasks ||
      report.morning.tasks.length === 0
    ) {
      throw new ApiError(
        400,
        'No morning tasks found for this date. Submit morning tasks first.'
      );
    }

    const allowedStatuses = [
      'morning_submitted',
      'evening_submitted',
      'needs_correction',
      'approved',
    ];

    if (
      !allowedStatuses.includes(
        report.status
      )
    ) {
      throw new ApiError(
        400,
        `Evening update is not available (status: ${report.status}).`
      );
    }

    const wasApproved =
      report.status === 'approved';

    const validTaskIds =
      new Set(
        report.morning.tasks.map(
          (t) => String(t._id)
        )
      );

    // ------------------------------------------------------------
    // Validate evening tasks
    // ------------------------------------------------------------

    for (const t of tasks) {
      if (
        !t.taskRef ||
        !validTaskIds.has(
          String(t.taskRef)
        )
      ) {
        throw new ApiError(
          400,
          `taskRef ${t.taskRef} does not match any morning task for this date.`
        );
      }

      if (
        ![
          'Completed',
          'Partially Completed',
          'Not Completed',
        ].includes(t.status)
      ) {
        throw new ApiError(
          400,
          'Invalid completion status.'
        );
      }

      const percentage =
        Number(
          t.completionPercentage
        );

      if (
        t.completionPercentage ===
          undefined ||
        Number.isNaN(percentage) ||
        percentage < 0 ||
        percentage > 100
      ) {
        throw new ApiError(
          400,
          'completionPercentage must be between 0 and 100.'
        );
      }

      const actualTime =
        Number(
          t.actualTimeSpentMinutes
        );

      if (
        t.actualTimeSpentMinutes ===
          undefined ||
        Number.isNaN(actualTime) ||
        actualTime < 0
      ) {
        throw new ApiError(
          400,
          'actualTimeSpentMinutes is required and must be >= 0.'
        );
      }
    }

    // ------------------------------------------------------------
    // Save evening tasks
    // ------------------------------------------------------------

    report.evening.tasks =
      tasks.map((t) => ({
        taskRef: t.taskRef,

        status: t.status,

        completionPercentage:
          Number(
            t.completionPercentage
          ),

        actualTimeSpentMinutes:
          Number(
            t.actualTimeSpentMinutes
          ),

        remarks:
          t.remarks || '',
      }));

    report.evening.remarks =
      remarks || '';

    if (submit) {
      report.evening.submittedAt =
        new Date();

      report.status =
        'evening_submitted';
    }

    recomputeSummary(report);

    await report.save();

    // ------------------------------------------------------------
    // Audit + notification
    // ------------------------------------------------------------

    if (submit) {
      await logAction({
        user: req.user,
        action:
          'evening_task_submitted',
        module: 'Task',
        description:
          `${employee.fullName} - ${date}`,
        req,
      });

      const message =
        wasApproved
          ? `${employee.fullName} edited and re-submitted their evening update for ${date} (was already approved).`
          : `${employee.fullName} submitted their evening update for ${date}.`;

      await notifyReviewers(
        employee,
        message,
        'evening_submitted',
        report
      );
    }

    sendSuccess(
      res,
      200,
      submit
        ? 'Evening update submitted'
        : 'Evening update saved',
      { report }
    );
  }
);


/* ============================================================
   GET DAY REPORT
   GET /api/tasks/day?date=&employeeId=
============================================================ */

const getDayReport = asyncHandler(
  async (req, res) => {
    const {
      date,
      employeeId,
    } = req.query;

    if (!date) {
      throw new ApiError(
        400,
        'date query param is required.'
      );
    }

    const employee =
      await resolveTargetEmployee(
        req.user,
        employeeId
      );

    const taskDate =
      toCalendarDate(date);

    if (!taskDate) {
      throw new ApiError(
        400,
        'Invalid date.'
      );
    }

    const report =
      await DailyTaskReport.findOne({
        employee: employee._id,
        taskDate,
      })
        .populate(
          'employee',
          'fullName employeeCode'
        )
        .populate(
          'department',
          'name'
        )
        .populate(
          'teamLead',
          'fullName'
        );

    sendSuccess(
      res,
      200,
      'Day report fetched',
      {
        report: report || null,
      }
    );
  }
);


/* ============================================================
   LIST REPORTS
   GET /api/tasks
============================================================ */

const listReports = asyncHandler(
  async (req, res) => {
    const {
      employeeId,
      department,
      teamLead,
      status,
      from,
      to,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {
      isDeleted: false,
    };

    // ------------------------------------------------------------
    // Employee
    // ------------------------------------------------------------

    if (req.user.role === 'employee') {
      filter.employee =
        req.user._id;
    }

    // ------------------------------------------------------------
    // Team Lead
    // ------------------------------------------------------------

    else if (
      req.user.role === 'team_lead'
    ) {
      if (employeeId) {
        const employee =
          await User.findById(
            employeeId
          ).select(
            'role teamLead'
          );

        if (!employee) {
          throw new ApiError(
            404,
            'Employee not found.'
          );
        }

        // Own reports
        if (
          String(employeeId) ===
          String(req.user._id)
        ) {
          filter.employee =
            req.user._id;
        }

        // Assigned employee
        else if (
          employee.role ===
            'employee' &&
          employee.teamLead &&
          String(
            employee.teamLead
          ) ===
            String(req.user._id)
        ) {
          filter.employee =
            employeeId;
        } else {
          throw new ApiError(
            403,
            'You can only view reports of employees assigned to you.'
          );
        }
      } else {
        filter.$or = [
          {
            teamLead:
              req.user._id,
          },
          {
            employee:
              req.user._id,
          },
        ];
      }
    }

    // ------------------------------------------------------------
    // Admin
    // ------------------------------------------------------------

    else if (
      req.user.role === 'admin'
    ) {
      if (employeeId) {
        filter.employee =
          employeeId;
      }

      if (teamLead) {
        filter.teamLead =
          teamLead;
      }

      if (department) {
        filter.department =
          department;
      }
    }

    else {
      throw new ApiError(
        403,
        'You are not allowed to view task reports.'
      );
    }

    // ------------------------------------------------------------
    // Common filters
    // ------------------------------------------------------------

    if (status) {
      filter.status =
        status;
    }

    if (from || to) {
      filter.taskDate = {};

      if (from) {
        const fromDate =
          toCalendarDate(from);

        if (!fromDate) {
          throw new ApiError(
            400,
            'Invalid from date.'
          );
        }

        filter.taskDate.$gte =
          fromDate;
      }

      if (to) {
        const toDate =
          toCalendarDate(to);

        if (!toDate) {
          throw new ApiError(
            400,
            'Invalid to date.'
          );
        }

        filter.taskDate.$lte =
          toDate;
      }
    }

    const pageNumber =
      Math.max(
        1,
        Number(page) || 1
      );

    const limitNumber =
      Math.min(
        100,
        Math.max(
          1,
          Number(limit) || 20
        )
      );

    const skip =
      (pageNumber - 1) *
      limitNumber;

    const [
      reports,
      total,
    ] = await Promise.all([
      DailyTaskReport.find(filter)
        .populate(
          'employee',
          'fullName employeeCode'
        )
        .populate(
          'department',
          'name'
        )
        .populate(
          'teamLead',
          'fullName'
        )
        .sort({
          taskDate: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      DailyTaskReport.countDocuments(
        filter
      ),
    ]);

    sendSuccess(
      res,
      200,
      'Reports fetched',
      { reports },
      {
        total,
        page: pageNumber,
        limit: limitNumber,
      }
    );
  }
);


/* ============================================================
   GET REPORT BY ID
   GET /api/tasks/:id
============================================================ */

const getReportById = asyncHandler(
  async (req, res) => {
    const report =
      await DailyTaskReport.findById(
        req.params.id
      )
        .populate(
          'employee',
          'fullName employeeCode'
        )
        .populate(
          'department',
          'name'
        )
        .populate(
          'teamLead',
          'fullName'
        )
        .populate(
          'reviewHistory.reviewedBy',
          'fullName role'
        );

    if (!report) {
      throw new ApiError(
        404,
        'Report not found.'
      );
    }

    await assertReportInScope(
      req.user,
      report
    );

    sendSuccess(
      res,
      200,
      'Report fetched',
      { report }
    );
  }
);


/* ============================================================
   REVIEW REPORT
   PATCH /api/tasks/:id/review
============================================================ */

const reviewReport = asyncHandler(
  async (req, res) => {
    const {
      action,
      remark,
    } = req.body;

    if (
      ![
        'approved',
        'needs_correction',
      ].includes(action)
    ) {
      throw new ApiError(
        400,
        "action must be 'approved' or 'needs_correction'."
      );
    }

    if (
      action ===
        'needs_correction' &&
      !remark
    ) {
      throw new ApiError(
        400,
        'A remark is required when returning a task for correction.'
      );
    }

    // Only Admin / Team Lead should review
    if (
      ![
        'admin',
        'team_lead',
      ].includes(req.user.role)
    ) {
      throw new ApiError(
        403,
        'You are not allowed to review reports.'
      );
    }

    const report =
      await DailyTaskReport.findById(
        req.params.id
      );

    if (!report) {
      throw new ApiError(
        404,
        'Report not found.'
      );
    }

    await assertReportInScope(
      req.user,
      report
    );

    // Team Lead cannot review own report
    if (
      String(report.employee) ===
        String(req.user._id) &&
      req.user.role !== 'admin'
    ) {
      throw new ApiError(
        403,
        'Your own submissions are reviewed by an Admin, not by you.'
      );
    }

    if (
      ![
        'morning_submitted',
        'evening_submitted',
      ].includes(report.status)
    ) {
      throw new ApiError(
        400,
        `Report is not awaiting review (status: ${report.status}).`
      );
    }

    const stage =
      report.status ===
      'morning_submitted'
        ? 'morning'
        : 'evening';

    report.reviewHistory.push({
      stage,
      action,
      remark: remark || '',
      reviewedBy:
        req.user._id,
    });

    report.status =
      action === 'approved'
        ? 'approved'
        : 'needs_correction';

    await report.save();

    await logAction({
      user: req.user,
      action:
        action === 'approved'
          ? 'task_approved'
          : 'task_rejected',
      module: 'Task',
      description:
        `Report ${report._id} (${stage})`,
      req,
    });

    await notify({
      recipient: report.employee,
      message:
        action === 'approved'
          ? `Your ${stage} update was approved.`
          : `Your ${stage} update was returned for correction: ${remark}`,
      type:
        action === 'approved'
          ? 'task_approved'
          : 'task_returned',
      relatedRecord:
        report._id,
      relatedModel:
        'DailyTaskReport',
      emailToo: true,
    });

    sendSuccess(
      res,
      200,
      action === 'approved'
        ? 'Report approved'
        : 'Report returned for correction',
      { report }
    );
  }
);


/* ============================================================
   MISSING UPDATES
   GET /api/tasks/missing
============================================================ */

const getMissingUpdates =
  asyncHandler(
    async (req, res) => {
      const {
        date,
        department,
      } = req.query;

      if (!date) {
        throw new ApiError(
          400,
          'date query param is required.'
        );
      }

      const taskDate =
        toCalendarDate(date);

      if (!taskDate) {
        throw new ApiError(
          400,
          'Invalid date.'
        );
      }

      const employeeFilter = {
        role: 'employee',
        status: 'active',
      };

      if (
        req.user.role ===
        'team_lead'
      ) {
        employeeFilter.teamLead =
          req.user._id;
      }

      else if (
        req.user.role ===
          'admin' &&
        department
      ) {
        employeeFilter.department =
          department;
      }

      else if (
        req.user.role ===
        'employee'
      ) {
        throw new ApiError(
          403,
          'Access denied.'
        );
      }

      const employees =
        await User.find(
          employeeFilter
        ).select(
          'fullName employeeCode department teamLead'
        );

      const reports =
        await DailyTaskReport.find({
          employee: {
            $in: employees.map(
              (e) => e._id
            ),
          },
          taskDate,
        }).select(
          'employee morning.submittedAt evening.submittedAt'
        );

      const reportByEmployee =
        new Map(
          reports.map((r) => [
            String(r.employee),
            r,
          ])
        );

      const result =
        employees.map(
          (emp) => {
            const report =
              reportByEmployee.get(
                String(emp._id)
              );

            return {
              employee: {
                _id: emp._id,
                fullName:
                  emp.fullName,
                employeeCode:
                  emp.employeeCode,
              },

              morning:
                report &&
                report.morning &&
                report.morning.submittedAt
                  ? 'Submitted'
                  : 'Missing',

              evening:
                report &&
                report.evening &&
                report.evening.submittedAt
                  ? 'Submitted'
                  : 'Missing',
            };
          }
        );

      sendSuccess(
        res,
        200,
        'Missing update status fetched',
        {
          date,
          results: result,
        }
      );
    }
  );


/* ============================================================
   REASSIGN TASK
   POST /api/tasks/:id/tasks/:taskId/reassign
============================================================ */

const REASSIGNABLE_STATUSES = [
  'draft',
  'needs_correction',
  'morning_submitted',
];

const reassignTask = asyncHandler(
  async (req, res) => {
    const {
      targetEmployeeId,
    } = req.body;

    if (!targetEmployeeId) {
      throw new ApiError(
        400,
        'targetEmployeeId is required.'
      );
    }

    if (
      ![
        'admin',
        'team_lead',
      ].includes(req.user.role)
    ) {
      throw new ApiError(
        403,
        'You are not allowed to reassign tasks.'
      );
    }

    const sourceReport =
      await DailyTaskReport.findById(
        req.params.id
      );

    if (!sourceReport) {
      throw new ApiError(
        404,
        'Report not found.'
      );
    }

    await assertReportInScope(
      req.user,
      sourceReport
    );

    if (
      !REASSIGNABLE_STATUSES.includes(
        sourceReport.status
      )
    ) {
      throw new ApiError(
        400,
        `Tasks can't be reassigned once the day's report is past morning review (status: ${sourceReport.status}).`
      );
    }

    const task =
      sourceReport.morning.tasks.id(
        req.params.taskId
      );

    if (!task) {
      throw new ApiError(
        404,
        'Task not found on this report.'
      );
    }

    if (
      String(targetEmployeeId) ===
      String(sourceReport.employee)
    ) {
      throw new ApiError(
        400,
        'This task is already assigned to that employee.'
      );
    }

    const targetEmployee =
      await User.findById(
        targetEmployeeId
      );

    if (
      !targetEmployee ||
      targetEmployee.role !==
        'employee'
    ) {
      throw new ApiError(
        404,
        'Target employee not found.'
      );
    }

    if (
      targetEmployee.status !==
      'active'
    ) {
      throw new ApiError(
        400,
        'Cannot reassign to an inactive employee.'
      );
    }

    if (!targetEmployee.department) {
      throw new ApiError(
        400,
        'Target employee has no department assigned.'
      );
    }

    // Team Lead can only reassign within own team
    if (
      req.user.role ===
        'team_lead' &&
      String(
        targetEmployee.teamLead
      ) !==
        String(req.user._id)
    ) {
      throw new ApiError(
        403,
        'You can only reassign tasks to employees on your own team.'
      );
    }

    // ------------------------------------------------------------
    // Target report
    // ------------------------------------------------------------

    let targetReport =
      await DailyTaskReport.findOne({
        employee:
          targetEmployee._id,
        taskDate:
          sourceReport.taskDate,
      });

    if (
      targetReport &&
      !REASSIGNABLE_STATUSES.includes(
        targetReport.status
      )
    ) {
      throw new ApiError(
        400,
        `${targetEmployee.fullName}'s report for this date is past morning review and can't accept a reassigned task.`
      );
    }

    if (!targetReport) {
      targetReport =
        new DailyTaskReport({
          employee:
            targetEmployee._id,

          department:
            targetEmployee.department,

          teamLead:
            targetEmployee.teamLead,

          taskDate:
            sourceReport.taskDate,
        });
    }

    // ------------------------------------------------------------
    // Copy task
    // ------------------------------------------------------------

    targetReport.morning.tasks.push({
      _id:
        new mongoose.Types.ObjectId(),

      title:
        task.title,

      description:
        task.description,

      priority:
        task.priority,

      expectedCompletion:
        task.expectedCompletion,

      estimatedTimeMinutes:
        task.estimatedTimeMinutes,

      remarks:
        task.remarks,
    });

    // ------------------------------------------------------------
    // Remove source task
    // ------------------------------------------------------------

    const removedTaskId =
      String(task._id);

    sourceReport.morning.tasks.pull(
      { _id: task._id }
    );

    sourceReport.evening.tasks =
      (
        sourceReport.evening.tasks ||
        []
      ).filter(
        (e) =>
          String(e.taskRef) !==
          removedTaskId
      );

    if (
      sourceReport.morning.tasks
        .length === 0
    ) {
      sourceReport.status =
        'draft';

      sourceReport.morning.submittedAt =
        null;
    }

    // ------------------------------------------------------------
    // Save
    // ------------------------------------------------------------

    recomputeSummary(
      sourceReport
    );

    recomputeSummary(
      targetReport
    );

    await Promise.all([
      sourceReport.save(),
      targetReport.save(),
    ]);

    // ------------------------------------------------------------
    // Audit
    // ------------------------------------------------------------

    const sourceDate =
      sourceReport.taskDate
        .toISOString()
        .slice(0, 10);

    await logAction({
      user: req.user,
      action:
        'task_reassigned',
      module: 'Task',
      description:
        `"${task.title}" moved from report ${sourceReport._id} to ${targetEmployee.fullName} (${sourceDate})`,
      req,
    });

    // ------------------------------------------------------------
    // Notifications
    // ------------------------------------------------------------

    const sourceEmployee =
      await User.findById(
        sourceReport.employee
      ).select('fullName');

    await notify({
      recipient:
        targetEmployee._id,

      message:
        `A task "${task.title}" was reassigned to you for ${sourceReport.taskDate.toDateString()} by ${req.user.fullName}.`,

      type:
        'report_info',

      relatedRecord:
        targetReport._id,

      relatedModel:
        'DailyTaskReport',
    });

    if (sourceEmployee) {
      await notify({
        recipient:
          sourceReport.employee,

        message:
          `Your task "${task.title}" was reassigned to ${targetEmployee.fullName} by ${req.user.fullName}.`,

        type:
          'report_info',

        relatedRecord:
          sourceReport._id,

        relatedModel:
          'DailyTaskReport',
      });
    }

    sendSuccess(
      res,
      200,
      `Task reassigned to ${targetEmployee.fullName}`,
      {
        sourceReport,
        targetReport,
      }
    );
  }
);


/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  submitMorningTasks,
  submitEveningTasks,
  getDayReport,
  listReports,
  getReportById,
  reviewReport,
  getMissingUpdates,
  reassignTask,
  assignTask,
};