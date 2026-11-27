import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { NextFunction, Request, Response, Router } from 'express';
import jwt from 'jsonwebtoken';
import { cfg } from '../config/env';
import { dashboard, summary } from '../controllers/dashboard';
import { logs } from '../controllers/logs';
import { lot, lots, lotStatus } from '../controllers/lots';
import { revenue } from '../controllers/revenue';
import {
  loadCurrentConfig,
  settings,
  updateSettings
} from '../controllers/settings';
import { user, users, userStatus } from '../controllers/users';
import { getAdminProfile } from '../controllers/utils';
import { ensureDatabaseSeeded, first, isDbConnectionError } from '../db/pool';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_SESSIONS = 500;
const JWT_SECRET = cfg.JWT_SECRET || 'ezspace_jwt_secret_capstone_2026';

interface SessionState {
  sid: string;
  csrf: string;
  seen: number;
  userId?: number;
}

const sessions = new Map<string, SessionState>();

function pruneExpiredSessions(now = Date.now()): void {
  for (const [id, ses] of sessions.entries()) {
    if (now - ses.seen > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
  while (sessions.size > MAX_SESSIONS) {
    const oldest = sessions.keys().next().value;
    if (!oldest) break;
    sessions.delete(oldest);
  }
}

function createFreshSession(res: Response, userId?: number): SessionState {
  pruneExpiredSessions();
  const sid = crypto.randomBytes(24).toString('hex');
  const ses: SessionState = {
    sid,
    csrf: crypto.randomBytes(24).toString('hex'),
    seen: Date.now(),
    ...(userId ? { userId } : {})
  };
  sessions.set(sid, ses);
  res.setHeader(
    'Set-Cookie',
    `ez_admin_pg=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`
  );
  return ses;
}

function getOrCreateSession(req: Request, res: Response): SessionState {
  pruneExpiredSessions();
  const cookies = Object.fromEntries(
    (req.headers.cookie || '')
      .split(';')
      .map(k => k.trim().split('=').slice(0, 2))
      .filter(a => a.length === 2)
  );
  const sid = cookies.ez_admin_pg;
  const ses = sid ? sessions.get(sid) : undefined;
  if (!ses) {
    return createFreshSession(res);
  }
  ses.seen = Date.now();
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

function sendJson(res: Response, status: number, data: unknown): void {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.status(status).json(data);
}

type RouteHandler = (req: Request, res: Response, ses: SessionState) => Promise<void>;

function handleAdminRoute(handler: RouteHandler) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ses = getOrCreateSession(req, res);
      await ensureDatabaseSeeded();
      await handler(req, res, ses);
    } catch (error) {
      if (isDbConnectionError(error)) {
        sendJson(res, 503, { error: 'Không thể kết nối cơ sở dữ liệu PostgreSQL.' });
        return;
      }
      next(error);
    }
  };
}

