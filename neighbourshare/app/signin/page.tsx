import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { CheckCircleIcon } from '@/components/ui/icons';
import SignInForm from './SignInForm';

export const metadata: Metadata = { title: 'Sign in | NeighbourShare' };

type SearchParams = Promise<{ callbackUrl?: string | string[]; registered?: string | string[] }>;

// Reads the URL (?callbackUrl=/dashboard, ?registered=1) at request time.
async function SignInContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const callbackUrl = typeof params.callbackUrl === 'string' ? params.callbackUrl : '/dashboard';
  let redirectTo = '/dashboard';
  try {
    const url = new URL(callbackUrl, 'http://placeholder');
    redirectTo = url.pathname + url.search;
  } catch {
    // Not a valid URL: keep the /dashboard default.
  }

  return (
    <>
      {params.registered === '1' && (
        // Same look as the "Profile saved" banner: tinted background, border
        // and icon, so success messages are easy to spot.
        <div role="status" className="mb-6 flex gap-3 rounded-md border border-primary bg-primary/10 p-4">
          <CheckCircleIcon width={20} height={20} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold">Account created</p>
            <p className="mt-1">Sign in to continue.</p>
          </div>
        </div>
      )}
      <SignInForm redirectTo={redirectTo} />
    </>
  );
}

export default function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Sign in</h1>
      <p className="mb-8 text-muted">
        New to NeighbourShare?{' '}
        <Link href="/signup" className="font-medium text-primary underline hover:text-primary-hover">
          Create an account
        </Link>
      </p>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <SignInContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}