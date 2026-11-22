import { createApp } from './app';
import { cfg } from './config/env';
import { pool } from './db/pool';

const port = Number(cfg.ADMIN_PORT || cfg.BACKEND_PORT || 8000);
const app = createApp();

export const server = app.listen(port, '127.0.0.1', () => {
  console.log(`[EZ-Space Admin Backend] Node.js + Express đang chạy tại http://127.0.0.1:${port}/`);
});

process.on('SIGINT', () => {
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
});

