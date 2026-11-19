import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUserId } from "@/lib/auth/current-user";
import {
  checkPhotoFile,
  PHOTO_MAX_BYTES,
  PHOTO_TYPES,
  sniffPhotoType,
} from "@/lib/listings/photo";
import { getUploadMode } from "@/lib/listings/upload-mode";

const error = (message: string, status: number) =>
  Response.json({ error: message }, { status });

// POST /api/uploads  (signed-in members only)
//
// With Vercel Blob, the browser uploads the photo straight to Blob (so the
// 5 MB file doesn't hit Vercel's 4.5 MB request limit). This route only hands
// out a short-lived upload token, limited to one image of at most 5 MB.
//
// In development without a Blob token, the browser sends the file here as
// form data and it is saved to public/uploads instead.
export async function POST(request: Request) {
  const userId = await getCurrentUserId(request);
  if (!userId) return error("Sign in to continue.", 401);

  const mode = getUploadMode();
  if (mode === "blob") return blobToken(request);
  if (mode === "local") return saveLocally(request);
  return error("Photo uploads are not set up yet.", 503);
}

async function blobToken(request: Request) {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return error("Send the upload request as JSON.", 400);
  }
  // No upload-completed callback is registered, so only token requests are expected.
  if (body?.type !== "blob.generate-client-token") {
    return error("Unsupported upload request.", 400);
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!/^listings\/[a-z0-9-]+\.(jpg|png|webp)$/.test(pathname)) {
          throw new Error("Invalid photo name.");
        }
        return {
          allowedContentTypes: Object.keys(PHOTO_TYPES),
          maximumSizeInBytes: PHOTO_MAX_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(result);
  } catch {
    return error("The photo could not be uploaded. Try again.", 400);
  }
}

async function saveLocally(request: Request) {
  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("photo");
  } catch {
    return error("Send the photo as form data.", 400);
  }
  if (!(file instanceof File)) return error("Add a photo.", 400);

  const problem = checkPhotoFile(file);
  if (problem) return error(problem, 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffPhotoType(bytes);
  if (!type) return error("Choose a JPEG, PNG or WebP image.", 400);

  const name = `${randomUUID()}.${PHOTO_TYPES[type]}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
  return Response.json({ url: `/uploads/${name}` }, { status: 201 });
}
