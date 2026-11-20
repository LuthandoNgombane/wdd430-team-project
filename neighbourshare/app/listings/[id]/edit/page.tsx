import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ListingForm } from "@/components/listings/listing-form";
import { getCurrentUserId, signInPath } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db";
import { getListing, listNeighborhoods } from "@/lib/listings/service";
import { getUploadMode } from "@/lib/listings/upload-mode";

export const metadata: Metadata = { title: "Edit listing" };

export default function EditListingPage({
  params,
}: PageProps<"/listings/[id]/edit">) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-8 text-3xl font-bold">Edit listing</h1>
      {/* Reads the listing and the signed-in member, so it loads after the page shell. */}
      <Suspense fallback={<p className="text-muted">Loading the listing…</p>}>
        <EditListing params={params} />
      </Suspense>
    </div>
  );
}

async function EditListing({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const signIn = signInPath(`/listings/${id}/edit`);
  const userId = await getCurrentUserId();
  if (!userId) redirect(signIn);

  const db = getDb();
  const listing = await getListing(db, id);
  if (!listing) notFound();

  if (listing.owner.id !== userId) {
    return (
      <p>
        You can only edit your own listings.{" "}
        <Link href={`/listings/${id}`} className="text-primary underline">
          Back to the listing
        </Link>
      </p>
    );
  }

  const { title, description, photoUrl, category, condition, neighborhood } =
    listing;
  return (
    <ListingForm
      listingId={id}
      initial={{
        title,
        description,
        photoUrl,
        category,
        condition,
        neighborhood,
        availableFrom: listing.availableFrom,
        availableTo: listing.availableTo,
      }}
      neighborhoods={await listNeighborhoods(db)}
      uploadMode={getUploadMode()}
      signInHref={signIn}
    />
  );
}
