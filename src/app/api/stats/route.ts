import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { computeFocusStats, type FocusStats } from "@/lib/focus-stats";

export async function GET(request: Request) {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const weekStart = new URL(request.url).searchParams.get("weekStart");
  if (!weekStart) return new Response("Missing weekStart", { status: 400 });

  const { env } = await getCloudflareContext({ async: true });
  const { results } = await env.DB.prepare(
    `SELECT duration_seconds, completed_at FROM focus_session WHERE user_id = ?`,
  ).bind(session.user.id).all<{ duration_seconds: number; completed_at: string }>();

  const stats: FocusStats = computeFocusStats(results ?? [], new Date(weekStart));
  return Response.json(stats);
}
