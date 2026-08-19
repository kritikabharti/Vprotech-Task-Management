const ExcelJS = require('exceljs');

const COMPANY_NAME = process.env.COMPANY_NAME || 'VproTech Digital';

// Builds a professional daily/weekly/monthly/custom report workbook.
// `rows` is the per-employee summary array from reportAggregation.summarizeByEmployee.
async function buildEmployeeSummaryWorkbook({ title, dateRangeLabel, rows }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = COMPANY_NAME;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Report', { views: [{ state: 'frozen', ySplit: 4 }] });

  sheet.mergeCells('A1:M1');
  sheet.getCell('A1').value = COMPANY_NAME;
  sheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF1E3A5F' } };

  sheet.mergeCells('A2:M2');
  sheet.getCell('A2').value = title;
  sheet.getCell('A2').font = { size: 13, bold: true };

  sheet.mergeCells('A3:M3');
  sheet.getCell('A3').value = `Date range: ${dateRangeLabel}  |  Generated: ${new Date().toLocaleString()}`;
  sheet.getCell('A3').font = { italic: true, size: 10, color: { argb: 'FF666666' } };

  const headers = [
    'Employee', 'Employee Code', 'Department', 'Team Lead', 'Working Days',
    'Morning Submitted', 'Evening Submitted', 'Missing Morning', 'Missing Evening',
    'Planned Tasks', 'Completed', 'Partial', 'Not Completed',
    'Completion %', 'Avg Daily %', 'Est. Hours', 'Actual Hours',
  ];

  const headerRow = sheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  let totals = {
    workingDays: 0, morningSubmitted: 0, eveningSubmitted: 0, missingMorning: 0, missingEvening: 0,
    planned: 0, completed: 0, partial: 0, notCompleted: 0, estHours: 0, actualHours: 0, pctSum: 0,
  };

  rows.forEach((r) => {
    const row = sheet.addRow([
      r.employee?.fullName || '-',
      r.employee?.employeeCode || '-',
      r.department?.name || '-',
      r.teamLead?.fullName || '-',
      r.workingDays,
      r.morningUpdatesSubmitted,
      r.eveningUpdatesSubmitted,
      r.missingMorningUpdates,
      r.missingEveningUpdates,
      r.totalPlannedTasks,
      r.totalCompletedTasks,
      r.totalPartialTasks,
      r.totalNotCompletedTasks,
      `${r.overallCompletionPercentage}%`,
      `${r.averageDailyCompletion}%`,
      r.totalEstimatedHours,
      r.totalActualHours,
    ]);
    row.eachCell((cell) => {
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });

    totals.workingDays += r.workingDays;
    totals.morningSubmitted += r.morningUpdatesSubmitted;
    totals.eveningSubmitted += r.eveningUpdatesSubmitted;
    totals.missingMorning += r.missingMorningUpdates;
    totals.missingEvening += r.missingEveningUpdates;
    totals.planned += r.totalPlannedTasks;
    totals.completed += r.totalCompletedTasks;
    totals.partial += r.totalPartialTasks;
    totals.notCompleted += r.totalNotCompletedTasks;
    totals.estHours += r.totalEstimatedHours;
    totals.actualHours += r.totalActualHours;
    totals.pctSum += r.overallCompletionPercentage;
  });

  const totalsRow = sheet.addRow([
    'TOTAL', '', '', '',
    totals.workingDays, totals.morningSubmitted, totals.eveningSubmitted,
    totals.missingMorning, totals.missingEvening,
    totals.planned, totals.completed, totals.partial, totals.notCompleted,
    rows.length ? `${Math.round((totals.pctSum / rows.length) * 100) / 100}%` : '0%',
    '', Math.round(totals.estHours * 100) / 100, Math.round(totals.actualHours * 100) / 100,
  ]);
  totalsRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF5' } };
  });

  sheet.columns.forEach((col) => {
    let max = 12;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, 30);
  });

  return workbook;
}

module.exports = { buildEmployeeSummaryWorkbook };
