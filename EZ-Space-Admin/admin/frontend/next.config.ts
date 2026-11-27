import fs from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';

function loadRootEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of ['.env', '.env.local']) {
    const file = path.resolve(__dirname, '..', name);
    if (!fs.existsSync(file)) continue;
    for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(/^(?:export\s+)?([a-zA-Z_][a-zA-Z_0-9]*)\s*=\s*(.*)$/);
      if (!match) continue;
      let val = match[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      } else {
        val = val.replace(/\s+#.*$/, '');
      }
      out[match[1]] = val;
    }
  }
  return out;
}

const rootEnv = loadRootEnv();
const backendPort =
  process.env.ADMIN_PORT ||
  process.env.BACKEND_PORT ||
  rootEnv.ADMIN_PORT ||
  rootEnv.BACKEND_PORT ||
  '8000';
const backendOrigin = process.env.ADMIN_API_ORIGIN || `http://127.0.0.1:${backendPort}`;
const partnerOrigin =
  process.env.NEXT_PUBLIC_PARTNER_ORIGIN ||
  rootEnv.NEXT_PUBLIC_PARTNER_ORIGIN ||
  'http://localhost:3001';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(__dirname),
  env: {
    NEXT_PUBLIC_PARTNER_ORIGIN: partnerOrigin
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
