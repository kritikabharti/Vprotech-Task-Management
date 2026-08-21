// const DailyTaskReport = require('../models/DailyTaskReport');
// const User = require('../models/User');
// const Department = require('../models/Department');
// const asyncHandler = require('../utils/asyncHandler');
// const { sendSuccess } = require('../utils/apiResponse');
// const { toCalendarDate } = require('../services/taskCalculations');
// const { summarizeByEmployee } = require('../services/reportAggregation');

// function rangeForToday() {
//   const today = toCalendarDate(new Date());
//   return { from: today, to: today };
// }
// function rangeForLastNDays(n) {
//   const to = toCalendarDate(new Date());
//   const from = new Date(to);
//   from.setUTCDate(from.getUTCDate() - (n - 1));
//   return { from: toCalendarDate(from), to };
// }

// // GET /api/dashboard/employee - self only
// const employeeDashboard = asyncHandler(async (req, res) => {
//   const employeeId = req.user._id;
//   const { from: todayFrom, to: todayTo } = rangeForToday();
//   const week = rangeForLastNDays(7);
//   const month = rangeForLastNDays(30);

//   const [todayReport, weekReports, monthReports, recent] = await Promise.all([
//     DailyTaskReport.findOne({ employee: employeeId, taskDate: todayFrom }),
//     DailyTaskReport.find({ employee: employeeId, taskDate: { $gte: week.from, $lte: week.to } }),
//     DailyTaskReport.find({ employee: employeeId, taskDate: { $gte: month.from, $lte: month.to } }),
//     DailyTaskReport.find({ employee: employeeId }).sort({ taskDate: -1 }).limit(5),
//   ]);

//   const sum = (arr, field) => arr.reduce((s, r) => s + r.summary[field], 0);

//   sendSuccess(res, 200, 'Employee dashboard', {
//     today: {
//       morningSubmitted: !!todayReport?.morning?.submittedAt,
//       eveningSubmitted: !!todayReport?.evening?.submittedAt,
//       plannedTasks: todayReport?.summary?.totalPlanned || 0,
//       completedTasks: todayReport?.summary?.totalCompleted || 0,
//       pendingTasks: (todayReport?.summary?.totalPlanned || 0) - (todayReport?.summary?.totalCompleted || 0),
//       completionPercentage: todayReport?.summary?.completionPercentage || 0,
//     },
//     weekly: { plannedTasks: sum(weekReports, 'totalPlanned'), completedTasks: sum(weekReports, 'totalCompleted') },
//     monthly: { plannedTasks: sum(monthReports, 'totalPlanned'), completedTasks: sum(monthReports, 'totalCompleted') },
//     recentTasks: recent,
//   });
// });

// // GET /api/dashboard/team-lead - own team, PLUS the team lead's own
// // self-submitted reports (a Team Lead now also plans/reports their own
// // day - see taskController.resolveTargetEmployee).
// const teamLeadDashboard = asyncHandler(async (req, res) => {
//   const teamLeadId = req.user._id;
//   const { from: todayFrom, to: todayTo } = rangeForToday();
//   const ownAndTeamFilter = (dateFilter) => ({
//     $or: [{ teamLead: teamLeadId }, { employee: teamLeadId }],
//     ...dateFilter,
//   });

//   const [totalEmployees, todayReports, weekReports, monthReports, ownToday] = await Promise.all([
//     User.countDocuments({ teamLead: teamLeadId, role: 'employee', status: 'active' }),
//     DailyTaskReport.find(ownAndTeamFilter({ taskDate: { $gte: todayFrom, $lte: todayTo } })),
//     DailyTaskReport.find(ownAndTeamFilter({ taskDate: { $gte: rangeForLastNDays(7).from, $lte: rangeForLastNDays(7).to } }))
//       .populate('employee', 'fullName employeeCode')
//       .populate('department', 'name')
//       .populate('teamLead', 'fullName'),
//     DailyTaskReport.find(ownAndTeamFilter({ taskDate: { $gte: rangeForLastNDays(30).from, $lte: rangeForLastNDays(30).to } }))
//       .populate('employee', 'fullName employeeCode')
//       .populate('department', 'name')
//       .populate('teamLead', 'fullName'),
//     DailyTaskReport.findOne({ employee: teamLeadId, taskDate: todayFrom }),
//   ]);

