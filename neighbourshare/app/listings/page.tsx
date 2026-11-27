import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ListingCard } from "@/components/listings/listing-card";
import { ListingFilters } from "@/components/listings/listing-filters";
import { buttonClasses } from "@/components/ui/button";
import { getDb } from "@/lib/db";
import {
  isCategory,
  listListings,
  listNeighborhoods,
} from "@/lib/listings/service";

export const metadata: Metadata = { title: "Browse listings" };

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default function BrowsePage({ searchParams }: PageProps<"/listings">) {
  return (
    <div>
      <h1 className="text-[2.4375rem] font-bold">Browse listings</h1>
      <p className="mt-2 max-w-prose text-muted">
        Find tools and gear to borrow from your neighbors.
      </p>
      {/* Reads the address filters and the database, so it loads after the page shell. */}
      <Suspense fallback={<p className="mt-8 text-muted">Loading listings…</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const db = getDb();
  const neighborhoods = await listNeighborhoods(db);

  // Unknown values in the address are ignored instead of causing an error.
  const wantedNeighborhood = firstValue(params.neighborhood);
  const wantedCategory = firstValue(params.category);
  const neighborhood = neighborhoods.includes(wantedNeighborhood)
    ? wantedNeighborhood
    : "";
  const category = isCategory(wantedCategory) ? wantedCategory : "";
  const filtered = Boolean(neighborhood || category);

  const listings = await listListings(db, {
    neighborhood: neighborhood || null,
    category: category || null,
  });

  return (
    <>
      <div className="mt-8">
        <ListingFilters
          neighborhoods={neighborhoods}
          neighborhood={neighborhood}
          category={category}
        />
      </div>

      <p className="mt-8 text-sm text-muted">
        {listings.length} {listings.length === 1 ? "listing" : "listings"}
      </p>

      {listings.length === 0 ? (
        <div className="mt-4 rounded-lg border border-border bg-surface px-6 py-12 text-center">
          <h2 className="text-xl font-semibold">
            {filtered ? "No listings match these filters" : "No listings yet"}
          </h2>
          <p className="mx-auto mt-2 max-w-prose text-muted">
            {filtered
              ? "Try a different neighborhood or category."
              : "Be the first to share an item with your neighbors."}
          </p>
          <div className="mt-6">
            {filtered ? (
              <Link href="/listings" className={buttonClasses("secondary")}>
                Clear filters
              </Link>
            ) : (
              <Link href="/listings/new" className={buttonClasses()}>
                Add a listing
              </Link>
            )}
          </div>
        </div>
      ) : (
        <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((listing) => (
            <li key={listing.id}>
              <ListingCard listing={listing} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}