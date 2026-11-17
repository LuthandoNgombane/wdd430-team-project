import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { compare } from 'bcryptjs';
import { migrate } from '../scripts/database.mjs';
import { seed, validateNeighborhoods } from '../scripts/seed-data.mjs';
import { readFile } from 'node:fs/promises';

// Fictional fixtures, not proposed project neighborhood names.
const names = Array.from({ length: 8 }, (_, i) => `Test neighborhood ${i + 1}`);

test('schema and seed are repeatable and enforce the issue requirements', async () => {
  const db = new PGlite();
  // PGlite needs exec for the migration's multi-statement SQL.
  const client = { query: (sql, params) => sql.includes('CREATE TABLE neighborhoods') ? db.exec(sql) : db.query(sql, params) };
  try {
    await migrate(client);
    await migrate(client);
    await seed(client, names, 'TestingOnly123');
    await seed(client, names, 'TestingOnly123');
    for (const [table, count] of [['neighborhoods', 8], ['users', 3], ['listings', 8], ['borrow_requests', 5], ['schema_migrations', 1]]) {
      assert.equal((await db.query(`SELECT count(*)::int AS count FROM ${table}`)).rows[0].count, count);
    }
    const user = (await db.query('SELECT * FROM users ORDER BY id LIMIT 1')).rows[0];
    assert.ok(await compare('TestingOnly123', user.password_hash));
    assert.notEqual(user.password_hash, 'TestingOnly123');
    const requestId = '43000000-0000-4000-8002-000000000001';
    for (const rating of [null, 1, 2, 3, 4, 5]) await db.query('UPDATE borrow_requests SET rating=$1 WHERE id=$2', [rating, requestId]);
    for (const rating of [0, 6, -1]) await assert.rejects(db.query('UPDATE borrow_requests SET rating=$1 WHERE id=$2', [rating, requestId]), { code: '23514' });
    await assert.rejects(db.query("UPDATE borrow_requests SET status='expired'"), { code: '23514' });
    await assert.rejects(db.query("UPDATE listings SET category='Unknown'"), { code: '23514' });
    await assert.rejects(db.query("UPDATE listings SET condition='Broken'"), { code: '23514' });
    await assert.rejects(db.query("UPDATE listings SET available_to=available_from-1"), { code: '23514' });
    await assert.rejects(db.query("UPDATE borrow_requests SET end_date=start_date-1"), { code: '23514' });
    await assert.rejects(db.query("UPDATE users SET neighborhood='Unknown'"), { code: '23503' });
    await assert.rejects(db.query("UPDATE users SET email=' DEMO1@EXAMPLE.COM ' WHERE email='demo2@example.com'"), { code: '23505' });
    await assert.rejects(db.query('DELETE FROM users WHERE id=$1', [user.id]), { code: '23001' });
    const statuses = (await db.query('SELECT DISTINCT status FROM borrow_requests')).rows.map(r => r.status).sort();
    assert.deepEqual(statuses, ['approved', 'cancelled', 'completed', 'pending', 'rejected']);
    // SQL domain options and the TypeScript options must remain synchronized.
    const domain = await readFile(new URL('../lib/domain.ts', import.meta.url), 'utf8');
    const categories = (await db.query('SELECT DISTINCT category FROM listings')).rows.map(r => r.category);
    for (const category of categories) assert.ok(domain.includes(`'${category}'`));
  } finally { await db.close(); }
});

test('unresolved neighborhood names cannot silently become real data', () => {
  assert.throws(() => validateNeighborhoods([]), /exactly eight/);
  assert.throws(() => validateNeighborhoods(Array(8).fill('Duplicate')), /exactly eight/);
  assert.deepEqual(validateNeighborhoods(names), names);
});
