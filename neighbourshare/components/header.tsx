import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { auth } from '@/auth';
import { signOutAction } from '@/app/signin/actions';

const linkClass = 'font-medium text-primary underline-offset-4 hover:text-primary-hover hover:underline';

// Reads the session cookie, so it renders at request time inside <Suspense>.
async function AccountLinks() {
  // Marks this part as per-request. Without it, Next.js (Cache Components)
  // stops on the random value Auth.js creates while reading the session.
  await connection();
  const session = await auth();

  if (!session?.user) {
    return (
      <>
        <Link href="/signin" className={linkClass}>
          Sign in
        </Link>
        <Link href="/signup" className="rounded-md bg-primary px-3 py-1.5 font-semibold text-on-primary hover:bg-primary-hover">
          Sign up
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href="/dashboard" className={linkClass}>
        Dashboard
      </Link>
      <span className="hidden text-muted sm:inline">Hi, {session.user.name}</span>
      <form action={signOutAction}>
        <button type="submit" className="rounded-md border border-input-border px-3 py-1.5 font-medium hover:bg-background">
          Sign out
        </button>
      </form>
    </>
  );
}

export default function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-xl font-bold text-primary">
          NeighbourShare
        </Link>
        <div className="flex items-center gap-4">
          {/* Fallback keeps the header height steady while the session loads. */}
          <Suspense fallback={<span className="h-8" />}>
            <AccountLinks />
          </Suspense>
        </div>
      </nav>
    </header>
  );
}