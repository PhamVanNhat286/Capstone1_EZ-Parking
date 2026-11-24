import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { adminRouter } from './routes/admin.routes';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/i.test(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Accept', 'X-CSRF-Token']
    })
  );

  // Localhost & Host guard (giữ nguyên chuẩn bảo mật local của Admin Portal)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const remote = req.socket.remoteAddress || '';
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)) {
      res.status(403).json({ error: 'Chỉ truy cập từ localhost.' });
      return;
    }
    if (!/^(localhost|127\.0\.0\.1)(:\d{1,5})?$/i.test(req.headers.host || '')) {
      res.status(403).json({ error: 'Host không được phép.' });
      return;
    }
    next();
  });

  app.use(express.json({ limit: '64kb' }));

  app.use('/api', adminRouter);

  app.get('/', (_req: Request, res: Response) => {
    res.json({
      service: 'EZ-Space Admin API (Node.js + Express + TypeScript)',
      architecture: 'RESTful JSON API',
      endpoints: [
        '/api/health',
        '/api/platform-config',
        '/api/admin/auth',
        '/api/admin/summary',
        '/api/admin/dashboard',
        '/api/admin/lots',
        '/api/admin/lots/:id',
        '/api/admin/lots/:id/status',
        '/api/admin/users',
        '/api/admin/users/:id',
        '/api/admin/users/:id/status',
        '/api/admin/revenue',
        '/api/admin/logs',
        '/api/admin/settings',
        '/api/admin/settings/cache-flush'
      ]
    });
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint không tồn tại.' });
  });

  // Error handling middleware
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const e = err as { status?: number; statusCode?: number; code?: string; message?: string; type?: string };
    let status = e.status || e.statusCode || 500;
    let message = e.message || 'Lỗi xử lý máy chủ, vui lòng kiểm tra log hệ thống.';

    if (e.type === 'entity.parse.failed') {
      status = 400;
      message = 'JSON không hợp lệ';
    } else if (e.type === 'entity.too.large') {
      status = 413;
      message = 'Yêu cầu quá lớn';
    }

    if (status >= 500) {
      console.error('[EZ-Admin API]', {
        code: e.code || 'UNKNOWN',
        message: e.message,
        endpoint: req.url
      });
      message = 'Lỗi xử lý máy chủ, vui lòng kiểm tra log hệ thống.';
    }

    if (!res.headersSent) {
      res.status(status).json({ error: message, code: e.code || null });
    }
  });

  return app;
}

