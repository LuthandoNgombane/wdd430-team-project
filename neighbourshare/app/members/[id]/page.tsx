import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { getDb } from "@/lib/db";
import { getPublicProfile } from "@/lib/profiles/service";

// Shared by the page title and the page itself: one database query per request.
const loadProfile = cache((id: string) => getPublicProfile(getDb(), id));

export async function generateMetadata({
  params,
}: PageProps<"/members/[id]">): Promise<Metadata> {
  const profile = await loadProfile((await params).id);
  return { title: profile ? profile.name : "Member not found" };
}

export default function MemberPage({ params }: PageProps<"/members/[id]">) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12">
      {/* Reads the member from the database, so it loads after the page shell. */}
      <Suspense fallback={<p className="text-muted">Loading the profile…</p>}>
        <MemberProfile params={params} />
      </Suspense>
    </main>
  );
}

const dateFormat = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-12-01" → "Dec 1, 2026" (dates are whole days, so read them as UTC). */
function formatDate(isoDate: string): string {
  return dateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

async function MemberProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Public fields only: getPublicProfile never returns email or phone.
  const profile = await loadProfile(id);
  if (!profile) notFound();

  const count = profile.listings.length;
  return (
    <>
      <h1 className="mb-1 text-3xl font-bold">{profile.name}</h1>
      <p className="mb-6 text-muted">{profile.neighborhood}</p>
      {profile.bio ? (
        <p className="mb-12 max-w-prose whitespace-pre-line">{profile.bio}</p>
      ) : (
        <p className="mb-12 text-muted">This member hasn&apos;t written a bio yet.</p>
      )}

      <h2 className="mb-6 text-2xl font-semibold">
        Listings <span className="text-muted">({count})</span>
      </h2>
      {count === 0 ? (
        <p className="text-muted">{profile.name} has no items to lend right now.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {profile.listings.map((listing) => (
            <li key={listing.id}>
              <Card image={{ src: listing.photoUrl, alt: listing.title }} className="h-full">
                <h3 className="mb-1 font-semibold">
                  <Link href={`/listings/${listing.id}`} className="text-primary underline-offset-4 hover:underline">
                    {listing.title}
                  </Link>
                </h3>
                <p className="text-sm text-muted">
                  {listing.category} · {listing.condition}
                </p>
                <p className="mt-2 text-sm">
                  Available {formatDate(listing.availableFrom)} to {formatDate(listing.availableTo)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
