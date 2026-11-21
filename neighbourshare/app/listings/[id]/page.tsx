import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteListingButton } from "@/components/listings/delete-listing-button";
import { buttonClasses } from "@/components/ui/button";
import { getCurrentUserId, signInPath } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db";
import { getListing } from "@/lib/listings/service";

export const metadata: Metadata = { title: "Listing details" };

/** "2026-11-20" -> "Nov 20, 2026", without time zone shifts. */
function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ListingDetailsPage({
  params,
}: PageProps<"/listings/[id]">) {
  return (
    // Reads the listing and the signed-in member, so it loads after the page shell.
    <Suspense fallback={<p className="text-muted">Loading the listing…</p>}>
      <ListingDetails params={params} />
    </Suspense>
  );
}

async function ListingDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(getDb(), id);
  if (!listing) notFound();

  const userId = await getCurrentUserId();
  const isOwner = userId === listing.owner.id;
  const signIn = signInPath(`/listings/${id}`);

  return (
    <article className="grid gap-8 lg:grid-cols-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-surface">
        <Image
          src={listing.photoUrl}
          alt={listing.title}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <div>
          <p className="inline-block rounded-md bg-accent px-2 py-0.5 text-sm font-semibold text-on-accent">
            {listing.category}
          </p>
          <h1 className="mt-3 break-words text-[2.4375rem] font-bold">
            {listing.title}
          </h1>
          <p className="mt-2 text-muted">
            Listed by{" "}
            <Link
              href={`/members/${listing.owner.id}`}
              className="font-medium text-primary underline underline-offset-4"
            >
              {listing.owner.name}
            </Link>
          </p>
        </div>

        <p className="max-w-prose whitespace-pre-line">{listing.description}</p>

        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          <dt className="font-semibold">Condition</dt>
          <dd className="text-muted">{listing.condition}</dd>
          <dt className="font-semibold">Neighborhood</dt>
          <dd className="text-muted">{listing.neighborhood}</dd>
          <dt className="font-semibold">Available</dt>
          <dd className="text-muted">
            {formatDate(listing.availableFrom)} –{" "}
            {formatDate(listing.availableTo)}
          </dd>
        </dl>

        {/* The buttons match who is looking: owner, signed-in member or visitor. */}
        {isOwner ? (
          <div className="flex flex-wrap items-start gap-3">
            <Link href={`/listings/${id}/edit`} className={buttonClasses()}>
              Edit
            </Link>
            <DeleteListingButton listingId={id} signInHref={signIn} />
          </div>
        ) : userId ? (
          <div>
            <Link href={`/listings/${id}/request`} className={buttonClasses()}>
              Request to borrow
            </Link>
          </div>
        ) : (
          <div>
            <Link href={signIn} className={buttonClasses()}>
              Sign in to request
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}