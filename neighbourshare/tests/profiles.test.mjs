import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { migrate } from '../scripts/database.mjs';
import { seed } from '../scripts/seed-data.mjs';
import { validateProfile, BIO_MAX } from '../lib/profiles/validate.ts';
import {
  getOwnProfile,
  getPublicProfile,
  updateOwnProfile,
} from '../lib/profiles/service.ts';

const names = Array.from({ length: 8 }, (_, i) => `Test neighborhood ${i + 1}`);
// Seed data: user 1 owns all 8 listings; user 2 owns none.
const OWNER = '43000000-0000-4000-8000-000000000001';
const OTHER = '43000000-0000-4000-8000-000000000002';
const MISSING = '43000000-0000-4000-8000-999999999999';

const valid = {
  name: '  Alex Demo  ',
  email: '  Alex.Demo@Example.COM ',
  neighborhood: names[0],
  phone: '+27 82 555 0101',
  bio: 'I like fixing bikes.\nHappy to lend my tools.',
};

async function setup() {
  const db = new PGlite();
  // PGlite needs exec for the migration's multi-statement SQL.
  const client = { query: (sql, params) => sql.includes('CREATE TABLE neighborhoods') ? db.exec(sql) : db.query(sql, params) };
  await migrate(client);
  await seed(client, names, 'TestingOnly123');
  return db;
}

test('validateProfile', async (t) => {
  await t.test('accepts a complete profile, trims text and lower-cases the email', () => {
    const result = validateProfile(valid, names);
    assert.equal(result.ok, true);
    assert.equal(result.value.name, 'Alex Demo');
    assert.equal(result.value.email, 'alex.demo@example.com');
    assert.equal(result.value.bio, valid.bio, 'line breaks inside the bio are kept');
  });

  await t.test('reports every missing required field', () => {
    const result = validateProfile({}, names);
    assert.equal(result.ok, false);
    assert.deepEqual(Object.keys(result.errors).sort(), ['email', 'name', 'neighborhood']);
  });

  await t.test('phone and bio are optional; an empty phone is stored as null', () => {
    const result = validateProfile({ ...valid, phone: '   ', bio: '' }, names);
    assert.equal(result.ok, true);
    assert.equal(result.value.phone, null);
    assert.equal(result.value.bio, '');
  });

  await t.test('the neighborhood must come from the fixed list', () => {
    assert.ok(validateProfile({ ...valid, neighborhood: 'Atlantis' }, names).errors.neighborhood);
  });

  await t.test('checks email, phone, name and bio formats and lengths', () => {
    assert.ok(validateProfile({ ...valid, email: 'not-an-email' }, names).errors.email);
    assert.ok(validateProfile({ ...valid, phone: 'call me' }, names).errors.phone);
    assert.ok(validateProfile({ ...valid, phone: '123' }, names).errors.phone, 'too few digits');
    assert.ok(validateProfile({ ...valid, phone: '1'.repeat(16) }, names).errors.phone, 'too many digits');
    assert.ok(validateProfile({ ...valid, name: 'x'.repeat(101) }, names).errors.name);
    assert.ok(validateProfile({ ...valid, bio: 'x'.repeat(BIO_MAX + 1) }, names).errors.bio);
    assert.equal(validateProfile({ ...valid, bio: 'x'.repeat(BIO_MAX) }, names).ok, true);
  });

  await t.test('values that are not text count as missing', () => {
    const result = validateProfile({ ...valid, name: 42, email: ['a@b.co'] }, names);
    assert.deepEqual(Object.keys(result.errors).sort(), ['email', 'name']);
  });
});

