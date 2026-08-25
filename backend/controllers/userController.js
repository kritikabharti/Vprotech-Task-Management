const User = require('../models/User');
const Department = require('../models/Department');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const { logAction } = require('../services/auditService');

/**
 * User Controller
 *
 * AUTHORITY RULES
 *
 * ADMIN
 * - Can view all users
 * - Can create users
 * - Can update users
 * - Can deactivate/reactivate users
 * - Can assign department/team lead
 *
 * TEAM LEAD
 * - Can view ONLY employees assigned to themselves
 * - Can create employees under themselves
 * - Can update their employees
 * - Can deactivate their employees
 * - Cannot access another Team Lead's employees
 * - Cannot access other Team Leads
 * - Cannot change department/team lead assignment
 *
 * EMPLOYEE
 * - Cannot access employee management APIs
 */


/* =========================================================
   HELPER FUNCTIONS
========================================================= */

/**
 * Safely get an ObjectId from:
 *
 * ObjectId
 * populated object
 * document
 */
function getId(value) {
  if (!value) return null;

  if (value._id) {
    return value._id;
  }

  return value;
}


/**
 * Build server-side scope.
 *
 * IMPORTANT:
 * Team Lead filtering is ALWAYS applied on the backend.
 * A Team Lead cannot bypass this by sending:
 *
 * ?teamLead=anotherTeamLead
 */
function buildScopeFilter(reqUser, extra = {}) {
  const filter = {
    ...extra,
  };

  if (reqUser.role === 'team_lead') {
    filter.teamLead = reqUser._id;
    filter.role = 'employee';
  }

  return filter;
}


/**
 * Verify whether the logged-in user can access targetUser.
 *
 * ADMIN
 * -> everything
 *
 * TEAM LEAD
 * -> only employees assigned to that Team Lead
 *
 * EMPLOYEE
 * -> denied
 */
async function assertInScope(reqUser, targetUser) {
  const requesterId = getId(reqUser._id);
  const targetId = getId(targetUser._id);

  if (!requesterId || !targetId) {
    throw new ApiError(
      403,
      'Unable to verify user authority.'
    );
  }

  /*
   * ADMIN HAS FULL ACCESS
   */
  if (reqUser.role === 'admin') {
    return;
  }

  /*
   * TEAM LEAD
   *
   * Only employees assigned to this Team Lead.
   */
  if (reqUser.role === 'team_lead') {
    const employeeTeamLeadId = getId(
      targetUser.teamLead
    );

    const isEmployee =
      targetUser.role === 'employee';

    const belongsToThisTeamLead =
      employeeTeamLeadId &&
      String(employeeTeamLeadId) ===
        String(requesterId);

    if (!isEmployee || !belongsToThisTeamLead) {
      throw new ApiError(
        403,
        'You do not have access to this employee.'
      );
    }

    return;
  }

  /*
   * EMPLOYEE / UNKNOWN ROLE
   */
  throw new ApiError(
    403,
    'Access denied.'
  );
}


/* =========================================================
   CREATE USER
   POST /api/users
========================================================= */

const createUser = asyncHandler(async (req, res) => {
  const {
    employeeCode,
    fullName,
    email,
    phone,
    password,
    role,
    designation,
    department,
    teamLead,
    joiningDate,
  } = req.body;

  let finalRole = role;
  let finalTeamLead = teamLead || null;
  let finalDepartment = department || null;

  /*
   * TEAM LEAD
   *
   * Team Lead cannot decide:
   * - role
   * - team lead
   * - department
   *
   * Everything is automatically controlled by backend.
   */
  if (req.user.role === 'team_lead') {
    finalRole = 'employee';
    finalTeamLead = req.user._id;
    finalDepartment = req.user.department || null;
  }

  /*
   * ADMIN
   */
  else if (req.user.role === 'admin') {
    /*
     * Validate department
     */
    if (finalDepartment) {
      const dept = await Department.findById(
        finalDepartment
      );

      if (!dept) {
        throw new ApiError(
          400,
          'Department not found.'
        );
      }

      if (dept.status !== 'active') {
        throw new ApiError(
          400,
          'Cannot assign an inactive department.'
        );
      }
    }

    /*
     * Validate Team Lead
     */
    if (finalTeamLead) {
      const tl = await User.findById(
        finalTeamLead
      );

      if (!tl || tl.role !== 'team_lead') {
        throw new ApiError(
          400,
          'Invalid team lead.'
        );
      }

      if (tl.status !== 'active') {
        throw new ApiError(
          400,
          'Cannot assign an inactive team lead.'
        );
      }
    }
  }

  /*
   * Any unknown role is denied.
   */
  else {
    throw new ApiError(
      403,
      'You are not authorized to create users.'
    );
  }

  /*
   * Team Lead must always create employee.
   */
  if (
    req.user.role === 'team_lead' &&
    finalRole !== 'employee'
  ) {
    throw new ApiError(
      403,
      'Team Lead can only create employees.'
    );
  }

  const user = await User.create({
    employeeCode,
    fullName,
    email,
    phone,
    password,
    role: finalRole,
    designation,
    department: finalDepartment,

    /*
     * Only employees can have a Team Lead.
     */
    teamLead:
      finalRole === 'employee'
        ? finalTeamLead
        : null,

    joiningDate,
  });

  await logAction({
    user: req.user,
    action:
      finalRole === 'team_lead'
        ? 'team_lead_created'
        : 'employee_created',
    module: 'User',
    description:
      `${user.fullName} (${user.employeeCode})`,
    req,
  });

  sendSuccess(
    res,
    201,
    'User created',
    {
      user: user.toJSON(),
    }
  );
});


