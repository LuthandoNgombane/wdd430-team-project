import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { auth } from '@/auth';

export const metadata: Metadata = { title: 'Dashboard | NeighbourShare' };

async function DashboardContent() {
  await connection(); 
  const session = await auth();
  if (!session?.user) redirect('/signin?callbackUrl=/dashboard');

  return (
    <>
      <h1 className="mb-2 text-3xl font-bold">Welcome, {session.user.name}</h1>
      <p className="text-muted">Your listings and borrow requests will appear here.</p>
    </>
  );
}

export default function DashboardPage() {
  return (
    <div>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}