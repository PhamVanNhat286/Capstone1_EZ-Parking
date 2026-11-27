import { PoolClient } from 'pg';
import { err, first } from '../db/pool';

export const pass = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

export const validId = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) err('ID không hợp lệ');
  return n;
};

export async function getActor(client: PoolClient, actorId?: unknown): Promise<number> {
  const parsed = Number(actorId);
  if (Number.isSafeInteger(parsed) && parsed > 0) {
    const r = await client.query<{ id: number }>(
      `SELECT id FROM users WHERE id = $1 AND role = 'admin' AND status = 'active' LIMIT 1`,
      [parsed]
    );
    if (r.rows[0]) return Number(r.rows[0].id);
  }
  const fallback = await client.query<{ id: number }>(
    `SELECT id FROM users WHERE role = 'admin' AND status = 'active' ORDER BY id LIMIT 1`
  );
  if (!fallback.rows[0]) err('Hệ thống chưa có tài khoản quản trị viên đang hoạt động.', 503);
  return Number(fallback.rows[0].id);
}

export interface AdminProfile {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
}

export async function getAdminProfile(userId: number): Promise<AdminProfile> {
  if (!Number.isSafeInteger(userId) || userId < 1) {
    err('Phiên đăng nhập không hợp lệ hoặc tài khoản đã ngưng hoạt động.', 401);
  }
  const row = await first<{
    id?: number;
    full_name?: string;
    email?: string;
    phone?: string | null;
  }>(
    `SELECT id, full_name, email, phone
     FROM users
     WHERE id = $1 AND role = 'admin' AND status = 'active'
     LIMIT 1`,
    [userId]
  );
  if (!row.id || !row.full_name || !row.email) {
    err('Phiên đăng nhập không hợp lệ hoặc tài khoản đã ngưng hoạt động.', 401);
  }
  return {
    id: Number(row.id),
    full_name: String(row.full_name),
    email: String(row.email),
    phone: row.phone ? String(row.phone) : null
  };
}
