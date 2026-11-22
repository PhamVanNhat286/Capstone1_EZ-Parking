import 'dotenv/config';
import { Client } from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const action = process.argv[2] ?? 'check';
if (!['check', 'init', 'sync'].includes(action)) throw new Error('Use check, init or sync.');
const config = {
  host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'ez_space', connectionTimeoutMillis: 5000,
};
let client;
try {
  if (action === 'init') {
    const maintenance = new Client({ ...config, database: 'postgres' });
    try {
      await maintenance.connect();
      const exists = await maintenance.query('SELECT 1 FROM pg_database WHERE datname=$1', [config.database]);
      if (!exists.rowCount) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(config.database)) throw new Error('DB_NAME must be a simple PostgreSQL identifier for initialization.');
        await maintenance.query(`CREATE DATABASE "${config.database}"`);
      }
    } finally { await maintenance.end(); }
  }
  client = new Client(config); await client.connect();
  if (action === 'init') {
    await client.query('BEGIN');
    // Refuse seed.sql (contains TRUNCATE) whenever public already contains tables.
    const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    if (tables.rowCount) throw new Error('Database already has tables. Initialization stopped; no seed or data reset was executed. Use db:partner:check / db:partner:sync.');
    await client.query(await readFile(path.join(root, 'database/schema.sql'), 'utf8'));
    await client.query(await readFile(path.join(root, 'database/seed.sql'), 'utf8'));
    await client.query('COMMIT');
    console.log('Initialized the empty database from develop/database SQL.');
  }
  if (action === 'sync') {
    // The only additive enum change between the selected SQL revisions.
    const type = await client.query("SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.typname='payment_provider' AND n.nspname='public'");
    if (!type.rowCount) throw new Error('Missing payment_provider. Initialize an empty database first or apply the project schema migration.');
    await client.query("ALTER TYPE public.payment_provider ADD VALUE IF NOT EXISTS 'bank' BEFORE 'momo'");
    console.log('Payment provider synchronized; no application rows were changed.');
  }
  const contract = JSON.parse(await readFile(path.join(root, 'partner-frontend/src/lib/database.generated.json'), 'utf8'));
  const actual = (await client.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'")).rows;
  const missing = [];
  for (const [table, columns] of Object.entries(contract.tables)) {
    for (const column of columns) if (!actual.some(item => item.table_name === table && item.column_name === column)) missing.push(`${table}.${column}`);
  }
  const enums = (await client.query("SELECT t.typname,e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public'")).rows;
  for (const [type, values] of Object.entries(contract.enums)) for (const value of values) if (!enums.some(item => item.typname === type && item.enumlabel === value)) missing.push(`${type}:${value}`);
  if (missing.length) throw new Error(`Missing SQL contract fields/enums: ${missing.join(', ')}`);
  console.log(`PostgreSQL ${config.database}: all ${Object.keys(contract.tables).length} tables and SQL enums match the develop contract.`);
} catch (cause) {
  await client?.query('ROLLBACK').catch(() => {});
  const error = cause;
  if (error.code) console.error(`PostgreSQL error ${error.code}. Check DB_* in backend/.env; no credentials are printed.`);
  else console.error(error.message);
  process.exitCode = 1;
} finally { await client?.end(); }
