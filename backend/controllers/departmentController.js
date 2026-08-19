const Department = require('../models/Department');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const { logAction } = require('../services/auditService');

// POST /api/departments (admin)
const createDepartment = asyncHandler(async (req, res) => {
  const { name, code, description } = req.body;
  const dept = await Department.create({ name, code, description });
  await logAction({ user: req.user, action: 'department_created', module: 'Department', description: dept.name, req });
  sendSuccess(res, 201, 'Department created', { department: dept });
});

// GET /api/departments?search=&status=&page=&limit=
const listDepartments = asyncHandler(async (req, res) => {
  const { search, status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { code: new RegExp(search, 'i') }];

  const skip = (Number(page) - 1) * Number(limit);
  const [departments, total] = await Promise.all([
    Department.find(filter).sort({ name: 1 }).skip(skip).limit(Number(limit)),
    Department.countDocuments(filter),
  ]);

  sendSuccess(res, 200, 'Departments fetched', { departments }, { total, page: Number(page), limit: Number(limit) });
});

// GET /api/departments/:id
const getDepartment = asyncHandler(async (req, res) => {
  const dept = await Department.findById(req.params.id);
  if (!dept) throw new ApiError(404, 'Department not found.');

  const [employeeCount, teamLeadCount] = await Promise.all([
    User.countDocuments({ department: dept._id, role: 'employee' }),
    User.countDocuments({ department: dept._id, role: 'team_lead' }),
  ]);

  sendSuccess(res, 200, 'Department fetched', { department: dept, employeeCount, teamLeadCount });
});

// PATCH /api/departments/:id
const updateDepartment = asyncHandler(async (req, res) => {
  const { name, code, description, status } = req.body;
  const dept = await Department.findById(req.params.id);
  if (!dept) throw new ApiError(404, 'Department not found.');

  if (name !== undefined) dept.name = name;
  if (code !== undefined) dept.code = code;
  if (description !== undefined) dept.description = description;
  if (status !== undefined) dept.status = status;
  await dept.save();

  await logAction({ user: req.user, action: 'department_updated', module: 'Department', description: dept.name, req });
  sendSuccess(res, 200, 'Department updated', { department: dept });
});

// DELETE /api/departments/:id (soft deactivate)
const deactivateDepartment = asyncHandler(async (req, res) => {
  const dept = await Department.findById(req.params.id);
  if (!dept) throw new ApiError(404, 'Department not found.');
  dept.status = 'inactive';
  await dept.save();

  await logAction({ user: req.user, action: 'department_deactivated', module: 'Department', description: dept.name, req });
  sendSuccess(res, 200, 'Department deactivated', { department: dept });
});

module.exports = { createDepartment, listDepartments, getDepartment, updateDepartment, deactivateDepartment };
