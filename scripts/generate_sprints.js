const fs = require('fs');
const path = require('path');

const sprintData = [
  {
    sprintNum: 1,
    sprintName: 'Sprint 1: Foundation, Auth & 2D Matrix Setup',
    startDate: '2026-08-27',
    daysCount: 21,
    report: [
      { no: 1, name: 'Pham Van Nhat', hours: 40 },
      { no: 2, name: 'Pham Thuan Hoang', hours: 36 },
      { no: 3, name: 'Pham Van Huy', hours: 28 },
      { no: 4, name: 'Pham Tran Vu Thai', hours: 24 }
    ],
    dates: [
      '27-Aug', '28-Aug', '29-Aug', '30-Aug', '31-Aug',
      '1-Sep', '2-Sep', '3-Sep', '4-Sep', '5-Sep',
      '6-Sep', '7-Sep', '8-Sep', '9-Sep', '10-Sep',
      '11-Sep', '12-Sep', '13-Sep', '14-Sep', '15-Sep', '16-Sep'
    ],
    tasks: [
      { comp: 'Initial', name: 'Sprint Plan Meeting', who: 'All', est: 4, finishDay: 0 },
      { comp: 'Initial', name: 'Sprint backlog document for Sprint 1', who: 'All', est: 4, finishDay: 1 },
      { comp: 'Initial', name: 'Test Plan document for Sprint 1', who: 'All', est: 4, finishDay: 2 },
      { comp: 'Design UI', name: 'Design UI for User Registration & Profile Management', who: 'Hoàng, Thái', est: 8, finishDay: 4, halfDay: 3 },
      { comp: 'Design UI', name: 'Design UI for Secure JWT Authentication & OTP Password Recovery', who: 'Nhật, Huy', est: 8, finishDay: 4, halfDay: 3 },
      { comp: 'Design UI', name: 'Design UI for Customer Vehicle Management', who: 'Hoàng, Thái', est: 4, finishDay: 5 },
      { comp: 'Design UI', name: 'Design UI for Parking Lot Registration & Profile Configuration', who: 'Nhật, Huy', est: 4, finishDay: 5 },
      { comp: 'Design UI', name: 'Design UI for 2D Parking Slot Matrix & Classification Builder', who: 'All', est: 4, finishDay: 6 },
      { comp: 'Design UI', name: 'Design Test Case for Sprint 1', who: 'All', est: 4, finishDay: 7 },
      { comp: 'Code', name: '[Front-end] User Registration & Profile Management', who: 'Huy, Thái', est: 8, finishDay: 9, halfDay: 8 },
      { comp: 'Code', name: '[Back-end] User Registration & Profile Management', who: 'Nhật, Hoàng', est: 8, finishDay: 9, halfDay: 8 },
      { comp: 'Code', name: '[Front-end] Secure JWT Authentication & OTP Password Recovery', who: 'Huy, Thái', est: 8, finishDay: 11, halfDay: 10 },
      { comp: 'Code', name: '[Back-end] Secure JWT Authentication & OTP Password Recovery', who: 'Nhật, Hoàng', est: 8, finishDay: 11, halfDay: 10 },
      { comp: 'Code', name: '[Front-end] Customer Vehicle Management', who: 'Huy, Thái', est: 4, finishDay: 12 },
      { comp: 'Code', name: '[Back-end] Customer Vehicle Management', who: 'Nhật, Hoàng', est: 4, finishDay: 12 },
      { comp: 'Code', name: '[Front-end] Parking Lot Registration & Profile Configuration', who: 'Huy, Thái', est: 4, finishDay: 13 },
      { comp: 'Code', name: '[Back-end] Parking Lot Registration & Profile Configuration', who: 'Nhật, Hoàng', est: 4, finishDay: 13 },
      { comp: 'Code', name: '[Front-end] 2D Parking Slot Matrix & Classification Builder', who: 'Huy, Thái', est: 8, finishDay: 15, halfDay: 14 },
      { comp: 'Code', name: '[Back-end] 2D Parking Slot Matrix & Classification Builder', who: 'Nhật, Hoàng', est: 8, finishDay: 15, halfDay: 14 },
      { comp: 'Integration', name: 'Integration for Sprint 1', who: 'All', est: 4, finishDay: 16 },
      { comp: 'Testing', name: 'Testing for Sprint 1', who: 'All', est: 8, finishDay: 18, halfDay: 17 },
      { comp: 'Sprint 1 Review Meeting', name: 'Sprint 1 Review Meeting', who: 'All', est: 4, finishDay: 19 },
      { comp: 'Release Sprint 1', name: 'Release Sprint 1', who: 'All', est: 4, finishDay: 20 }
    ]
  },
  {
    sprintNum: 2,
    sprintName: 'Sprint 2: Discovery, Real-time 2D Map & Concurrency Lock',
    startDate: '2026-09-17',
    daysCount: 21,
    report: [
      { no: 1, name: 'Pham Van Nhat', hours: 40 },
      { no: 2, name: 'Pham Thuan Hoang', hours: 36 },
      { no: 3, name: 'Pham Van Huy', hours: 28 },
      { no: 4, name: 'Pham Tran Vu Thai', hours: 24 }
    ],
    dates: [
      '17-Sep', '18-Sep', '19-Sep', '20-Sep', '21-Sep',
      '22-Sep', '23-Sep', '24-Sep', '25-Sep', '26-Sep',
      '27-Sep', '28-Sep', '29-Sep', '30-Sep', '1-Oct',
      '2-Oct', '3-Oct', '4-Oct', '5-Oct', '6-Oct', '7-Oct'
    ],
    tasks: [
      { comp: 'Initial', name: 'Sprint Plan Meeting', who: 'All', est: 4, finishDay: 0 },
      { comp: 'Initial', name: 'Sprint backlog document for Sprint 2', who: 'All', est: 4, finishDay: 1 },
      { comp: 'Initial', name: 'Test Plan document for Sprint 2', who: 'All', est: 4, finishDay: 2 },
      { comp: 'Design UI', name: 'Design UI for Parking Lot Search & Multi-criteria Filtering', who: 'Hoàng, Thái', est: 8, finishDay: 4, halfDay: 3 },
      { comp: 'Design UI', name: 'Design UI for Real-time 2D Visual Slot Map Display', who: 'Nhật, Huy', est: 8, finishDay: 4, halfDay: 3 },
      { comp: 'Design UI', name: 'Design UI for Rule-based Smart Slot Recommendation', who: 'Hoàng, Thái', est: 4, finishDay: 5 },
      { comp: 'Design UI', name: 'Design UI for High-Concurrency Slot Holding & 10m Timer', who: 'Nhật, Huy', est: 4, finishDay: 5 },
      { comp: 'Design UI', name: 'Design UI for Expired Hold Release Feedback & Status Alert', who: 'All', est: 4, finishDay: 6 },
      { comp: 'Design UI', name: 'Design Test Case for Sprint 2', who: 'All', est: 4, finishDay: 7 },
      { comp: 'Code', name: '[Front-end] Parking Lot Search & Multi-criteria Filtering', who: 'Huy, Thái', est: 8, finishDay: 9, halfDay: 8 },
      { comp: 'Code', name: '[Back-end] Parking Lot Search & Multi-criteria Filtering', who: 'Nhật, Hoàng', est: 8, finishDay: 9, halfDay: 8 },
      { comp: 'Code', name: '[Front-end] Real-time 2D Visual Slot Map Display', who: 'Huy, Thái', est: 8, finishDay: 11, halfDay: 10 },
      { comp: 'Code', name: '[Back-end] Real-time 2D Visual Slot Map Display', who: 'Nhật, Hoàng', est: 8, finishDay: 11, halfDay: 10 },
      { comp: 'Code', name: '[Front-end] Rule-based Smart Slot Recommendation', who: 'Huy, Thái', est: 4, finishDay: 12 },
      { comp: 'Code', name: '[Back-end] Rule-based Smart Slot Recommendation', who: 'Nhật, Hoàng', est: 4, finishDay: 12 },
      { comp: 'Code', name: '[Front-end] High-Concurrency Slot Holding & 10m Timer', who: 'Huy, Thái', est: 4, finishDay: 13 },
      { comp: 'Code', name: '[Back-end] High-Concurrency Slot Holding Engine with Conflict Lock', who: 'Nhật, Hoàng', est: 4, finishDay: 13 },
      { comp: 'Code', name: '[Front-end] Expired Hold Status & Real-time Slot Sync', who: 'Huy, Thái', est: 8, finishDay: 15, halfDay: 14 },
      { comp: 'Code', name: '[Back-end] Automated Background Worker for Expired Hold Release', who: 'Nhật, Hoàng', est: 8, finishDay: 15, halfDay: 14 },
      { comp: 'Integration', name: 'Integration for Sprint 2', who: 'All', est: 4, finishDay: 16 },
      { comp: 'Testing', name: 'Testing for Sprint 2', who: 'All', est: 8, finishDay: 18, halfDay: 17 },
      { comp: 'Sprint 2 Review Meeting', name: 'Sprint 2 Review Meeting', who: 'All', est: 4, finishDay: 19 },
      { comp: 'Release Sprint 2', name: 'Release Sprint 2', who: 'All', est: 4, finishDay: 20 }
    ]
  },
  {
    sprintNum: 3,
    sprintName: 'Sprint 3: Payment Gateway, Dynamic QR & Kiosk Terminals',
    startDate: '2026-10-08',
    daysCount: 21,
    report: [
      { no: 1, name: 'Pham Van Nhat', hours: 40 },
      { no: 2, name: 'Pham Thuan Hoang', hours: 36 },
      { no: 3, name: 'Pham Van Huy', hours: 28 },
      { no: 4, name: 'Pham Tran Vu Thai', hours: 24 }
    ],
    dates: [
      '8-Oct', '9-Oct', '10-Oct', '11-Oct', '12-Oct',
      '13-Oct', '14-Oct', '15-Oct', '16-Oct', '17-Oct',
      '18-Oct', '19-Oct', '20-Oct', '21-Oct', '22-Oct',
      '23-Oct', '24-Oct', '25-Oct', '26-Oct', '27-Oct', '28-Oct'
    ],
    tasks: [
      { comp: 'Initial', name: 'Sprint Plan Meeting', who: 'All', est: 4, finishDay: 0 },
      { comp: 'Initial', name: 'Sprint backlog document for Sprint 3', who: 'All', est: 4, finishDay: 1 },
      { comp: 'Initial', name: 'Test Plan document for Sprint 3', who: 'All', est: 4, finishDay: 2 },
      { comp: 'Design UI', name: 'Design UI for Sandbox Deposit Payment Integration (VNPay/MoMo)', who: 'Hoàng, Thái', est: 8, finishDay: 4, halfDay: 3 },
      { comp: 'Design UI', name: 'Design UI for Dynamic QR Ticket Display & Security Watermark', who: 'Nhật, Huy', est: 8, finishDay: 4, halfDay: 3 },
      { comp: 'Design UI', name: 'Design UI for Kiosk Scan-In Check-In Terminal', who: 'Hoàng, Thái', est: 4, finishDay: 5 },
      { comp: 'Design UI', name: 'Design UI for Kiosk Scan-Out Settle & Release Terminal', who: 'Nhật, Huy', est: 4, finishDay: 5 },
      { comp: 'Design UI', name: 'Design UI for No-Show Forfeiture Notification & Alerts', who: 'All', est: 4, finishDay: 6 },
      { comp: 'Design UI', name: 'Design Test Case for Sprint 3', who: 'All', est: 4, finishDay: 7 },
      { comp: 'Code', name: '[Front-end] Sandbox Deposit Payment Integration', who: 'Huy, Thái', est: 8, finishDay: 9, halfDay: 8 },
      { comp: 'Code', name: '[Back-end] Sandbox Deposit Payment & IPN Webhook Verification', who: 'Nhật, Hoàng', est: 8, finishDay: 9, halfDay: 8 },
      { comp: 'Code', name: '[Front-end] Dynamic QR Ticket Issuance Screen', who: 'Huy, Thái', est: 8, finishDay: 11, halfDay: 10 },
      { comp: 'Code', name: '[Back-end] Dynamic QR Cryptographic Signing & Validation', who: 'Nhật, Hoàng', est: 8, finishDay: 11, halfDay: 10 },
      { comp: 'Code', name: '[Front-end] Kiosk Scan-In Check-In Terminal', who: 'Huy, Thái', est: 4, finishDay: 12 },
      { comp: 'Code', name: '[Back-end] Kiosk Scan-In Check-In Processing & State Change', who: 'Nhật, Hoàng', est: 4, finishDay: 12 },
      { comp: 'Code', name: '[Front-end] Kiosk Scan-Out Settle & Release Terminal', who: 'Huy, Thái', est: 4, finishDay: 13 },
      { comp: 'Code', name: '[Back-end] Kiosk Scan-Out Settle & Fee Calculation', who: 'Nhật, Hoàng', est: 4, finishDay: 13 },
      { comp: 'Code', name: '[Front-end] Deposit Status & Forfeiture Warning UI', who: 'Huy, Thái', est: 8, finishDay: 15, halfDay: 14 },
      { comp: 'Code', name: '[Back-end] Automated No-Show Forfeiture Worker (20-min grace)', who: 'Nhật, Hoàng', est: 8, finishDay: 15, halfDay: 14 },
      { comp: 'Integration', name: 'Integration for Sprint 3', who: 'All', est: 4, finishDay: 16 },
      { comp: 'Testing', name: 'Testing for Sprint 3', who: 'All', est: 8, finishDay: 18, halfDay: 17 },
      { comp: 'Sprint 3 Review Meeting', name: 'Sprint 3 Review Meeting', who: 'All', est: 4, finishDay: 19 },
      { comp: 'Release Sprint 3', name: 'Release Sprint 3', who: 'All', est: 4, finishDay: 20 }
    ]
  },
  {
    sprintNum: 4,
    sprintName: 'Sprint 4: AI Assistant, Analytics, Cancellation & Admin',
    startDate: '2026-10-29',
    daysCount: 21,
    report: [
      { no: 1, name: 'Pham Van Nhat', hours: 40 },
      { no: 2, name: 'Pham Thuan Hoang', hours: 36 },
      { no: 3, name: 'Pham Van Huy', hours: 28 },
      { no: 4, name: 'Pham Tran Vu Thai', hours: 24 }
    ],
    dates: [
      '29-Oct', '30-Oct', '31-Oct', '1-Nov', '2-Nov',
      '3-Nov', '4-Nov', '5-Nov', '6-Nov', '7-Nov',
      '8-Nov', '9-Nov', '10-Nov', '11-Nov', '12-Nov',
      '13-Nov', '14-Nov', '15-Nov', '16-Nov', '17-Nov', '18-Nov'
    ],
    tasks: [
      { comp: 'Initial', name: 'Sprint Plan Meeting', who: 'All', est: 4, finishDay: 0 },
      { comp: 'Initial', name: 'Sprint backlog document for Sprint 4', who: 'All', est: 4, finishDay: 1 },
      { comp: 'Initial', name: 'Test Plan document for Sprint 4', who: 'All', est: 4, finishDay: 2 },
      { comp: 'Design UI', name: 'Design UI for Conversational AI Assistant for Parking', who: 'Hoàng, Thái', est: 8, finishDay: 4, halfDay: 3 },
      { comp: 'Design UI', name: 'Design UI for Parking Manager Occupancy & Revenue Analytics', who: 'Nhật, Huy', est: 8, finishDay: 4, halfDay: 3 },
      { comp: 'Design UI', name: 'Design UI for Booking History, Directions & Active Session', who: 'Hoàng, Thái', est: 4, finishDay: 5 },
      { comp: 'Design UI', name: 'Design UI for Booking Cancellation & Deposit Refund', who: 'Nhật, Huy', est: 4, finishDay: 5 },
      { comp: 'Design UI', name: 'Design UI for System Administration & Simulation Controls', who: 'All', est: 4, finishDay: 6 },
      { comp: 'Design UI', name: 'Design Test Case for Sprint 4', who: 'All', est: 4, finishDay: 7 },
      { comp: 'Code', name: '[Front-end] Conversational AI Assistant Chat Window & Cards', who: 'Huy, Thái', est: 8, finishDay: 9, halfDay: 8 },
      { comp: 'Code', name: '[Back-end] Conversational AI Intent Routing & History API', who: 'Nhật, Hoàng', est: 8, finishDay: 9, halfDay: 8 },
      { comp: 'Code', name: '[Front-end] Parking Manager Occupancy & Revenue Charts Dashboard', who: 'Huy, Thái', est: 8, finishDay: 11, halfDay: 10 },
      { comp: 'Code', name: '[Back-end] Parking Manager Occupancy & Revenue Aggregation Engine', who: 'Nhật, Hoàng', est: 8, finishDay: 11, halfDay: 10 },
      { comp: 'Code', name: '[Front-end] Booking History, Directions & Active Session Banner', who: 'Huy, Thái', est: 4, finishDay: 12 },
      { comp: 'Code', name: '[Back-end] Booking History Query & Route Navigation Helpers', who: 'Nhật, Hoàng', est: 4, finishDay: 12 },
      { comp: 'Code', name: '[Front-end] Booking Cancellation Dialog & Refund Status View', who: 'Huy, Thái', est: 4, finishDay: 13 },
      { comp: 'Code', name: '[Back-end] Cancellation Eligibility Validator & Refund Trigger', who: 'Nhật, Hoàng', est: 4, finishDay: 13 },
      { comp: 'Code', name: '[Front-end] Admin User Privileges, Audit Logs & Simulation UI', who: 'Huy, Thái', est: 8, finishDay: 15, halfDay: 14 },
      { comp: 'Code', name: '[Back-end] Admin RBAC Enforcement & Simulation Cron Endpoints', who: 'Nhật, Hoàng', est: 8, finishDay: 15, halfDay: 14 },
      { comp: 'Integration', name: 'Integration for Sprint 4', who: 'All', est: 4, finishDay: 16 },
      { comp: 'Testing', name: 'Testing for Sprint 4', who: 'All', est: 8, finishDay: 18, halfDay: 17 },
      { comp: 'Sprint 4 Review Meeting', name: 'Sprint 4 Review Meeting', who: 'All', est: 4, finishDay: 19 },
      { comp: 'Release Sprint 4', name: 'Release Sprint 4', who: 'All', est: 4, finishDay: 20 }
    ]
  },
  {
    sprintNum: 5,
    sprintName: 'Sprint 5: System Hardening, Docker & Capstone Defense',
    startDate: '2026-11-19',
    daysCount: 18,
    report: [
      { no: 1, name: 'Pham Van Nhat', hours: 32 },
      { no: 2, name: 'Pham Thuan Hoang', hours: 28 },
      { no: 3, name: 'Pham Van Huy', hours: 22 },
      { no: 4, name: 'Pham Tran Vu Thai', hours: 18 }
    ],
    dates: [
      '19-Nov', '20-Nov', '21-Nov', '22-Nov', '23-Nov',
      '24-Nov', '25-Nov', '26-Nov', '27-Nov', '28-Nov',
      '29-Nov', '30-Nov', '1-Dec', '2-Dec', '3-Dec',
      '4-Dec', '5-Dec', '6-Dec'
    ],
    tasks: [
      { comp: 'Initial', name: 'Sprint 5 Plan Meeting', who: 'All', est: 4, finishDay: 0 },
      { comp: 'Initial', name: 'Capstone 1 Release Backlog & Quality Strategy Doc', who: 'All', est: 4, finishDay: 1 },
      { comp: 'Initial', name: 'Comprehensive System Test Plan for Capstone Defense', who: 'All', est: 4, finishDay: 2 },
      { comp: 'Testing & Optimization', name: 'End-to-End User Journey Testing (Driver, Manager, Kiosk, Admin)', who: 'All', est: 8, finishDay: 4, halfDay: 3 },
      { comp: 'Testing & Optimization', name: 'Concurrency & Load Testing on Redis Slot Locks (JMeter)', who: 'Nhật, Hoàng', est: 8, finishDay: 4, halfDay: 3 },
      { comp: 'Testing & Optimization', name: 'Cross-browser & Mobile UX Responsiveness Polish', who: 'Huy, Thái', est: 4, finishDay: 5 },
      { comp: 'Testing & Optimization', name: 'API Latency Profiling & SQL Index Optimization (<500ms)', who: 'Nhật, Hoàng', est: 4, finishDay: 5 },
      { comp: 'Testing & Optimization', name: 'Security Hardening (JWT, HMAC Callback, BCrypt, CORS)', who: 'Nhật, Hoàng', est: 4, finishDay: 6 },
      { comp: 'Testing & Optimization', name: 'Edge Case Simulation & Fault Recovery Verification', who: 'All', est: 4, finishDay: 7 },
      { comp: 'Deployment & DevOps', name: '[DevOps] Docker Compose Multi-container Setup', who: 'Nhật, Huy', est: 8, finishDay: 9, halfDay: 8 },
      { comp: 'Deployment & DevOps', name: '[DevOps] Database Migration & Master Data Seeding', who: 'Nhật, Hoàng', est: 8, finishDay: 9, halfDay: 8 },
      { comp: 'Deployment & DevOps', name: '[DevOps] CI/CD Pipeline Configuration with GitHub Actions', who: 'Huy, Thái', est: 4, finishDay: 10 },
      { comp: 'Deployment & DevOps', name: '[DevOps] Live Deployment & Health Check Monitoring', who: 'Nhật, Huy', est: 4, finishDay: 11 },
      { comp: 'Documentation & Release', name: 'Capstone Final Project Report Document (CMU-SE 450)', who: 'All', est: 8, finishDay: 13, halfDay: 12 },
      { comp: 'Documentation & Release', name: 'User Manual & Technical Documentation Compilation', who: 'All', est: 8, finishDay: 13, halfDay: 12 },
      { comp: 'Documentation & Release', name: 'Demo Video Recording & Slide Presentation Preparation', who: 'All', est: 4, finishDay: 14 },
      { comp: 'Documentation & Release', name: 'Rehearsal & Dry-run Capstone Defense Presentation', who: 'All', est: 4, finishDay: 15 },
      { comp: 'Review', name: 'Sprint 5 Review & Final Acceptance Sign-off Meeting', who: 'All', est: 4, finishDay: 16 },
      { comp: 'Release', name: 'Final Capstone Release (v1.0 Tag & Defense Ready)', who: 'All', est: 4, finishDay: 17 }
    ]
  }
];

