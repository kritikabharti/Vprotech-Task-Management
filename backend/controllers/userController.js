const User = require('../models/User');
const Department = require('../models/Department');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const { logAction } = require('../services/auditService');

/**
 * Shared controller for both "Employee Management" (section 15/9) and
 * "Team Lead Management" (section 16), since both operate on the same
 * User model. Scoping rules enforced here, server-side, regardless of
 * what the request body claims:
 *
 *  - admin        -> full access to all users
 *  - team_lead     -> may only create/view/update users where
 *                      teamLead === req.user._id AND role === 'employee'
 *  - employee      -> no access to this controller at all (blocked by route middleware)
 */

function buildScopeFilter(reqUser, extra = {}) {
  const filter = { ...extra };
  if (reqUser.role === 'team_lead') {
    filter.teamLead = reqUser._id;
    filter.role = 'employee';
  }
  return filter;
}

async function assertInScope(reqUser, targetUser) {
  // Anyone may always view/edit their own record (profile self-service).
  if (String(reqUser._id) === String(targetUser._id)) return;
  if (reqUser.role === 'admin') return;
  if (reqUser.role === 'team_lead') {
    const belongs = targetUser.role === 'employee' && String(targetUser.teamLead) === String(reqUser._id);
    if (!belongs) throw new ApiError(403, 'You do not have access to this employee.');
    return;
  }
  throw new ApiError(403, 'Access denied.');
}

// POST /api/users (admin: any role; team_lead: employees only, auto-assigned to self)
const createUser = asyncHandler(async (req, res) => {
  const { employeeCode, fullName, email, phone, password, role, designation, department, teamLead, joiningDate } = req.body;

  let finalRole = role;
  let finalTeamLead = teamLead || null;
  let finalDepartment = department || null;

  if (req.user.role === 'team_lead') {
    // A team lead can only create employees under themselves, regardless
    // of what role/teamLead/department the request body claims.
    finalRole = 'employee';
    finalTeamLead = req.user._id;
    finalDepartment = req.user.department;
  } else {
    // Admin path: validate referenced department/team lead exist and are active.
    if (finalDepartment) {
      const dept = await Department.findById(finalDepartment);
      if (!dept) throw new ApiError(400, 'Department not found.');
      if (dept.status !== 'active') throw new ApiError(400, 'Cannot assign an inactive department.');
    }
    if (finalTeamLead) {
      const tl = await User.findById(finalTeamLead);
      if (!tl || tl.role !== 'team_lead') throw new ApiError(400, 'Invalid team lead.');
      if (tl.status !== 'active') throw new ApiError(400, 'Cannot assign an inactive team lead.');
    }
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
    teamLead: finalRole === 'employee' ? finalTeamLead : null,
    joiningDate,
  });

  await logAction({
    user: req.user,
    action: finalRole === 'team_lead' ? 'team_lead_created' : 'employee_created',
    module: 'User',
    description: `${user.fullName} (${user.employeeCode})`,
    req,
  });

  sendSuccess(res, 201, 'User created', { user: user.toJSON() });
});

// GET /api/users?role=&department=&teamLead=&status=&search=&page=&limit=
const listUsers = asyncHandler(async (req, res) => {
  const { role, department, teamLead, status, search, page = 1, limit = 20 } = req.query;

  const filter = buildScopeFilter(req.user);
  if (role && req.user.role === 'admin') filter.role = role;
  if (department) filter.department = department;
  if (teamLead && req.user.role === 'admin') filter.teamLead = teamLead;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { fullName: new RegExp(search, 'i') },
      { employeeCode: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter)
      .populate('department', 'name code')
      .populate('teamLead', 'fullName employeeCode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  sendSuccess(res, 200, 'Users fetched', { users }, { total, page: Number(page), limit: Number(limit) });
});

// GET /api/users/:id
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .populate('department', 'name code')
    .populate('teamLead', 'fullName employeeCode');
  if (!user) throw new ApiError(404, 'User not found.');
  await assertInScope(req.user, user);
  sendSuccess(res, 200, 'User fetched', { user });
});

// PATCH /api/users/:id
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  await assertInScope(req.user, user);

  const editable = ['fullName', 'phone', 'designation', 'profileImage'];
  const adminOnlyEditable = ['email', 'employeeCode', 'joiningDate'];

  editable.forEach((field) => {
    if (req.body[field] !== undefined) user[field] = req.body[field];
  });

  if (req.user.role === 'admin') {
    adminOnlyEditable.forEach((field) => {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    });
  }

  await user.save();
  await logAction({ user: req.user, action: 'employee_updated', module: 'User', description: `${user.fullName}`, req });
  sendSuccess(res, 200, 'User updated', { user: user.toJSON() });
});

// PATCH /api/users/:id/deactivate
const deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  await assertInScope(req.user, user);

  user.status = 'inactive';
  await user.save();
  await logAction({ user: req.user, action: 'employee_deactivated', module: 'User', description: user.fullName, req });
  sendSuccess(res, 200, 'User deactivated', { user: user.toJSON() });
});

// PATCH /api/users/:id/reactivate (admin only, enforced by route)
const reactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');

  if (user.department) {
    const dept = await Department.findById(user.department);
    if (dept && dept.status !== 'active') {
      throw new ApiError(400, 'Cannot reactivate a user in an inactive department. Reassign department first.');
    }
  }

  user.status = 'active';
  await user.save();
  await logAction({ user: req.user, action: 'employee_reactivated', module: 'User', description: user.fullName, req });
  sendSuccess(res, 200, 'User reactivated', { user: user.toJSON() });
});

// PATCH /api/users/:id/assign (admin only) - change department and/or team lead
const assignUser = asyncHandler(async (req, res) => {
  const { department, teamLead } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');

  if (department !== undefined) {
    if (department) {
      const dept = await Department.findById(department);
      if (!dept || dept.status !== 'active') throw new ApiError(400, 'Invalid or inactive department.');
    }
    user.department = department || null;
  }

  if (teamLead !== undefined) {
    if (user.role !== 'employee') throw new ApiError(400, 'Only employees can be assigned to a team lead.');
    if (teamLead) {
      const tl = await User.findById(teamLead);
      if (!tl || tl.role !== 'team_lead' || tl.status !== 'active') {
        throw new ApiError(400, 'Invalid or inactive team lead.');
      }
    }
    user.teamLead = teamLead || null;
  }

  await user.save();
  await logAction({
    user: req.user,
    action: 'employee_reassigned',
    module: 'User',
    description: `${user.fullName} -> dept:${user.department} teamLead:${user.teamLead}`,
    req,
  });
  sendSuccess(res, 200, 'Assignment updated', { user: user.toJSON() });
});

// GET /api/users/team-leads (admin) - list for dropdowns
const listTeamLeads = asyncHandler(async (req, res) => {
  const filter = { role: 'team_lead' };
  if (req.query.department) filter.department = req.query.department;
  if (req.query.status) filter.status = req.query.status;
  const teamLeads = await User.find(filter).populate('department', 'name code').sort({ fullName: 1 });
  sendSuccess(res, 200, 'Team leads fetched', { teamLeads });
});

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
