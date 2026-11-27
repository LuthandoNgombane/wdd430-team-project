
export type SignUpField = 'name' | 'email' | 'password' | 'neighborhood';
export type FieldErrors = Partial<Record<SignUpField, string>>;

export type SignUpData = {
  name: string;
  email: string;
  password: string;
  neighborhood: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 254;

/** Shared by sign-up and sign-in so both check and word it the same way. */
export const INVALID_EMAIL_MESSAGE = 'Enter a valid email address, like name@example.com.';

/** True when the (trimmed) email looks like name@example.com. */
export function isValidEmail(email: string): boolean {
  return email.length <= EMAIL_MAX && EMAIL_PATTERN.test(email);
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}


export function validateSignUp(
  input: Record<string, unknown>,
  neighborhoods: readonly string[],
): { data: SignUpData; errors: FieldErrors } {
  const data: SignUpData = {
    name: asText(input.name).trim(),
    // Stored trimmed and lower-case so the same address is always one account.
    email: asText(input.email).trim().toLowerCase(),
    // Passwords are never trimmed: spaces are allowed characters.
    password: asText(input.password),
    neighborhood: asText(input.neighborhood).trim(),
  };
  const errors: FieldErrors = {};

  if (!data.name) errors.name = 'Enter your name.';
  else if (data.name.length > 100) errors.name = 'Name must be 100 characters or fewer.';

  if (!data.email) errors.email = 'Enter your email address.';
  else if (!isValidEmail(data.email)) errors.email = INVALID_EMAIL_MESSAGE;

  if (!data.password) errors.password = 'Enter a password.';
  else if (data.password.length < 8) errors.password = 'Password must be at least 8 characters.';
  // bcrypt only uses the first 72 bytes of a password.
  else if (new TextEncoder().encode(data.password).length > 72)
    errors.password = 'Password is too long. Use 72 characters or fewer.';

  if (!data.neighborhood) errors.neighborhood = 'Choose your neighborhood.';
  else if (!neighborhoods.includes(data.neighborhood))
    errors.neighborhood = 'Choose a neighborhood from the list.';

  return { data, errors };
}