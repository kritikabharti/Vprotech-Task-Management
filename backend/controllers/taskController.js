const mongoose = require('mongoose');
const DailyTaskReport = require('../models/DailyTaskReport');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const { recomputeSummary, toCalendarDate } = require('../services/taskCalculations');
const { logAction } = require('../services/auditService');
const { notify, notifyMany } = require('../services/notificationService');

// Resolves which employee's data a request may touch for self-service
// task actions (submit morning/evening, view own day). Employees and
// Team Leads may always act on their OWN tasks - a Team Lead plans and
// reports their own day the same way an Employee does, in addition to
// managing their team (new: Team Lead self-reporting). Admin/Team-Lead
// access to SOMEONE ELSE's tasks (the second branch below) is unchanged:
// still restricted to role==='employee' targets, and a Team Lead is
// still scoped to only their own assigned employees.
async function resolveTargetEmployee(reqUser, requestedEmployeeId) {
  if (reqUser.role === 'employee' || reqUser.role === 'team_lead') {
    if (requestedEmployeeId && String(requestedEmployeeId) !== String(reqUser._id)) {
      throw new ApiError(403, 'You can only manage your own tasks.');
    }
    return reqUser;
  }

  if (!requestedEmployeeId) throw new ApiError(400, 'employeeId is required.');
  const target = await User.findById(requestedEmployeeId);
  if (!target || target.role !== 'employee') throw new ApiError(404, 'Employee not found.');

  if (reqUser.role === 'team_lead' && String(target.teamLead) !== String(reqUser._id)) {
    throw new ApiError(403, 'You do not have access to this employee.');
  }
  return target;
}

async function assertReportInScope(reqUser, report) {
  if (reqUser.role === 'admin') return;
  // Own report (an Employee's, or a Team Lead's own self-submitted one)
  // is always in scope for its owner.
  if (String(report.employee) === String(reqUser._id)) return;
  if (reqUser.role === 'team_lead') {
    if (String(report.teamLead) !== String(reqUser._id)) {
      throw new ApiError(403, 'You do not have access to this report.');
    }
    return;
  }
  if (reqUser.role === 'employee') {
    throw new ApiError(403, 'You can only access your own tasks.');
  }
  throw new ApiError(403, 'Access denied.');
}

// Notifies whoever is responsible for reviewing this submission: the
// employee's team lead, or - when the submitter IS a team lead (self-
// report, no manager above them) - every active Admin instead.
async function notifyReviewers(employee, message, type, report) {
  if (employee.teamLead) {
    await notify({
      recipient: employee.teamLead,
      message,
      type,
      relatedRecord: report._id,
      relatedModel: 'DailyTaskReport',
    });
    return;
  }
  if (employee.role === 'team_lead') {
    const admins = await User.find({ role: 'admin', status: 'active' }).select('_id');
    await notifyMany(admins.map((a) => a._id), {
      message,
      type,
      relatedRecord: report._id,
      relatedModel: 'DailyTaskReport',
    });
  }
}

// POST /api/tasks/morning
// Creates the day's report if absent, or replaces the morning task list
// while status is still draft/needs_correction (i.e. before the employee
// has formally submitted, or after a team lead sent it back).
const submitMorningTasks = asyncHandler(async (req, res) => {
  const { date, tasks, remarks, employeeId, submit } = req.body;
  if (!date) throw new ApiError(400, 'Date is required.');
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new ApiError(400, 'At least one planned task is required.');
  }

  const employee = await resolveTargetEmployee(req.user, employeeId);
  if (!employee.department) throw new ApiError(400, 'Employee has no department assigned; cannot log tasks.');

  const taskDate = toCalendarDate(date);
  if (!taskDate) throw new ApiError(400, 'Invalid date.');

  for (const t of tasks) {
    if (!t.title || t.estimatedTimeMinutes === undefined) {
      throw new ApiError(400, 'Each task requires a title and estimatedTimeMinutes.');
    }
  }

  let report = await DailyTaskReport.findOne({ employee: employee._id, taskDate });

  if (report && !['draft', 'needs_correction', 'morning_submitted'].includes(report.status)) {
    throw new ApiError(400, `Morning tasks can no longer be edited (status: ${report.status}).`);
  }

  if (!report) {
    report = new DailyTaskReport({
      employee: employee._id,
      department: employee.department,
      teamLead: employee.teamLead,
      taskDate,
    });
  }

  report.morning.tasks = tasks.map((t) => ({
    title: t.title,
    description: t.description || '',
    priority: t.priority || 'Medium',
    expectedCompletion: t.expectedCompletion || '',
    estimatedTimeMinutes: t.estimatedTimeMinutes,
    remarks: t.remarks || '',
  }));
  report.morning.remarks = remarks || '';

  if (submit) {
    report.morning.submittedAt = new Date();
    report.status = 'morning_submitted';
  }

  recomputeSummary(report);
  await report.save();

  if (submit) {
    await logAction({ user: req.user, action: 'morning_task_submitted', module: 'Task', description: `${employee.fullName} - ${date}`, req });
    await notifyReviewers(employee, `${employee.fullName} submitted their morning update for ${date}.`, 'morning_submitted', report);
  } else {
    await logAction({ user: req.user, action: 'morning_task_saved_draft', module: 'Task', description: `${employee.fullName} - ${date}`, req });
  }

  sendSuccess(res, 200, submit ? 'Morning tasks submitted' : 'Morning tasks saved', { report });
});

