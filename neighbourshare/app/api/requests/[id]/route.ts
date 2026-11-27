import { getCurrentUserId } from "@/lib/auth/current-user";
import { getDb, withTransaction } from "@/lib/db";
import { readRequest, updateRequest } from "@/lib/requests/service";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/requests/[id]">,
) {
  const userId = await getCurrentUserId(request);
  if (!userId)
    return Response.json({ error: "Sign in to continue." }, { status: 401 });

  const { id } = await ctx.params;
  const result = await readRequest(getDb(), userId, id);
  return result.kind === "error"
    ? Response.json({ error: result.error }, { status: result.status })
    : Response.json({ request: result.request });
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/requests/[id]">,
) {
  const userId = await getCurrentUserId(request);
  if (!userId)
    return Response.json({ error: "Sign in to continue." }, { status: 401 });

  const { id } = await ctx.params;
  const body: unknown = await request.json().catch(() => null);
  const result = await withTransaction((tx) =>
    updateRequest(tx, userId, id, body),
  );
  return result.kind === "error"
    ? Response.json({ error: result.error }, { status: result.status })
    : Response.json({ request: result.request });
}
