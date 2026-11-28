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

/**
 * Today's date for the community (South Africa), in SQL. The borrow requests
 * code (#49) uses the same expression, so both agree on what has expired.
 */
export const TODAY_SQL =
  "(statement_timestamp() AT TIME ZONE 'Africa/Johannesburg')::date";

/**
 * SQL condition: true when a borrow request's dates fall outside its
 * listing's availability. Pass the table aliases used in the query, e.g.
 * `${outsideAvailabilitySql("r", "l")} AS "outsideAvailability"`, so the
 * request pages can mark these requests for the owner and the borrower (#25).
 */
export function outsideAvailabilitySql(request = "r", listing = "l"): string {
  return `(${request}.start_date < ${listing}.available_from OR ${request}.end_date > ${listing}.available_to)`;
}

const dayFormat = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-12-01" → "Dec 1, 2026" (whole days, so read as UTC). */
function formatDay(isoDate: string): string {
  return dayFormat.format(new Date(`${isoDate}T00:00:00Z`));
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

type BorrowDates = { startDate: string; endDate: string };

export type UpdateResult =
  | {
      kind: "ok";
      listing: Listing;
      /** Pending requests the saved dates leave outside (they can't be approved). */
      pendingOutsideAvailability: number;
    }
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "invalid"; errors: FieldErrors }
  /** The new dates would leave approved borrows outside. Nothing was saved. */
  | { kind: "conflict"; errors: FieldErrors; borrows: BorrowDates[] };

/** Pending requests (not yet expired) whose dates are outside the listing's availability. */
export async function countPendingOutsideAvailability(
  db: Queryable,
  listingId: string,
): Promise<number> {
  if (!isListingId(listingId)) return 0;
  const { rows } = await db.query(
    `SELECT count(*)::int AS n
     FROM borrow_requests r JOIN listings l ON l.id = r.listing_id
     WHERE r.listing_id = $1 AND r.status = 'pending'
       AND r.start_date >= ${TODAY_SQL}
       AND ${outsideAvailabilitySql("r", "l")}`,
    [listingId],
  );
  return (rows[0] as { n: number }).n;
}

/**
 * Updates only the fields sent in the body, then checks the whole listing
 * (so changing just one date still checks start <= end).
 *
 * The edit is refused if it would leave out an approved borrow that the
 * current dates cover (#25). Borrows that are already outside (data from
 * before this rule) don't block unrelated edits. Ended borrows don't count
 * either: until "mark as returned" exists they stay approved forever, and
 * they'd stop an owner from ever moving the dates on.
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

  // The listing row is locked, so a borrow can't be approved in the meantime
  // (approving locks the same row).
  const { rows: outside } = await tx.query(
    `SELECT start_date::text AS "startDate", end_date::text AS "endDate"
     FROM borrow_requests
     WHERE listing_id = $1 AND status = 'approved' AND end_date >= ${TODAY_SQL}
       AND start_date >= $4 AND end_date <= $5          -- inside the current dates
       AND (start_date < $2 OR end_date > $3)           -- outside the new ones
     ORDER BY start_date`,
    [id, v.availableFrom, v.availableTo, current.availableFrom, current.availableTo],
  );
  if (outside.length) {
    const borrows = outside as BorrowDates[];
    const dates = (b: BorrowDates) =>
      `${formatDay(b.startDate)} to ${formatDay(b.endDate)}`;
    // One message per date field, about the borrows that field leaves out.
    const message = (left: BorrowDates[]) =>
      left.length === 1
        ? `These dates leave out an approved borrow (${dates(left[0])}).`
        : `These dates leave out ${left.length} approved borrows (the first is ${dates(left[0])}).`;
    const errors: FieldErrors = {};
    const startsBefore = borrows.filter((b) => b.startDate < v.availableFrom);
    const endsAfter = borrows.filter((b) => b.endDate > v.availableTo);
    if (startsBefore.length) errors.availableFrom = message(startsBefore);
    if (endsAfter.length) errors.availableTo = message(endsAfter);
    return { kind: "conflict", errors, borrows };
  }

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
  return {
    kind: "ok",
    listing: (await getListing(tx, id))!,
    pendingOutsideAvailability: await countPendingOutsideAvailability(tx, id),
  };
}

export type DeleteResult =
  | { kind: "ok" }
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "has_requests" };

/**
 * Removes a listing from browsing and from its page. The row is kept (status
 * 'inactive') because past borrow requests still point to it.
 *
 * Blocked while a request is still open (#25): a pending request that can
 * still be approved (start date not passed), or an approved borrow that
 * hasn't ended. Expired requests and ended borrows don't block.
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
     WHERE listing_id = $1
       AND ((status = 'pending' AND start_date >= ${TODAY_SQL})
         OR (status = 'approved' AND end_date >= ${TODAY_SQL}))
     LIMIT 1`,
    [id],
  );
  if (rows.length) return { kind: "has_requests" };

  await tx.query("UPDATE listings SET status = 'inactive' WHERE id = $1", [id]);
  return { kind: "ok" };
}
