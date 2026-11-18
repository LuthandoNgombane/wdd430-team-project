import { readFile } from 'node:fs/promises';
import { migrate, run } from './database.mjs';
import { seed, validateNeighborhoods } from './seed-data.mjs';

// Validate the unresolved team choices before contacting or changing a database.
const names = validateNeighborhoods(JSON.parse(await readFile(new URL('../db/neighborhoods.json', import.meta.url), 'utf8')));
await run(async client => {
  if (!process.env.SEED_PASSWORD || process.env.SEED_PASSWORD.length < 8 || Buffer.byteLength(process.env.SEED_PASSWORD) > 72) throw new Error('Set SEED_PASSWORD.');
  await migrate(client);
  await seed(client, names, process.env.SEED_PASSWORD);
  console.log('Demo data loaded. Existing demo records were preserved.');
});