/* =========================================================
   LIST USERS
   GET /api/users
========================================================= */

const listUsers = asyncHandler(async (req, res) => {
  const {
    role,
    department,
    teamLead,
    status,
    search,
    page = 1,
    limit = 20,
  } = req.query;

  /*
   * IMPORTANT:
   *
   * This is the main Team Lead authority check.
   *
   * For Team Lead:
   *
   * {
   *   teamLead: loggedInTeamLeadId,
   *   role: 'employee'
   * }
   */
  const filter = buildScopeFilter(req.user);

  /*
   * ADMIN FILTERS
   */
  if (
    role &&
    req.user.role === 'admin'
  ) {
    filter.role = role;
  }

  if (department) {
    filter.department = department;
  }

  /*
   * Only ADMIN can select arbitrary Team Lead.
   */
  if (
    teamLead &&
    req.user.role === 'admin'
  ) {
    filter.teamLead = teamLead;
  }

  if (status) {
    filter.status = status;
  }

  /*
   * Search
   */
  if (search) {
    const safeSearch = String(search)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    filter.$or = [
      {
        fullName: new RegExp(
          safeSearch,
          'i'
        ),
      },
      {
        employeeCode: new RegExp(
          safeSearch,
          'i'
        ),
      },
      {
        email: new RegExp(
          safeSearch,
          'i'
        ),
      },
    ];
  }

  const pageNumber =
    Math.max(Number(page) || 1, 1);

  const limitNumber =
    Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

  const skip =
    (pageNumber - 1) *
    limitNumber;

  const [
    users,
    total,
  ] = await Promise.all([
    User.find(filter)
      .select(
        '-password ' +
        '-resetPasswordToken ' +
        '-resetPasswordExpires'
      )
      .populate(
        'department',
        'name code'
      )
      .populate(
        'teamLead',
        'fullName employeeCode'
      )
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limitNumber),

    User.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    200,
    'Users fetched',
    {
      users,
    },
    {
      total,
      page: pageNumber,
      limit: limitNumber,
    }
  );
});


/* =========================================================
   GET SINGLE USER
   GET /api/users/:id
========================================================= */

const getUser = asyncHandler(async (req, res) => {
  /*
   * IMPORTANT:
   *
   * Do NOT populate before checking authority.
   *
   * First retrieve raw MongoDB document so
   * teamLead is the actual ObjectId.
   */
  const user = await User.findById(
    req.params.id
  );

  if (!user) {
    throw new ApiError(
      404,
      'User not found.'
    );
  }

  /*
   * CHECK AUTHORITY BEFORE POPULATE
   */
  await assertInScope(
    req.user,
    user
  );

  /*
   * Now populate employee information.
   */
  const populatedUser =
    await User.findById(
      req.params.id
    )
      .select(
        '-password ' +
        '-resetPasswordToken ' +
        '-resetPasswordExpires'
      )
      .populate(
        'department',
        'name code'
      )
      .populate(
        'teamLead',
        'fullName employeeCode email'
      );

  sendSuccess(
    res,
    200,
    'User fetched',
    {
      user: populatedUser,
    }
  );
});


/* =========================================================
   UPDATE USER
   PATCH /api/users/:id
========================================================= */

const updateUser = asyncHandler(async (req, res) => {
  /*
   * Get raw user first.
   */
  const user = await User.findById(
    req.params.id
  );

  if (!user) {
    throw new ApiError(
      404,
      'User not found.'
    );
  }

  /*
   * Check authority.
   */
  await assertInScope(
    req.user,
    user
  );

  /*
   * Fields that Team Lead can edit.
   */
  const editable = [
    'fullName',
    'phone',
    'designation',
    'profileImage',
  ];

  editable.forEach((field) => {
    if (
      req.body[field] !== undefined
    ) {
      user[field] =
        req.body[field];
    }
  });

  /*
   * Only ADMIN can change these.
   */
  if (req.user.role === 'admin') {
    const adminOnlyEditable = [
      'email',
      'employeeCode',
      'joiningDate',
    ];

    adminOnlyEditable.forEach(
      (field) => {
        if (
          req.body[field] !== undefined
        ) {
          user[field] =
            req.body[field];
        }
      }
    );
  }

  await user.save();

  await logAction({
    user: req.user,
    action: 'employee_updated',
    module: 'User',
    description:
      `${user.fullName}`,
    req,
  });

  sendSuccess(
    res,
    200,
    'User updated',
    {
      user: user.toJSON(),
    }
  );
});


/* =========================================================
   DEACTIVATE USER
   PATCH /api/users/:id/deactivate
========================================================= */

const deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(
    req.params.id
  );

  if (!user) {
    throw new ApiError(
      404,
      'User not found.'
    );
  }

  /*
   * Team Lead can deactivate only
   * their own employees.
   */
  await assertInScope(
    req.user,
    user
  );

  /*
   * Prevent unnecessary update.
   */
  if (user.status === 'inactive') {
    sendSuccess(
      res,
      200,
      'User is already inactive',
      {
        user: user.toJSON(),
      }
    );

    return;
  }

  user.status = 'inactive';

  await user.save();

  await logAction({
    user: req.user,
    action: 'employee_deactivated',
    module: 'User',
    description:
      user.fullName,
    req,
  });

  sendSuccess(
    res,
    200,
    'User deactivated',
    {
      user: user.toJSON(),
    }
  );
});


/* =========================================================
   REACTIVATE USER
   PATCH /api/users/:id/reactivate
========================================================= */

const reactivateUser = asyncHandler(async (req, res) => {
  /*
   * This endpoint should be ADMIN ONLY
   * through route middleware.
   */
  if (req.user.role !== 'admin') {
    throw new ApiError(
      403,
      'Only admin can reactivate users.'
    );
  }

  const user = await User.findById(
    req.params.id
  );

  if (!user) {
    throw new ApiError(
      404,
      'User not found.'
    );
  }

  /*
   * Department must be active.
   */
  if (user.department) {
    const dept =
      await Department.findById(
        user.department
      );

    if (
      dept &&
      dept.status !== 'active'
    ) {
      throw new ApiError(
        400,
        'Cannot reactivate a user in an inactive department. Reassign department first.'
      );
    }
  }

  user.status = 'active';

  await user.save();

  await logAction({
    user: req.user,
    action: 'employee_reactivated',
    module: 'User',
    description:
      user.fullName,
    req,
  });

  sendSuccess(
    res,
    200,
    'User reactivated',
    {
      user: user.toJSON(),
    }
  );
});


/* =========================================================
   ASSIGN USER
   PATCH /api/users/:id/assign
========================================================= */

const assignUser = asyncHandler(async (req, res) => {
  /*
   * ADMIN ONLY
   */
  if (req.user.role !== 'admin') {
    throw new ApiError(
      403,
      'Only admin can change department or team lead assignment.'
    );
  }

  const {
    department,
    teamLead,
  } = req.body;

  const user = await User.findById(
    req.params.id
  );

  if (!user) {
    throw new ApiError(
      404,
      'User not found.'
    );
  }

  /*
   * Department assignment
   */
  if (department !== undefined) {
    if (department) {
      const dept =
        await Department.findById(
          department
        );

      if (
        !dept ||
        dept.status !== 'active'
      ) {
        throw new ApiError(
          400,
          'Invalid or inactive department.'
        );
      }
    }

    user.department =
      department || null;
  }

  /*
   * Team Lead assignment
   */
  if (teamLead !== undefined) {
    if (user.role !== 'employee') {
      throw new ApiError(
        400,
        'Only employees can be assigned to a team lead.'
      );
    }

    if (teamLead) {
      const tl =
        await User.findById(
          teamLead
        );

      if (
        !tl ||
        tl.role !== 'team_lead' ||
        tl.status !== 'active'
      ) {
        throw new ApiError(
          400,
          'Invalid or inactive team lead.'
        );
      }

      /*
       * Optional consistency check:
       * Team Lead and employee should belong
       * to the same department.
       */
      if (
        user.department &&
        tl.department &&
        String(user.department) !==
          String(tl.department)
      ) {
        throw new ApiError(
          400,
          'Employee and Team Lead must belong to the same department.'
        );
      }
    }

    user.teamLead =
      teamLead || null;
  }

  await user.save();

  await logAction({
    user: req.user,
    action: 'employee_reassigned',
    module: 'User',
    description:
      `${user.fullName} -> dept:${user.department} teamLead:${user.teamLead}`,
    req,
  });

  sendSuccess(
    res,
    200,
    'Assignment updated',
    {
      user: user.toJSON(),
    }
  );
});


/* =========================================================
   LIST TEAM LEADS
   GET /api/users/team-leads
========================================================= */

const listTeamLeads = asyncHandler(async (req, res) => {
  /*
   * ADMIN ONLY
   */
  if (req.user.role !== 'admin') {
    throw new ApiError(
      403,
      'Only admin can view the team lead list.'
    );
  }

  const filter = {
    role: 'team_lead',
  };

  if (req.query.department) {
    filter.department =
      req.query.department;
  }

  if (req.query.status) {
    filter.status =
      req.query.status;
  }

  const teamLeads =
    await User.find(filter)
      .select(
        '-password ' +
        '-resetPasswordToken ' +
        '-resetPasswordExpires'
      )
      .populate(
        'department',
        'name code'
      )
      .sort({
        fullName: 1,
      });

  sendSuccess(
    res,
    200,
    'Team leads fetched',
    {
      teamLeads,
    }
  );
});


/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createUser,
  listUsers,
  getUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  assignUser,
  listTeamLeads,
};