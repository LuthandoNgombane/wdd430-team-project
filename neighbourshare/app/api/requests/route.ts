import { getCurrentUserId } from "@/lib/auth/current-user";
import { getDb, withTransaction } from "@/lib/db";
import { REQUEST_STATUSES } from "@/lib/domain";
import {
  createRequest,
  listRequests,
  type VisibleRequestStatus,
} from "@/lib/requests/service";

function isVisibleStatus(value: string): value is VisibleRequestStatus {
  return (
    value === "expired" || REQUEST_STATUSES.some((status) => status === value)
  );
}

export async function GET(request: Request) {
  const userId = await getCurrentUserId(request);
  if (!userId)
    return Response.json({ error: "Sign in to continue." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const role = params.get("role");
  const status = params.get("status");
  if (role !== null && role !== "owner" && role !== "borrower") {
    return Response.json(
      { error: "Choose owner or borrower." },
      { status: 400 },
    );
  }
  if (status !== null && !isVisibleStatus(status)) {
    return Response.json({ error: "Unknown request status." }, { status: 400 });
  }
  const requests = await listRequests(getDb(), userId, role, status);
  return Response.json({ requests });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId(request);
  if (!userId)
    return Response.json({ error: "Sign in to continue." }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  const result = await withTransaction((tx) => createRequest(tx, userId, body));
  if (result.kind === "error") {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json(
    { request: result.request },
    {
      status: 201,
      headers: { Location: `/api/requests/${result.request.id}` },
    },
  );
}
