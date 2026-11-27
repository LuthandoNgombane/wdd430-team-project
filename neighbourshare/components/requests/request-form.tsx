"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  listingId: string;
  availableFrom: string;
  availableTo: string;
  messageMax: number;
  signInHref: string;
};

type State = {
  startDate: string;
  endDate: string;
  message: string;
  error?: string;
  signInRequired?: boolean;
  submitted?: boolean;
};

export function RequestForm({
  listingId,
  availableFrom,
  availableTo,
  messageMax,
  signInHref,
}: Props) {
  const [state, submit, pending] = useActionState(
    async (_previous: State, form: FormData): Promise<State> => {
      const values = {
        startDate: String(form.get("startDate") ?? ""),
        endDate: String(form.get("endDate") ?? ""),
        message: String(form.get("message") ?? ""),
      };
      try {
        const response = await fetch("/api/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId, ...values }),
        });
        if (response.status === 201) return { ...values, submitted: true };
        if (response.status === 401) {
          return {
            ...values,
            error: "Sign in to continue.",
            signInRequired: true,
          };
        }
        if (response.status < 500) {
          const { error } = await response.json();
          if (typeof error === "string") return { ...values, error };
        }
      } catch {
        // Keep the entered values available if the request fails.
      }
      return {
        ...values,
        error: "Could not send your request. Please try again.",
      };
    },
    { startDate: "", endDate: "", message: "" },
  );

  if (state.submitted) {
    return (
      <p role="status">
        Request sent. <StatusBadge status="pending" />
      </p>
    );
  }

  return (
    <form action={submit} className="grid gap-4">
      <Input
        label="Start date"
        name="startDate"
        type="date"
        min={availableFrom}
        max={availableTo}
        defaultValue={state.startDate}
        required
      />
      <Input
        label="End date"
        name="endDate"
        type="date"
        min={availableFrom}
        max={availableTo}
        defaultValue={state.endDate}
        required
      />
      <Textarea
        label="Message to the owner"
        name="message"
        maxLength={messageMax}
        defaultValue={state.message}
        required
      />
      {state.error && <p role="alert">{state.error}</p>}
      {state.signInRequired && (
        <Link className="text-primary underline" href={signInHref}>
          Sign in
        </Link>
      )}
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Sending…" : "Send borrow request"}
      </Button>
    </form>
  );
}
