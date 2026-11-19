import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { migrate } from '../scripts/database.mjs';
import { seed } from '../scripts/seed-data.mjs';
import { validateListing, isIsoDate } from '../lib/listings/validate.ts';
import {
  createListing,
  deleteListing,
  getListing,
  listListings,
  updateListing,
} from '../lib/listings/service.ts';

const names = Array.from({ length: 8 }, (_, i) => `Test neighborhood ${i + 1}`);
// Seed data: user 1 owns every listing; listing 1 has a request in each status.
const OWNER = '43000000-0000-4000-8000-000000000001';
const OTHER = '43000000-0000-4000-8000-000000000002';
const WITH_REQUESTS = '43000000-0000-4000-8001-000000000001';
const NO_REQUESTS = '43000000-0000-4000-8001-000000000002';
const MISSING = '43000000-0000-4000-8001-999999999999';

const valid = {
  title: '  Ladder  ',
  description: 'Six-step aluminium ladder.',
  photoUrl: '/seed-item.svg',
  category: 'Tools',
  condition: 'Good',
  neighborhood: names[0],
  availableFrom: '2026-12-01',
  availableTo: '2026-12-31',
};

async function setup() {
  const db = new PGlite();
  // PGlite needs exec for the migration's multi-statement SQL.
  const client = { query: (sql, params) => sql.includes('CREATE TABLE neighborhoods') ? db.exec(sql) : db.query(sql, params) };
  await migrate(client);
  await seed(client, names, 'TestingOnly123');
  return db;
}

test('validateListing', async (t) => {
  await t.test('accepts a complete listing and trims text', () => {
    const result = validateListing(valid, names);
    assert.equal(result.ok, true);
    assert.equal(result.value.title, 'Ladder');
  });

  await t.test('reports every missing field', () => {
    const result = validateListing({}, names);
    assert.equal(result.ok, false);
    assert.deepEqual(Object.keys(result.errors).sort(), [
      'availableFrom', 'availableTo', 'category', 'condition', 'description', 'neighborhood', 'photoUrl', 'title',
    ]);
  });

  await t.test('only allows values from the fixed lists', () => {
    const result = validateListing({ ...valid, category: 'Cars', condition: 'Broken', neighborhood: 'Atlantis' }, names);
    assert.deepEqual(Object.keys(result.errors).sort(), ['category', 'condition', 'neighborhood']);
  });

  await t.test('checks dates: real calendar dates, start on or before end', () => {
    assert.equal(isIsoDate('2026-02-28'), true);
    assert.equal(isIsoDate('2026-02-30'), false);
    assert.equal(isIsoDate('12/01/2026'), false);
    assert.ok(validateListing({ ...valid, availableTo: '2026-11-30' }, names).errors.availableTo);
    assert.equal(validateListing({ ...valid, availableTo: valid.availableFrom }, names).ok, true);
  });

  await t.test('only allows /public files or Vercel Blob photo addresses', () => {
    for (const photoUrl of [
      'javascript:alert(1)', 'data:image/png;base64,AA',
      'http://abc.public.blob.vercel-storage.com/a.jpg', // not https
      'https://example.com/a.jpg', // host not set up for next/image
      'https://public.blob.vercel-storage.com.evil.com/a.jpg',
      'https://user:pw@abc.public.blob.vercel-storage.com/a.jpg',
      '//example.com/a.jpg', '/../secret', '/a.jpg?x=1', '/a b.jpg',
    ])
      assert.ok(validateListing({ ...valid, photoUrl }, names).errors.photoUrl, photoUrl);
    for (const photoUrl of ['/seed-item.svg', '/uploads/a-1_b.jpg', 'https://abc123.public.blob.vercel-storage.com/listings/a.jpg'])
      assert.equal(validateListing({ ...valid, photoUrl }, names).ok, true, photoUrl);
  });

  await t.test('limits title length', () => {
    assert.ok(validateListing({ ...valid, title: 'x'.repeat(101) }, names).errors.title);
  });
});

