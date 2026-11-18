import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

export function connect() {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in .env.local (see .env.example).');
  return new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
}

export async function migrate(client) {
  await client.query('BEGIN');
  try {
    await client.query("SELECT pg_advisory_xact_lock(430001)");
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const result = await client.query('SELECT version FROM schema_migrations WHERE version = $1', ['001']);
    if (!result.rows.length) {
      await client.query(await readFile(new URL('../db/001-initial.sql', import.meta.url), 'utf8'));
      await client.query('INSERT INTO schema_migrations(version) VALUES ($1)', ['001']);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

export async function run(action) {
  let client;
  try {
    client = connect();
    await client.connect();
    await action(client);
  } catch (error) {
    // Do not print driver errors or connection strings: they can contain secrets.
    console.error(`Database command failed${error.code ? ` (${error.code})` : ''}. Check configuration, connectivity and the README.`);
    process.exitCode = 1;
  } finally {
    if (client) await client.end();
  }
}
