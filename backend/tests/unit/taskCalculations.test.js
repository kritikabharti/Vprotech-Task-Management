const { recomputeSummary, toCalendarDate } = require('../../services/taskCalculations');

function buildReport({ morningTasks, eveningEntries }) {
  return {
    morning: { tasks: morningTasks },
    evening: { tasks: eveningEntries },
  };
}

describe('recomputeSummary', () => {
  test('spec example: 100+100+100+100+50 over 5 tasks = 90% average, not a completed-count ratio', () => {
    const morningTasks = Array.from({ length: 5 }, (_, i) => ({ _id: `t${i}`, estimatedTimeMinutes: 60 }));
    const percentages = [100, 100, 100, 100, 50];
    const eveningEntries = morningTasks.map((t, i) => ({
      taskRef: t._id,
      status: percentages[i] === 100 ? 'Completed' : 'Partially Completed',
      completionPercentage: percentages[i],
      actualTimeSpentMinutes: 60,
    }));

    const report = buildReport({ morningTasks, eveningEntries });
    const summary = recomputeSummary(report);

    expect(summary.totalPlanned).toBe(5);
    expect(summary.totalCompleted).toBe(4);
    expect(summary.totalPartial).toBe(1);
    expect(summary.totalNotCompleted).toBe(0);
    expect(summary.completionPercentage).toBe(90);
  });

  test('a morning task with no evening entry counts as Not Completed at 0%, dragging the average down', () => {
    const morningTasks = [
      { _id: 't1', estimatedTimeMinutes: 30 },
      { _id: 't2', estimatedTimeMinutes: 30 },
    ];
    const eveningEntries = [
      { taskRef: 't1', status: 'Completed', completionPercentage: 100, actualTimeSpentMinutes: 30 },
    ];

    const summary = recomputeSummary(buildReport({ morningTasks, eveningEntries }));

    expect(summary.totalPlanned).toBe(2);
    expect(summary.totalCompleted).toBe(1);
    expect(summary.totalNotCompleted).toBe(1);
    expect(summary.completionPercentage).toBe(50);
  });

  test('zero planned tasks yields 0% rather than dividing by zero', () => {
    const summary = recomputeSummary(buildReport({ morningTasks: [], eveningEntries: [] }));
    expect(summary.totalPlanned).toBe(0);
    expect(summary.completionPercentage).toBe(0);
  });

  test('sums estimated vs actual minutes independently of completion status', () => {
    const morningTasks = [
      { _id: 't1', estimatedTimeMinutes: 60 },
      { _id: 't2', estimatedTimeMinutes: 90 },
    ];
    const eveningEntries = [
      { taskRef: 't1', status: 'Completed', completionPercentage: 100, actualTimeSpentMinutes: 45 },
      { taskRef: 't2', status: 'Not Completed', completionPercentage: 0, actualTimeSpentMinutes: 20 },
    ];
    const summary = recomputeSummary(buildReport({ morningTasks, eveningEntries }));
    expect(summary.totalEstimatedMinutes).toBe(150);
    expect(summary.totalActualMinutes).toBe(65);
  });
});

describe('toCalendarDate', () => {
  test('normalizes a date string to UTC midnight', () => {
    const d = toCalendarDate('2026-08-15T18:42:00.000Z');
    expect(d.toISOString()).toBe('2026-08-15T00:00:00.000Z');
  });

  test('normalizes a Date object the same way regardless of its time component', () => {
    const d1 = toCalendarDate(new Date('2026-01-01T23:59:59Z'));
    const d2 = toCalendarDate(new Date('2026-01-01T00:00:01Z'));
    expect(d1.getTime()).toBe(d2.getTime());
  });

  test('returns null for an invalid date input', () => {
    expect(toCalendarDate('not-a-date')).toBeNull();
  });
});
