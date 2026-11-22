import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PoolClient } from 'pg';
import { confirmDeposit } from './reservation';

function fakeClient(status: string, amount = 50_000, expires = Date.now() + 60_000) {
  const statements: string[] = [];
  const client = {
    query: async (sql: string) => {
      statements.push(sql);
      if (sql.startsWith('SELECT')) return { rows: [{ id: 42, status, hold_expires_at: new Date(expires), deposit_amount: amount }] };
      return { rows: [] };
    },
  } as unknown as PoolClient;
  return { client, statements };
}

test('giao dich hop le cap nhat don va ghi thanh toan', async () => {
  const { client, statements } = fakeClient('holding');
  assert.equal(await confirmDeposit(client, 42, 'vnpay', 'reference', 50_000), 'success');
  assert.equal(statements.length, 3);
  assert.match(statements[1], /UPDATE reservations/);
  assert.match(statements[2], /INSERT INTO payments/);
});

test('don het han hoac sai so tien khong duoc danh dau da tra', async () => {
  for (const [amount, expires] of [[50_000, Date.now() - 1000], [40_000, Date.now() + 60_000]]) {
    const { client, statements } = fakeClient('holding', amount, expires);
    assert.equal(await confirmDeposit(client, 42, 'bank', 'reference', 50_000), 'late');
    assert.equal(statements.length, 1);
  }
});

test('don da tra khong bi ghi thanh toan lan hai', async () => {
  const { client, statements } = fakeClient('paid');
  assert.equal(await confirmDeposit(client, 42, 'bank', 'reference', 50_000), 'late');
  assert.equal(statements.length, 1);
});
