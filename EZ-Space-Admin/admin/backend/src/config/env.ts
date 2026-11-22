import fs from 'node:fs';
import path from 'node:path';

function readEnv(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {};
  const out: Record<string, string> = {};
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
    if (val !== 'YOUR_POSTGRES_PASSWORD') {
      out[match[1]] = val;
    }
  }
  return out;
}

export const backendRoot = path.resolve(__dirname, '../..');
export const adminRoot = path.resolve(backendRoot, '..');

const envCandidates = [
  path.resolve(adminRoot, '../../backend/.env'),
  path.resolve(adminRoot, '../backend/.env'),
  path.join(adminRoot, '.env'),
  path.join(adminRoot, '.env.local'),
  path.join(backendRoot, '.env'),
  path.join(backendRoot, '.env.local')
];

const mergedFileEnv: Record<string, string> = Object.assign(
  {},
  ...envCandidates.map(readEnv)
);

export const cfg: Record<string, string | undefined> = {
  ...mergedFileEnv,
  ...process.env
};
