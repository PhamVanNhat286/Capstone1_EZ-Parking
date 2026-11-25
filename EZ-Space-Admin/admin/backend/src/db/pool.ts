import fs from 'node:fs';
import path from 'node:path';
import { Pool, PoolClient, types } from 'pg';
import { adminRoot, cfg } from '../config/env';

// Giữ ngày/giờ PostgreSQL ở timezone do server trả về, thay vì đổi về UTC khi JSON hóa.
for (const oid of [1082, 1083, 1114, 1184]) {
  types.setTypeParser(oid, value => value);
}

export class HttpError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export function err(message: string, status = 400): never {
  throw new HttpError(message, status);
}

export const pool = new Pool({
  host: cfg.DB_HOST || 'localhost',
  port: Number(cfg.DB_PORT || 5432),
  database: cfg.DB_NAME || 'ez_space',
  user: cfg.DB_USER || 'postgres',
  password: cfg.DB_PASSWORD || 'postgres',
  connectionTimeoutMillis: 3500,
  max: 7,
  idleTimeoutMillis: 20000,
  options: '-c timezone=Asia/Ho_Chi_Minh'
});

export async function q<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  try {
    return (await pool.query<T>(sql, params)).rows;
  } catch (error) {
    const e = error as { code?: string; message?: string; detail?: string; hint?: string; position?: string };
    const statement = String(sql).replace(/\s+/g, ' ').trim();
    console.error('[EZ-Space PostgreSQL QUERY FAILED]', {
      code: e.code || 'UNKNOWN',
      message: e.message,
      detail: e.detail || undefined,
      hint: e.hint || undefined,
      position: e.position || undefined,
      statement: statement.slice(0, 1600),
      parameter_count: params.length
    });
    throw error;
  }
}

export async function first<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T> {
  const rows = await q<T>(sql, params);
  return (rows[0] || {}) as T;
}

async function safeQuery<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
  fallback: T[] = []
): Promise<T[]> {
  try {
    return (await pool.query<T>(sql, params)).rows;
  } catch (error) {
    const e = error as { code?: string };
    if (e && e.code === '42P01') return fallback;
    throw error;
  }
}

export async function safeFirst<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
  fallback: Partial<T> = {}
): Promise<T> {
  const rows = await safeQuery<T>(sql, params, []);
  return (rows[0] || fallback) as T;
}

export async function audit(
  client: PoolClient,
  actor: number,
  lot: number | null,
  action: string,
  entity: string,
  id: number,
  before: unknown,
  after: unknown,
  note: string
): Promise<void> {
  await client.query(
    `INSERT INTO audit_logs (user_id, parking_lot_id, action, entity_type, entity_id, old_value, new_value, note)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)`,
    [
      actor,
      lot,
      action,
      entity,
      id,
      JSON.stringify(before),
      JSON.stringify(after),
      String(note || '').slice(0, 250)
    ]
  );
}

export async function withTx<T>(task: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await task(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export function isDbConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string; errors?: Array<{ code?: string }> };
  const dbCodes = ['ECONNREFUSED', '28P01', '3D000', '42P01', 'ENOTFOUND', 'ETIMEDOUT', 'EACCES', '57P03'];
  if (e.code && dbCodes.includes(e.code)) return true;
  if (Array.isArray(e.errors) && e.errors.some(item => item?.code && dbCodes.includes(item.code))) {
    return true;
  }
  return /ECONNREFUSED|password authentication failed|does not exist|connect EACCES/i.test(
    String(e.message || '')
  );
}

let dbSeedPromise: Promise<boolean> | null = null;

async function runDatabaseSeedCheck(): Promise<boolean> {
  try {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"; CREATE EXTENSION IF NOT EXISTS "unaccent";`);
    const check = await pool.query<{ tbl: string | null }>(`SELECT to_regclass('public.users') AS tbl`);
    if (!check.rows[0]?.tbl) {
      const schemaSql = fs.readFileSync(path.join(adminRoot, 'sql/schema.sql'), 'utf8');
      await pool.query(schemaSql);
    }
    let countRes = await pool.query<{ cnt: number }>(`SELECT COUNT(*)::int AS cnt FROM users`);
    if (Number(countRes.rows[0]?.cnt || 0) === 0) {
      const seedSql = fs.readFileSync(path.join(adminRoot, 'sql/seed.sql'), 'utf8');
      await pool.query(seedSql);
      countRes = await pool.query<{ cnt: number }>(`SELECT COUNT(*)::int AS cnt FROM users`);
    }
    return Number(countRes.rows[0]?.cnt || 0) > 0;
  } catch {
    return false;
  }
}

export function ensureDatabaseSeeded(): Promise<boolean> {
  if (!dbSeedPromise) {
    dbSeedPromise = runDatabaseSeedCheck()
      .then(ok => {
        if (!ok) {
          dbSeedPromise = null;
        }
        return ok;
      })
      .catch(() => {
        dbSeedPromise = null;
        return false;
      });
  }
  return dbSeedPromise;
}

