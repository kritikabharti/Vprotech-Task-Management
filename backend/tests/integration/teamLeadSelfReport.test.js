process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const { connect, closeDatabase, clearDatabase } = require('./setup');
const { createDepartment, createUser, loginAs, request, app } = require('./helpers');

beforeAll(async () => { await connect(); });
afterEach(async () => { await clearDatabase(); });
afterAll(async () => { await closeDatabase(); });

const DATE = '2026-08-19';

describe('Team Lead self-reporting', () => {
  test('a team lead can submit their own morning plan, same as an employee', async () => {
    const dept = await createDepartment();
    await createUser({ role: 'team_lead', email: 'tl@test.com', department: dept._id });
    const token = await loginAs('tl@test.com');

    const res = await request(app)
      .post('/api/tasks/morning')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: DATE, tasks: [{ title: 'Review team plan', estimatedTimeMinutes: 45 }], submit: true });

    expect(res.status).toBe(200);
    expect(res.body.data.report.summary.totalPlanned).toBe(1);
  });

  test('a team lead cannot submit a morning plan on behalf of one of their employees', async () => {
    const dept = await createDepartment();
    const tl = await createUser({ role: 'team_lead', email: 'tl2@test.com', department: dept._id });
    const emp = await createUser({ role: 'employee', email: 'emp@test.com', department: dept._id, teamLead: tl._id });
    const tlToken = await loginAs('tl2@test.com');

    const res = await request(app)
      .post('/api/tasks/morning')
      .set('Authorization', `Bearer ${tlToken}`)
      .send({ date: DATE, employeeId: String(emp._id), tasks: [{ title: 'Spoofed', estimatedTimeMinutes: 30 }], submit: true });

    expect(res.status).toBe(403);
  });

  test("a team lead's own self-submitted report shows up in their own /tasks listing (no employeeId filter)", async () => {
    const dept = await createDepartment();
    await createUser({ role: 'team_lead', email: 'tl3@test.com', department: dept._id });
    const token = await loginAs('tl3@test.com');

    await request(app)
      .post('/api/tasks/morning')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: DATE, tasks: [{ title: 'Plan the sprint', estimatedTimeMinutes: 30 }], submit: true });

    const res = await request(app).get('/api/tasks').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.reports.length).toBe(1);
    expect(res.body.data.reports[0].morning.tasks[0].title).toBe('Plan the sprint');
  });

  test('a team lead cannot approve their own self-submitted report - only Admin can', async () => {
    const dept = await createDepartment();
    await createUser({ role: 'team_lead', email: 'tl4@test.com', department: dept._id });
    const tlToken = await loginAs('tl4@test.com');

    const morningRes = await request(app)
      .post('/api/tasks/morning')
      .set('Authorization', `Bearer ${tlToken}`)
      .send({ date: DATE, tasks: [{ title: 'Self task', estimatedTimeMinutes: 30 }], submit: true });
    const reportId = morningRes.body.data.report._id;

    const selfApprove = await request(app)
      .patch(`/api/tasks/${reportId}/review`)
      .set('Authorization', `Bearer ${tlToken}`)
      .send({ action: 'approved' });
    expect(selfApprove.status).toBe(403);

    const admin = await createUser({ role: 'admin', email: 'admin@test.com' });
    const adminToken = await loginAs('admin@test.com');
    const adminApprove = await request(app)
      .patch(`/api/tasks/${reportId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approved' });
    expect(adminApprove.status).toBe(200);
    expect(adminApprove.body.data.report.status).toBe('approved');
  });

  test("admin's global report list includes a team lead's self-submitted report without any filter", async () => {
    const dept = await createDepartment();
    await createUser({ role: 'team_lead', email: 'tl5@test.com', department: dept._id });
    const tlToken = await loginAs('tl5@test.com');
    await request(app)
      .post('/api/tasks/morning')
      .set('Authorization', `Bearer ${tlToken}`)
      .send({ date: DATE, tasks: [{ title: 'Visible to admin', estimatedTimeMinutes: 30 }], submit: true });

    const admin = await createUser({ role: 'admin', email: 'admin2@test.com' });
    const adminToken = await loginAs('admin2@test.com');
    const res = await request(app).get('/api/tasks').set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.reports.some((r) => r.morning.tasks[0]?.title === 'Visible to admin')).toBe(true);
  });
});
