'use strict';
const fs = require('node:fs');
const path = require('node:path');

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([a-zA-Z_][a-zA-Z_0-9]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
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

const root = path.resolve(__dirname, '../..');
const envCandidates = [
  path.resolve(root, '../../../Capstone1_EZ-Parking/backend/.env'),
  path.resolve(root, '../../Capstone1_EZ-Parking/backend/.env'),
  path.resolve(root, '../../backend/.env'),
  path.resolve(root, '../backend/.env'),
  path.join(root, '.env'),
  path.join(root, '.env.local')
];

const mergedFileEnv = Object.assign({}, ...envCandidates.map(readEnv));
const cfg = { ...mergedFileEnv, ...process.env };

module.exports = { cfg, root, readEnv };