test('profile queries', async (t) => {
  const db = await setup();
  const tx = (fn) => db.transaction(fn);
  try {
    await t.test('getOwnProfile returns the member, including private contact details', async () => {
      const profile = await getOwnProfile(db, OWNER);
      assert.deepEqual(Object.keys(profile).sort(), ['bio', 'email', 'id', 'name', 'neighborhood', 'phone']);
      assert.equal(profile.id, OWNER);
      assert.equal(await getOwnProfile(db, MISSING), null);
      assert.equal(await getOwnProfile(db, 'not-a-uuid'), null);
    });

    await t.test('public profile shows only public fields and active listings', async () => {
      await db.query("UPDATE users SET phone = '+27 82 555 0199' WHERE id = $1", [OWNER]);
      const profile = await getPublicProfile(db, OWNER);
      assert.deepEqual(Object.keys(profile).sort(), ['bio', 'id', 'listings', 'name', 'neighborhood']);
      assert.equal(profile.listings.length, 8);
      assert.ok(profile.listings.every((l) => l.owner.id === OWNER));
      const json = JSON.stringify(profile);
      assert.ok(!json.includes('@'), 'email must never be exposed');
      assert.ok(!json.includes('555 0199'), 'phone must never be exposed');
      assert.ok(!json.includes('password'), 'password hash must never be exposed');
    });

    await t.test('public profile of a member without listings, and unknown members', async () => {
      assert.deepEqual((await getPublicProfile(db, OTHER)).listings, []);
      assert.equal(await getPublicProfile(db, MISSING), null);
      assert.equal(await getPublicProfile(db, 'not-a-uuid'), null);
    });

    await t.test('inactive listings and inactive members are hidden', async () => {
      const listing = '43000000-0000-4000-8001-000000000002';
      await db.query("UPDATE listings SET status = 'inactive' WHERE id = $1", [listing]);
      const profile = await getPublicProfile(db, OWNER);
      assert.equal(profile.listings.length, 7);
      assert.ok(!profile.listings.some((l) => l.id === listing));

      const inactive = '43000000-0000-4000-8000-000000000003';
      await db.query("UPDATE users SET status = 'inactive' WHERE id = $1", [inactive]);
      assert.equal(await getPublicProfile(db, inactive), null);
      assert.equal(await getOwnProfile(db, inactive), null);
      assert.equal((await tx((c) => updateOwnProfile(c, inactive, { name: 'x' }))).kind, 'not_found');
    });

    await t.test('update saves only the signed-in member, with partial changes', async () => {
      const before = await getOwnProfile(db, OTHER);
      const ok = await tx((c) => updateOwnProfile(c, OWNER, { bio: 'New bio', id: OTHER, email_verified: false, status: 'inactive' }));
      assert.equal(ok.kind, 'ok');
      assert.equal(ok.profile.id, OWNER);
      assert.equal(ok.profile.bio, 'New bio');
      assert.deepEqual(await getOwnProfile(db, OTHER), before, 'another member must never change');

      const { rows } = await db.query('SELECT status, email_verified FROM users WHERE id = $1', [OWNER]);
      // Seeded members are verified; the body tried to unverify and deactivate.
      assert.deepEqual(rows[0], { status: 'active', email_verified: true }, 'only profile fields can change');
    });

    await t.test('update validates the merged profile and saves nothing when invalid', async () => {
      const before = await getOwnProfile(db, OWNER);
      const bad = await tx((c) => updateOwnProfile(c, OWNER, { name: '', neighborhood: 'Atlantis' }));
      assert.equal(bad.kind, 'invalid');
      assert.deepEqual(Object.keys(bad.errors).sort(), ['name', 'neighborhood']);
      assert.deepEqual(await getOwnProfile(db, OWNER), before);
    });

    await t.test('changing the email needs the current password', async () => {
      const before = await getOwnProfile(db, OWNER);
      const missing = await tx((c) => updateOwnProfile(c, OWNER, { email: 'new.owner@example.com' }));
      assert.equal(missing.kind, 'invalid');
      assert.deepEqual(Object.keys(missing.errors), ['currentPassword']);

      const wrong = await tx((c) => updateOwnProfile(c, OWNER, { email: 'new.owner@example.com', currentPassword: 'WrongPassword1' }));
      assert.equal(wrong.kind, 'invalid');
      assert.ok(wrong.errors.currentPassword);
      assert.ok(!Object.hasOwn(wrong, 'profile'));
      assert.deepEqual(await getOwnProfile(db, OWNER), before, 'nothing is saved without the right password');

      const notText = await tx((c) => updateOwnProfile(c, OWNER, { email: 'new.owner@example.com', currentPassword: ['TestingOnly123'] }));
      assert.equal(notText.kind, 'invalid');
      assert.ok(notText.errors.currentPassword);
    });

    await t.test('the password is checked before revealing whether an email is taken', async () => {
      const other = await getOwnProfile(db, OTHER);
      const result = await tx((c) => updateOwnProfile(c, OWNER, { email: other.email, currentPassword: 'WrongPassword1' }));
      assert.equal(result.kind, 'invalid', 'a wrong password must not reveal that the email exists');
      assert.ok(result.errors.currentPassword);
    });

    await t.test('other fields, and the same email in another letter case, need no password', async () => {
      const own = await getOwnProfile(db, OWNER);
      assert.equal((await tx((c) => updateOwnProfile(c, OWNER, { name: 'No Password Needed', phone: '082 555 0101', email: ` ${own.email.toUpperCase()} ` }))).kind, 'ok');
    });

    await t.test('update normalizes values and can clear the phone', async () => {
      const ok = await tx((c) => updateOwnProfile(c, OWNER, { ...valid, phone: '', currentPassword: 'TestingOnly123' }));
      assert.equal(ok.kind, 'ok');
      assert.deepEqual(ok.profile, { id: OWNER, name: 'Alex Demo', email: 'alex.demo@example.com', neighborhood: names[0], phone: null, bio: valid.bio });
      assert.deepEqual(await getOwnProfile(db, OWNER), ok.profile);
    });

    await t.test("update rejects another member's email, in any letter case", async () => {
      const other = await getOwnProfile(db, OTHER);
      const taken = await tx((c) => updateOwnProfile(c, OWNER, { email: ` ${other.email.toUpperCase()} `, currentPassword: 'TestingOnly123' }));
      assert.equal(taken.kind, 'email_taken');
      assert.notEqual((await getOwnProfile(db, OWNER)).email, other.email);

      const own = await getOwnProfile(db, OWNER);
      assert.equal((await tx((c) => updateOwnProfile(c, OWNER, { email: own.email.toUpperCase() }))).kind, 'ok', 'keeping your own email is fine');
    });

    await t.test('update of an unknown member is not_found', async () => {
      assert.equal((await tx((c) => updateOwnProfile(c, MISSING, { name: 'x' }))).kind, 'not_found');
      assert.equal((await tx((c) => updateOwnProfile(c, 'not-a-uuid', { name: 'x' }))).kind, 'not_found');
    });
  } finally {
    await db.close();
  }
});
