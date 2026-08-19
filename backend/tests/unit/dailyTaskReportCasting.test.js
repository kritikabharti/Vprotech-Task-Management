const mongoose = require('mongoose');
const DailyTaskReport = require('../../models/DailyTaskReport');

/**
 * Regression test for a real bug found when running the seed script:
 * plain JS objects assigned to `morning.tasks` only get a real `_id`
 * once Mongoose casts them onto the schema path - the *original* array
 * of plain objects never gets one. Any code that builds evening.tasks
 * (or anything else referencing a morning task by id) MUST read _id off
 * the document's cast `report.morning.tasks`, not off the source array
 * it was constructed from. validateSync() exercises this without
 * needing a live database connection.
 */
describe('DailyTaskReport morning/evening task linkage', () => {
  const morningTasksInput = [
    { title: 'Task A', estimatedTimeMinutes: 60 },
    { title: 'Task B', estimatedTimeMinutes: 90 },
  ];

  test('plain input objects never receive an _id (this is the trap)', () => {
    new DailyTaskReport({
      employee: new mongoose.Types.ObjectId(),
      department: new mongoose.Types.ObjectId(),
      taskDate: new Date(),
      morning: { tasks: morningTasksInput },
    });
    expect(morningTasksInput[0]._id).toBeUndefined();
  });

  test('cast subdocuments on report.morning.tasks DO get a real _id, and using those for evening.tasks.taskRef passes validation', () => {
    const report = new DailyTaskReport({
      employee: new mongoose.Types.ObjectId(),
      department: new mongoose.Types.ObjectId(),
      taskDate: new Date(),
      morning: { tasks: morningTasksInput },
    });

    expect(report.morning.tasks[0]._id).toBeDefined();

    report.evening.tasks = report.morning.tasks.map((t) => ({
      taskRef: t._id,
      status: 'Completed',
      completionPercentage: 100,
      actualTimeSpentMinutes: 60,
    }));

    const err = report.validateSync();
    expect(err).toBeUndefined();
    expect(String(report.evening.tasks[0].taskRef)).toBe(String(report.morning.tasks[0]._id));
  });

  test('building evening.tasks from the ORIGINAL plain-object array fails validation (the exact bug this guards against)', () => {
    const report = new DailyTaskReport({
      employee: new mongoose.Types.ObjectId(),
      department: new mongoose.Types.ObjectId(),
      taskDate: new Date(),
      morning: { tasks: morningTasksInput },
    });

    report.evening.tasks = morningTasksInput.map((t) => ({
      taskRef: t._id, // undefined - this is the bug
      status: 'Completed',
      completionPercentage: 100,
      actualTimeSpentMinutes: 60,
    }));

    const err = report.validateSync();
    expect(err).toBeDefined();
    expect(err.errors['evening.tasks.0.taskRef']).toBeDefined();
  });
});
