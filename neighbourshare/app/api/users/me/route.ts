import { unstable_update } from "@/auth";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { getDb, withTransaction } from "@/lib/db";
import { getOwnProfile, updateOwnProfile } from "@/lib/profiles/service";

const unauthorized = () =>
  Response.json({ error: "Sign in to continue." }, { status: 401 });

// GET /api/users/me  (signed-in member: full profile, including contact details)
export async function GET(request: Request) {
  const userId = await getCurrentUserId(request);
  if (!userId) return unauthorized();
  const profile = await getOwnProfile(getDb(), userId);
  // A session for a member who no longer exists or was deactivated.
  return profile ? Response.json({ profile }) : unauthorized();
}

// PATCH /api/users/me  (signed-in member; send just the fields to change)
// The member always comes from the session, never from the body.
export async function PATCH(request: Request) {
  const userId = await getCurrentUserId(request);
  if (!userId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json(
      { error: "Send the profile as a JSON object." },
      { status: 400 },
    );
  }

  const result = await withTransaction((tx) =>
    updateOwnProfile(tx, userId, body),
  );
  switch (result.kind) {
    case "not_found":
      return unauthorized();
    case "invalid":
      return Response.json(
        { error: "Check the highlighted fields.", fields: result.errors },
        { status: 400 },
      );
    case "email_taken":
      return Response.json(
        {
          error: "Check the highlighted fields.",
          fields: { email: "Another account already uses this email." },
        },
        { status: 409 },
      );
    case "ok":
      try {
        // Refresh the session cookie so the header shows the new name.
        // auth.ts reloads the name and email from the database.
        await unstable_update({});
      } catch (error) {
        // The profile is saved; the header catches up at the next sign-in.
        console.error(
          "Session refresh after profile update failed:",
          error instanceof Error ? error.message : error,
        );
      }
      return Response.json({ profile: result.profile });
  }
}
