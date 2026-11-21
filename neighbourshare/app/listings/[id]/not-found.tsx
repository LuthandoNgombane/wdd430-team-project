import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function ListingNotFound() {
  return (
    <div className="py-12 text-center">
      <h1 className="text-[2.4375rem] font-bold">Listing not found</h1>
      <p className="mx-auto mt-4 max-w-prose text-muted">
        This listing may have been removed, or the link is wrong.
      </p>
      <div className="mt-8">
        <Link href="/listings" className={buttonClasses()}>
          Browse listings
        </Link>
      </div>
    </div>
  );
}