test('listing queries', async (t) => {
  const db = await setup();
  try {
    await t.test('browse returns active listings without private owner details', async () => {
      const listings = await listListings(db);
      assert.equal(listings.length, 8);
      const json = JSON.stringify(listings);
      assert.ok(!json.includes('example.com'), 'owner email must not be exposed');
      assert.ok(!json.includes('password'), 'password hash must not be exposed');
      assert.deepEqual(Object.keys(listings[0].owner).sort(), ['id', 'name', 'neighborhood']);
      assert.match(listings[0].availableFrom, /^\d{4}-\d{2}-\d{2}$/);
    });

    await t.test('filters by neighborhood, category, or both', async () => {
      assert.deepEqual((await listListings(db, { neighborhood: names[2] })).map((l) => l.neighborhood), [names[2]]);
      assert.deepEqual((await listListings(db, { category: 'Tools' })).map((l) => l.category), ['Tools']);
      assert.equal((await listListings(db, { neighborhood: names[0], category: 'Tools' })).length, 1);
      assert.equal((await listListings(db, { neighborhood: names[1], category: 'Tools' })).length, 0);
    });

    await t.test('getListing returns null for unknown or malformed ids', async () => {
      assert.equal(await getListing(db, MISSING), null);
      assert.equal(await getListing(db, 'not-a-uuid'), null);
      assert.equal((await getListing(db, NO_REQUESTS)).id, NO_REQUESTS);
    });

    await t.test('create validates, then saves for the signed-in owner', async () => {
      const invalid = await createListing(db, OTHER, { ...valid, title: '' });
      assert.equal(invalid.kind, 'invalid');
      assert.ok(invalid.errors.title);

      const created = await createListing(db, OTHER, valid);
      assert.equal(created.kind, 'ok');
      assert.equal(created.listing.owner.id, OTHER);
      assert.equal(created.listing.title, 'Ladder');
      assert.equal(created.listing.availableFrom, '2026-12-01');
      assert.equal((await listListings(db)).length, 9);
    });

    await t.test('update: owner only, partial changes, rechecks the whole listing', async () => {
      const tx = (fn) => db.transaction(fn);
      assert.equal((await tx((c) => updateListing(c, OTHER, NO_REQUESTS, { title: 'Mine now' }))).kind, 'forbidden');
      assert.equal((await tx((c) => updateListing(c, OWNER, MISSING, { title: 'x' }))).kind, 'not_found');

      const before = await getListing(db, NO_REQUESTS);
      const bad = await tx((c) => updateListing(c, OWNER, NO_REQUESTS, { availableTo: '2000-01-01' }));
      assert.equal(bad.kind, 'invalid');
      assert.ok(bad.errors.availableTo);

      const ok = await tx((c) => updateListing(c, OWNER, NO_REQUESTS, { title: 'Hedge trimmer', id: 'ignored', owner_id: OTHER }));
      assert.equal(ok.kind, 'ok');
      assert.equal(ok.listing.title, 'Hedge trimmer');
      assert.equal(ok.listing.owner.id, OWNER);
      assert.equal(ok.listing.description, before.description);
      assert.equal(ok.listing.availableTo, before.availableTo);
    });

    await t.test('delete: owner only, blocked by pending or approved requests', async () => {
      const tx = (fn) => db.transaction(fn);
      assert.equal((await tx((c) => deleteListing(c, OTHER, NO_REQUESTS))).kind, 'forbidden');
      assert.equal((await tx((c) => deleteListing(c, OWNER, WITH_REQUESTS))).kind, 'has_requests');
      assert.ok(await getListing(db, WITH_REQUESTS), 'blocked delete must leave the listing');

      assert.equal((await tx((c) => deleteListing(c, OWNER, NO_REQUESTS))).kind, 'ok');
      assert.equal(await getListing(db, NO_REQUESTS), null);
      assert.ok(!(await listListings(db)).some((l) => l.id === NO_REQUESTS));
      assert.equal((await tx((c) => deleteListing(c, OWNER, NO_REQUESTS))).kind, 'not_found');
      assert.equal((await tx((c) => updateListing(c, OWNER, NO_REQUESTS, { title: 'x' }))).kind, 'not_found');
    });

    await t.test('delete is allowed once requests are resolved', async () => {
      await db.query("UPDATE borrow_requests SET status = 'completed' WHERE listing_id = $1 AND status IN ('pending', 'approved')", [WITH_REQUESTS]);
      assert.equal((await db.transaction((c) => deleteListing(c, OWNER, WITH_REQUESTS))).kind, 'ok');
    });
  } finally {
    await db.close();
  }
});
