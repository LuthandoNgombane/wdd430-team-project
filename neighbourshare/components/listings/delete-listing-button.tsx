"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircleIcon } from "@/components/ui/icons";

type DeleteListingButtonProps = {
  listingId: string;
  /** Where to send the member if their session has ended. */
  signInHref: string;
};

export function DeleteListingButton({
  listingId,
  signInHref,
}: DeleteListingButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function onDelete() {
    if (deleting) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/listings/${listingId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        router.push("/listings");
        router.refresh();
        return; // keep the buttons disabled while the next page loads
      }
      if (response.status === 401) {
        window.location.assign(signInHref);
        return;
      }
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "The listing could not be deleted. Try again.");
    } catch {
      setError(
        "The listing could not be deleted. Check your connection and try again.",
      );
    }
    setDeleting(false);
  }

  if (!confirming) {
    return (
      <Button variant="secondary" onClick={() => setConfirming(true)}>
        Delete
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
      <p className="font-medium">Delete this listing?</p>
      <p className="text-sm text-muted">
        It will disappear from browsing. This can&apos;t be undone.
      </p>
      {error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-error">
          <AlertCircleIcon className="shrink-0" />
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button onClick={onDelete} disabled={deleting}>
          {deleting ? "Deleting…" : "Yes, delete"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => setConfirming(false)}
          disabled={deleting}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}