import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { Listing } from "@/lib/listings/service";

/** "2026-11-20" -> "Nov 20, 2026", without time zone shifts. */
function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/listings/${listing.id}`} className="group block h-full rounded-lg">
      <Card
        image={{ src: listing.photoUrl, alt: listing.title }}
        className="h-full transition-shadow group-hover:shadow-md"
      >
        <p className="inline-block rounded-md bg-accent px-2 py-0.5 text-sm font-semibold text-on-accent">
          {listing.category}
        </p>
        <h2 className="mt-2 text-xl font-semibold">{listing.title}</h2>
        <p className="mt-1 text-sm text-muted">
          {listing.condition} · {listing.neighborhood}
        </p>
        <p className="mt-2 text-sm text-muted">
          Available {formatDate(listing.availableFrom)} –{" "}
          {formatDate(listing.availableTo)}
        </p>
      </Card>
    </Link>
  );
}