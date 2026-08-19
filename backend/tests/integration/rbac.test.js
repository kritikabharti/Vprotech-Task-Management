process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const { connect, closeDatabase, clearDatabase } = require('./setup');
const { createDepartment, createUser, loginAs, request, app } = require('./helpers');

beforeAll(async () => { await connect(); });
afterEach(async () => { await clearDatabase(); });
afterAll(async () => { await closeDatabase(); });

describe('Role-based access control', () => {
  test('an employee cannot list users (admin/team_lead only route)', async () => {
    await createUser({ role: 'employee', email: 'emp@test.com' });
    const token = await loginAs('emp@test.com');

    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('an employee cannot access the admin-only dashboard', async () => {
    await createUser({ role: 'employee', email: 'emp2@test.com' });
    const token = await loginAs('emp2@test.com');

    const res = await request(app).get('/api/dashboard/admin').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('a team lead cannot access another team lead\'s employee record', async () => {
    const dept = await createDepartment();
    const tlA = await createUser({ role: 'team_lead', email: 'tlA@test.com', department: dept._id });
    const tlB = await createUser({ role: 'team_lead', email: 'tlB@test.com', department: dept._id });
    const empUnderB = await createUser({ role: 'employee', email: 'empB@test.com', department: dept._id, teamLead: tlB._id });

    const tokenA = await loginAs('tlA@test.com');
    const res = await request(app).get(`/api/users/${empUnderB._id}`).set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(403);
  });

  test('a team lead CAN access their own employee\'s record', async () => {
    const dept = await createDepartment();
    const tl = await createUser({ role: 'team_lead', email: 'tl2@test.com', department: dept._id });
    const emp = await createUser({ role: 'employee', email: 'emp3@test.com', department: dept._id, teamLead: tl._id });

    const token = await loginAs('tl2@test.com');
    const res = await request(app).get(`/api/users/${emp._id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('any authenticated user can view/edit their OWN profile via /users/:id (self-service fix)', async () => {
    const tl = await createUser({ role: 'team_lead', email: 'tl3@test.com' });
    const token = await loginAs('tl3@test.com');

    const getRes = await request(app).get(`/api/users/${tl._id}`).set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);

    const patchRes = await request(app)
      .patch(`/api/users/${tl._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '9998887777' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.user.phone).toBe('9998887777');
  });

  test('only admin can reactivate a deactivated user', async () => {
    const dept = await createDepartment();
    const tl = await createUser({ role: 'team_lead', email: 'tl4@test.com', department: dept._id });
    const emp = await createUser({ role: 'employee', email: 'emp4@test.com', department: dept._id, teamLead: tl._id });
    emp.status = 'inactive';
    await emp.save();

    const tlToken = await loginAs('tl4@test.com');
    const forbidden = await request(app).patch(`/api/users/${emp._id}/reactivate`).set('Authorization', `Bearer ${tlToken}`);
    expect(forbidden.status).toBe(403);

    const admin = await createUser({ role: 'admin', email: 'admin1@test.com' });
    const adminToken = await loginAs('admin1@test.com');
    const allowed = await request(app).patch(`/api/users/${emp._id}/reactivate`).set('Authorization', `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);
  });
});
