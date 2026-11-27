'use server';

import { AuthError } from 'next-auth';
import { signIn, signOut } from '@/auth';
import { INVALID_EMAIL_MESSAGE, isValidEmail } from '@/lib/validation';

export type SignInState = {
  errors?: { email?: string; password?: string };
  message?: string;
  email?: string;
};

function safeRedirect(value: FormDataEntryValue | null): string {
  const path = typeof value === 'string' ? value : '';
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\') ? path : '/dashboard';
}

export async function authenticate(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  const errors: SignInState['errors'] = {};
  if (!email) errors.email = 'Enter your email address.';
  // Same check and message as sign-up. Only the format is checked, so this
  // never reveals whether an account exists.
  else if (!isValidEmail(email.toLowerCase())) errors.email = INVALID_EMAIL_MESSAGE;
  if (!password) errors.password = 'Enter your password.';
  if (errors.email || errors.password) return { errors, email };

  try {
    await signIn('credentials', { email, password, redirectTo: safeRedirect(formData.get('redirectTo')) });
  } catch (error) {
    if (error instanceof AuthError) {
      // Same message for a wrong email or a wrong password.
      if (error.type === 'CredentialsSignin') return { message: 'Incorrect email or password.', email };
      return { message: 'Something went wrong. Please try again.', email };
    }
    
    throw error;
  }
  return {};
}

export async function signOutAction() {
  await signOut({ redirectTo: '/' });
}