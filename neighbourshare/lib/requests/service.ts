import type { RequestStatus } from "../domain.ts";
import type { Queryable } from "../listings/service.ts";
import { isListingId } from "../listings/service.ts";
import { isIsoDate } from "../listings/validate.ts";

export const MESSAGE_MAX = 2000;
const TODAY =
  "(statement_timestamp() AT TIME ZONE 'Africa/Johannesburg')::date";
const STATUS = `CASE WHEN r.status = 'pending' AND r.start_date < ${TODAY}
                     THEN 'expired' ELSE r.status END`;

export type VisibleRequestStatus = RequestStatus | "expired";

type Role = "owner" | "borrower";
type Decision = "approved" | "rejected" | "cancelled";

const SELECT_REQUEST = `
  SELECT r.id, r.listing_id AS "listingId", l.title AS "listingTitle",
         l.owner_id AS "ownerId", r.borrower_id AS "borrowerId",
         r.start_date::text AS "startDate", r.end_date::text AS "endDate",
         r.message, ${STATUS} AS status, r.created_at AS "createdAt",
         CASE WHEN r.borrower_id = $1 AND r.status = 'approved'
              THEN jsonb_build_object('email', owner.email, 'phone', owner.phone)
         END AS "ownerContact"
  FROM borrow_requests r
  JOIN listings l ON l.id = r.listing_id
  JOIN users owner ON owner.id = l.owner_id`;

export async function listRequests(
  db: Queryable,
  userId: string,
  role: Role | null,
  status: VisibleRequestStatus | null,
): Promise<RequestRow[]> {
  const { rows } = await db.query(
    `${SELECT_REQUEST}
     WHERE ((l.owner_id = $1 AND ($2::text IS NULL OR $2 = 'owner'))
         OR (r.borrower_id = $1 AND ($2::text IS NULL OR $2 = 'borrower')))
       AND ($3::text IS NULL OR (${STATUS}) = $3)
     ORDER BY r.created_at DESC, r.id`,
    [userId, role, status],
  );
  return rows as RequestRow[];
}

type RequestRow = {
  id: string;
  listingId: string;
  listingTitle: string;
  ownerId: string;
  borrowerId: string;
  startDate: string;
  endDate: string;
  status: VisibleRequestStatus;
  message: string;
  createdAt: Date;
  ownerContact: { email: string; phone: string | null } | null;
};

type Failure = { kind: "error"; status: number; error: string };
type Result = { kind: "ok"; request: RequestRow } | Failure;

function fail(status: number, error: string): Failure {
  return { kind: "error", status, error };
}

export async function readRequest(
  db: Queryable,
  userId: string,
  id: string,
): Promise<Result> {
  if (!isListingId(id)) return fail(404, "Request not found.");
  const { rows } = await db.query(`${SELECT_REQUEST} WHERE r.id = $2`, [
    userId,
    id,
  ]);
  const request = rows[0] as RequestRow | undefined;
  if (!request) return fail(404, "Request not found.");
  if (request.ownerId !== userId && request.borrowerId !== userId) {
    return fail(403, "Only participants can view this request.");
  }
  return { kind: "ok", request };
}

type ListingDates = {
  ownerId: string;
  from: string;
  to: string;
  today: string;
  status: string;
};

// Creation, approval and listing edits/deletes serialize on the same listing row.
async function lockListing(tx: Queryable, id: string) {
  const { rows } = await tx.query(
    `SELECT owner_id AS "ownerId", available_from::text AS "from",
            available_to::text AS "to", ${TODAY}::text AS today, status
     FROM listings WHERE id = $1 FOR UPDATE`,
    [id],
  );
  return rows[0] as ListingDates | undefined;
}

