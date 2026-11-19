import { getCurrentUserId } from "@/lib/auth/current-user";
import { getDb, withTransaction } from "@/lib/db";
import {
  deleteListing,
  getListing,
  updateListing,
} from "@/lib/listings/service";

const notFound = () =>
  Response.json({ error: "Listing not found." }, { status: 404 });
const unauthorized = () =>
  Response.json({ error: "Sign in to continue." }, { status: 401 });
const forbidden = () =>
  Response.json(
    { error: "You can only change your own listings." },
    { status: 403 },
  );

// GET /api/listings/[id]  (public)
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/listings/[id]">,
) {
  const { id } = await ctx.params;
  const listing = await getListing(getDb(), id);
  return listing ? Response.json({ listing }) : notFound();
}

// PATCH /api/listings/[id]  (owner only; send just the fields to change)
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/listings/[id]">,
) {
  const userId = await getCurrentUserId(request);
  if (!userId) return unauthorized();
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json(
      { error: "Send the changes as a JSON object." },
      { status: 400 },
    );
  }

  const result = await withTransaction((tx) =>
    updateListing(tx, userId, id, body),
  );
  switch (result.kind) {
    case "not_found":
      return notFound();
    case "forbidden":
      return forbidden();
    case "invalid":
      return Response.json(
        { error: "Check the highlighted fields.", fields: result.errors },
        { status: 400 },
      );
    case "ok":
      return Response.json({ listing: result.listing });
  }
}

// DELETE /api/listings/[id]  (owner only)
export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/listings/[id]">,
) {
  const userId = await getCurrentUserId(request);
  if (!userId) return unauthorized();
  const { id } = await ctx.params;

  const result = await withTransaction((tx) => deleteListing(tx, userId, id));
  switch (result.kind) {
    case "not_found":
      return notFound();
    case "forbidden":
      return forbidden();
    case "has_requests":
      return Response.json(
        {
          error:
            "This listing has pending or approved borrow requests. Resolve them before deleting it.",
        },
        { status: 409 },
      );
    case "ok":
      return new Response(null, { status: 204 });
  }
}
