import crypto from 'node:crypto';
import { NextFunction, Request, Response, Router } from 'express';
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
import { ensureDatabaseSeeded, isDbConnectionError } from '../db/pool';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_SESSIONS = 500;

interface SessionState {
  csrf: string;
  seen: number;
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

function getOrCreateSession(req: Request, res: Response): SessionState {
  pruneExpiredSessions();
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
    ses = {
      csrf: crypto.randomBytes(24).toString('hex'),
      seen: Date.now()
    };
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

adminRouter.get(
  '/admin/auth',
  handleAdminRoute(async (_req, res, ses) => {
    const admin = await getAdminProfile();
    sendJson(res, 200, {
      authenticated: true,
      user: admin.full_name,
      email: admin.email,
      csrf: ses.csrf
    });
  })
);

adminRouter.get(
  '/admin/summary',
  handleAdminRoute(async (_req, res) => {
    sendJson(res, 200, await summary());
  })
);

adminRouter.get(
  '/admin/dashboard',
  handleAdminRoute(async (req, res) => {
    sendJson(res, 200, await dashboard(normalizeQuery(req.query)));
  })
);

adminRouter.get(
  '/admin/lots',
  handleAdminRoute(async (_req, res) => {
    sendJson(res, 200, await lots());
  })
);

adminRouter.get(
  '/admin/lots/:id',
  handleAdminRoute(async (req, res) => {
    sendJson(res, 200, await lot({ id: String(req.params.id || '') }));
  })
);

adminRouter.patch(
  '/admin/lots/:id/status',
  handleAdminRoute(async (req, res, ses) => {
    if (!requireMutationGuards(req, res, ses)) return;
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    sendJson(res, 200, await lotStatus({ ...body, id: String(req.params.id || '') }));
  })
);

adminRouter.get(
  '/admin/users',
  handleAdminRoute(async (_req, res) => {
    sendJson(res, 200, await users());
  })
);

adminRouter.get(
  '/admin/users/:id',
  handleAdminRoute(async (req, res) => {
    sendJson(res, 200, await user({ id: String(req.params.id || '') }));
  })
);

adminRouter.patch(
  '/admin/users/:id/status',
  handleAdminRoute(async (req, res, ses) => {
    if (!requireMutationGuards(req, res, ses)) return;
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    sendJson(res, 200, await userStatus({ ...body, id: String(req.params.id || '') }));
  })
);

adminRouter.get(
  '/admin/revenue',
  handleAdminRoute(async (req, res) => {
    sendJson(res, 200, await revenue(normalizeQuery(req.query)));
  })
);

adminRouter.get(
  '/admin/logs',
  handleAdminRoute(async (_req, res) => {
    sendJson(res, 200, await logs());
  })
);

adminRouter.get(
  '/admin/settings',
  handleAdminRoute(async (_req, res) => {
    sendJson(res, 200, await settings());
  })
);

adminRouter.patch(
  '/admin/settings',
  handleAdminRoute(async (req, res, ses) => {
    if (!requireMutationGuards(req, res, ses)) return;
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    sendJson(res, 200, await updateSettings(body));
  })
);

adminRouter.all('/admin/{*splat}', (_req: Request, res: Response) => {
  sendJson(res, 404, { error: 'Endpoint RESTful Admin không tồn tại.' });
});
