process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const { connect, closeDatabase, clearDatabase } = require('./setup');
const { createDepartment, createUser, loginAs, request, app } = require('./helpers');

beforeAll(async () => { await connect(); });
afterEach(async () => { await clearDatabase(); });
afterAll(async () => { await closeDatabase(); });

describe('Auth', () => {
  test('rejects login with wrong password', async () => {
    await createUser({ role: 'employee', email: 'e1@test.com' });
    const res = await request(app).post('/api/auth/login').send({ email: 'e1@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('logs in and returns a token + user without the password hash', async () => {
    await createUser({ role: 'employee', email: 'e2@test.com' });
    const res = await request(app).post('/api/auth/login').send({ email: 'e2@test.com', password: 'Password@123' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.password).toBeUndefined();
  });

  test('rejects a deactivated user even with the correct password', async () => {
    const dept = await createDepartment();
    const user = await createUser({ role: 'employee', email: 'e3@test.com', department: dept._id });
    user.status = 'inactive';
    await user.save();

    const res = await request(app).post('/api/auth/login').send({ email: 'e3@test.com', password: 'Password@123' });
    expect(res.status).toBe(403);
  });

  test('rejects protected routes with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('rejects protected routes with a garbage token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});
