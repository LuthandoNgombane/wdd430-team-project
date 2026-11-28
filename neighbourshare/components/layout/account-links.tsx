import Link from "next/link";
import { connection } from "next/server";
import { auth } from "@/auth";
import { signOutAction } from "@/app/signin/actions";

const linkClass =
  "inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:text-primary-hover hover:underline";

// Reads the session cookie, so it renders at request time inside <Suspense>.
export async function AccountLinks() {
  await connection();
  const session = await auth();

  if (!session?.user) {
    return (
      <>
        <Link href="/signin" className={linkClass}>
          Sign in
        </Link>
        <Link
          href="/signup"
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 font-semibold text-on-primary hover:bg-primary-hover"
        >
          Sign up
        </Link>
      </>
    );
  }

  return (
    <>
      <span className="max-w-40 truncate text-muted">Hi, {session.user.name}</span>
      <form action={signOutAction}>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-md border border-input-border px-4 font-medium hover:bg-background"
        >
          Sign out
        </button>
      </form>
    </>
  );
}