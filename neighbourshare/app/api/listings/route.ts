import { getCurrentUserId } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db";
import {
  createListing,
  isCategory,
  listListings,
  listNeighborhoods,
} from "@/lib/listings/service";

// GET /api/listings?neighborhood=...&category=...  (public)
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const neighborhood = params.get("neighborhood") || null;
  const category = params.get("category") || null;
  const db = getDb();

  if (category && !isCategory(category)) {
    return Response.json({ error: "Unknown category." }, { status: 400 });
  }
  if (neighborhood && !(await listNeighborhoods(db)).includes(neighborhood)) {
    return Response.json({ error: "Unknown neighborhood." }, { status: 400 });
  }

  const listings = await listListings(db, { neighborhood, category });
  return Response.json({ listings });
}

// POST /api/listings  (signed-in members only)
export async function POST(request: Request) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return Response.json({ error: "Sign in to continue." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json(
      { error: "Send the listing as a JSON object." },
      { status: 400 },
    );
  }

  const result = await createListing(getDb(), userId, body);
  if (result.kind === "invalid") {
    return Response.json(
      { error: "Check the highlighted fields.", fields: result.errors },
      { status: 400 },
    );
  }
  return Response.json(
    { listing: result.listing },
    {
      status: 201,
      headers: { Location: `/api/listings/${result.listing.id}` },
    },
  );
}