async function requireAdminSession(res: Response, ses: SessionState): Promise<number | null> {
  if (!ses.userId) {
    sendJson(res, 401, { error: 'Vui lòng đăng nhập tài khoản Quản trị viên.' });
    return null;
  }
  try {
    const admin = await getAdminProfile(ses.userId);
    return admin.id;
  } catch {
    delete ses.userId;
    sendJson(res, 401, { error: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.' });
    return null;
  }
}

function requireMutationGuards(req: Request, res: Response, ses: SessionState): boolean {
  const origin = String(req.headers.origin || '');
  if (origin !== '' && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/i.test(origin)) {
    sendJson(res, 403, { error: 'Origin không hợp lệ.' });
    return false;
  }
  const csrfHeader = String(req.headers['x-csrf-token'] || '');
  if (!csrfHeader || csrfHeader !== ses.csrf) {
    sendJson(res, 403, { error: 'CSRF token không hợp lệ.' });
    return false;
  }
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
    sendJson(res, 415, { error: 'Chỉ chấp nhận JSON.' });
    return false;
  }
  return true;
}

export const adminRouter = Router();

adminRouter.get('/health', async (_req: Request, res: Response) => {
  const dbReady = await ensureDatabaseSeeded();
  const config = dbReady ? await loadCurrentConfig() : null;
  sendJson(res, dbReady ? 200 : 503, {
    ok: dbReady,
    service: 'ez-space-admin-backend',
    db: dbReady ? 'postgresql' : 'disconnected',
    maintenance_mode: config ? config.maintenance_mode : false
  });
});

adminRouter.get('/platform-config', async (_req: Request, res: Response) => {
  const dbReady = await ensureDatabaseSeeded();
  if (!dbReady) {
    sendJson(res, 503, { ok: false, error: 'Không thể kết nối cơ sở dữ liệu PostgreSQL.' });
    return;
  }
  const config = await loadCurrentConfig();
  sendJson(res, 200, {
    ok: true,
    config: {
      hold_timeout_minutes: config.hold_timeout_minutes,
      arrival_timeout_minutes: config.arrival_timeout_minutes,
      deposit_amount: config.deposit_amount,
      commission_rate: config.commission_rate,
      maintenance_mode: config.maintenance_mode
    }
  });
});

// 1) Kiểm tra trạng thái phiên hiện tại + cấp CSRF token
adminRouter.get(
  '/admin/auth',
  handleAdminRoute(async (_req, res, ses) => {
    if (!ses.userId) {
      sendJson(res, 200, { authenticated: false, csrf: ses.csrf });
      return;
    }
    try {
      const admin = await getAdminProfile(ses.userId);
      sendJson(res, 200, {
        authenticated: true,
        user: admin.full_name,
        email: admin.email,
        csrf: ses.csrf
      });
    } catch {
      delete ses.userId;
      sendJson(res, 200, { authenticated: false, csrf: ses.csrf });
    }
  })
);

// 2) Đăng nhập chung (hỗ trợ cả Admin lẫn Partner)
adminRouter.post(
  '/admin/login',
  handleAdminRoute(async (req, res, ses) => {
    if (!requireMutationGuards(req, res, ses)) return;
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const rawAccount = String(body.email || '').trim();
    const password = String(body.password || '');
    if (!rawAccount || !password) {
      sendJson(res, 400, { error: 'Vui lòng nhập Email / Số điện thoại và mật khẩu.' });
      return;
    }
    const row = await first<{
      id?: number;
      full_name?: string;
      email?: string;
      password_hash?: string;
      role?: string;
      status?: string;
    }>(
      `SELECT id, full_name, email, password_hash, role::text AS role, status::text AS status
       FROM users
       WHERE LOWER(email) = $1 OR phone = $2
       LIMIT 1`,
      [rawAccount.toLowerCase(), rawAccount.replace(/\s+/g, '')]
    );
    if (!row.id || !row.password_hash) {
      sendJson(res, 401, { error: 'Email / Số điện thoại hoặc mật khẩu không chính xác.' });
      return;
    }
    if (row.status !== 'active') {
      sendJson(res, 403, { error: `Tài khoản hiện không hoạt động (${row.status}).` });
      return;
    }
    const matched = await bcrypt.compare(password, row.password_hash);
    if (!matched) {
      sendJson(res, 401, { error: 'Email / Số điện thoại hoặc mật khẩu không chính xác.' });
      return;
    }
    if (row.role === 'customer') {
      sendJson(res, 403, { error: 'Tài khoản khách hàng vui lòng đăng nhập trên ứng dụng đặt chỗ.' });
      return;
    }
    // Nếu là Chủ bãi (manager) -> Ký JWT chuẩn để Frontend nhảy sang Partner Portal
    if (row.role === 'manager') {
      const token = jwt.sign(
        { id: Number(row.id), email: row.email, role: 'manager' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      sendJson(res, 200, { ok: true, role: 'manager', token });
      return;
    }
    // Nếu là Admin -> Xoay vòng phiên & lưu userId vào phiên mới
    sessions.delete(ses.sid);
    const nextSes = createFreshSession(res, Number(row.id));
    sendJson(res, 200, {
      ok: true,
      role: 'admin',
      authenticated: true,
      user: row.full_name,
      email: row.email,
      csrf: nextSes.csrf
    });
  })
);

// 3) Nhận token SSO khi đăng nhập tài khoản Admin từ bên trang Partner nhảy sang
adminRouter.post(
  '/admin/sso',
  handleAdminRoute(async (req, res, ses) => {
    if (!requireMutationGuards(req, res, ses)) return;
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const token = String(body.token || '').trim();
    if (!token) {
      sendJson(res, 400, { error: 'Thiếu token xác thực.' });
      return;
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id?: number; role?: string };
      if (!decoded?.id || decoded.role !== 'admin') {
        sendJson(res, 403, { error: 'Token không có quyền Quản trị viên.' });
        return;
      }
      const admin = await getAdminProfile(Number(decoded.id));
      sessions.delete(ses.sid);
      const nextSes = createFreshSession(res, admin.id);
      sendJson(res, 200, {
        ok: true,
        authenticated: true,
        user: admin.full_name,
        email: admin.email,
        csrf: nextSes.csrf
      });
    } catch {
      sendJson(res, 401, { error: 'Token đăng nhập không hợp lệ hoặc đã hết hạn.' });
    }
  })
);

// 4) Đăng xuất
adminRouter.post(
  '/admin/logout',
  handleAdminRoute(async (req, res, ses) => {
    if (!requireMutationGuards(req, res, ses)) return;
    delete ses.userId;
    sessions.delete(ses.sid);
    res.setHeader(
      'Set-Cookie',
      'ez_admin_pg=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
    );
    sendJson(res, 200, { ok: true });
  })
);

adminRouter.get(
  '/admin/summary',
  handleAdminRoute(async (_req, res, ses) => {
    const actorId = await requireAdminSession(res, ses);
    if (!actorId) return;
    sendJson(res, 200, await summary());
  })
);

adminRouter.get(
  '/admin/dashboard',
  handleAdminRoute(async (req, res, ses) => {
    const actorId = await requireAdminSession(res, ses);
    if (!actorId) return;
    sendJson(res, 200, await dashboard(normalizeQuery(req.query)));
  })
);

adminRouter.get(
  '/admin/lots',
  handleAdminRoute(async (_req, res, ses) => {
    const actorId = await requireAdminSession(res, ses);
    if (!actorId) return;
    sendJson(res, 200, await lots());
  })
);

adminRouter.get(
  '/admin/lots/:id',
  handleAdminRoute(async (req, res, ses) => {
    const actorId = await requireAdminSession(res, ses);
    if (!actorId) return;
    sendJson(res, 200, await lot({ id: String(req.params.id || '') }));
  })
);

adminRouter.patch(
  '/admin/lots/:id/status',
  handleAdminRoute(async (req, res, ses) => {
    const actorId = await requireAdminSession(res, ses);
    if (!actorId) return;
    if (!requireMutationGuards(req, res, ses)) return;
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    sendJson(
      res,
      200,
      await lotStatus({ ...body, id: String(req.params.id || ''), _actorId: actorId })
    );
  })
);

adminRouter.get(
  '/admin/users',
  handleAdminRoute(async (_req, res, ses) => {
    const actorId = await requireAdminSession(res, ses);
    if (!actorId) return;
    sendJson(res, 200, await users());
  })
);

adminRouter.get(
  '/admin/users/:id',
  handleAdminRoute(async (req, res, ses) => {
    const actorId = await requireAdminSession(res, ses);
    if (!actorId) return;
    sendJson(res, 200, await user({ id: String(req.params.id || '') }));
  })
);

adminRouter.patch(
  '/admin/users/:id/status',
  handleAdminRoute(async (req, res, ses) => {
    const actorId = await requireAdminSession(res, ses);
    if (!actorId) return;
    if (!requireMutationGuards(req, res, ses)) return;
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    sendJson(
      res,
      200,
      await userStatus({ ...body, id: String(req.params.id || ''), _actorId: actorId })
    );
  })
);

adminRouter.get(
  '/admin/revenue',
  handleAdminRoute(async (req, res, ses) => {
    const actorId = await requireAdminSession(res, ses);
    if (!actorId) return;
    sendJson(res, 200, await revenue(normalizeQuery(req.query)));
  })
);

adminRouter.get(
  '/admin/logs',
  handleAdminRoute(async (_req, res, ses) => {
    const actorId = await requireAdminSession(res, ses);
    if (!actorId) return;
    sendJson(res, 200, await logs());
  })
);

adminRouter.get(
  '/admin/settings',
  handleAdminRoute(async (_req, res, ses) => {
    const actorId = await requireAdminSession(res, ses);
    if (!actorId) return;
    sendJson(res, 200, await settings());
  })
);

adminRouter.patch(
  '/admin/settings',
  handleAdminRoute(async (req, res, ses) => {
    const actorId = await requireAdminSession(res, ses);
    if (!actorId) return;
    if (!requireMutationGuards(req, res, ses)) return;
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    sendJson(res, 200, await updateSettings({ ...body, _actorId: actorId }));
  })
);

adminRouter.all('/admin/{*splat}', (_req: Request, res: Response) => {
  sendJson(res, 404, { error: 'Endpoint RESTful Admin không tồn tại.' });
});
