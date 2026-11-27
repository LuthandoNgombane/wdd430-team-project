// Member profile queries. Route handlers pass in the database, so these
// functions can also be tested against an in-memory Postgres (see tests/).
import { compare } from "bcryptjs";
import {
  listListings,
  listNeighborhoods,
  type Listing,
  type Queryable,
} from "../listings/service.ts";
import {
  PROFILE_FIELDS,
  validateProfile,
  type ProfileErrors,
  type ProfileInput,
} from "./validate.ts";

/** The signed-in member's own profile, including private contact details. */
export type OwnProfile = ProfileInput & { id: string };

/** What any visitor may see. Never includes email or phone (FR-007). */
export type PublicProfile = {
  id: string;
  name: string;
  neighborhood: string;
  bio: string;
  /** Active listings only, newest first. */
  listings: Listing[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Member ids are UUIDs; anything else can't exist (and would make Postgres error). */
export function isUserId(id: string): boolean {
  return UUID.test(id);
}

// Explicit columns: never SELECT * from users (it has the password hash).
const SELECT_OWN = `SELECT id, name, email, neighborhood, phone, bio FROM users`;

/** Returns null for unknown or inactive members. */
export async function getOwnProfile(
  db: Queryable,
  userId: string,
): Promise<OwnProfile | null> {
  if (!isUserId(userId)) return null;
  const { rows } = await db.query(
    `${SELECT_OWN} WHERE id = $1 AND status = 'active'`,
    [userId],
  );
  return (rows[0] as OwnProfile | undefined) ?? null;
}

/** Returns null for unknown or inactive members. */
export async function getPublicProfile(
  db: Queryable,
  id: string,
): Promise<PublicProfile | null> {
  if (!isUserId(id)) return null;
  const { rows } = await db.query(
    `SELECT id, name, neighborhood, bio FROM users
     WHERE id = $1 AND status = 'active'`,
    [id],
  );
  const member = rows[0] as Omit<PublicProfile, "listings"> | undefined;
  if (!member) return null;
  return { ...member, listings: await listListings(db, { ownerId: id }) };
}

/** Field errors, plus the current password needed to change the email. */
export type UpdateProfileErrors = ProfileErrors & { currentPassword?: string };

export type UpdateProfileResult =
  | { kind: "ok"; profile: OwnProfile }
  | { kind: "not_found" }
  | { kind: "invalid"; errors: UpdateProfileErrors }
  | { kind: "email_taken" };

/**
 * Updates only the fields sent in the body, then checks the whole profile.
 * The member is always `userId` (from the session): an id in the body is
 * ignored, so members can only ever change their own profile.
 *
 * Changing the email (the sign-in address) also needs `currentPassword` in
 * the body, so someone using a session left open can't take the account over.
 * Call inside a transaction (withTransaction).
 */
export async function updateOwnProfile(
  tx: Queryable,
  userId: string,
  body: unknown,
): Promise<UpdateProfileResult> {
  if (!isUserId(userId)) return { kind: "not_found" };
  const { rows } = await tx.query(
    `SELECT id, name, email, neighborhood, phone, bio, password_hash AS "passwordHash"
     FROM users WHERE id = $1 AND status = 'active' FOR UPDATE`,
    [userId],
  );
  const row = rows[0] as (OwnProfile & { passwordHash: string }) | undefined;
  if (!row) return { kind: "not_found" };
  // The hash stays inside this function: it's never returned.
  const { passwordHash, ...current } = row;

  const changes =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const merged: Record<string, unknown> = {};
  for (const field of PROFILE_FIELDS) {
    merged[field] = field in changes ? changes[field] : current[field];
  }
  const result = validateProfile(merged, await listNeighborhoods(tx));
  if (!result.ok) return { kind: "invalid", errors: result.errors };
  const v = result.value;

  // Checked before the "email taken" check, so without the password nobody
  // can use this form to find out which emails have accounts.
  if (v.email !== current.email.trim().toLowerCase()) {
    const password = changes.currentPassword;
    if (typeof password !== "string" || !password) {
      return {
        kind: "invalid",
        errors: { currentPassword: "Enter your current password to change your email." },
      };
    }
    if (!(await compare(password, passwordHash))) {
      return {
        kind: "invalid",
        errors: { currentPassword: "That password is incorrect." },
      };
    }
  }

  // Checked first so the usual case gets a clear message. The unique index
  // still stops two members claiming the same address at the same moment.
  const taken = await tx.query(
    `SELECT 1 FROM users WHERE lower(btrim(email)) = $1 AND id <> $2 LIMIT 1`,
    [v.email, userId],
  );
  if (taken.rows.length) return { kind: "email_taken" };

  try {
    await tx.query(
      `UPDATE users SET name = $2, email = $3, neighborhood = $4, phone = $5, bio = $6
       WHERE id = $1`,
      [userId, v.name, v.email, v.neighborhood, v.phone, v.bio],
    );
  } catch (error) {
    // 23505 = unique violation on users_email_unique (see createUser).
    if ((error as { code?: string }).code === "23505") {
      return { kind: "email_taken" };
    }
    throw error;
  }
  return { kind: "ok", profile: { id: userId, ...v } };
}