// POST /api/tasks/evening
// Loads the same day's report (must already have morning tasks) and
// records completion info for each morning task, keyed by taskRef so
// the link between plan and outcome is explicit, not re-typed.
const submitEveningTasks = asyncHandler(async (req, res) => {
  const { date, tasks, remarks, employeeId, submit } = req.body;
  if (!date) throw new ApiError(400, 'Date is required.');
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new ApiError(400, 'At least one evening update is required.');
  }

  const employee = await resolveTargetEmployee(req.user, employeeId);
  const taskDate = toCalendarDate(date);
  if (!taskDate) throw new ApiError(400, 'Invalid date.');

  const report = await DailyTaskReport.findOne({ employee: employee._id, taskDate });
  if (!report || report.morning.tasks.length === 0) {
    throw new ApiError(400, 'No morning tasks found for this date. Submit morning tasks first.');
  }
  if (!['morning_submitted', 'evening_submitted', 'needs_correction'].includes(report.status)) {
    throw new ApiError(400, `Evening update is not available (status: ${report.status}).`);
  }

  const validTaskIds = new Set(report.morning.tasks.map((t) => String(t._id)));

  for (const t of tasks) {
    if (!t.taskRef || !validTaskIds.has(String(t.taskRef))) {
      throw new ApiError(400, `taskRef ${t.taskRef} does not match any morning task for this date.`);
    }
    if (!['Completed', 'Partially Completed', 'Not Completed'].includes(t.status)) {
      throw new ApiError(400, 'Invalid completion status.');
    }
    if (t.completionPercentage === undefined || t.completionPercentage < 0 || t.completionPercentage > 100) {
      throw new ApiError(400, 'completionPercentage must be between 0 and 100.');
    }
    if (t.actualTimeSpentMinutes === undefined || t.actualTimeSpentMinutes < 0) {
      throw new ApiError(400, 'actualTimeSpentMinutes is required and must be >= 0.');
    }
  }

  report.evening.tasks = tasks.map((t) => ({
    taskRef: t.taskRef,
    status: t.status,
    completionPercentage: t.completionPercentage,
    actualTimeSpentMinutes: t.actualTimeSpentMinutes,
    remarks: t.remarks || '',
  }));
  report.evening.remarks = remarks || '';

  if (submit) {
    report.evening.submittedAt = new Date();
    report.status = 'evening_submitted';
  }

  recomputeSummary(report);
  await report.save();

  if (submit) {
    await logAction({ user: req.user, action: 'evening_task_submitted', module: 'Task', description: `${employee.fullName} - ${date}`, req });
    await notifyReviewers(employee, `${employee.fullName} submitted their evening update for ${date}.`, 'evening_submitted', report);
  }

  sendSuccess(res, 200, submit ? 'Evening update submitted' : 'Evening update saved', { report });
});

// GET /api/tasks/day?date=&employeeId=
// Returns the single day's report - used by the Evening page to preload
// that day's morning tasks, and by dashboards for "today".
const getDayReport = asyncHandler(async (req, res) => {
  const { date, employeeId } = req.query;
  if (!date) throw new ApiError(400, 'date query param is required.');

  const employee = await resolveTargetEmployee(req.user, employeeId);
  const taskDate = toCalendarDate(date);

  const report = await DailyTaskReport.findOne({ employee: employee._id, taskDate })
    .populate('employee', 'fullName employeeCode')
    .populate('department', 'name')
    .populate('teamLead', 'fullName');

  sendSuccess(res, 200, 'Day report fetched', { report: report || null });
});

