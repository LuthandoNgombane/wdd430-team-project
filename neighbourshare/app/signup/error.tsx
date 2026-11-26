"use client";

export default function SignUpError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{ padding: "2rem", textAlign: "center" }}>
      <h1>We couldn&apos;t load the sign-up form</h1>
      <p>Something went wrong on our side. Please try again.</p>
      <button type="button" onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}