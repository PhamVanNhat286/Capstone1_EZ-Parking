// Read SQL as data. This script never connects to PostgreSQL or executes SQL.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const schema = await readFile(path.join(root, 'database/schema.sql'), 'utf8');
const seed = await readFile(path.join(root, 'database/seed.sql'), 'utf8');
const unquote = s => s.slice(1, -1).replaceAll("''", "'");
function uncomment(text) {
  let quoted = false, out = '';
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "'") {
      out += text[i];
      if (quoted && text[i + 1] === "'") { out += text[++i]; continue; }
      quoted = !quoted;
    } else if (!quoted && text.slice(i, i + 2) === '--') {
      while (i < text.length && text[i] !== '\n') i++;
      out += '\n';
    } else out += text[i];
  }
  return out;
}
function split(text, delimiter) {
  let quoted = false, depth = 0, start = 0;
  const parts = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "'") {
      if (quoted && text[i + 1] === "'") { i++; continue; }
      quoted = !quoted;
    } else if (!quoted) {
      if (c === '(') depth++;
      if (c === ')') depth--;
      if (c === delimiter && depth === 0) { parts.push(text.slice(start, i).trim()); start = i + 1; }
    }
  }
  if (text.slice(start).trim()) parts.push(text.slice(start).trim());
  return parts;
}
const cleanSchema = uncomment(schema);
const enums = Object.fromEntries([...cleanSchema.matchAll(/CREATE TYPE (\w+) AS ENUM\s*\(([\s\S]*?)\);/g)]
  .map(([, name, values]) => [name, split(values, ',').map(unquote)]));
const tables = Object.fromEntries([...cleanSchema.matchAll(/CREATE TABLE(?: IF NOT EXISTS)? (\w+)\s*\(([\s\S]*?)\n\);/g)]
  .map(([, name, body]) => [name, split(body, ',').filter(c => !/^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK)\b/i.test(c)).map(c => c.match(/^(\w+)/)[1])]));
// NOW() in seed.sql is relative. Resolve all rows against the same preview clock.
function literal(expression) {
  const value = expression.trim();
  if (/^NULL$/i.test(value)) return null;
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (/^'.*'::jsonb$/s.test(value)) return JSON.parse(unquote(value.slice(0, -7)));
  if (/^'.*'$/s.test(value)) return unquote(value);
  if (/^NOW\(\)/i.test(value)) {
    let offset = 0;
    const rest = value.replace(/^NOW\(\)/i, '');
    const intervals = [...rest.matchAll(/([+-])\s*INTERVAL\s*'(\d+) (minutes?|hours?|days?)'/gi)];
    if (rest.replace(/([+-])\s*INTERVAL\s*'\d+ (minutes?|hours?|days?)'/gi, '').trim()) throw new Error(`Unsupported seed expression: ${value}`);
    for (const [, sign, count, unit] of intervals) offset += (sign === '+' ? 1 : -1) * Number(count) * (unit.startsWith('day') ? 86400000 : unit.startsWith('hour') ? 3600000 : 60000);
    return { $now: offset };
  }
  const digest = value.match(/^encode\(digest\('([^']*)',\s*'sha256'\),\s*'hex'\)$/i);
  if (digest) return createHash('sha256').update(digest[1]).digest('hex');
  throw new Error(`Unsupported seed expression: ${value}`);
}
const rows = Object.fromEntries(Object.keys(tables).map(name => [name, []]));
for (const statement of split(uncomment(seed), ';')) {
  const match = statement.match(/^INSERT INTO (\w+)\s*\(([\s\S]*?)\)\s*VALUES\s*([\s\S]*)$/i);
  if (!match) continue;
  const [, name, columnsText, values] = match;
  const columns = split(columnsText, ',');
  for (const tuple of split(values, ',')) {
    if (!tuple.startsWith('(') || !tuple.endsWith(')')) throw new Error(`Bad tuple in ${name}`);
    const cells = split(tuple.slice(1, -1), ',').map(literal);
    if (cells.length !== columns.length) throw new Error(`Column count in ${name}`);
    const row = Object.fromEntries(columns.map((column, i) => [column, cells[i]]));
    if (!row.id) row.id = rows[name].length + 1;
    // Password hashes / provider payloads have no place in a browser preview.
    delete row.password_hash;
    delete row.raw_ipn_payload;
    rows[name].push(row);
  }
}
const output = { source: 'database/schema.sql + database/seed.sql', schema_sha256: createHash('sha256').update(schema.replaceAll('\r\n', '\n')).digest('hex'), seed_sha256: createHash('sha256').update(seed.replaceAll('\r\n', '\n')).digest('hex'), enums, tables, rows };
const target = path.join(root, 'partner-frontend/src/lib/database.generated.json');
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, JSON.stringify(output, null, 2) + '\n');
console.log(`Generated ${Object.keys(tables).length} table contracts and SQL seed preview. No SQL was executed.`);
