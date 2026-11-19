// Photo upload rules, shared by the listing form (browser) and the upload
// route (server). Spec FR-003: one photo, JPEG, PNG or WebP, at most 5 MB.

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

/** Allowed media types and the file extension each is saved with. */
export const PHOTO_TYPES: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** For the file input's accept attribute. */
export const PHOTO_ACCEPT = Object.keys(PHOTO_TYPES).join(",");

/** Returns an error message, or null when the file can be uploaded. */
export function checkPhotoFile(file: { type: string; size: number }): string | null {
  if (!PHOTO_TYPES[file.type]) return "Choose a JPEG, PNG or WebP image.";
  if (file.size === 0) return "This file is empty. Choose another photo.";
  if (file.size > PHOTO_MAX_BYTES)
    return "This photo is larger than 5 MB. Choose a smaller one.";
  return null;
}

/**
 * The real image type from the file's first bytes, or null if it is not a
 * JPEG, PNG or WebP. The browser-reported type can't be trusted on its own.
 */
export function sniffPhotoType(bytes: Uint8Array): string | null {
  const starts = (sig: number[], offset = 0) =>
    bytes.length >= offset + sig.length &&
    sig.every((b, i) => bytes[offset + i] === b);
  if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // "RIFF" .... "WEBP"
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8))
    return "image/webp";
  return null;
}
