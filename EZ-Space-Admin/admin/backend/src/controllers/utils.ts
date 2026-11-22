import { PoolClient } from 'pg';
import { err, safeFirst } from '../db/pool';

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
  phone: string;
}

export async function getAdminProfile(): Promise<AdminProfile> {
  try {
    const row = await safeFirst<{
      id?: number;
      full_name?: string;
      email?: string;
      phone?: string;
    }>(
      `SELECT id, full_name, email, phone, role FROM users WHERE role = 'admin' AND status = 'active' ORDER BY id LIMIT 1`,
      [],
      {}
    );
    return {
      id: Number(row.id) || 1,
      full_name: row.full_name || 'Admin Hệ Thống',
      email: row.email || 'admin@ezspace.vn',
      phone: row.phone || '0905000111'
    };
  } catch {
    return {
      id: 1,
      full_name: 'Admin Hệ Thống',
      email: 'admin@ezspace.vn',
      phone: '0905000111'
    };
  }
}