//   const morningSubmitted = todayReports.filter((r) => r.morning.submittedAt).length;
//   const eveningSubmitted = todayReports.filter((r) => r.evening.submittedAt).length;
//   const completedTasks = todayReports.reduce((s, r) => s + r.summary.totalCompleted, 0);
//   const plannedTasks = todayReports.reduce((s, r) => s + r.summary.totalPlanned, 0);
//   const pctSum = todayReports.reduce((s, r) => s + r.summary.completionPercentage, 0);

//   sendSuccess(res, 200, 'Team lead dashboard', {
//     totalEmployees,
//     todayMorningSubmitted: morningSubmitted,
//     todayMorningPending: totalEmployees - morningSubmitted,
//     todayEveningSubmitted: eveningSubmitted,
//     todayEveningPending: totalEmployees - eveningSubmitted,
//     completedTasks,
//     pendingTasks: plannedTasks - completedTasks,
//     teamCompletionPercentage: todayReports.length ? Math.round((pctSum / todayReports.length) * 100) / 100 : 0,
//     weeklyPerformance: summarizeByEmployee(weekReports),
//     monthlyPerformance: summarizeByEmployee(monthReports),
//     ownToday: {
//       morningSubmitted: !!ownToday?.morning?.submittedAt,
//       eveningSubmitted: !!ownToday?.evening?.submittedAt,
//       plannedTasks: ownToday?.summary?.totalPlanned || 0,
//       completedTasks: ownToday?.summary?.totalCompleted || 0,
//       completionPercentage: ownToday?.summary?.completionPercentage || 0,
//     },
//   });
// });

// // GET /api/dashboard/admin - global
// const adminDashboard = asyncHandler(async (req, res) => {
//   const { from: todayFrom, to: todayTo } = rangeForToday();

//   const [totalEmployees, totalTeamLeads, totalDepartments, todayReports, missingEmployees] = await Promise.all([
//     User.countDocuments({ role: 'employee', status: 'active' }),
//     User.countDocuments({ role: 'team_lead', status: 'active' }),
//     Department.countDocuments({ status: 'active' }),
//     DailyTaskReport.find({ taskDate: { $gte: todayFrom, $lte: todayTo } }),
//     User.countDocuments({ role: 'employee', status: 'active' }),
//   ]);

//   const morningSubmitted = todayReports.filter((r) => r.morning.submittedAt).length;
//   const eveningSubmitted = todayReports.filter((r) => r.evening.submittedAt).length;
//   const completedTasks = todayReports.reduce((s, r) => s + r.summary.totalCompleted, 0);
//   const plannedTasks = todayReports.reduce((s, r) => s + r.summary.totalPlanned, 0);
//   const pctSum = todayReports.reduce((s, r) => s + r.summary.completionPercentage, 0);

//   sendSuccess(res, 200, 'Admin dashboard', {
//     totalEmployees,
//     totalTeamLeads,
//     totalDepartments,
//     todayMorningUpdates: morningSubmitted,
//     todayEveningUpdates: eveningSubmitted,
//     completedTasks,
//     pendingTasks: plannedTasks - completedTasks,
//     overallCompletionPercentage: todayReports.length ? Math.round((pctSum / todayReports.length) * 100) / 100 : 0,
//     employeesMissingMorning: missingEmployees - morningSubmitted,
//     employeesMissingEvening: missingEmployees - eveningSubmitted,
//   });
// });

// module.exports = { employeeDashboard, teamLeadDashboard, adminDashboard };




const DailyTaskReport = require('../models/DailyTaskReport');
const User = require('../models/User');
const Department = require('../models/Department');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { toCalendarDate } = require('../services/taskCalculations');
const { summarizeByEmployee } = require('../services/reportAggregation');

function rangeForToday() {
  const today = toCalendarDate(new Date());
  return { from: today, to: today };
}

function rangeForLastNDays(n) {
  const to = toCalendarDate(new Date());
  const from = new Date(to);

  from.setUTCDate(from.getUTCDate() - (n - 1));

  return {
    from: toCalendarDate(from),
    to,
  };
}

/**
 * GET /api/dashboard/employee
 * Employee's own dashboard
 */
