import "server-only";
import { headers } from "next/headers";

/**
 * Returns the signed-in member's id, or null when nobody is signed in.
 * Route handlers pass their request; pages call it without arguments.
 *
 * TEMPORARY until sign-in (#14) is merged. Then replace the body with the
 * Auth.js session, for example:
 *   const session = await auth();
 *   return session?.user?.id ?? null;
 *
 * Until then, in development only, the member is taken from:
 * 1. the "x-dev-user-id" request header (handy for testing with curl), or
 * 2. DEV_USER_ID in .env.local (so the browser acts as that member).
 * In production this always returns null, so nothing here can be used to
 * pretend to be another member on the live site.
 */
export async function getCurrentUserId(
  request?: Request,
): Promise<string | null> {
  // Read the request first, so pages that call this always render per request.
  const requestHeaders = request?.headers ?? (await headers());
  if (process.env.NODE_ENV === "production") return null;
  const id = (
    requestHeaders.get("x-dev-user-id") ||
    process.env.DEV_USER_ID ||
    ""
  )
    .trim()
    .toLowerCase();
  // Postgres returns ids in lowercase; anything that isn't a UUID can't be a member.
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
    id,
  )
    ? id
    : null;
}

/**
 * Where to send signed-out visitors. Auth.js serves this route and forwards
 * to the custom sign-in page from #14, then back to `returnTo`.
 */
export function signInPath(returnTo: string): string {
  return `/api/auth/signin?callbackUrl=${encodeURIComponent(returnTo)}`;
}
