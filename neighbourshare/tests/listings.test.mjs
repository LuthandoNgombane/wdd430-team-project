import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { migrate } from '../scripts/database.mjs';
import { seed } from '../scripts/seed-data.mjs';
import { validateListing, isIsoDate } from '../lib/listings/validate.ts';
import { checkPhotoFile, sniffPhotoType, PHOTO_MAX_BYTES } from '../lib/listings/photo.ts';
import {
  countPendingOutsideAvailability,
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
      'https://a.b.public.blob.vercel-storage.com/a.jpg', // next/image only allows one subdomain
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

test('photo files', async (t) => {
  await t.test('accepts JPEG, PNG and WebP up to 5 MB', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp'])
      assert.equal(checkPhotoFile({ type, size: PHOTO_MAX_BYTES }), null, type);
  });

  await t.test('rejects other types, empty files and files over 5 MB', () => {
    assert.match(checkPhotoFile({ type: 'image/gif', size: 10 }), /JPEG, PNG or WebP/);
    assert.match(checkPhotoFile({ type: 'image/svg+xml', size: 10 }), /JPEG, PNG or WebP/);
    assert.match(checkPhotoFile({ type: 'image/png', size: 0 }), /empty/);
    assert.match(checkPhotoFile({ type: 'image/png', size: PHOTO_MAX_BYTES + 1 }), /5 MB/);
  });

  await t.test('detects the real type from the first bytes', () => {
    const bytes = (...b) => new Uint8Array(b);
    assert.equal(sniffPhotoType(bytes(0xff, 0xd8, 0xff, 0xe0)), 'image/jpeg');
    assert.equal(sniffPhotoType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), 'image/png');
    assert.equal(sniffPhotoType(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ')), 'image/webp');
    assert.equal(sniffPhotoType(new TextEncoder().encode('RIFF\0\0\0\0WAVEfmt ')), null);
    assert.equal(sniffPhotoType(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">')), null);
    assert.equal(sniffPhotoType(bytes(0xff, 0xd8)), null);
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

// #25: listings that have borrow requests.
// Seed data: listing 1 (WITH_REQUESTS) is available from 60 days ago to a year
// from now, with a pending request on days +10..+11 and an approved one on
// days +14..+15 (plus rejected, cancelled and completed ones).
test('protecting listings that have borrow requests', async (t) => {
  const db = await setup();
  const tx = (fn) => db.transaction(fn);
  // Same "today" as the app (South Africa), so the tests agree with it.
  const offsets = [-60, -20, -18, -5, -3, -1, 0, 1, 14, 15, 20, 365];
  const { rows: dayRows } = await db.query(
    `SELECT n, ((statement_timestamp() AT TIME ZONE 'Africa/Johannesburg')::date + n)::text AS d
     FROM unnest($1::int[]) AS n`,
    [offsets],
  );
  const days = Object.fromEntries(dayRows.map((r) => [r.n, r.d]));
  /** YYYY-MM-DD, n days from today (worked out once, before any transaction). */
  const day = (n) => days[n];
  const addRequest = async (status, from, to) => {
    const { rows } = await db.query(
      `INSERT INTO borrow_requests (listing_id, borrower_id, start_date, end_date, message, status)
       VALUES ($1, $2, $3, $4, 'Test', $5) RETURNING id`,
      [WITH_REQUESTS, OTHER, day(from), day(to), status],
    );
    return rows[0].id;
  };
  try {
    await t.test('blocks dates that would leave an approved borrow outside', async () => {
      const before = await getListing(db, WITH_REQUESTS);
      const later = await tx((c) => updateListing(c, OWNER, WITH_REQUESTS, { availableFrom: day(15) }));
      assert.equal(later.kind, 'conflict');
      assert.deepEqual(later.borrows, [{ startDate: day(14), endDate: day(15) }]);
      assert.ok(later.errors.availableFrom, 'the start date field explains why');
      assert.equal(later.errors.availableTo, undefined);

      const earlier = await tx((c) => updateListing(c, OWNER, WITH_REQUESTS, { availableTo: day(14) }));
      assert.equal(earlier.kind, 'conflict');
      assert.ok(earlier.errors.availableTo, 'the end date field explains why');
      assert.match(earlier.errors.availableTo, /approved borrow/);

      assert.deepEqual(await getListing(db, WITH_REQUESTS), before, 'nothing is saved');
    });

    await t.test('allows dates that still cover every approved borrow, and other edits', async () => {
      const ok = await tx((c) => updateListing(c, OWNER, WITH_REQUESTS, { availableFrom: day(14), availableTo: day(15) }));
      assert.equal(ok.kind, 'ok');
      assert.equal(ok.listing.availableFrom, day(14));
      assert.equal((await tx((c) => updateListing(c, OWNER, WITH_REQUESTS, { title: 'Renamed drill' }))).kind, 'ok', 'non-date edits are never blocked');
    });

    await t.test('reports pending requests that the new dates leave outside', async () => {
      // Days +14..+15 only: the pending request on +10..+11 is now outside.
      const narrowed = await tx((c) => updateListing(c, OWNER, WITH_REQUESTS, { availableFrom: day(14), availableTo: day(15) }));
      assert.equal(narrowed.pendingOutsideAvailability, 1);
      assert.equal(await countPendingOutsideAvailability(db, WITH_REQUESTS), 1);

      const widened = await tx((c) => updateListing(c, OWNER, WITH_REQUESTS, { availableFrom: day(-60), availableTo: day(365) }));
      assert.equal(widened.pendingOutsideAvailability, 0, 'changing the dates back makes the request valid again');
      assert.equal(await countPendingOutsideAvailability(db, WITH_REQUESTS), 0);
      assert.equal(await countPendingOutsideAvailability(db, 'not-a-uuid'), 0);
    });

    await t.test('borrows that already ended and expired requests do not block edits', async () => {
      const ended = await addRequest('approved', -20, -18);
      const expired = await addRequest('pending', -5, -3);
      const ok = await tx((c) => updateListing(c, OWNER, WITH_REQUESTS, { availableFrom: day(0) }));
      assert.equal(ok.kind, 'ok', 'an ended borrow must not stop the owner moving the dates forward');
      assert.equal(ok.pendingOutsideAvailability, 0, 'expired requests are not counted');
      await db.query('DELETE FROM borrow_requests WHERE id IN ($1, $2)', [ended, expired]);
    });

    await t.test('only an edit that leaves a borrow out is blocked, not a borrow that was already outside', async () => {
      // Data from before this rule existed: an approved borrow outside the dates.
      await db.query('UPDATE listings SET available_from = $2, available_to = $3 WHERE id = $1', [WITH_REQUESTS, day(14), day(365)]);
      const outside = await addRequest('approved', 1, 1);
      assert.equal((await tx((c) => updateListing(c, OWNER, WITH_REQUESTS, { title: 'Typo fixed' }))).kind, 'ok', 'unrelated edits still save');
      assert.equal((await tx((c) => updateListing(c, OWNER, WITH_REQUESTS, { availableTo: day(365) }))).kind, 'ok');
      // Narrowing the end so the seeded borrow on +14..+15 is left out is still blocked.
      assert.equal((await tx((c) => updateListing(c, OWNER, WITH_REQUESTS, { availableTo: day(14) }))).kind, 'conflict');
      await db.query('DELETE FROM borrow_requests WHERE id = $1', [outside]);
      await db.query('UPDATE listings SET available_from = $2 WHERE id = $1', [WITH_REQUESTS, day(-60)]);
    });

    await t.test('several left-out borrows are counted in the message', async () => {
      const second = await addRequest('approved', 20, 20);
      const result = await tx((c) => updateListing(c, OWNER, WITH_REQUESTS, { availableFrom: day(365) }));
      assert.equal(result.kind, 'conflict');
      assert.equal(result.borrows.length, 2);
      assert.match(result.errors.availableFrom, /2 approved borrows/);
      await db.query('DELETE FROM borrow_requests WHERE id = $1', [second]);
    });

    await t.test('an ongoing borrow still blocks edits', async () => {
      const ongoing = await addRequest('approved', -1, 1);
      const result = await tx((c) => updateListing(c, OWNER, WITH_REQUESTS, { availableFrom: day(1) }));
      assert.equal(result.kind, 'conflict');
      await db.query('DELETE FROM borrow_requests WHERE id = $1', [ongoing]);
    });

    await t.test('delete: blocked by upcoming requests, not by expired or ended ones', async () => {
      assert.equal((await tx((c) => deleteListing(c, OWNER, WITH_REQUESTS))).kind, 'has_requests');

      // Resolve the upcoming ones; leave an expired pending request and an ended borrow.
      await db.query("UPDATE borrow_requests SET status = 'cancelled' WHERE listing_id = $1 AND status IN ('pending', 'approved')", [WITH_REQUESTS]);
      await addRequest('pending', -5, -3);
      await addRequest('approved', -20, -18);
      assert.equal((await tx((c) => deleteListing(c, OWNER, WITH_REQUESTS))).kind, 'ok');
      assert.equal(await getListing(db, WITH_REQUESTS), null);
    });
  } finally {
    await db.close();
  }
});
