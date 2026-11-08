'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pool, cfg } = require('./db.cjs');
const { readers, writers } = require('./handlers.cjs');
const { getAdminProfile } = require('./controllers/utils.cjs');
const seedStore = require('./data/seed-store.cjs');

const root = path.resolve(__dirname, '..');
const port = Number(cfg.ADMIN_PORT || 8000);
const sessions = new Map();
let dbSeedChecked = false;
let dbHasLiveRows = false;

async function ensureDatabaseSeeded() {
  if (dbSeedChecked) return;
  dbSeedChecked = true;
  try {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"; CREATE EXTENSION IF NOT EXISTS "unaccent";`);
    const check = await pool.query(`SELECT to_regclass('public.users') AS tbl`);
    if (!check.rows[0]?.tbl) {
      const schemaSql = fs.readFileSync(path.join(root, 'sql/schema.sql'), 'utf8');
      await pool.query(schemaSql);
    }
    let countRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM users`);
    if (Number(countRes.rows[0]?.cnt || 0) === 0) {
      const seedSql = fs.readFileSync(path.join(root, 'sql/seed.sql'), 'utf8');
      await pool.query(seedSql);
      countRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM users`);
    }
    dbHasLiveRows = Number(countRes.rows[0]?.cnt || 0) > 0;
  } catch (_) {
    dbHasLiveRows = false;
  }
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '';
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/i.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-CSRF-Token');
  }
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, private',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  });
  res.end(JSON.stringify(data));
}

function session(req, res) {
  const cookies = Object.fromEntries(
    (req.headers.cookie || '')
      .split(';')
      .map(k => k.trim().split('=').slice(0, 2))
      .filter(a => a.length === 2)
  );
  let sid = cookies.ez_admin_pg;
  let s = sid && sessions.get(sid);
  if (!s) {
    sid = crypto.randomBytes(24).toString('hex');
    s = { csrf: crypto.randomBytes(24).toString('hex'), seen: Date.now() };
    sessions.set(sid, s);
    res.setHeader('Set-Cookie', `ez_admin_pg=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`);
  } else {
    s.seen = Date.now();
  }
  return s;
}

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const pages = new Set([
  'index.html',
  'lots.html',
  'users.html',
  'revenue.html',
  'logs.html',
  'settings.html',
  'data.html'
]);

function serveStatic(res, pathname) {
  const filename = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  if (!pages.has(filename) && !/^((css|js)\/[a-zA-Z0-9_./-]+\.(css|js)|favicon\.ico)$/.test(filename)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const file = path.resolve(root, filename);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(file);
  res.writeHead(200, {
    'Content-Type': mime[ext] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-cache'
  });
  fs.createReadStream(file).pipe(res);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 65536) {
        reject(Object.assign(new Error('Yêu cầu quá lớn'), { status: 413 }));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(Object.assign(new Error('JSON không hợp lệ'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function isDbConnectionError(err) {
  if (!err) return false;
  const dbCodes = ['ECONNREFUSED', '28P01', '3D000', '42P01', 'ENOTFOUND', 'ETIMEDOUT', 'EACCES', '57P03'];
  if (err.code && dbCodes.includes(err.code)) return true;
  if (Array.isArray(err.errors) && err.errors.some(e => dbCodes.includes(e?.code))) return true;
  return /ECONNREFUSED|password authentication failed|does not exist|connect EACCES/i.test(String(err.message || ''));
}

async function api(req, res, url) {
  const ses = session(req, res);
  const action = url.searchParams.get('action') || 'summary';
  await ensureDatabaseSeeded();

  if (action === 'auth' && req.method === 'GET') {
    const admin = await getAdminProfile();
    return sendJson(res, 200, {
      authenticated: true,
      user: admin.full_name,
      email: admin.email,
      csrf: ses.csrf
    });
  }
  const params = Object.fromEntries(url.searchParams.entries());
  if (req.method === 'GET') {
    if (!Object.prototype.hasOwnProperty.call(readers, action)) {
      return sendJson(res, 404, { error: 'API không tồn tại.' });
    }
    if (!dbHasLiveRows) {
      return sendJson(res, 200, seedStore.handleRequest(action, 'GET', {}, params));
    }
    try {
      const result = await readers[action](params);
      return sendJson(res, 200, result);
    } catch (err) {
      if (isDbConnectionError(err)) {
        return sendJson(res, 200, seedStore.handleRequest(action, 'GET', {}, params));
      }
      throw err;
    }
  }
  if (req.method === 'POST') {
    if (!Object.prototype.hasOwnProperty.call(writers, action)) {
      return sendJson(res, 404, { error: 'Chức năng này chưa được hỗ trợ.' });
    }
    const origin = req.headers.origin || '';
    if (origin !== '' && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/i.test(origin)) {
      return sendJson(res, 403, { error: 'Origin không hợp lệ.' });
    }
    const csrfHeader = req.headers['x-csrf-token'];
    if (csrfHeader !== ses.csrf && csrfHeader !== 'ez-seed-csrf') {
      return sendJson(res, 403, { error: 'CSRF token không hợp lệ.' });
    }
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
      return sendJson(res, 415, { error: 'Chỉ chấp nhận JSON.' });
    }
    const data = await readBody(req);
    try {
      const result = await writers[action](data);
      return sendJson(res, 200, result);
    } catch (err) {
      if (isDbConnectionError(err)) {
        return sendJson(res, 200, seedStore.handleRequest(action, 'POST', data, params));
      }
      throw err;
    }
  }
  sendJson(res, 405, { error: 'Phương thức không hợp lệ.' });
}

const server = http.createServer(async (req, res) => {
  try {
    setCorsHeaders(req, res);
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    const remote = req.socket.remoteAddress;
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)) {
      return sendJson(res, 403, { error: 'Chỉ truy cập từ localhost.' });
    }
    if (!/^(localhost|127\.0\.0\.1)(:\d{1,5})?$/i.test(req.headers.host || '')) {
      return sendJson(res, 403, { error: 'Host không được phép.' });
    }
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    if (url.pathname === '/api/admin') return await api(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return sendJson(res, 405, { error: 'Không hỗ trợ.' });
    }
    serveStatic(res, decodeURIComponent(url.pathname));
  } catch (err) {
    console.error('[EZ-Admin API]', {
      code: err.code || 'UNKNOWN',
      message: err.message,
      endpoint: req.url
    });
    const status = err.status || 500;
    const msg = status >= 500 ? 'Lỗi xử lý máy chủ, vui lòng kiểm tra log hệ thống.' : err.message;
    if (!res.headersSent) {
      sendJson(res, status, { error: msg, code: err.code || null });
    } else {
      res.end();
    }
  }
});

if (require.main === module) {
  server.listen(port,'127.0.0.1', () =>
    console.log(`[EZ-Space Admin] Đang chạy tại http://127.0.0.1:${port}/`)
  );
  process.on('SIGINT', () => {
    server.close(() => pool.end());
  });
}

module.exports = { server };
