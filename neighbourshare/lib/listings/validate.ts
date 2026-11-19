// Listing field checks, shared by the API (server) and the listing form (browser).
// No database or server-only imports here, so the form can use it too.
import {
  CATEGORIES,
  CONDITIONS,
  type Category,
  type Condition,
} from "../domain.ts";

export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 2000;
const PHOTO_URL_MAX = 2048;

export type ListingInput = {
  title: string;
  description: string;
  photoUrl: string;
  category: Category;
  condition: Condition;
  neighborhood: string;
  /** YYYY-MM-DD, inclusive */
  availableFrom: string;
  /** YYYY-MM-DD, inclusive */
  availableTo: string;
};

export type ListingField = keyof ListingInput;
export type FieldErrors = Partial<Record<ListingField, string>>;

export const LISTING_FIELDS: readonly ListingField[] = [
  "title",
  "description",
  "photoUrl",
  "category",
  "condition",
  "neighborhood",
  "availableFrom",
  "availableTo",
];

export type ValidationResult =
  { ok: true; value: ListingInput } | { ok: false; errors: FieldErrors };

/** True for a real calendar date written as YYYY-MM-DD. */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

// Photos are uploaded to Vercel Blob (#19). next/image refuses hosts that are
// not set up in next.config.ts, so a photo from any other site would break
// the pages that show it. Keep this host in sync with images.remotePatterns.
const PHOTO_HOST_SUFFIX = ".public.blob.vercel-storage.com";

/** A file in /public (like the seed photo) or an https Vercel Blob URL. */
export function isAllowedPhotoUrl(value: string): boolean {
  if (value.startsWith("/")) {
    // Plain paths only: no "//host", "..", query strings or odd characters.
    return /^\/[A-Za-z0-9._\-/]+$/.test(value) && !/\/\/|\.\./.test(value);
  }
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(PHOTO_HOST_SUFFIX) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function text(raw: Record<string, unknown>, field: ListingField): string {
  const value = raw[field];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Checks every listing field. Pass the neighborhood names from the database
 * (server) or from the page props (browser) to check the neighborhood too.
 */
export function validateListing(
  raw: unknown,
  neighborhoods?: readonly string[],
): ValidationResult {
  const input =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const errors: FieldErrors = {};

  const title = text(input, "title");
  if (!title) errors.title = "Enter a title.";
  else if (title.length > TITLE_MAX)
    errors.title = `Use ${TITLE_MAX} characters or fewer.`;

  const description = text(input, "description");
  if (!description) errors.description = "Enter a description.";
  else if (description.length > DESCRIPTION_MAX)
    errors.description = `Use ${DESCRIPTION_MAX} characters or fewer.`;

  const photoUrl = text(input, "photoUrl");
  if (!photoUrl) errors.photoUrl = "Add a photo.";
  else if (photoUrl.length > PHOTO_URL_MAX || !isAllowedPhotoUrl(photoUrl))
    errors.photoUrl = "The photo address is not valid.";

  const category = text(input, "category");
  if (!(CATEGORIES as readonly string[]).includes(category))
    errors.category = "Choose a category from the list.";

  const condition = text(input, "condition");
  if (!(CONDITIONS as readonly string[]).includes(condition))
    errors.condition = "Choose a condition from the list.";

  const neighborhood = text(input, "neighborhood");
  if (!neighborhood) errors.neighborhood = "Choose a neighborhood.";
  else if (neighborhoods && !neighborhoods.includes(neighborhood))
    errors.neighborhood = "Choose a neighborhood from the list.";

  const availableFrom = text(input, "availableFrom");
  const availableTo = text(input, "availableTo");
  if (!isIsoDate(availableFrom))
    errors.availableFrom = "Enter a valid start date.";
  if (!isIsoDate(availableTo)) errors.availableTo = "Enter a valid end date.";
  // YYYY-MM-DD strings compare correctly as text.
  if (
    !errors.availableFrom &&
    !errors.availableTo &&
    availableFrom > availableTo
  )
    errors.availableTo = "The end date must be on or after the start date.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title,
      description,
      photoUrl,
      category: category as Category,
      condition: condition as Condition,
      neighborhood,
      availableFrom,
      availableTo,
    },
  };
}
