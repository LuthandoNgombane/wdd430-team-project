import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { RequestForm } from "@/components/requests/request-form";
import { getCurrentUserId, signInPath } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db";
import { getListing } from "@/lib/listings/service";
import { MESSAGE_MAX } from "@/lib/requests/service";

export const metadata: Metadata = { title: "Request to borrow" };

export default function RequestPage({
  params,
}: PageProps<"/listings/[id]/request">) {
  return (
    <Suspense fallback={<p role="status">Loading the request form…</p>}>
      <RequestDetails params={params} />
    </Suspense>
  );
}

async function RequestDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const signIn = signInPath(`/listings/${encodeURIComponent(id)}/request`);
  const userId = await getCurrentUserId();
  if (!userId) redirect(signIn);

  const listing = await getListing(getDb(), id);
  if (!listing) notFound();

  return (
    <section className="mx-auto grid max-w-2xl gap-6">
      <Link className="text-primary underline" href={`/listings/${listing.id}`}>
        Back to listing
      </Link>
      <h1 className="break-words text-3xl font-bold">
        Request to borrow {listing.title}
      </h1>
      {userId === listing.owner.id ? (
        <p>You cannot borrow your own listing.</p>
      ) : (
        <>
          <p>
            Available from {listing.availableFrom} to {listing.availableTo},
            inclusive.
          </p>
          <RequestForm
            listingId={listing.id}
            availableFrom={listing.availableFrom}
            availableTo={listing.availableTo}
            messageMax={MESSAGE_MAX}
            signInHref={signIn}
          />
        </>
      )}
    </section>
  );
}
