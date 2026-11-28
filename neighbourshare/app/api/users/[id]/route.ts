import { getDb } from "@/lib/db";
import { getPublicProfile } from "@/lib/profiles/service";

// GET /api/users/[id]  (public: name, neighborhood, bio and active listings;
// never email or phone)
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/users/[id]">,
) {
  const { id } = await ctx.params;
  const profile = await getPublicProfile(getDb(), id);
  return profile
    ? Response.json({ profile })
    : Response.json({ error: "Member not found." }, { status: 404 });
}