const employeeDashboard = asyncHandler(async (req, res) => {
  const employeeId = req.user._id;

  const { from: todayFrom } = rangeForToday();
  const week = rangeForLastNDays(7);
  const month = rangeForLastNDays(30);

  const [todayReport, weekReports, monthReports, recent] =
    await Promise.all([
      DailyTaskReport.findOne({
        employee: employeeId,
        taskDate: todayFrom,
      }),

      DailyTaskReport.find({
        employee: employeeId,
        taskDate: {
          $gte: week.from,
          $lte: week.to,
        },
      }),

      DailyTaskReport.find({
        employee: employeeId,
        taskDate: {
          $gte: month.from,
          $lte: month.to,
        },
      }),

      DailyTaskReport.find({
        employee: employeeId,
      })
        .sort({ taskDate: -1 })
        .limit(5),
    ]);

  const sum = (arr, field) =>
    arr.reduce(
      (total, report) =>
        total + Number(report.summary?.[field] || 0),
      0
    );

  sendSuccess(res, 200, 'Employee dashboard', {
    today: {
      morningSubmitted: Boolean(todayReport?.morning?.submittedAt),
      eveningSubmitted: Boolean(todayReport?.evening?.submittedAt),

      plannedTasks: Number(
        todayReport?.summary?.totalPlanned || 0
      ),

      completedTasks: Number(
        todayReport?.summary?.totalCompleted || 0
      ),

      pendingTasks: Math.max(
        0,
        Number(todayReport?.summary?.totalPlanned || 0) -
          Number(todayReport?.summary?.totalCompleted || 0)
      ),

      completionPercentage: Number(
        todayReport?.summary?.completionPercentage || 0
      ),
    },

    weekly: {
      plannedTasks: sum(weekReports, 'totalPlanned'),
      completedTasks: sum(weekReports, 'totalCompleted'),
    },

    monthly: {
      plannedTasks: sum(monthReports, 'totalPlanned'),
      completedTasks: sum(monthReports, 'totalCompleted'),
    },

    recentTasks: recent,
  });
});

/**
 * GET /api/dashboard/team-lead
 * Team Lead dashboard
 *
 * Includes:
 * - Employees belonging to this Team Lead
 * - Team Lead's own reports
 */
const teamLeadDashboard = asyncHandler(async (req, res) => {
  const teamLeadId = req.user._id;

  const { from: todayFrom, to: todayTo } = rangeForToday();
  const week = rangeForLastNDays(7);
  const month = rangeForLastNDays(30);

  const teamEmployeeFilter = {
    teamLead: teamLeadId,
    role: 'employee',
  };

  const reportFilter = (dateFilter) => ({
    $or: [
      { teamLead: teamLeadId },
      { employee: teamLeadId },
    ],
    ...dateFilter,
  });

  const [
    totalEmployees,
    todayReports,
    weekReports,
    monthReports,
    ownToday,
  ] = await Promise.all([
    User.countDocuments({
      ...teamEmployeeFilter,
      status: 'active',
    }),

    DailyTaskReport.find(
      reportFilter({
        taskDate: {
          $gte: todayFrom,
          $lte: todayTo,
        },
      })
    ),

    DailyTaskReport.find(
      reportFilter({
        taskDate: {
          $gte: week.from,
          $lte: week.to,
        },
      })
    )
      .populate('employee', 'fullName employeeCode')
      .populate('department', 'name')
      .populate('teamLead', 'fullName'),

    DailyTaskReport.find(
      reportFilter({
        taskDate: {
          $gte: month.from,
          $lte: month.to,
        },
      })
    )
      .populate('employee', 'fullName employeeCode')
      .populate('department', 'name')
      .populate('teamLead', 'fullName'),

    DailyTaskReport.findOne({
      employee: teamLeadId,
      taskDate: todayFrom,
    }),
  ]);

  /**
   * Only employee reports should count toward
   * employee submission statistics.
   */
  const employeeTodayReports = todayReports.filter(
    (report) =>
      String(report.employee) !== String(teamLeadId)
  );

  const morningSubmitted = employeeTodayReports.filter(
    (report) => report.morning?.submittedAt
  ).length;

  const eveningSubmitted = employeeTodayReports.filter(
    (report) => report.evening?.submittedAt
  ).length;

  const completedTasks = employeeTodayReports.reduce(
    (sum, report) =>
      sum + Number(report.summary?.totalCompleted || 0),
    0
  );

  const plannedTasks = employeeTodayReports.reduce(
    (sum, report) =>
      sum + Number(report.summary?.totalPlanned || 0),
    0
  );

  const pctSum = employeeTodayReports.reduce(
    (sum, report) =>
      sum + Number(report.summary?.completionPercentage || 0),
    0
  );

  sendSuccess(res, 200, 'Team lead dashboard', {
    totalEmployees,

    todayMorningSubmitted: morningSubmitted,

    todayMorningPending: Math.max(
      0,
      totalEmployees - morningSubmitted
    ),

    todayEveningSubmitted: eveningSubmitted,

    todayEveningPending: Math.max(
      0,
      totalEmployees - eveningSubmitted
    ),

    completedTasks,

    pendingTasks: Math.max(
      0,
      plannedTasks - completedTasks
    ),

    teamCompletionPercentage:
      employeeTodayReports.length > 0
        ? Math.round(
            (pctSum / employeeTodayReports.length) * 100
          ) / 100
        : 0,

    weeklyPerformance: summarizeByEmployee(weekReports),

    monthlyPerformance: summarizeByEmployee(monthReports),

    ownToday: {
      morningSubmitted: Boolean(
        ownToday?.morning?.submittedAt
      ),

      eveningSubmitted: Boolean(
        ownToday?.evening?.submittedAt
      ),

      plannedTasks: Number(
        ownToday?.summary?.totalPlanned || 0
      ),

      completedTasks: Number(
        ownToday?.summary?.totalCompleted || 0
      ),

      completionPercentage: Number(
        ownToday?.summary?.completionPercentage || 0
      ),
    },
  });
});

