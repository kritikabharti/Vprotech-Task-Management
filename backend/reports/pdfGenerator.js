const PDFDocument = require('pdfkit');
const path = require('path');

const COMPANY_NAME = process.env.COMPANY_NAME || 'VproTech Digital';
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo.png');

function drawHeader(doc, title, dateRangeLabel) {
  try {
    doc.image(LOGO_PATH, 40, 30, { width: 70 });
  } catch (_e) {
    // Logo missing shouldn't block report generation.
  }
  doc.fontSize(16).fillColor('#1E3A5F').font('Helvetica-Bold').text(COMPANY_NAME, 120, 35);
  doc.fontSize(12).fillColor('#000000').font('Helvetica-Bold').text(title, 120, 56);
  doc.fontSize(9).fillColor('#666666').font('Helvetica').text(`Date range: ${dateRangeLabel}`, 120, 74);
  doc.fontSize(9).fillColor('#666666').text(`Generated: ${new Date().toLocaleString()}`, 120, 88);
  doc.moveTo(40, 112).lineTo(555, 112).strokeColor('#1E3A5F').lineWidth(1).stroke();
  doc.y = 122;
}

function drawFooter(doc, pageNumber) {
  doc.fontSize(8).fillColor('#999999').text(`${COMPANY_NAME} - Confidential`, 40, 780, { continued: false });
  doc.text(`Page ${pageNumber}`, 500, 780);
}

const COLS = [
  { key: 'name', label: 'Employee', width: 90 },
  { key: 'dept', label: 'Department', width: 70 },
  { key: 'teamLead', label: 'Team Lead', width: 70 },
  { key: 'planned', label: 'Planned', width: 45 },
  { key: 'completed', label: 'Done', width: 40 },
  { key: 'partial', label: 'Partial', width: 40 },
  { key: 'notDone', label: 'Not Done', width: 45 },
  { key: 'pct', label: 'Completion', width: 65 },
];

function drawTableHeader(doc, y) {
  let x = 40;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF');
  doc.rect(40, y, 515, 20).fill('#1E3A5F');
  doc.fillColor('#FFFFFF');
  COLS.forEach((col) => {
    doc.text(col.label, x + 4, y + 6, { width: col.width - 6 });
    x += col.width;
  });
  return y + 20;
}

function drawTableRow(doc, y, row, shaded) {
  let x = 40;
  if (shaded) doc.rect(40, y, 515, 18).fill('#F3F6FA');
  doc.fillColor('#000000').font('Helvetica').fontSize(8.5);
  COLS.forEach((col) => {
    doc.text(String(row[col.key] ?? ''), x + 4, y + 5, { width: col.width - 6 });
    x += col.width;
  });
  return y + 18;
}

// rows: per-employee summary array from reportAggregation.summarizeByEmployee
async function buildEmployeeSummaryPdf({ title, dateRangeLabel, rows }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, title, dateRangeLabel);
    let y = drawTableHeader(doc, doc.y);

    rows.forEach((r, i) => {
      if (y > 740) {
        doc.addPage();
        drawHeader(doc, title, dateRangeLabel);
        y = drawTableHeader(doc, doc.y);
      }
      y = drawTableRow(doc, y, {
        name: r.employee?.fullName || '-',
        dept: r.department?.name || '-',
        teamLead: r.teamLead?.fullName || '-',
        planned: r.totalPlannedTasks,
        completed: r.totalCompletedTasks,
        partial: r.totalPartialTasks,
        notDone: r.totalNotCompletedTasks,
        pct: `${r.overallCompletionPercentage}%`,
      }, i % 2 === 1);
    });

    // Summary section
    y += 20;
    if (y > 700) { doc.addPage(); drawHeader(doc, title, dateRangeLabel); y = doc.y; }
    const totalPlanned = rows.reduce((s, r) => s + r.totalPlannedTasks, 0);
    const totalCompleted = rows.reduce((s, r) => s + r.totalCompletedTasks, 0);
    const avgPct = rows.length
      ? Math.round((rows.reduce((s, r) => s + r.overallCompletionPercentage, 0) / rows.length) * 100) / 100
      : 0;

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1E3A5F').text('Summary', 40, y);
    doc.font('Helvetica').fontSize(9).fillColor('#000000');
    doc.text(`Employees: ${rows.length}`, 40, y + 16);
    doc.text(`Total Planned Tasks: ${totalPlanned}`, 40, y + 30);
    doc.text(`Total Completed Tasks: ${totalCompleted}`, 40, y + 44);
    doc.text(`Average Completion: ${avgPct}%`, 40, y + 58);

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      drawFooter(doc, i + 1);
    }

    doc.end();
  });
}

module.exports = { buildEmployeeSummaryPdf };
