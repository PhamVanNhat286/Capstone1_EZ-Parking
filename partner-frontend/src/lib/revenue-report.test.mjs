import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoLot, transitionSession } from './overview-model.ts';
import { revenueTransactions, summarizeRevenue, filterRevenue, revenueBuckets, reportRange, validDateRange, revenueCsv, dateKey } from './revenue-report.ts';

const anchor='2026-11-05';
test('report receipts reconcile to completed revenue without adding held deposits or refunds',()=>{
  const lot=createDemoLot();const rows=revenueTransactions(lot,anchor);const summary=summarizeRevenue(rows);
  assert.equal(summary.total,lot.sessions.filter(s=>s.status==='completed').reduce((sum,s)=>sum+s.amount,0));
  assert.equal(summary.total,summary.deposit+summary.parking+summary.overtime+summary.penalty);
  assert.equal(summary.refunds,50000);assert.equal(summary.held,3900000);
  assert.equal(summary.byVehicle.reduce((sum,row)=>sum+row.total,0),summary.total);
  assert.equal(new Set(rows.map(row=>row.id)).size,rows.length);
});
test('checkout records completion time and keeps separately captured overtime in one receipt',()=>{
  const lot=createDemoLot();let next=transitionSession(lot,'EZ-8919','checkout');
  assert.ok(next.sessions.find(s=>s.id==='EZ-8919').completedAt);
  next={...next,sessions:next.sessions.map(s=>s.id==='EZ-8919'?{...s,amount:105000,overtimeFee:25000}:s)};
  const receipt=revenueTransactions(next,dateKey(new Date())).filter(row=>row.bookingId==='EZ-8919');
  assert.equal(receipt.reduce((sum,row)=>sum+row.amount,0),105000);
  assert.equal(receipt.find(row=>row.category==='overtime').amount,25000);
});
test('date, vehicle and grouped chart totals apply consistently',()=>{
  const rows=revenueTransactions(createDemoLot(),anchor);
  const filtered=filterRevenue(rows,{from:anchor,to:anchor,vehicle:'suv'});
  assert.ok(filtered.every(row=>row.date===anchor&&row.vehicle==='suv'));
  const summary=summarizeRevenue(filtered);assert.equal(summary.total,80000);
  for(const group of ['day','hour']) assert.equal(revenueBuckets(filtered,anchor,anchor,group).reduce((sum,bucket)=>sum+bucket.total,0),summary.total);
  assert.equal(filterRevenue(rows,{from:'2020-01-01',to:'2020-01-02',vehicle:'all'}).length,0);
});
test('ranges reject invalid dates and oversized spans; presets cross month boundaries',()=>{
  assert.equal(validDateRange('2026-11-05','2026-11-01'),false);
  assert.equal(validDateRange('2026-02-30','2026-03-05'),false);
  assert.equal(validDateRange('2020-01-01','2026-01-01'),false);
  assert.equal(validDateRange('2024-02-29','2024-03-01'),true);
  assert.deepEqual(reportRange('7days','2026-11-05'),{from:'2026-10-30',to:'2026-11-05'});
});
test('CSV separates held/refunded money and escapes spreadsheet formula inputs',()=>{
  const rows=revenueTransactions(createDemoLot(),anchor);
  const csv=revenueCsv([{...rows[0],plate:'=1+1'},...rows.filter(row=>row.status==='refunded')]);
  assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes("'=1+1"));assert.ok(csv.includes('"-50000"'));
});
