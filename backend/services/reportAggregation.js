const DailyTaskReport = require('../models/DailyTaskReport');
const User = require('../models/User');
const { toCalendarDate } = require('./taskCalculations');

/**
 * Builds the Mongo filter for a report query, applying role-based scope
 * server-side. The caller-supplied employeeId/department/teamLead are
 * only ever narrowing filters WITHIN that scope - never a way to escape it.
 */
function buildScopedFilter(reqUser, { employeeId, department, teamLead, from, to } = {}) {
  const filter = { isDeleted: false };

  if (reqUser.role === 'employee') {
    filter.employee = reqUser._id;
  } else if (reqUser.role === 'team_lead') {
    if (employeeId) {
      // Narrowed to one specific target: an assigned employee, or the
      // team lead's own self-submitted reports.
      filter.employee = employeeId;
    } else {
      // Unnarrowed: the team's reports PLUS the team lead's own
      // self-submitted reports (teamLead: null on those, since a team
      // lead has no manager of their own).
      filter.$or = [{ teamLead: reqUser._id }, { employee: reqUser._id }];
    }
  } else {
    if (employeeId) filter.employee = employeeId;
    if (department) filter.department = department;
    if (teamLead) filter.teamLead = teamLead;
  }

  if (from || to) {
    filter.taskDate = {};
    if (from) filter.taskDate.$gte = toCalendarDate(from);
    if (to) filter.taskDate.$lte = toCalendarDate(to);
  }

  return filter;
}

async function getReportsForRange(reqUser, params) {
  const filter = buildScopedFilter(reqUser, params);
  return DailyTaskReport.find(filter)
    .populate('employee', 'fullName employeeCode')
    .populate('department', 'name')
    .populate('teamLead', 'fullName')
    .sort({ taskDate: 1 });
}

// Rolls a set of DailyTaskReport docs (already fetched) up into
// per-employee totals - shared by weekly/monthly/custom report builders.
function summarizeByEmployee(reports) {
  const byEmployee = new Map();

  for (const r of reports) {
    const key = String(r.employee._id);
    if (!byEmployee.has(key)) {
      byEmployee.set(key, {
        employee: r.employee,
        department: r.department,
        teamLead: r.teamLead,
        daysWithMorning: 0,
        daysWithEvening: 0,
        totalPlanned: 0,
        totalCompleted: 0,
        totalPartial: 0,
        totalNotCompleted: 0,
        totalEstimatedMinutes: 0,
        totalActualMinutes: 0,
        percentageSum: 0,
        dayCount: 0,
      });
    }
    const agg = byEmployee.get(key);
    if (r.morning.submittedAt) agg.daysWithMorning += 1;
    if (r.evening.submittedAt) agg.daysWithEvening += 1;
    agg.totalPlanned += r.summary.totalPlanned;
    agg.totalCompleted += r.summary.totalCompleted;
    agg.totalPartial += r.summary.totalPartial;
    agg.totalNotCompleted += r.summary.totalNotCompleted;
    agg.totalEstimatedMinutes += r.summary.totalEstimatedMinutes;
    agg.totalActualMinutes += r.summary.totalActualMinutes;
    agg.percentageSum += r.summary.completionPercentage;
    agg.dayCount += 1;
  }

  return Array.from(byEmployee.values()).map((agg) => ({
    employee: agg.employee,
    department: agg.department,
    teamLead: agg.teamLead,
    workingDays: agg.dayCount,
    morningUpdatesSubmitted: agg.daysWithMorning,
    eveningUpdatesSubmitted: agg.daysWithEvening,
    missingMorningUpdates: agg.dayCount - agg.daysWithMorning,
    missingEveningUpdates: agg.dayCount - agg.daysWithEvening,
    totalPlannedTasks: agg.totalPlanned,
    totalCompletedTasks: agg.totalCompleted,
    totalPartialTasks: agg.totalPartial,
    totalNotCompletedTasks: agg.totalNotCompleted,
    overallCompletionPercentage: agg.totalPlanned > 0
      ? Math.round((agg.percentageSum / agg.dayCount) * 100) / 100
      : 0,
    averageDailyCompletion: agg.dayCount > 0 ? Math.round((agg.percentageSum / agg.dayCount) * 100) / 100 : 0,
    totalEstimatedHours: Math.round((agg.totalEstimatedMinutes / 60) * 100) / 100,
    totalActualHours: Math.round((agg.totalActualMinutes / 60) * 100) / 100,
  }));
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

module.exports = { buildScopedFilter, getReportsForRange, summarizeByEmployee, groupBy };
