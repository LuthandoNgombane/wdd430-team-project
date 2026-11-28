import 'server-only';
import { compare, hash } from 'bcryptjs';
import { getDb } from '@/lib/db';
import type { SignUpData } from '@/lib/validation';

const BCRYPT_ROUNDS = 12;

// Used when no account matches, so a wrong email takes as long as a wrong
// password and response times do not reveal which emails are registered.
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO5bYzbJ8m0P6cY1rZ7n8u2O4lZ1hQy6e';

export async function getNeighborhoods(): Promise<string[]> {
  const result = await getDb().query<{ name: string }>('SELECT name FROM neighborhoods ORDER BY name');
  return result.rows.map((row) => row.name);
}

export class EmailTakenError extends Error {
  constructor() {
    super('An account with this email already exists.');
  }
}

/** Creates a member with a bcrypt-hashed password. Throws EmailTakenError for duplicates. */
export async function createUser(data: SignUpData): Promise<{ id: string }> {
  const passwordHash = await hash(data.password, BCRYPT_ROUNDS);
  try {
    const result = await getDb().query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, neighborhood)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [data.name, data.email, passwordHash, data.neighborhood],
    );
    return result.rows[0];
  } catch (error) {
    // 23505 = unique violation on users_email_unique. Relying on the database
    // index (not a SELECT first) means two sign-ups at the same moment still
    // cannot create two accounts.
    if ((error as { code?: string }).code === '23505') throw new EmailTakenError();
    throw error;
  }
}

export type SignedInUser = { id: string; name: string; email: string };

/** Returns the member only if the email exists, the password matches and the account is active. */
export async function verifyCredentials(email: string, password: string): Promise<SignedInUser | null> {
  const result = await getDb().query<SignedInUser & { password_hash: string; status: string }>(
    `SELECT id, name, email, password_hash, status
     FROM users
     WHERE lower(btrim(email)) = lower(btrim($1))`,
    [email],
  );
  const user = result.rows[0];
  const passwordMatches = await compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !passwordMatches || user.status !== 'active') return null;
  return { id: user.id, name: user.name, email: user.email };
}

/** The name and email to keep in the session cookie. Null for unknown or inactive members. */
export async function getSessionUser(id: string): Promise<SignedInUser | null> {
  const result = await getDb().query<SignedInUser>(
    `SELECT id, name, email FROM users WHERE id = $1 AND status = 'active'`,
    [id],
  );
  return result.rows[0] ?? null;
}