/**
 * GET /api/dashboard/admin
 * Global Admin dashboard
 */
const adminDashboard = asyncHandler(async (req, res) => {
  const { from: todayFrom, to: todayTo } = rangeForToday();

  /**
   * IMPORTANT:
   * Admin statistics are based only on ACTIVE EMPLOYEES.
   * Team Leads are not counted as employees here.
   */
  const activeEmployeeFilter = {
    role: 'employee',
    status: 'active',
  };

  const [
    totalEmployees,
    totalTeamLeads,
    totalDepartments,
    todayReports,
  ] = await Promise.all([
    User.countDocuments(activeEmployeeFilter),

    User.countDocuments({
      role: 'team_lead',
      status: 'active',
    }),

    Department.countDocuments({
      status: 'active',
    }),

    DailyTaskReport.find({
      taskDate: {
        $gte: todayFrom,
        $lte: todayTo,
      },
    }),
  ]);

  /**
   * Only reports belonging to employees.
   */
  const employeeIds = await User.find(
    activeEmployeeFilter
  ).select('_id');

  const employeeIdSet = new Set(
    employeeIds.map((user) => String(user._id))
  );

  const employeeTodayReports = todayReports.filter(
    (report) =>
      report.employee &&
      employeeIdSet.has(String(report.employee))
  );

  const morningSubmitted = employeeTodayReports.filter(
    (report) => report.morning?.submittedAt
  ).length;

  const eveningSubmitted = employeeTodayReports.filter(
    (report) => report.evening?.submittedAt
  ).length;

  const completedTasks = employeeTodayReports.reduce(
    (sum, report) =>
      sum + Number(report.summary?.totalCompleted || 0),
    0
  );

  const plannedTasks = employeeTodayReports.reduce(
    (sum, report) =>
      sum + Number(report.summary?.totalPlanned || 0),
    0
  );

  const pctSum = employeeTodayReports.reduce(
    (sum, report) =>
      sum + Number(report.summary?.completionPercentage || 0),
    0
  );

  const overallCompletionPercentage =
    plannedTasks > 0
      ? Math.round(
          (completedTasks / plannedTasks) * 10000
        ) / 100
      : 0;

  sendSuccess(res, 200, 'Admin dashboard', {
    totalEmployees,

    totalTeamLeads,

    totalDepartments,

    todayMorningUpdates: morningSubmitted,

    todayEveningUpdates: eveningSubmitted,

    completedTasks,

    plannedTasks,

    pendingTasks: Math.max(
      0,
      plannedTasks - completedTasks
    ),

    overallCompletionPercentage,

    employeesMissingMorning: Math.max(
      0,
      totalEmployees - morningSubmitted
    ),

    employeesMissingEvening: Math.max(
      0,
      totalEmployees - eveningSubmitted
    ),

    /**
     * Extra values useful for the Admin Dashboard.
     */
    today: {
      date: todayFrom,
      totalEmployees,
      morningSubmitted,
      eveningSubmitted,
      missingMorning: Math.max(
        0,
        totalEmployees - morningSubmitted
      ),
      missingEvening: Math.max(
        0,
        totalEmployees - eveningSubmitted
      ),
      plannedTasks,
      completedTasks,
      pendingTasks: Math.max(
        0,
        plannedTasks - completedTasks
      ),
      completionPercentage: overallCompletionPercentage,
    },
  });
});

module.exports = {
  employeeDashboard,
  teamLeadDashboard,
  adminDashboard,
};