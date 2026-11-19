import "server-only";

/**
 * How listing photos are stored:
 * - "blob":        Vercel Blob (needs BLOB_READ_WRITE_TOKEN, from the Vercel project)
 * - "local":       development without a token: saved to public/uploads
 * - "unavailable": production without a token: uploads are turned off
 */
export type UploadMode = "blob" | "local" | "unavailable";

export function getUploadMode(): UploadMode {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  return process.env.NODE_ENV === "production" ? "unavailable" : "local";
}
