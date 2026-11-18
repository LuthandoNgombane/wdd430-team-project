import { migrate, run } from './database.mjs';
await run(async client => { await migrate(client); console.log('Database schema is up to date.'); });
