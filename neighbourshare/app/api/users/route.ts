import { NextResponse } from 'next/server';
import { createUser, EmailTakenError, getNeighborhoods } from '@/lib/users';
import { validateSignUp } from '@/lib/validation';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Send the sign-up details as JSON.' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ message: 'Send the sign-up details as JSON.' }, { status: 400 });
  }

  try {
    const neighborhoods = await getNeighborhoods();
    const { data, errors } = validateSignUp(body as Record<string, unknown>, neighborhoods);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const user = await createUser(data);
    // Only the new id is returned: never send back the password or its hash.
    return NextResponse.json({ id: user.id }, { status: 201 });
  } catch (error) {
    if (error instanceof EmailTakenError) {
      return NextResponse.json(
        { errors: { email: 'An account with this email already exists.' }, code: 'EMAIL_TAKEN' },
        { status: 409 },
      );
    }
    console.error('Sign-up failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}