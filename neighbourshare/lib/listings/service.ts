// Listing database queries. Route handlers pass in the database, so these
// functions can also be tested against an in-memory Postgres (see tests/).
import { CATEGORIES, type Category } from "../domain.ts";
import {
  LISTING_FIELDS,
  validateListing,
  type FieldErrors,
} from "./validate.ts";

/** Anything with a pg-style query(): the shared pool, a transaction client, PGlite. */
export type Queryable = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
};

/** Public listing data. Never includes the owner's email or phone (FR-007). */
export type Listing = {
  id: string;
  title: string;
  description: string;
  photoUrl: string;
  category: string;
  condition: string;
  neighborhood: string;
  availableFrom: string;
  availableTo: string;
  createdAt: string;
  owner: { id: string; name: string; neighborhood: string };
};

type ListingRow = Omit<Listing, "owner" | "createdAt"> & {
  createdAt: Date | string;
  ownerId: string;
  ownerName: string;
  ownerNeighborhood: string;
};

// Dates are cast to text so they stay YYYY-MM-DD. Without the cast, pg turns
// them into JavaScript Dates and they can shift by a day across time zones.
const SELECT_LISTING = `
  SELECT l.id, l.title, l.description, l.photo_url AS "photoUrl",
         l.category, l.condition, l.neighborhood,
         l.available_from::text AS "availableFrom",
         l.available_to::text AS "availableTo",
         l.created_at AS "createdAt",
         u.id AS "ownerId", u.name AS "ownerName",
         u.neighborhood AS "ownerNeighborhood"
  FROM listings l
  JOIN users u ON u.id = l.owner_id`;

function toListing(row: ListingRow): Listing {
  const { ownerId, ownerName, ownerNeighborhood, createdAt, ...rest } = row;
  return {
    ...rest,
    createdAt: new Date(createdAt).toISOString(),
    owner: { id: ownerId, name: ownerName, neighborhood: ownerNeighborhood },
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Listing ids are UUIDs; anything else can't exist (and would make Postgres error). */
export function isListingId(id: string): boolean {
  return UUID.test(id);
}

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export async function listNeighborhoods(db: Queryable): Promise<string[]> {
  const { rows } = await db.query(
    "SELECT name FROM neighborhoods ORDER BY name",
  );
  return (rows as { name: string }[]).map((r) => r.name);
}

export async function listListings(
  db: Queryable,
  filters: { neighborhood?: string | null; category?: string | null } = {},
): Promise<Listing[]> {
  const { rows } = await db.query(
    `${SELECT_LISTING}
     WHERE l.status = 'active'
       AND ($1::text IS NULL OR l.neighborhood = $1)
       AND ($2::text IS NULL OR l.category = $2)
     ORDER BY l.created_at DESC, l.id`,
    [filters.neighborhood ?? null, filters.category ?? null],
  );
  return (rows as ListingRow[]).map(toListing);
}

/** Returns null when the listing doesn't exist or was deleted. */
export async function getListing(
  db: Queryable,
  id: string,
): Promise<Listing | null> {
  if (!isListingId(id)) return null;
  const { rows } = await db.query(
    `${SELECT_LISTING} WHERE l.id = $1 AND l.status = 'active'`,
    [id],
  );
  return rows.length ? toListing(rows[0] as ListingRow) : null;
}

export type CreateResult =
  { kind: "ok"; listing: Listing } | { kind: "invalid"; errors: FieldErrors };

export async function createListing(
  db: Queryable,
  ownerId: string,
  body: unknown,
): Promise<CreateResult> {
  const result = validateListing(body, await listNeighborhoods(db));
  if (!result.ok) return { kind: "invalid", errors: result.errors };
  const v = result.value;
  const { rows } = await db.query(
    `INSERT INTO listings (owner_id, title, description, photo_url, category,
       condition, neighborhood, available_from, available_to)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      ownerId,
      v.title,
      v.description,
      v.photoUrl,
      v.category,
      v.condition,
      v.neighborhood,
      v.availableFrom,
      v.availableTo,
    ],
  );
  const listing = await getListing(db, (rows[0] as { id: string }).id);
  return { kind: "ok", listing: listing! };
}

type OwnedRow = { ownerId: string };

/** Locks the listing row so a concurrent edit, delete or request has to wait. */
async function lockListing(
  tx: Queryable,
  id: string,
): Promise<OwnedRow | null> {
  if (!isListingId(id)) return null;
  const { rows } = await tx.query(
    `SELECT owner_id AS "ownerId" FROM listings
     WHERE id = $1 AND status = 'active' FOR UPDATE`,
    [id],
  );
  return (rows[0] as OwnedRow | undefined) ?? null;
}

export type UpdateResult =
  | { kind: "ok"; listing: Listing }
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "invalid"; errors: FieldErrors };

/**
 * Updates only the fields sent in the body, then checks the whole listing
 * (so changing just one date still checks start <= end).
 * Call inside a transaction (withTransaction).
 */
export async function updateListing(
  tx: Queryable,
  userId: string,
  id: string,
  body: unknown,
): Promise<UpdateResult> {
  const locked = await lockListing(tx, id);
  if (!locked) return { kind: "not_found" };
  if (locked.ownerId !== userId) return { kind: "forbidden" };

  const current = (await getListing(tx, id))!;
  const changes =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const merged: Record<string, unknown> = {};
  for (const field of LISTING_FIELDS) {
    merged[field] = field in changes ? changes[field] : current[field];
  }

  const result = validateListing(merged, await listNeighborhoods(tx));
  if (!result.ok) return { kind: "invalid", errors: result.errors };
  const v = result.value;
  await tx.query(
    `UPDATE listings SET title = $2, description = $3, photo_url = $4,
       category = $5, condition = $6, neighborhood = $7,
       available_from = $8, available_to = $9
     WHERE id = $1`,
    [
      id,
      v.title,
      v.description,
      v.photoUrl,
      v.category,
      v.condition,
      v.neighborhood,
      v.availableFrom,
      v.availableTo,
    ],
  );
  return { kind: "ok", listing: (await getListing(tx, id))! };
}

export type DeleteResult =
  | { kind: "ok" }
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "has_requests" };

/**
 * Removes a listing from browsing and from its page. The row is kept (status
 * 'inactive') because past borrow requests still point to it.
 * Call inside a transaction (withTransaction).
 */
export async function deleteListing(
  tx: Queryable,
  userId: string,
  id: string,
): Promise<DeleteResult> {
  const locked = await lockListing(tx, id);
  if (!locked) return { kind: "not_found" };
  if (locked.ownerId !== userId) return { kind: "forbidden" };

  const { rows } = await tx.query(
    `SELECT 1 FROM borrow_requests
     WHERE listing_id = $1 AND status IN ('pending', 'approved') LIMIT 1`,
    [id],
  );
  if (rows.length) return { kind: "has_requests" };

  await tx.query("UPDATE listings SET status = 'inactive' WHERE id = $1", [id]);
  return { kind: "ok" };
}
