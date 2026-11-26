import "server-only";
import { connection } from "next/server";
import { auth } from "@/auth";

/**
 * Returns the signed-in member's id, or null when nobody is signed in.
 * Reads the Auth.js session cookie (set when the member signs in at /signin).
 *
 * The `request` argument is still accepted so existing route handlers keep
 * working, but it is no longer needed: auth() reads the cookie itself.
 */
export async function getCurrentUserId(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  request?: Request,
): Promise<string | null> {
  await connection(); // per-request: reads the session cookie
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Where to send signed-out visitors: the sign-in page, then back to `returnTo`. */
export function signInPath(returnTo: string): string {
  return `/signin?callbackUrl=${encodeURIComponent(returnTo)}`;
}