const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const { getReportsForRange, summarizeByEmployee } = require('../services/reportAggregation');
const { buildEmployeeSummaryWorkbook } = require('../reports/excelGenerator');
const { buildEmployeeSummaryPdf } = require('../reports/pdfGenerator');
const { toCalendarDate } = require('../services/taskCalculations');
const { logAction } = require('../services/auditService');

function fmt(d) {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // ISO week starts Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return toCalendarDate(d);
}

function startOfMonth(date) {
  const d = new Date(date);
  return toCalendarDate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
}

function endOfMonth(date) {
  const d = new Date(date);
  return toCalendarDate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}

// GET /api/reports/daily?date=&employeeId=&department=&teamLead=
const dailyReport = asyncHandler(async (req, res) => {
  const { date, employeeId, department, teamLead } = req.query;
  if (!date) throw new ApiError(400, 'date is required.');

  const reports = await getReportsForRange(req.user, { employeeId, department, teamLead, from: date, to: date });

  const details = reports.map((r) => ({
    employee: r.employee,
    employeeCode: r.employee?.employeeCode,
    department: r.department,
    teamLead: r.teamLead,
    date: fmt(r.taskDate),
    morningTaskCount: r.summary.totalPlanned,
    morningTasks: r.morning.tasks,
    eveningStatus: r.evening.submittedAt ? 'Submitted' : 'Missing',
    completedCount: r.summary.totalCompleted,
    partialCount: r.summary.totalPartial,
    notCompletedCount: r.summary.totalNotCompleted,
    completionPercentage: r.summary.completionPercentage,
    estimatedMinutes: r.summary.totalEstimatedMinutes,
    actualMinutes: r.summary.totalActualMinutes,
    teamLeadRemarks: r.reviewHistory.filter((h) => h.remark).map((h) => h.remark),
  }));

  sendSuccess(res, 200, 'Daily report fetched', { date, details });
});

// GET /api/reports/weekly?weekStart=&employeeId=&department=&teamLead=
const weeklyReport = asyncHandler(async (req, res) => {
  const { weekStart, employeeId, department, teamLead } = req.query;
  if (!weekStart) throw new ApiError(400, 'weekStart is required.');

  const from = startOfWeek(weekStart);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 6);

  const reports = await getReportsForRange(req.user, { employeeId, department, teamLead, from, to });
  const summary = summarizeByEmployee(reports);

  // Per-employee day-by-day breakdown (Mon-Sun) for the requested week.
  const byEmployee = new Map();
  reports.forEach((r) => {
    const key = String(r.employee._id);
    if (!byEmployee.has(key)) byEmployee.set(key, { employee: r.employee, days: {} });
    byEmployee.get(key).days[fmt(r.taskDate)] = {
      morningSubmitted: !!r.morning.submittedAt,
      eveningSubmitted: !!r.evening.submittedAt,
      planned: r.summary.totalPlanned,
      completed: r.summary.totalCompleted,
      partial: r.summary.totalPartial,
      notCompleted: r.summary.totalNotCompleted,
      completionPercentage: r.summary.completionPercentage,
    };
  });

  sendSuccess(res, 200, 'Weekly report fetched', {
    weekStart: fmt(from),
    weekEnd: fmt(to),
    summary,
    dayByDay: Array.from(byEmployee.values()),
  });
});

