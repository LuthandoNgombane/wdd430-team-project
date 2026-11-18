import { hash } from 'bcryptjs';

export function validateNeighborhoods(names) {
  if (!Array.isArray(names) || names.length !== 8 || names.some(n => typeof n !== 'string' || !n.trim() || n !== n.trim()) || new Set(names.map(n => n.toLowerCase())).size !== 8) {
    throw new Error('Add exactly eight distinct, agreed neighborhood names to db/neighborhoods.json.');
  }
  return names;
}

export async function seed(client, names, password) {
  validateNeighborhoods(names);
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) throw new Error('SEED_PASSWORD must be 8+ characters and at most 72 bytes.');
  const passwordHash = await hash(password, 12);
  await client.query('BEGIN');
  try {
    await client.query('SELECT pg_advisory_xact_lock(430002)');
    const existing = await client.query('SELECT name FROM neighborhoods');
    if (existing.rows.some(row => !names.includes(row.name))) throw new Error('Existing neighborhoods differ; review them before seeding.');
    for (const name of names) await client.query('INSERT INTO neighborhoods(name) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
    // Dedicated, deterministic IDs; never overwrite existing users or their data.
    const users = [];
    for (let i = 0; i < 3; i++) {
      const id = `43000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;
      await client.query(`INSERT INTO users(id, name, email, password_hash, neighborhood, bio, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, true) ON CONFLICT (id) DO NOTHING`,
        [id, ['Alex Demo', 'Sione Demo', 'Luthando Demo'][i], `demo${i + 1}@example.com`, passwordHash, names[i], 'Development test account']);
      users.push(id);
    }
    const categories = ['Tools', 'Garden & Yard', 'Outdoor & Camping', 'Sports & Fitness', 'Electronics', 'Kitchen & Appliances', 'Party & Events', 'Other'];
    for (let i = 0; i < categories.length; i++) {
      const id = `43000000-0000-4000-8001-${String(i + 1).padStart(12, '0')}`;
      await client.query(`INSERT INTO listings(id, owner_id, title, description, photo_url, category, condition, neighborhood, available_from, available_to)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_DATE - 60,CURRENT_DATE + 365) ON CONFLICT (id) DO NOTHING`,
        [id, users[0], ['Cordless drill', 'Garden trimmer', 'Camping tent', 'Tennis racket', 'Projector', 'Stand mixer', 'Folding table', 'Luggage scale'][i], 'Demo item available for neighbors to borrow.', '/seed-item.svg', categories[i], ['New', 'Like new', 'Good', 'Fair'][i % 4], names[i]]);
    }
    for (const [i, status] of ['pending', 'approved', 'rejected', 'cancelled', 'completed'].entries()) {
      await client.query(`INSERT INTO borrow_requests(id,listing_id,borrower_id,start_date,end_date,message,status,rating)
        VALUES ($1,$2,$3,CURRENT_DATE + $4::integer,CURRENT_DATE + $5::integer,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [`43000000-0000-4000-8002-${String(i + 1).padStart(12, '0')}`, '43000000-0000-4000-8001-000000000001', users[1 + i % 2], i === 4 ? -10 : 10 + i * 4, i === 4 ? -8 : 11 + i * 4, 'May I borrow this item?', status, i === 4 ? 5 : null]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
