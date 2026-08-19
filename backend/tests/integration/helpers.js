const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Department = require('../../models/Department');

async function createDepartment(overrides = {}) {
  return Department.create({ name: 'Development', code: 'DEV', ...overrides });
}

async function createUser({ role, department, teamLead, email, password = 'Password@123' }) {
  const user = await User.create({
    employeeCode: `${role.toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    fullName: `Test ${role}`,
    email,
    password,
    role,
    department,
    teamLead,
  });
  return user;
}

async function loginAs(email, password = 'Password@123') {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data.token;
}

module.exports = { createDepartment, createUser, loginAs, request, app };