// GET /api/reports/monthly?month=YYYY-MM&employeeId=&department=&teamLead=
const monthlyReport = asyncHandler(async (req, res) => {
  const { month, employeeId, department, teamLead } = req.query;
  if (!month) throw new ApiError(400, 'month (YYYY-MM) is required.');

  const [y, m] = month.split('-').map(Number);
  const refDate = new Date(Date.UTC(y, m - 1, 1));
  const from = startOfMonth(refDate);
  const to = endOfMonth(refDate);

  const reports = await getReportsForRange(req.user, { employeeId, department, teamLead, from, to });
  const summary = summarizeByEmployee(reports);

  const byDepartment = {};
  const byTeamLead = {};
  summary.forEach((s) => {
    const dKey = s.department?.name || 'Unassigned';
    const tKey = s.teamLead?.fullName || 'Unassigned';
    if (!byDepartment[dKey]) byDepartment[dKey] = { planned: 0, completed: 0, employees: 0 };
    byDepartment[dKey].planned += s.totalPlannedTasks;
    byDepartment[dKey].completed += s.totalCompletedTasks;
    byDepartment[dKey].employees += 1;

    if (!byTeamLead[tKey]) byTeamLead[tKey] = { planned: 0, completed: 0, employees: 0 };
    byTeamLead[tKey].planned += s.totalPlannedTasks;
    byTeamLead[tKey].completed += s.totalCompletedTasks;
    byTeamLead[tKey].employees += 1;
  });

  sendSuccess(res, 200, 'Monthly report fetched', {
    month,
    from: fmt(from),
    to: fmt(to),
    summary,
    departmentSummary: byDepartment,
    teamLeadSummary: byTeamLead,
  });
});

// GET /api/reports/custom?from=&to=&employeeId=&department=&teamLead=
const customReport = asyncHandler(async (req, res) => {
  const { from, to, employeeId, department, teamLead } = req.query;
  if (!from || !to) throw new ApiError(400, 'from and to are required.');

  const reports = await getReportsForRange(req.user, { employeeId, department, teamLead, from, to });
  const summary = summarizeByEmployee(reports);

  sendSuccess(res, 200, 'Custom report fetched', { from, to, summary });
});

// GET /api/reports/export?type=daily|weekly|monthly|custom&format=excel|pdf&...same params
const exportReport = asyncHandler(async (req, res) => {
  const { type, format } = req.query;
  if (!['daily', 'weekly', 'monthly', 'custom'].includes(type)) throw new ApiError(400, 'Invalid report type.');
  if (!['excel', 'pdf'].includes(format)) throw new ApiError(400, 'format must be excel or pdf.');

  let from;
  let to;
  let title;

  if (type === 'daily') {
    if (!req.query.date) throw new ApiError(400, 'date is required.');
    from = req.query.date;
    to = req.query.date;
    title = `Daily Report - ${req.query.date}`;
  } else if (type === 'weekly') {
    if (!req.query.weekStart) throw new ApiError(400, 'weekStart is required.');
    from = startOfWeek(req.query.weekStart);
    to = new Date(from);
    to.setUTCDate(to.getUTCDate() + 6);
    title = `Weekly Report - ${fmt(from)} to ${fmt(to)}`;
  } else if (type === 'monthly') {
    if (!req.query.month) throw new ApiError(400, 'month is required.');
    const [y, m] = req.query.month.split('-').map(Number);
    from = startOfMonth(new Date(Date.UTC(y, m - 1, 1)));
    to = endOfMonth(new Date(Date.UTC(y, m - 1, 1)));
    title = `Monthly Report - ${req.query.month}`;
  } else {
    if (!req.query.from || !req.query.to) throw new ApiError(400, 'from and to are required.');
    from = req.query.from;
    to = req.query.to;
    title = `Custom Report - ${fmt(toCalendarDate(from))} to ${fmt(toCalendarDate(to))}`;
  }

  const reports = await getReportsForRange(req.user, {
    employeeId: req.query.employeeId,
    department: req.query.department,
    teamLead: req.query.teamLead,
    from,
    to,
  });
  const summary = summarizeByEmployee(reports);
  const dateRangeLabel = `${fmt(toCalendarDate(from))} to ${fmt(toCalendarDate(to))}`;

  await logAction({ user: req.user, action: 'report_generated', module: 'Report', description: `${title} (${format})`, req });

  if (format === 'excel') {
    const workbook = await buildEmployeeSummaryWorkbook({ title, dateRangeLabel, rows: summary });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report.xlsx"`);
    await workbook.xlsx.write(res);
    return res.end();
  }

  const pdfBuffer = await buildEmployeeSummaryPdf({ title, dateRangeLabel, rows: summary });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${type}-report.pdf"`);
  res.send(pdfBuffer);
});

module.exports = { dailyReport, weeklyReport, monthlyReport, customReport, exportReport };