async function checkDates(
  tx: Queryable,
  id: string,
  listing: ListingDates,
  start: string,
  end: string,
) {
  if (start < listing.from || end > listing.to) {
    return fail(
      409,
      `Choose dates within the listing's availability (${listing.from} to ${listing.to}).`,
    );
  }
  const { rows } = await tx.query(
    `SELECT 1 FROM borrow_requests
     WHERE listing_id = $1 AND status = 'approved'
       AND start_date <= $3 AND end_date >= $2 LIMIT 1`,
    [id, start, end],
  );
  if (rows.length)
    return fail(
      409,
      "Those dates overlap an approved request. Choose different dates.",
    );
}

function requestFields(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

export async function createRequest(
  tx: Queryable,
  userId: string,
  body: unknown,
): Promise<Result> {
  const { listingId, startDate, endDate, message } = requestFields(body);
  if (typeof listingId !== "string" || !isListingId(listingId)) {
    return fail(400, "Choose a valid listing.");
  }
  if (
    typeof startDate !== "string" ||
    !isIsoDate(startDate) ||
    typeof endDate !== "string" ||
    !isIsoDate(endDate) ||
    startDate > endDate
  ) {
    return fail(
      400,
      "Enter valid dates with the end date on or after the start date.",
    );
  }
  if (
    typeof message !== "string" ||
    !message.trim() ||
    message.length > MESSAGE_MAX ||
    message.includes("\0")
  ) {
    return fail(
      400,
      `Enter a valid message of up to ${MESSAGE_MAX} characters.`,
    );
  }

  const listing = await lockListing(tx, listingId);
  if (!listing || listing.status !== "active")
    return fail(404, "Listing not found.");
  if (listing.ownerId === userId)
    return fail(403, "You cannot borrow your own listing.");
  if (startDate < listing.today)
    return fail(400, "The start date cannot be in the past.");
  const conflict = await checkDates(tx, listingId, listing, startDate, endDate);
  if (conflict) return conflict;

  const { rows } = await tx.query(
    `INSERT INTO borrow_requests (listing_id, borrower_id, start_date, end_date, message)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [listingId, userId, startDate, endDate, message.trim()],
  );
  return readRequest(tx, userId, (rows[0] as { id: string }).id);
}

function isDecision(value: unknown): value is Decision {
  return value === "approved" || value === "rejected" || value === "cancelled";
}

export async function updateRequest(
  tx: Queryable,
  userId: string,
  id: string,
  body: unknown,
): Promise<Result> {
  const { status } = requestFields(body);
  if (!isDecision(status))
    return fail(400, "Choose approved, rejected or cancelled.");

  const result = await readRequest(tx, userId, id);
  if (result.kind === "error") return result;
  const { request } = result;
  const allowedUser =
    status === "cancelled" ? request.borrowerId : request.ownerId;
  if (allowedUser !== userId)
    return fail(403, "You cannot make this change to the request.");

  const alreadyUpdated = () => fail(409, "This request was already updated.");
  if (request.status !== "pending" && request.status !== "expired")
    return alreadyUpdated();

  if (status === "approved") {
    const listing = await lockListing(tx, request.listingId);
    if (!listing || listing.status !== "active")
      return fail(409, "This listing is no longer available.");
    const current = await readRequest(tx, userId, id);
    if (current.kind === "error") return current;
    if (current.request.status === "expired")
      return fail(409, "This request has expired.");
    if (current.request.status !== "pending") return alreadyUpdated();
    const conflict = await checkDates(
      tx,
      request.listingId,
      listing,
      request.startDate,
      request.endDate,
    );
    if (conflict) return conflict;
  }

  const { rows } = await tx.query(
    `UPDATE borrow_requests SET status = $2
     WHERE id = $1 AND status = 'pending'
       AND ($2 <> 'approved' OR start_date >= ${TODAY})
     RETURNING id`,
    [id, status],
  );
  if (!rows.length) {
    const latest = await readRequest(tx, userId, id);
    if (latest.kind === "ok" && latest.request.status === "expired") {
      return fail(409, "This request has expired.");
    }
    return alreadyUpdated();
  }
  return readRequest(tx, userId, id);
}
