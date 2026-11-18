import 'server-only';
import { Pool, type PoolClient } from 'pg';

const globalForDb = globalThis as unknown as { neighbourSharePool?: Pool };

/** Use from server code only. Neon URLs must include sslmode=require. */
export function getDb(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing. Configure .env.local using .env.example.');
  }
  return (globalForDb.neighbourSharePool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
  }));
}

/** All queries in the callback must use this client, not the shared pool. */
export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getDb().connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
