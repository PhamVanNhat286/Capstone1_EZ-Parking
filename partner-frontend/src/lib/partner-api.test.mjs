import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { partnerRequest, PartnerApiError } from './partner-api.ts';

test('Partner API sends the manager token and disables response caching', async () => {
  let captured;
  const result = await partnerRequest('/partner/snapshot', 'test-token', 'GET', undefined, async (url, options) => {
    captured = { url, ...options };
    return Response.json({ success: true, data: { manager_id: '9007199254740993' } });
  });
  assert.equal(captured.url, '/api/partner/snapshot');
  assert.equal(captured.headers.Authorization, 'Bearer test-token');
  assert.equal(captured.cache, 'no-store');
  assert.equal(result.manager_id, '9007199254740993');
});

test('writes send only the submitted JSON body and preserve server validation errors', async () => {
  const input = { code: 'A-01', parking_lot_id: '1' };
  await assert.rejects(partnerRequest('/partner/slots', 'token', 'POST', input, async (_url, options) => {
    assert.equal(options.body, JSON.stringify(input));
    return Response.json({ success: false, message: 'Ô đã có xe.' }, { status: 409 });
  }), error => error instanceof PartnerApiError && error.status === 409 && error.message === 'Ô đã có xe.');
});

test('network and invalid backend responses fail visibly without substituting seed data', async () => {
  await assert.rejects(partnerRequest('/partner/snapshot', 'token', 'GET', undefined, async () => { throw new Error('offline'); }), error => error instanceof PartnerApiError && error.status === 0);
  await assert.rejects(partnerRequest('/partner/snapshot', 'token', 'GET', undefined, async () => new Response('not JSON', { status: 502 })), error => error instanceof PartnerApiError && error.status === 502);
  const runtime = await readFile(new URL('../components/partner/SqlWorkspace.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(runtime, /createSqlPreview|database-seed|managerId\s*=\s*['"]2['"]/);
});