function calculateSprintGrid(sp) {
  const numDays = sp.dates.length;
  const grid = [];
  const dailyTotals = new Array(numDays).fill(0);

  for (const t of sp.tasks) {
    const rowValues = [];
    for (let d = 0; d < numDays; d++) {
      let val = '';
      if (d < (t.halfDay !== undefined ? t.halfDay : t.finishDay)) {
        val = t.est;
      } else if (t.halfDay !== undefined && d === t.halfDay) {
        val = t.est / 2;
      } else if (d === t.finishDay) {
        val = 0;
      } else {
        val = ''; // finished
      }
      rowValues.push(val);
      if (val !== '') {
        dailyTotals[d] += val;
      }
    }
    grid.push({
      comp: t.comp,
      name: t.name,
      who: t.who,
      est: t.est,
      total: t.est,
      rowValues
    });
  }

  const totalEst = sp.tasks.reduce((sum, t) => sum + t.est, 0);
  return { grid, dailyTotals, totalEst };
}

// 1. Export Clean Single-Header TSV for each sprint
for (const sp of sprintData) {
  const calc = calculateSprintGrid(sp);

  // Single clean header row (NO subheaders with '2')
  let tsv = 'Sprint ' + sp.sprintNum + '\tComponent\tTask Name\tResponsible Member\tEstimate\tTotal\t' + sp.dates.join('\t') + '\n';

  for (const row of calc.grid) {
    tsv += '\t' + row.comp + '\t' + row.name + '\t' + row.who + '\t' + row.est + '\t' + row.total + '\t' + row.rowValues.join('\t') + '\n';
  }
  tsv += '\t\t\tTotal\t' + calc.totalEst + '\t' + calc.totalEst + '\t' + calc.dailyTotals.join('\t') + '\n';

  const filename = path.join('docs', `EZSpace_Sprint${sp.sprintNum}_Estimation_Burndown.tsv`);
  fs.writeFileSync(filename, tsv, 'utf8');
  console.log('Saved', filename);

  // Also create a dedicated 3-column table for making clean Burndown Charts
  let chartTsv = 'Date\tEstimate\tActual\n';
  const startHours = calc.totalEst;
  const step = startHours / (sp.dates.length - 1);
  for (let i = 0; i < sp.dates.length; i++) {
    const estVal = Math.round(startHours - i * step);
    const actVal = calc.dailyTotals[i];
    chartTsv += `${sp.dates[i]}\t${estVal}\t${actVal}\n`;
  }
  const chartFilename = path.join('docs', `Burndown_Chart_Sprint${sp.sprintNum}_Clean.tsv`);
  fs.writeFileSync(chartFilename, chartTsv, 'utf8');
  console.log('Saved', chartFilename);
}

