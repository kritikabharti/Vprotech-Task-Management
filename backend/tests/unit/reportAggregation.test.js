const { summarizeByEmployee } = require('../../services/reportAggregation');

function fakeReport(overrides) {
  return {
    employee: { _id: 'emp1', fullName: 'Test Employee' },
    department: { _id: 'dep1', name: 'Development' },
    teamLead: { _id: 'tl1', fullName: 'Test Lead' },
    morning: { submittedAt: new Date() },
    evening: { submittedAt: new Date() },
    summary: {
      totalPlanned: 5,
      totalCompleted: 4,
      totalPartial: 1,
      totalNotCompleted: 0,
      totalEstimatedMinutes: 300,
      totalActualMinutes: 280,
      completionPercentage: 90,
    },
    ...overrides,
  };
}

describe('summarizeByEmployee', () => {
  test('rolls up multiple days for the same employee into one summary row', () => {
    const reports = [fakeReport({}), fakeReport({})];
    const result = summarizeByEmployee(reports);

    expect(result).toHaveLength(1);
    expect(result[0].workingDays).toBe(2);
    expect(result[0].totalPlannedTasks).toBe(10);
    expect(result[0].totalCompletedTasks).toBe(8);
    expect(result[0].morningUpdatesSubmitted).toBe(2);
    expect(result[0].eveningUpdatesSubmitted).toBe(2);
    expect(result[0].averageDailyCompletion).toBe(90);
  });

  test('counts a day with no evening submission toward missingEveningUpdates', () => {
    const reports = [fakeReport({ evening: { submittedAt: null } })];
    const result = summarizeByEmployee(reports);
    expect(result[0].eveningUpdatesSubmitted).toBe(0);
    expect(result[0].missingEveningUpdates).toBe(1);
  });

  test('keeps separate employees in separate rows', () => {
    const reports = [
      fakeReport({}),
      fakeReport({ employee: { _id: 'emp2', fullName: 'Second Employee' } }),
    ];
    const result = summarizeByEmployee(reports);
    expect(result).toHaveLength(2);
  });

  test('converts estimated/actual minutes to hours, rounded to 2 decimals', () => {
    const reports = [fakeReport({ summary: { ...fakeReport({}).summary, totalEstimatedMinutes: 100, totalActualMinutes: 50 } })];
    const result = summarizeByEmployee(reports);
    expect(result[0].totalEstimatedHours).toBeCloseTo(1.67, 2);
    expect(result[0].totalActualHours).toBeCloseTo(0.83, 2);
  });
});
