/**
 * Completion percentage calculation
 * -----------------------------------
 * The overall completion percentage for a day is the AVERAGE of each
 * individual task's completionPercentage - not a count of "how many
 * tasks reached 100%". This is intentional per spec section 7:
 *
 *   5 tasks: 100 + 100 + 100 + 100 + 50  ->  (100+100+100+100+50)/5 = 90%
 *
 * A task with no evening entry yet counts as 0% (not completed / not
 * yet reported), so completion percentage only reaches 100% once every
 * planned task has an evening update at 100%.
 */
function recomputeSummary(report) {
  const morningTasks = report.morning?.tasks || [];
  const eveningTasks = report.evening?.tasks || [];

  const eveningByTaskRef = new Map(eveningTasks.map((t) => [String(t.taskRef), t]));

  let totalCompleted = 0;
  let totalPartial = 0;
  let totalNotCompleted = 0;
  let totalEstimatedMinutes = 0;
  let totalActualMinutes = 0;
  let percentageSum = 0;

  for (const task of morningTasks) {
    totalEstimatedMinutes += task.estimatedTimeMinutes || 0;
    const evening = eveningByTaskRef.get(String(task._id));

    if (!evening) {
      totalNotCompleted += 1;
      continue;
    }

    totalActualMinutes += evening.actualTimeSpentMinutes || 0;
    percentageSum += evening.completionPercentage || 0;

    if (evening.status === 'Completed') totalCompleted += 1;
    else if (evening.status === 'Partially Completed') totalPartial += 1;
    else totalNotCompleted += 1;
  }

  const totalPlanned = morningTasks.length;
  const completionPercentage = totalPlanned > 0 ? Math.round((percentageSum / totalPlanned) * 100) / 100 : 0;

  report.summary = {
    totalPlanned,
    totalCompleted,
    totalPartial,
    totalNotCompleted,
    totalEstimatedMinutes,
    totalActualMinutes,
    completionPercentage,
  };

  return report.summary;
}

// Normalizes any Date/date-string to UTC midnight so "one report per
// employee per day" (the unique index) works regardless of the time
// portion the client sends.
function toCalendarDate(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

module.exports = { recomputeSummary, toCalendarDate };
