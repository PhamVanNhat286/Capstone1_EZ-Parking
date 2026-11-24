import { PoolClient } from 'pg';
import { err, first } from '../db/pool';

export const pass = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

export const validId = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) err('ID không hợp lệ');
  return n;
};

export async function getActor(client: PoolClient): Promise<number> {
  const r = await client.query<{ id: number }>(
    `SELECT id FROM users WHERE role = 'admin' AND status = 'active' ORDER BY id LIMIT 1`
  );
  if (!r.rows[0]) err('Hệ thống chưa có tài khoản quản trị viên đang hoạt động.', 503);
  return Number(r.rows[0].id);
}

export interface AdminProfile {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
}

export async function getAdminProfile(): Promise<AdminProfile> {
  const row = await first<{
    id?: number;
    full_name?: string;
    email?: string;
    phone?: string | null;
  }>(
    `SELECT id, full_name, email, phone
     FROM users
     WHERE role = 'admin' AND status = 'active'
     ORDER BY id
     LIMIT 1`
  );
  if (!row.id || !row.full_name || !row.email) {
    err('Không tìm thấy tài khoản quản trị viên đang hoạt động trong cơ sở dữ liệu.', 503);
  }
  return {
    id: Number(row.id),
    full_name: String(row.full_name),
    email: String(row.email),
    phone: row.phone ? String(row.phone) : null
  };
}