// GET /api/tasks?employeeId=&department=&teamLead=&status=&priority=&from=&to=&page=&limit=
const listReports = asyncHandler(async (req, res) => {
  const { employeeId, department, teamLead, status, from, to, page = 1, limit = 20 } = req.query;
  const filter = { isDeleted: false };

  if (req.user.role === 'employee') {
    filter.employee = req.user._id;
  } else if (req.user.role === 'team_lead') {
    if (employeeId) {
      // Narrowed to one specific target: either a specific assigned
      // employee, or the team lead's own self-submitted reports.
      filter.employee = employeeId;
    } else {
      // Unnarrowed: everything in scope - the team's reports (teamLead
      // field) PLUS the team lead's own self-submitted reports (which
      // have teamLead: null, since a team lead has no manager of their
      // own, so they'd never match a teamLead filter alone).
      filter.$or = [{ teamLead: req.user._id }, { employee: req.user._id }];
    }
  } else {
    if (employeeId) filter.employee = employeeId;
    if (teamLead) filter.teamLead = teamLead;
    if (department) filter.department = department;
  }

  if (status) filter.status = status;
  if (from || to) {
    filter.taskDate = {};
    if (from) filter.taskDate.$gte = toCalendarDate(from);
    if (to) filter.taskDate.$lte = toCalendarDate(to);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [reports, total] = await Promise.all([
    DailyTaskReport.find(filter)
      .populate('employee', 'fullName employeeCode')
      .populate('department', 'name')
      .sort({ taskDate: -1 })
      .skip(skip)
      .limit(Number(limit)),
    DailyTaskReport.countDocuments(filter),
  ]);

  sendSuccess(res, 200, 'Reports fetched', { reports }, { total, page: Number(page), limit: Number(limit) });
});

// GET /api/tasks/:id
const getReportById = asyncHandler(async (req, res) => {
  const report = await DailyTaskReport.findById(req.params.id)
    .populate('employee', 'fullName employeeCode')
    .populate('department', 'name')
    .populate('teamLead', 'fullName')
    .populate('reviewHistory.reviewedBy', 'fullName role');
  if (!report) throw new ApiError(404, 'Report not found.');
  await assertReportInScope(req.user, report);
  sendSuccess(res, 200, 'Report fetched', { report });
});

// PATCH /api/tasks/:id/review  { action: 'approved' | 'needs_correction', remark }
// Team lead / admin review step (section 13).
const reviewReport = asyncHandler(async (req, res) => {
  const { action, remark } = req.body;
  if (!['approved', 'needs_correction'].includes(action)) {
    throw new ApiError(400, "action must be 'approved' or 'needs_correction'.");
  }
  if (action === 'needs_correction' && !remark) {
    throw new ApiError(400, 'A remark is required when returning a task for correction.');
  }

  const report = await DailyTaskReport.findById(req.params.id);
  if (!report) throw new ApiError(404, 'Report not found.');
  await assertReportInScope(req.user, report);

  // A Team Lead's own self-submitted report can only be reviewed by
  // Admin - a Team Lead approving/rejecting their own submission would
  // defeat the point of review. (Employees were never in scope to
  // review anything, so this only ever applies to a team_lead reviewer.)
  if (String(report.employee) === String(req.user._id) && req.user.role !== 'admin') {
    throw new ApiError(403, 'Your own submissions are reviewed by an Admin, not by you.');
  }

  if (!['morning_submitted', 'evening_submitted'].includes(report.status)) {
    throw new ApiError(400, `Report is not awaiting review (status: ${report.status}).`);
  }

  const stage = report.status === 'morning_submitted' ? 'morning' : 'evening';
  report.reviewHistory.push({ stage, action, remark: remark || '', reviewedBy: req.user._id });
  report.status = action === 'approved' ? 'approved' : 'needs_correction';
  await report.save();

  await logAction({
    user: req.user,
    action: action === 'approved' ? 'task_approved' : 'task_rejected',
    module: 'Task',
    description: `Report ${report._id} (${stage})`,
    req,
  });

  await notify({
    recipient: report.employee,
    message:
      action === 'approved'
        ? `Your ${stage} update was approved.`
        : `Your ${stage} update was returned for correction: ${remark}`,
    type: action === 'approved' ? 'task_approved' : 'task_returned',
    relatedRecord: report._id,
    relatedModel: 'DailyTaskReport',
    emailToo: true,
  });

  sendSuccess(res, 200, `Report ${action === 'approved' ? 'approved' : 'returned for correction'}`, { report });
});

// GET /api/tasks/missing?date=&department=&teamLead=
// Identifies employees with no (or incomplete) morning/evening
// submission for the given date, scoped to the caller's role.
const getMissingUpdates = asyncHandler(async (req, res) => {
  const { date, department } = req.query;
  if (!date) throw new ApiError(400, 'date query param is required.');
  const taskDate = toCalendarDate(date);

  const employeeFilter = { role: 'employee', status: 'active' };
  if (req.user.role === 'team_lead') employeeFilter.teamLead = req.user._id;
  else if (req.user.role === 'admin' && department) employeeFilter.department = department;
  else if (req.user.role === 'employee') throw new ApiError(403, 'Access denied.');

  const employees = await User.find(employeeFilter).select('fullName employeeCode department teamLead');
  const reports = await DailyTaskReport.find({
    employee: { $in: employees.map((e) => e._id) },
    taskDate,
  }).select('employee morning.submittedAt evening.submittedAt');

  const reportByEmployee = new Map(reports.map((r) => [String(r.employee), r]));

  const result = employees.map((emp) => {
    const r = reportByEmployee.get(String(emp._id));
    return {
      employee: { _id: emp._id, fullName: emp.fullName, employeeCode: emp.employeeCode },
      morning: r && r.morning.submittedAt ? 'Submitted' : 'Missing',
      evening: r && r.evening.submittedAt ? 'Submitted' : 'Missing',
    };
  });

  sendSuccess(res, 200, 'Missing update status fetched', { date, results: result });
});

module.exports = {
  submitMorningTasks,
  submitEveningTasks,
  getDayReport,
  listReports,
  getReportById,
  reviewReport,
  getMissingUpdates,
};
