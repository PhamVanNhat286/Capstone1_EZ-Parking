import crypto from 'node:crypto';
import { NextFunction, Request, Response, Router } from 'express';
import { dashboard, summary } from '../controllers/dashboard';
import { logs } from '../controllers/logs';
import { lot, lots, lotStatus } from '../controllers/lots';
import { records } from '../controllers/records';
import { revenue } from '../controllers/revenue';
import { settings } from '../controllers/settings';
import { user, users, userStatus } from '../controllers/users';
import { getAdminProfile } from '../controllers/utils';
import { ensureDatabaseSeeded, isDbConnectionError } from '../db/pool';

interface SessionState {
  csrf: string;
  seen: number;
}

const sessions = new Map<string, SessionState>();

function getOrCreateSession(req: Request, res: Response): SessionState {
  const cookies = Object.fromEntries(
    (req.headers.cookie || '')
      .split(';')
      .map(k => k.trim().split('=').slice(0, 2))
      .filter(a => a.length === 2)
  );
  let sid = cookies.ez_admin_pg;
  let ses = sid ? sessions.get(sid) : undefined;
  if (!ses) {
    sid = crypto.randomBytes(24).toString('hex');
    ses = { csrf: crypto.randomBytes(24).toString('hex'), seen: Date.now() };
    sessions.set(sid, ses);
    res.setHeader(
      'Set-Cookie',
      `ez_admin_pg=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`
    );
  } else {
    ses.seen = Date.now();
  }
  return ses;
}

function normalizeQuery(query: Request['query']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(query)) {
    if (typeof val === 'string') out[key] = val;
    else if (Array.isArray(val) && typeof val[0] === 'string') out[key] = val[0];
  }
  return out;
}

type ReaderFn = (params: Record<string, string>) => Promise<unknown>;
type WriterFn = (input: Record<string, unknown>) => Promise<unknown>;

const readers: Record<string, ReaderFn> = {
  summary: () => summary(),
  dashboard: params => dashboard(params),
  lots: () => lots(),
  lot: params => lot(params),
  users: () => users(),
  user: params => user(params),
  logs: () => logs(),
  records: () => records(),
  revenue: params => revenue(params),
  settings: () => settings()
};

const writers: Record<string, WriterFn> = {
  lot_status: data => lotStatus(data),
  user_status: data => userStatus(data)
};

function sendJson(res: Response, status: number, data: unknown): void {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.status(status).json(data);
}

export const adminRouter = Router();

adminRouter.get('/health', async (_req: Request, res: Response) => {
  const dbReady = await ensureDatabaseSeeded();
  sendJson(res, dbReady ? 200 : 503, {
    ok: dbReady,
    service: 'ez-space-admin-backend',
    db: dbReady ? 'postgresql' : 'disconnected'
  });
});

adminRouter.all('/admin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ses = getOrCreateSession(req, res);
    const params = normalizeQuery(req.query);
    const action = params.action || 'summary';
    await ensureDatabaseSeeded();

    if (action === 'auth' && req.method === 'GET') {
      const admin = await getAdminProfile();
      sendJson(res, 200, {
        authenticated: true,
        user: admin.full_name,
        email: admin.email,
        csrf: ses.csrf
      });
      return;
    }

    if (req.method === 'GET') {
      if (!Object.prototype.hasOwnProperty.call(readers, action)) {
        sendJson(res, 404, { error: 'API không tồn tại.' });
        return;
      }
      const result = await readers[action](params);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === 'POST') {
      if (!Object.prototype.hasOwnProperty.call(writers, action)) {
        sendJson(res, 404, { error: 'Chức năng này chưa được hỗ trợ.' });
        return;
      }
      const origin = String(req.headers.origin || '');
      if (origin !== '' && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/i.test(origin)) {
        sendJson(res, 403, { error: 'Origin không hợp lệ.' });
        return;
      }
      const csrfHeader = String(req.headers['x-csrf-token'] || '');
      if (!csrfHeader || csrfHeader !== ses.csrf) {
        sendJson(res, 403, { error: 'CSRF token không hợp lệ.' });
        return;
      }
      if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
        sendJson(res, 415, { error: 'Chỉ chấp nhận JSON.' });
        return;
      }
      const data = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
      const result = await writers[action](data);
      sendJson(res, 200, result);
      return;
    }

    sendJson(res, 405, { error: 'Phương thức không hợp lệ.' });
  } catch (error) {
    if (isDbConnectionError(error)) {
      sendJson(res, 503, { error: 'Không thể kết nối cơ sở dữ liệu PostgreSQL.' });
      return;
    }
    next(error);
  }
});
