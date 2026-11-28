// Profile field checks, shared by the API (server) and the profile form (browser).
// No database or server-only imports here, so the form can use it too.

export const NAME_MAX = 100;
export const EMAIL_MAX = 254;
export const PHONE_MAX = 30;
export const BIO_MAX = 500;

export type ProfileInput = {
  name: string;
  /** Trimmed and lower-case, like at sign-up, so one address is one account. */
  email: string;
  neighborhood: string;
  /** Optional; null when empty. Private: never shown on the public profile. */
  phone: string | null;
  bio: string;
};

export type ProfileField = keyof ProfileInput;
export type ProfileErrors = Partial<Record<ProfileField, string>>;

export const PROFILE_FIELDS: readonly ProfileField[] = [
  "name",
  "email",
  "neighborhood",
  "phone",
  "bio",
];

export type ProfileResult =
  { ok: true; value: ProfileInput } | { ok: false; errors: ProfileErrors };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Digits with the usual separators, e.g. "+27 82 555 0101" or "(082) 555-0101".
const PHONE_PATTERN = /^\+?[0-9 ().-]+$/;
const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15; // the international (E.164) maximum

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateProfile(
  input: unknown,
  neighborhoods: readonly string[],
): ProfileResult {
  const raw =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const name = text(raw.name);
  const email = text(raw.email).toLowerCase();
  const neighborhood = text(raw.neighborhood);
  const phone = text(raw.phone);
  // Only the ends are trimmed: line breaks inside the bio are kept.
  const bio = text(raw.bio);
  const errors: ProfileErrors = {};

  if (!name) errors.name = "Enter your name.";
  else if (name.length > NAME_MAX)
    errors.name = `Use ${NAME_MAX} characters or fewer.`;

  if (!email) errors.email = "Enter your email address.";
  else if (email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email))
    errors.email = "Enter a valid email address, like name@example.com.";

  if (!neighborhood) errors.neighborhood = "Choose your neighborhood.";
  else if (!neighborhoods.includes(neighborhood))
    errors.neighborhood = "Choose a neighborhood from the list.";

  if (phone) {
    const digits = phone.replace(/\D/g, "").length;
    if (
      phone.length > PHONE_MAX ||
      !PHONE_PATTERN.test(phone) ||
      digits < PHONE_MIN_DIGITS ||
      digits > PHONE_MAX_DIGITS
    ) {
      errors.phone = "Enter a phone number with 7 to 15 digits, like +27 82 555 0101.";
    }
  }

  if (bio.length > BIO_MAX) errors.bio = `Use ${BIO_MAX} characters or fewer.`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { name, email, neighborhood, phone: phone || null, bio },
  };
}
