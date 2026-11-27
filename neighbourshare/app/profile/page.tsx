import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ProfileForm } from "@/components/profile/profile-form";
import { getCurrentUserId, signInPath } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db";
import { listNeighborhoods } from "@/lib/listings/service";
import { getOwnProfile } from "@/lib/profiles/service";

export const metadata: Metadata = { title: "Your profile" };

export default function ProfilePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Your profile</h1>
      <p className="mb-8 text-muted">
        Your name, neighborhood and bio are public, so neighbors know who they
        are sharing with.
      </p>
      {/* Reads the signed-in member, so it loads after the page shell. */}
      <Suspense fallback={<p className="text-muted">Loading your profile…</p>}>
        <EditProfile />
      </Suspense>
    </main>
  );
}

async function EditProfile() {
  const signIn = signInPath("/profile");
  const userId = await getCurrentUserId();
  if (!userId) redirect(signIn);

  const db = getDb();
  const profile = await getOwnProfile(db, userId);
  // The session belongs to a member who no longer exists or was deactivated.
  if (!profile) redirect(signIn);

  const { id, ...initial } = profile;
  return (
    // key: a different member always gets a fresh form, never the kept
    // (hidden) state of a previous member's form on this browser.
    <ProfileForm
      key={id}
      initial={initial}
      neighborhoods={await listNeighborhoods(db)}
      publicHref={`/members/${id}`}
      signInHref={signIn}
    />
  );
}
