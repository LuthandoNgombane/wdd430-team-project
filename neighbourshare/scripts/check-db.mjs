import { run } from './database.mjs';
await run(async client => { await client.query('SELECT 1'); console.log('Database connection successful.'); });
