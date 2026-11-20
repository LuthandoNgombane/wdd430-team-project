import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ListingForm } from "@/components/listings/listing-form";
import { getCurrentUserId, signInPath } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db";
import { listNeighborhoods } from "@/lib/listings/service";
import { getUploadMode } from "@/lib/listings/upload-mode";

export const metadata: Metadata = { title: "Add a listing" };

export default function NewListingPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Add a listing</h1>
      <p className="mb-8 text-muted">
        Share an item with your neighbors. All fields are required.
      </p>
      {/* Reads the signed-in member, so it loads after the page shell. */}
      <Suspense fallback={<p className="text-muted">Loading the form…</p>}>
        <NewListing />
      </Suspense>
    </main>
  );
}

async function NewListing() {
  const signIn = signInPath("/listings/new");
  if (!(await getCurrentUserId())) redirect(signIn);

  return (
    <ListingForm
      neighborhoods={await listNeighborhoods(getDb())}
      uploadMode={getUploadMode()}
      signInHref={signIn}
    />
  );
}
