import test from 'node:test';
import assert from 'node:assert/strict';
import { auditEntries, auditCsv, filterAudit } from './audit-log.ts';

const defaults={query:'',action:'all',manager:'all',from:'',to:''};

test('audit filters combine accent-insensitive reason, order, manager and date searches without modifying records',()=>{
  const snapshot=JSON.stringify(auditEntries);
  const matching=filterAudit(auditEntries,{...defaults,query:'EZ 8902',action:'FORCE_CANCEL',manager:'Minh Trần',from:'2026-10-29',to:'2026-10-29'});
  assert.equal(matching.length,1);
  assert.equal(matching[0].id,'AUD-20261029-002');
  assert.equal(filterAudit(auditEntries,{...defaults,query:'don EZ8902'}).length,1);
  assert.equal(filterAudit(auditEntries,{...defaults,query:'son lai vach'}).length,1);
  assert.equal(filterAudit(auditEntries,{...defaults,action:'UPDATE_PRICING',manager:'Lê Hoàng'}).length,0);
  assert.equal(JSON.stringify(auditEntries),snapshot);
});

test('date boundaries include the full selected day and exclude records outside it',()=>{
  const rows=filterAudit(auditEntries,{...defaults,from:'2026-10-28',to:'2026-10-28'});
  assert.equal(rows.length,2);
  assert.ok(rows.every(row=>row.date==='2026-10-28'));
  assert.equal(filterAudit(auditEntries,{...defaults,from:'2026-11-01',to:'2026-11-05'}).length,0);
});

test('CSV preserves before/after evidence, quotes and line breaks while neutralizing formulas',()=>{
  const csv=auditCsv([{...auditEntries[0],reason:'=HYPERLINK("example")\nquoted reason'}]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('20.000đ'));
  assert.ok(csv.includes('25.000đ/giờ'));
  assert.ok(csv.includes('"\'=HYPERLINK(""example"")\nquoted reason"'));
});
