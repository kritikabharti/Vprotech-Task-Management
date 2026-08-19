process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const { connect, closeDatabase, clearDatabase } = require('./setup');
const { createDepartment, createUser, loginAs, request, app } = require('./helpers');

beforeAll(async () => { await connect(); });
afterEach(async () => { await clearDatabase(); });
afterAll(async () => { await closeDatabase(); });

const DATE = '2026-08-17';

async function setupEmployeeWithTeamLead() {
  const dept = await createDepartment();
  const tl = await createUser({ role: 'team_lead', email: 'tl@test.com', department: dept._id });
  const emp = await createUser({ role: 'employee', email: 'emp@test.com', department: dept._id, teamLead: tl._id });
  return { dept, tl, emp };
}

describe('Morning -> Evening task workflow', () => {
  test('evening update is rejected when no morning plan exists for that date', async () => {
    const { emp } = await setupEmployeeWithTeamLead();
    const token = await loginAs('emp@test.com');

    const res = await request(app)
      .post('/api/tasks/evening')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: DATE, tasks: [{ taskRef: '507f1f77bcf86cd799439011', status: 'Completed', completionPercentage: 100, actualTimeSpentMinutes: 30 }] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/morning tasks first/i);
  });

  test('evening entries must reference a real morning taskRef from that day', async () => {
    const { emp } = await setupEmployeeWithTeamLead();
    const token = await loginAs('emp@test.com');

    await request(app)
      .post('/api/tasks/morning')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: DATE, tasks: [{ title: 'Task A', estimatedTimeMinutes: 60 }], submit: true });

    const res = await request(app)
      .post('/api/tasks/evening')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: DATE, tasks: [{ taskRef: '507f1f77bcf86cd799439011', status: 'Completed', completionPercentage: 100, actualTimeSpentMinutes: 60 }] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/does not match/i);
  });

  test('full happy path: morning submit -> evening submit -> summary reflects weighted completion', async () => {
    const { emp } = await setupEmployeeWithTeamLead();
    const token = await loginAs('emp@test.com');

    const morningRes = await request(app)
      .post('/api/tasks/morning')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: DATE,
        tasks: [
          { title: 'Task A', estimatedTimeMinutes: 60 },
          { title: 'Task B', estimatedTimeMinutes: 60 },
        ],
        submit: true,
      });
    expect(morningRes.status).toBe(200);
    expect(morningRes.body.data.report.summary.totalPlanned).toBe(2);

    const [taskA, taskB] = morningRes.body.data.report.morning.tasks;

    const eveningRes = await request(app)
      .post('/api/tasks/evening')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: DATE,
        tasks: [
          { taskRef: taskA._id, status: 'Completed', completionPercentage: 100, actualTimeSpentMinutes: 60 },
          { taskRef: taskB._id, status: 'Partially Completed', completionPercentage: 50, actualTimeSpentMinutes: 40 },
        ],
        submit: true,
      });

    expect(eveningRes.status).toBe(200);
    expect(eveningRes.body.data.report.status).toBe('evening_submitted');
    expect(eveningRes.body.data.report.summary.completionPercentage).toBe(75); // (100+50)/2
  });

  test('morning tasks lock once evening has been submitted', async () => {
    const { emp } = await setupEmployeeWithTeamLead();
    const token = await loginAs('emp@test.com');

    const morningRes = await request(app)
      .post('/api/tasks/morning')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: DATE, tasks: [{ title: 'Task A', estimatedTimeMinutes: 60 }], submit: true });
    const taskId = morningRes.body.data.report.morning.tasks[0]._id;

    await request(app)
      .post('/api/tasks/evening')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: DATE, tasks: [{ taskRef: taskId, status: 'Completed', completionPercentage: 100, actualTimeSpentMinutes: 60 }], submit: true });

    const secondMorningAttempt = await request(app)
      .post('/api/tasks/morning')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: DATE, tasks: [{ title: 'Sneaky edit', estimatedTimeMinutes: 10 }], submit: false });

    expect(secondMorningAttempt.status).toBe(400);
  });
});

describe('Review workflow', () => {
  test('returning a report for correction without a remark is rejected', async () => {
    const { tl, emp } = await setupEmployeeWithTeamLead();
    const empToken = await loginAs('emp@test.com');
    const tlToken = await loginAs('tl@test.com');

    const morningRes = await request(app)
      .post('/api/tasks/morning')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ date: DATE, tasks: [{ title: 'Task A', estimatedTimeMinutes: 60 }], submit: true });

    const reportId = morningRes.body.data.report._id;

    const res = await request(app)
      .patch(`/api/tasks/${reportId}/review`)
      .set('Authorization', `Bearer ${tlToken}`)
      .send({ action: 'needs_correction' }); // no remark

    expect(res.status).toBe(400);
  });

  test('approve requires no remark, moves status to approved, and is recorded in reviewHistory', async () => {
    const { tl, emp } = await setupEmployeeWithTeamLead();
    const empToken = await loginAs('emp@test.com');
    const tlToken = await loginAs('tl@test.com');

    const morningRes = await request(app)
      .post('/api/tasks/morning')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ date: DATE, tasks: [{ title: 'Task A', estimatedTimeMinutes: 60 }], submit: true });

    const reportId = morningRes.body.data.report._id;

    const res = await request(app)
      .patch(`/api/tasks/${reportId}/review`)
      .set('Authorization', `Bearer ${tlToken}`)
      .send({ action: 'approved' });

    expect(res.status).toBe(200);
    expect(res.body.data.report.status).toBe('approved');
    expect(res.body.data.report.reviewHistory).toHaveLength(1);
    expect(res.body.data.report.reviewHistory[0].action).toBe('approved');
  });
});

describe('IDOR protection on task reports', () => {
  test('one employee cannot read another employee\'s report by guessing its id', async () => {
    const dept = await createDepartment();
    const tl = await createUser({ role: 'team_lead', email: 'tl5@test.com', department: dept._id });
    const empA = await createUser({ role: 'employee', email: 'empA@test.com', department: dept._id, teamLead: tl._id });
    const empB = await createUser({ role: 'employee', email: 'empB2@test.com', department: dept._id, teamLead: tl._id });

    const tokenA = await loginAs('empA@test.com');
    const tokenB = await loginAs('empB2@test.com');

    const morningRes = await request(app)
      .post('/api/tasks/morning')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ date: DATE, tasks: [{ title: 'Private task', estimatedTimeMinutes: 30 }], submit: true });

    const reportId = morningRes.body.data.report._id;

    const res = await request(app).get(`/api/tasks/${reportId}`).set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });

  test('an employee cannot submit a morning update on behalf of another employee via employeeId in the body', async () => {
    const dept = await createDepartment();
    const tl = await createUser({ role: 'team_lead', email: 'tl6@test.com', department: dept._id });
    const empA = await createUser({ role: 'employee', email: 'empA2@test.com', department: dept._id, teamLead: tl._id });
    const empB = await createUser({ role: 'employee', email: 'empB3@test.com', department: dept._id, teamLead: tl._id });

    const tokenA = await loginAs('empA2@test.com');

    const res = await request(app)
      .post('/api/tasks/morning')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ date: DATE, employeeId: String(empB._id), tasks: [{ title: 'Spoofed task', estimatedTimeMinutes: 30 }], submit: true });

    expect(res.status).toBe(403);
  });
});