// 2. Export SpreadsheetML Excel XML with clean single-row headers
function buildSpreadsheetML() {
  let xml = '<?xml version="1.0"?>\n';
  xml += '<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
  xml += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n';
  xml += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
  xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
  xml += ' xmlns:html="http://www.w3.org/TR/REC-html40">\n';
  
  xml += ' <Styles>\n';
  xml += '  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11"/></Style>\n';
  xml += '  <Style ss:ID="sTitle"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="13" ss:Bold="1"/><Interior ss:Color="#9BC2E6" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>\n';
  xml += '  <Style ss:ID="sHeader"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#BDD7EE" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>\n';
  xml += '  <Style ss:ID="sReportHeader"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#BDD7EE" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>\n';
  xml += '  <Style ss:ID="sDataText"><Alignment ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="10"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/></Borders></Style>\n';
  xml += '  <Style ss:ID="sDataCenter"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="10"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/></Borders></Style>\n';
  xml += '  <Style ss:ID="sDataNum"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="10"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/></Borders></Style>\n';
  xml += '  <Style ss:ID="sZero"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#FFFF00" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/></Borders></Style>\n';
  xml += '  <Style ss:ID="sTotalRow"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#F2F2F2" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#000000"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/></Borders></Style>\n';
  xml += ' </Styles>\n';

  for (const sp of sprintData) {
    const calc = calculateSprintGrid(sp);
    xml += ' <Worksheet ss:Name="Sprint ' + sp.sprintNum + '">\n';
    xml += '  <Table ss:DefaultRowHeight="20">\n';
    xml += '   <Column ss:Width="60"/>\n';
    xml += '   <Column ss:Width="90"/>\n';
    xml += '   <Column ss:Width="320"/>\n';
    xml += '   <Column ss:Width="140"/>\n';
    xml += '   <Column ss:Width="55"/>\n';
    xml += '   <Column ss:Width="55"/>\n';
    for (let d = 0; d < sp.dates.length; d++) {
      xml += '   <Column ss:Width="45"/>\n';
    }

    // --- SPRINT REPORT TABLE AT TOP ---
    xml += '   <Row ss:Height="24">\n';
    xml += '    <Cell ss:Index="2" ss:MergeAcross="2" ss:StyleID="sReportHeader"><Data ss:Type="String">Sprint ' + sp.sprintNum + ' Report</Data></Cell>\n';
    xml += '   </Row>\n';
    xml += '   <Row ss:Height="22">\n';
    xml += '    <Cell ss:Index="2" ss:StyleID="sHeader"><Data ss:Type="String">No.</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Member Name</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Working hours</Data></Cell>\n';
    xml += '   </Row>\n';

    let rTotal = 0;
    for (const r of sp.report) {
      xml += '   <Row>\n';
      xml += '    <Cell ss:Index="2" ss:StyleID="sDataCenter"><Data ss:Type="Number">' + r.no + '</Data></Cell>\n';
      xml += '    <Cell ss:StyleID="sDataText"><Data ss:Type="String">' + r.name + '</Data></Cell>\n';
      xml += '    <Cell ss:StyleID="sDataNum"><Data ss:Type="Number">' + r.hours + '</Data></Cell>\n';
      xml += '   </Row>\n';
      rTotal += r.hours;
    }
    xml += '   <Row ss:Height="22">\n';
    xml += '    <Cell ss:Index="3" ss:StyleID="sTotalRow"><Data ss:Type="String">Total</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sTotalRow"><Data ss:Type="Number">' + rTotal + '</Data></Cell>\n';
    xml += '   </Row>\n';
    xml += '   <Row ss:Height="12"></Row>\n'; // Empty separator row

    // --- ESTIMATE BURNDOWN TABLE ---
    // Header Row
    xml += '   <Row ss:Height="28">\n';
    xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Sprint ' + sp.sprintNum + '</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Component</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Task Name</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Responsible Member</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Estimate</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Total</Data></Cell>\n';
    for (const dt of sp.dates) {
      xml += '    <Cell ss:StyleID="sHeader"><Data ss:Type="String">' + dt + '</Data></Cell>\n';
    }
    xml += '   </Row>\n';

    // Data Rows
    for (const row of calc.grid) {
      xml += '   <Row>\n';
      xml += '    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String"></Data></Cell>\n';
      xml += '    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">' + row.comp + '</Data></Cell>\n';
      xml += '    <Cell ss:StyleID="sDataText"><Data ss:Type="String">' + row.name + '</Data></Cell>\n';
      xml += '    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">' + row.who + '</Data></Cell>\n';
      xml += '    <Cell ss:StyleID="sDataNum"><Data ss:Type="Number">' + row.est + '</Data></Cell>\n';
      xml += '    <Cell ss:StyleID="sDataNum"><Data ss:Type="Number">' + row.total + '</Data></Cell>\n';
      for (const v of row.rowValues) {
        if (v === 0) {
          xml += '    <Cell ss:StyleID="sZero"><Data ss:Type="Number">0</Data></Cell>\n';
        } else if (typeof v === 'number') {
          xml += '    <Cell ss:StyleID="sDataNum"><Data ss:Type="Number">' + v + '</Data></Cell>\n';
        } else {
          xml += '    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String"></Data></Cell>\n';
        }
      }
      xml += '   </Row>\n';
    }

    // Total Row
    xml += '   <Row ss:Height="24">\n';
    xml += '    <Cell ss:StyleID="sTotalRow"><Data ss:Type="String"></Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sTotalRow"><Data ss:Type="String"></Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sTotalRow"><Data ss:Type="String">Total Remaining Hours</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sTotalRow"><Data ss:Type="String">Total</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sTotalRow"><Data ss:Type="Number">' + calc.totalEst + '</Data></Cell>\n';
    xml += '    <Cell ss:StyleID="sTotalRow"><Data ss:Type="Number">' + calc.totalEst + '</Data></Cell>\n';
    for (const tot of calc.dailyTotals) {
      xml += '    <Cell ss:StyleID="sTotalRow"><Data ss:Type="Number">' + tot + '</Data></Cell>\n';
    }
    xml += '   </Row>\n';

    xml += '  </Table>\n';
    xml += ' </Worksheet>\n';
  }

  xml += '</Workbook>\n';
  return xml;
}

const excelXml = buildSpreadsheetML();
const excelPath = path.join('docs', 'EZSpace_Sprint_Estimation_Burndown_2026.xls');
fs.writeFileSync(excelPath, excelXml, 'utf8');
console.log('Saved', excelPath);
