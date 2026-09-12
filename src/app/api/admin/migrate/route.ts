import { getAuth } from "@/lib/auth";
import { getMigrations } from "better-auth/db/migration";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  if (request.headers.get("x-migrate-secret") !== env.BETTER_AUTH_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }
  const auth = await getAuth();
  const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options);
  if (toBeCreated.length === 0 && toBeAdded.length === 0) {
    return Response.json({ message: "No migrations needed" });
  }
  await runMigrations();
  return Response.json({ created: toBeCreated.map((t) => t.table), added: toBeAdded.map((t) => t.table) });
}
