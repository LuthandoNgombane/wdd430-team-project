import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { getNeighborhoods } from '@/lib/users';
import SignUpForm from './SignUpForm';

export const metadata: Metadata = { title: 'Sign up' };

async function SignUpFormWithNeighborhoods() {
  const neighborhoods = await getNeighborhoods();
  return <SignUpForm neighborhoods={neighborhoods} />;
}

export default function SignUpPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="mb-2 text-3xl font-bold">Create your account</h1>
      <p className="mb-8 text-muted">
        Already a member?{' '}
        <Link href="/signin" className="font-medium text-primary underline hover:text-primary-hover">
          Sign in
        </Link>
      </p>
      <Suspense fallback={<p className="text-muted">Loading form…</p>}>
        <SignUpFormWithNeighborhoods />
      </Suspense>
    </div>
  );
}