# Phase 2 — Better Auth + D1 Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Supabase Auth + Postgres with Better Auth (social-only: Google, Discord, GitHub; anonymous-first) on Cloudflare D1, and repoint the realtime Worker to verify Better Auth JWTs and write completed sessions to D1 — a single consistent cutover across both repos.

**Architecture:** The App Worker (Next.js/OpenNext, from Phase 1) hosts Better Auth at `/api/auth/*` with D1 as its store, mints JWTs for the realtime Worker, and reads focus-stats server-side from D1. The realtime Worker verifies those JWTs via JWKS and writes `focus_session` rows directly to the same D1. This must land as one cutover because Supabase's `focus_session` has a foreign key to Supabase's `auth.users`, so a Better Auth user id cannot be written there.

**Tech Stack:** Better Auth ≥ 1.5 (native D1), `jose`, Cloudflare D1, Next.js 14.2.x App Router, `@opennextjs/cloudflare`, `partyserver` Durable Object.

**Repos:** `POMO-frontend` (app) and `POMO-backend` (realtime Worker).

## Prerequisites (MANUAL — you must provide these before execution)

- **D1 database** created: `wrangler d1 create pomo` → record the `database_id`. Bound as `DB` in both repos' `wrangler.jsonc`.
- **Three OAuth apps**, each returning a client id + secret, with redirect URI `<app-origin>/api/auth/callback/<provider>`:
  - Google (Google Cloud Console → Credentials): `.../callback/google`
  - Discord (Discord Developer Portal → OAuth2): `.../callback/discord`
  - GitHub (GitHub → Developer settings → OAuth Apps; **must include `user:email` scope**): `.../callback/github`
- **`BETTER_AUTH_SECRET`**: `openssl rand -base64 32`.
- **App origin** (from Phase 1 Task 4), e.g. `https://tomatera.example.com`. Used as `BETTER_AUTH_URL` and the realtime Worker's `APP_ORIGIN` (JWT issuer/audience + JWKS host).

## Global Constraints

- **Social-only.** No email/password, no magic link, no transactional email. Providers: Google, Discord, GitHub.
- **Anonymous-first, lazy.** Create the anonymous user on first identity-need (joining a room), NOT on page load. Upgrade uses `anonymous({ disableDeleteAnonymousUser: true, onLinkAccount })` which re-points `focus_session` rows from the anon id to the new id.
- **Better Auth on Workers wiring:** build the auth instance **per request** from `getCloudflareContext({ async: true }).env` (no module-level singleton); pass `secret` and `baseURL` from `env` (no `process.env` on Workers); `nextCookies()` MUST be the last plugin. `nodejs_compat` already set (Phase 1).
- **JWT:** issuer and audience = app origin. The realtime Worker verifies locally via `jose` + `createRemoteJWKSet(<app-origin>/api/auth/jwks)` and trusts only the `sub` claim → `x-user-id`. Never self-fetch JWKS (the Worker is a different origin — fine).
- **D1 access control (replaces RLS):** the app reads only `WHERE user_id = <session user>`; the realtime Worker writes only the verified user's rows. No secrets in query params reach the DO (strip `token`).
- **Do NOT delete `@supabase/*` deps or the Supabase project in this phase** — that is Phase 3. This phase stops *using* Supabase; Phase 3 removes it.
- Keep both test suites green at every commit (frontend Vitest; backend `@cloudflare/vitest-plugin`).

---

## PART A — Frontend (POMO-frontend)

### Task A1: Add D1 binding + `focus_session` schema

**Files:**
- Modify: `wrangler.jsonc` (add `d1_databases`)
- Create: `migrations/0001_focus_session.sql`

**Interfaces:**
- Produces: a `DB` D1 binding and the `focus_session` table used by A8 (stats) and B2 (writes).

- [ ] **Step 1: Add the D1 binding to `wrangler.jsonc`** (alongside the Phase 1 config)

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "pomo",
    "database_id": "<DATABASE_ID>"
  }
]
```

- [ ] **Step 2: Create `migrations/0001_focus_session.sql`**

```sql
CREATE TABLE IF NOT EXISTS focus_session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  completed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS focus_session_user_completed_idx
  ON focus_session (user_id, completed_at DESC);
```

- [ ] **Step 3: Apply locally and remotely** (remote requires your Cloudflare account)

```bash
npx wrangler d1 execute pomo --local --file=migrations/0001_focus_session.sql
npx wrangler d1 execute pomo --remote --file=migrations/0001_focus_session.sql
```
Expected: both report success.

- [ ] **Step 4: Commit**

```bash
git add wrangler.jsonc migrations/0001_focus_session.sql
git commit -m "feat: add D1 binding and focus_session schema"
```

---

### Task A2: Install Better Auth + jose; add env

**Files:**
- Modify: `package.json`
- Modify: `.dev.vars` (local secrets)

**Interfaces:**
- Produces: `better-auth` and `jose` available; local env for `getAuth()`.

- [ ] **Step 1: Install**

```bash
npm install better-auth@^1.5 jose
```

- [ ] **Step 2: Add local dev vars to `.dev.vars`** (git-ignored; do NOT commit real secrets)

```
NEXTJS_ENV=development
BETTER_AUTH_SECRET=<dev-secret-from-openssl>
BETTER_AUTH_URL=http://localhost:3001
GOOGLE_CLIENT_ID=<dev>
GOOGLE_CLIENT_SECRET=<dev>
DISCORD_CLIENT_ID=<dev>
DISCORD_CLIENT_SECRET=<dev>
GITHUB_CLIENT_ID=<dev>
GITHUB_CLIENT_SECRET=<dev>
```

- [ ] **Step 3: Commit** (package changes only)

```bash
git add package.json package-lock.json
git commit -m "chore: add better-auth and jose"
```

---

### Task A3: Server auth instance (`getAuth`)

**Files:**
- Create: `src/lib/auth.ts`

**Interfaces:**
- Produces: `getAuth(): Promise<ReturnType<typeof betterAuth>>` — used by A4 (route handler), A5 (migrate route), A8 (stats session).

- [ ] **Step 1: Write `src/lib/auth.ts`**

```ts
import { betterAuth } from "better-auth";
import { anonymous, jwt } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getAuth() {
  const { env } = await getCloudflareContext({ async: true });
  const origin = env.BETTER_AUTH_URL;

  return betterAuth({
    database: env.DB, // D1 binding, auto-detected (Better Auth >= 1.5)
    baseURL: origin,
    secret: env.BETTER_AUTH_SECRET,
    socialProviders: {
      google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
      discord: { clientId: env.DISCORD_CLIENT_ID, clientSecret: env.DISCORD_CLIENT_SECRET },
      github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET },
    },
    plugins: [
      anonymous({
        disableDeleteAnonymousUser: false,
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          // Preserve the guest's focus history: re-point rows to the new id.
          const { env } = await getCloudflareContext({ async: true });
          await env.DB.prepare(
            `UPDATE focus_session SET user_id = ? WHERE user_id = ?`,
          ).bind(newUser.user.id, anonymousUser.user.id).run();
        },
      }),
      jwt({ jwt: { issuer: origin, audience: origin, expirationTime: "1h" } }),
      nextCookies(), // MUST be last
    ],
  });
}
```

- [ ] **Step 2: Extend `CloudflareEnv` types** — run `npm run cf-typegen` after A1 so `env.DB` and the vars are typed. Add the auth vars to `wrangler.jsonc` `vars` as empty placeholders for typegen, or rely on `.dev.vars`; confirm `npx tsc --noEmit` passes.

Run: `npx tsc --noEmit`
Expected: no type errors in `src/lib/auth.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: better-auth server instance on D1 (social + anonymous + jwt)"
```

---

### Task A4: Mount Better Auth route handler

**Files:**
- Create: `src/app/api/auth/[...all]/route.ts`

**Interfaces:**
- Consumes: `getAuth` (A3).
- Produces: `/api/auth/*` endpoints (sign-in, callback, token, jwks).

- [ ] **Step 1: Write the handler**

```ts
import { getAuth } from "@/lib/auth";

async function handler(request: Request) {
  const auth = await getAuth();
  return auth.handler(request);
}

export const GET = handler;
export const POST = handler;
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` passes.
- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/
git commit -m "feat: mount better-auth route handler"
```

---

### Task A5: Better Auth schema migration route (D1)

**Files:**
- Create: `src/app/api/admin/migrate/route.ts`

**Interfaces:**
- Consumes: `getAuth` (A3).
- Produces: creates `user`/`session`/`account`/`verification`/`jwks` tables in D1 when hit. (The Better Auth CLI can't reach D1; migrations run programmatically.)

- [ ] **Step 1: Write the migrate route** (guarded by a header secret)

```ts
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
```

- [ ] **Step 2: Run migrations locally** — start `npm run preview`, then:

```bash
curl -s -X POST http://localhost:8770/api/admin/migrate -H "x-migrate-secret: <dev-secret>"
```
Expected: JSON listing created tables (`user`, `session`, `account`, `verification`, `jwks`). Re-running returns `"No migrations needed"`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/migrate/
git commit -m "feat: programmatic better-auth D1 migration route"
```

---

### Task A6: Client auth + lazy anonymous session

**Files:**
- Create: `src/lib/auth-client.ts`
- Rewrite: `src/app/providers/AuthContext.tsx`
- Rewrite: `src/hooks/useCurrentUser.ts`
- Delete: `src/hooks/useEnsureAnonUser.ts` (+ any usage)

**Interfaces:**
- Produces: `authClient` with `useSession`, `signIn`, `signOut`, `token`; `useCurrentUser()` returning `{ user, displayName, avatarUrl, isAnonymous }` (same shape consumers already expect); `ensureAnonUser()` for lazy sign-in.

- [ ] **Step 1: Write `src/lib/auth-client.ts`**

```ts
import { createAuthClient } from "better-auth/react";
import { anonymousClient, jwtClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [anonymousClient(), jwtClient()],
});

export const { signIn, signOut, useSession } = authClient;

export async function ensureAnonUser(): Promise<void> {
  const { data } = await authClient.getSession();
  if (!data?.session) {
    await authClient.signIn.anonymous();
  }
}
```

- [ ] **Step 2: Rewrite `AuthContext.tsx`** to expose Better Auth's session (drop `@supabase/ssr`)

```tsx
"use client";
import { createContext, useContext } from "react";
import { useSession } from "@/lib/auth-client";

type AuthContextType = {
  user: ReturnType<typeof useSession>["data"] extends infer S
    ? (S extends { user: infer U } ? U | null : null)
    : null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isPending } = useSession();
  return (
    <AuthContext.Provider value={{ user: data?.user ?? null, loading: isPending }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 3: Rewrite `useCurrentUser.ts`** to derive display fields from the Better Auth session, preserving anonymous fallback (dicebear via `utils/user.ts`)

```ts
import { useSession } from "@/lib/auth-client";
import { anonymousUserDisplayName, anonUserAvatarUrl } from "@/utils/user";

export function useCurrentUser() {
  const { data } = useSession();
  const user = data?.user ?? null;
  const isAnonymous = Boolean((user as { isAnonymous?: boolean } | null)?.isAnonymous) || !user;
  const displayName = user?.name?.trim() || anonymousUserDisplayName();
  const avatarUrl = user?.image || anonUserAvatarUrl(displayName);
  return { user, displayName, avatarUrl, isAnonymous };
}
```

- [ ] **Step 4: Delete `useEnsureAnonUser.ts`** and replace its call site so anon sign-in is lazy (triggered on room join in A9, not on load).

```bash
git rm src/hooks/useEnsureAnonUser.ts
```
Search for `useEnsureAnonUser` usages and remove them:
Run: `rg -n "useEnsureAnonUser" src` → expected: no remaining references after edits.

- [ ] **Step 5: Verify** — `npx tsc --noEmit` passes.
- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: better-auth client, lazy anon session, useCurrentUser via session"
```

---

### Task A7: Replace auth UI with social sign-in

**Files:**
- Rewrite: `src/components/login-form.tsx`, `src/components/sign-up-form.tsx` → social buttons
- Delete: `src/components/forgot-password-form.tsx`, `src/components/update-password-form.tsx`, `src/app/auth/confirm/route.ts`
- Modify: `src/components/logout-button.tsx` (use `signOut`); `src/app/protected/page.tsx` (use `getAuth`)
- Delete: `src/lib/auth/sign-up.ts` (+ test), `src/components/sign-up-form.test.tsx`

**Interfaces:**
- Consumes: `signIn`, `signOut` (A6).
- Produces: a social sign-in surface; no password/email flows.

- [ ] **Step 1: Replace `login-form.tsx` and `sign-up-form.tsx`** with a shared social button set

```tsx
"use client";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

const providers = [
  { id: "google", label: "Continue with Google" },
  { id: "discord", label: "Continue with Discord" },
  { id: "github", label: "Continue with GitHub" },
] as const;

export function SocialSignIn({ callbackURL = "/" }: { callbackURL?: string }) {
  return (
    <div className="flex flex-col gap-3">
      {providers.map((p) => (
        <Button key={p.id} onClick={() => signIn.social({ provider: p.id, callbackURL })}>
          {p.label}
        </Button>
      ))}
    </div>
  );
}
```
Update `login-form.tsx`/`sign-up-form.tsx` to render `<SocialSignIn />` (or replace their imports at call sites with `SocialSignIn`).

- [ ] **Step 2: Delete password/email flows**

```bash
git rm src/components/forgot-password-form.tsx src/components/update-password-form.tsx \
       src/app/auth/confirm/route.ts src/lib/auth/sign-up.ts src/lib/auth/sign-up.test.ts \
       src/components/sign-up-form.test.tsx
```

- [ ] **Step 3: Update `logout-button.tsx`**

```tsx
"use client";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return <Button onClick={() => signOut()}>Log out</Button>;
}
```

- [ ] **Step 4: Update `src/app/protected/page.tsx`** to use `getAuth()` server-side

```tsx
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) redirect("/");
  return <div>Signed in as {session.user.name ?? session.user.id}</div>;
}
```

- [ ] **Step 5: Remove any remaining Supabase imports in auth UI** — `rg -n "@supabase|supabase/client|supabase/server" src/components src/app` and clear matches touched by this task.
- [ ] **Step 6: Verify** — `npx tsc --noEmit && npm test` pass.
- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: social-only auth UI; remove password/email flows"
```

---

### Task A8: Focus-stats from D1 (server-side)

**Files:**
- Rewrite: `src/lib/focus-stats.ts` (keep `startOfWeek`; `fetchFocusStats` now calls the app endpoint; add pure `computeFocusStats`)
- Create: `src/lib/focus-stats.test.ts` (rewrite for the pure function)
- Create: `src/app/api/stats/route.ts`

**Interfaces:**
- Consumes: `getAuth` (A3), `DB` (A1).
- Produces: `computeFocusStats(rows, weekStart): FocusStats`; `GET /api/stats?weekStart=ISO` → `FocusStats` for the session user; `fetchFocusStats(now?)` client helper.

- [ ] **Step 1: Write the failing test for `computeFocusStats`** in `src/lib/focus-stats.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { computeFocusStats } from "@/lib/focus-stats";

describe("computeFocusStats", () => {
  it("aggregates totals and this-week count", () => {
    const weekStart = new Date("2026-09-07T00:00:00.000Z");
    const rows = [
      { duration_seconds: 1500, completed_at: "2026-09-08T10:00:00.000Z" },
      { duration_seconds: 1500, completed_at: "2026-09-01T10:00:00.000Z" },
      { duration_seconds: 300, completed_at: "2026-09-09T10:00:00.000Z" },
    ];
    expect(computeFocusStats(rows, weekStart)).toEqual({
      totalSessions: 3,
      totalMinutes: 55, // (1500+1500+300)/60 = 55
      sessionsThisWeek: 2,
    });
  });

  it("handles empty history", () => {
    expect(computeFocusStats([], new Date())).toEqual({
      totalSessions: 0, totalMinutes: 0, sessionsThisWeek: 0,
    });
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- src/lib/focus-stats.test.ts`
Expected: FAIL (`computeFocusStats` not exported).

- [ ] **Step 3: Rewrite `src/lib/focus-stats.ts`**

```ts
export type FocusStats = {
  totalSessions: number;
  totalMinutes: number;
  sessionsThisWeek: number;
};

type FocusRow = { duration_seconds: number; completed_at: string };

export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const daysSinceMonday = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - daysSinceMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function computeFocusStats(rows: FocusRow[], weekStart: Date): FocusStats {
  const weekStartMs = weekStart.getTime();
  let totalSeconds = 0;
  let sessionsThisWeek = 0;
  for (const row of rows) {
    totalSeconds += row.duration_seconds;
    if (new Date(row.completed_at).getTime() >= weekStartMs) sessionsThisWeek += 1;
  }
  return {
    totalSessions: rows.length,
    totalMinutes: Math.floor(totalSeconds / 60),
    sessionsThisWeek,
  };
}

export async function fetchFocusStats(now: Date = new Date()): Promise<FocusStats> {
  const weekStart = startOfWeek(now).toISOString();
  const res = await fetch(`/api/stats?weekStart=${encodeURIComponent(weekStart)}`);
  if (!res.ok) throw new Error(`stats request failed: ${res.status}`);
  return (await res.json()) as FocusStats;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- src/lib/focus-stats.test.ts`
Expected: PASS.

- [ ] **Step 5: Create `src/app/api/stats/route.ts`**

```ts
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { computeFocusStats, type FocusStats } from "@/lib/focus-stats";

export async function GET(request: Request) {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: headers() });
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
```

- [ ] **Step 6: Update stats callers** — find where `fetchFocusStats` was called with a Supabase client and change to `fetchFocusStats(now)`.
Run: `rg -n "fetchFocusStats" src` and update call sites; `npx tsc --noEmit` passes.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: focus-stats from D1 via /api/stats"
```

---

### Task A9: Room connect uses a Better Auth JWT + lazy anon

**Files:**
- Modify: `src/app/room/[id]/page.tsx` (`getToken`, ensure anon before join)

**Interfaces:**
- Consumes: `authClient.token`, `ensureAnonUser` (A6).
- Produces: the realtime connect token is a Better Auth JWT.

- [ ] **Step 1: Replace `getToken`** at the top of the room page

```ts
import { authClient, ensureAnonUser } from "@/lib/auth-client";

const getToken = async () => {
  await ensureAnonUser(); // lazy: create an anon session on first room join
  const { data } = await authClient.token();
  return data?.token ?? null;
};
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit && npm test` pass.
- [ ] **Step 3: Empirically confirm anon sessions can mint a JWT** (research flagged this as unverified): with `npm run preview`, sign in anonymously, call `authClient.token()`, confirm a token is returned and `/api/auth/jwks` serves a key. If anon cannot mint a JWT, fall back to gating room join on social sign-in and note it.
- [ ] **Step 4: Commit**

```bash
git add src/app/room/
git commit -m "feat: room connect mints a better-auth JWT (lazy anon)"
```

---

## PART B — Realtime Worker (POMO-backend)

### Task B1: Verify Better Auth JWTs (replace Supabase verification)

**Files:**
- Rewrite: `src/auth.ts`
- Rewrite: `test/auth.test.ts` (or wherever `verifyAccessToken` is tested)

**Interfaces:**
- Consumes: `env.APP_ORIGIN`.
- Produces: `verifyAccessToken(token, env): Promise<string | null>` (returns the `sub`), and a testable `verifyToken(token, keySet, opts)`.

- [ ] **Step 1: Install jose** — `cd /Users/llama/Documents/Development/POMO-backend && npm install jose`.

- [ ] **Step 2: Write the failing test** in `test/auth.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { SignJWT, generateKeyPair, exportJWK, createLocalJWKSet } from "jose";
import { verifyToken } from "../src/auth";

async function setup(claims: { sub?: string; iss?: string; aud?: string }) {
  const { publicKey, privateKey } = await generateKeyPair("EdDSA", { crv: "Ed25519" });
  const jwk = await exportJWK(publicKey);
  jwk.kid = "test";
  const keySet = createLocalJWKSet({ keys: [jwk] });
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "EdDSA", kid: "test" })
    .setSubject(claims.sub ?? "user-1")
    .setIssuer(claims.iss ?? "https://app.test")
    .setAudience(claims.aud ?? "https://app.test")
    .setExpirationTime("1h")
    .sign(privateKey);
  return { token, keySet };
}

describe("verifyToken", () => {
  it("returns sub for a valid token", async () => {
    const { token, keySet } = await setup({ sub: "user-1" });
    const uid = await verifyToken(token, keySet, { issuer: "https://app.test", audience: "https://app.test" });
    expect(uid).toBe("user-1");
  });

  it("returns null on issuer mismatch", async () => {
    const { token, keySet } = await setup({ iss: "https://evil.test" });
    const uid = await verifyToken(token, keySet, { issuer: "https://app.test", audience: "https://app.test" });
    expect(uid).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to confirm it fails** — `npm test -- test/auth.test.ts` → FAIL (`verifyToken` not exported).

- [ ] **Step 4: Rewrite `src/auth.ts`**

```ts
import { jwtVerify, createRemoteJWKSet, type JWTVerifyGetKey } from "jose";

export interface AuthEnv {
  APP_ORIGIN: string;
}

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedOrigin: string | null = null;

function jwksFor(origin: string) {
  if (!cachedJwks || cachedOrigin !== origin) {
    cachedJwks = createRemoteJWKSet(new URL(`${origin}/api/auth/jwks`));
    cachedOrigin = origin;
  }
  return cachedJwks;
}

export async function verifyToken(
  token: string,
  keySet: JWTVerifyGetKey,
  opts: { issuer: string; audience: string },
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, keySet, {
      issuer: opts.issuer,
      audience: opts.audience,
    });
    return typeof payload.sub === "string" && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function verifyAccessToken(token: string, env: AuthEnv): Promise<string | null> {
  return verifyToken(token, jwksFor(env.APP_ORIGIN), {
    issuer: env.APP_ORIGIN,
    audience: env.APP_ORIGIN,
  });
}
```

- [ ] **Step 5: Run the test to confirm it passes** — `npm test -- test/auth.test.ts` → PASS.
- [ ] **Step 6: Commit**

```bash
git add src/auth.ts test/auth.test.ts package.json package-lock.json
git commit -m "feat: verify better-auth JWTs via JWKS (replaces supabase)"
```

---

### Task B2: Write completed sessions to D1 (replace Supabase REST)

**Files:**
- Rewrite: `src/focus-session.ts` (`insertFocusSession`, `flushOutbox` env type)
- Rewrite/extend: the focus-session test to use a D1 test binding

**Interfaces:**
- Consumes: `env.DB` (D1).
- Produces: `insertFocusSession(row, env): Promise<boolean>` writing to D1; `flushOutbox(sql, env)` unchanged in behavior.

- [ ] **Step 1: Rewrite the insert + env type in `src/focus-session.ts`** (keep `OutboxRow`, `MAX_ATTEMPTS`, `OUTBOX_RETRY_MS`, and the `flushOutbox` loop; only the env type and `insertFocusSession` body change)

```ts
export interface FocusDbEnv {
  DB: D1Database;
}

export async function insertFocusSession(row: OutboxRow, env: FocusDbEnv): Promise<boolean> {
  try {
    await env.DB.prepare(
      `INSERT INTO focus_session (id, user_id, room_id, duration_seconds, completed_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        row.uid,
        row.room_id,
        row.duration_seconds,
        new Date(row.completed_at).toISOString(),
      )
      .run();
    return true;
  } catch (error) {
    console.error("focus_session insert threw", error);
    return false;
  }
}
```
Change `flushOutbox(sql: SqlStorage, env: SupabaseEnv)` → `env: FocusDbEnv`, and delete the `SupabaseEnv` interface.

- [ ] **Step 2: Add the D1 test binding** — add `d1_databases` (binding `DB`, `database_name` "pomo") to the backend `wrangler.jsonc` (Task B4) and, in the focus-session test, create the schema before asserting:

```ts
import { env } from "cloudflare:test";
// in beforeAll:
await env.DB.exec(
  "CREATE TABLE IF NOT EXISTS focus_session (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, room_id TEXT NOT NULL, duration_seconds INTEGER NOT NULL, completed_at TEXT NOT NULL)",
);
```

- [ ] **Step 3: Write/adjust the test** to assert a row lands in D1

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { env } from "cloudflare:test";
import { insertFocusSession } from "../src/focus-session";

beforeAll(async () => {
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS focus_session (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, room_id TEXT NOT NULL, duration_seconds INTEGER NOT NULL, completed_at TEXT NOT NULL)",
  );
});

describe("insertFocusSession", () => {
  it("writes a row to D1", async () => {
    const ok = await insertFocusSession(
      { id: 1, uid: "u1", room_id: "r1", duration_seconds: 1500, completed_at: Date.now(), attempts: 0 },
      env,
    );
    expect(ok).toBe(true);
    const { results } = await env.DB.prepare("SELECT user_id FROM focus_session WHERE user_id = ?").bind("u1").all();
    expect(results.length).toBe(1);
  });
});
```

- [ ] **Step 4: Run tests** — `npm test` → all pass (existing outbox/DO tests still green; some Task 6-era tests that asserted Supabase behavior may need their env stub swapped to the D1 binding).
- [ ] **Step 5: Commit**

```bash
git add src/focus-session.ts test/ wrangler.jsonc
git commit -m "feat: write focus_session to D1 (replaces supabase REST)"
```

---

### Task B3: Wire the DO connect gate to the new verifier

**Files:**
- Modify: `src/index.ts` (imports/usage only — `onBeforeConnect` shape unchanged)

**Interfaces:**
- Consumes: `verifyAccessToken` (B1).

- [ ] **Step 1:** Confirm `src/index.ts` still imports `verifyAccessToken` from `./auth` and calls it as `await verifyAccessToken(token, env)`. No behavioral change needed — the signature is preserved. Confirm `env.APP_ORIGIN` is typed (after B4).

Run: `npx tsc --noEmit` (or the repo's `typecheck` script)
Expected: passes.

- [ ] **Step 2: Commit** (if anything changed)

```bash
git add src/index.ts
git commit -m "chore: connect gate uses better-auth verifier" --allow-empty
```

---

### Task B4: Backend config — D1 binding, APP_ORIGIN, drop Supabase vars

**Files:**
- Modify: `wrangler.jsonc`

**Interfaces:**
- Produces: `env.DB` and `env.APP_ORIGIN`; removes Supabase vars/secret usage.

- [ ] **Step 1: Update `wrangler.jsonc`** — remove `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` from `vars`, add `APP_ORIGIN`, add the shared D1 binding

```jsonc
"vars": {
  "APP_ORIGIN": "https://tomatera.example.com",
  "ALLOWED_ORIGINS": "https://tomatera.example.com,http://localhost:3001"
},
"d1_databases": [
  { "binding": "DB", "database_name": "pomo", "database_id": "<DATABASE_ID>" }
]
```
(Keep `durable_objects` and `migrations` as-is.)

- [ ] **Step 2:** Remove the old `.dev.vars` `SUPABASE_SECRET_KEY` entry; ensure no code references `SUPABASE_*`. Run: `rg -n "SUPABASE" src` → expected: no matches.
- [ ] **Step 3: Regenerate types + typecheck** — `npx wrangler types` (if used) then `npx tsc --noEmit` passes.
- [ ] **Step 4: Commit**

```bash
git add wrangler.jsonc .dev.vars
git commit -m "chore: bind D1 + APP_ORIGIN, drop supabase vars"
```

---

## MANUAL cutover steps (require your accounts)

- [ ] Set frontend production secrets (App Worker): `wrangler secret put BETTER_AUTH_SECRET` and the six OAuth `*_CLIENT_ID/SECRET` values; set `BETTER_AUTH_URL` var to the app origin.
- [ ] Deploy the App Worker (`npm run deploy`), then POST `/api/admin/migrate` once against production to create Better Auth tables in remote D1.
- [ ] Set `NEXT_PUBLIC_REALTIME_HOST` to the realtime Worker host; set the realtime Worker's `APP_ORIGIN` + `ALLOWED_ORIGINS`; `wrangler deploy` the backend.
- [ ] End-to-end smoke test: anonymous join → start/pause → work→break completion writes a `focus_session` row in D1 → stats reflect it; then sign in with each provider (Google/Discord/GitHub) and confirm the anon history is re-pointed (stats persist across the upgrade).

## Self-Review

- **Spec coverage:** Better Auth social-only + anonymous (A3, A6, A7); D1 store + migration (A1, A5); stats from D1 (A8); JWT mint (A9) + verify (B1); focus_session → D1 (B2); realtime rewire (B3, B4). Matches spec Phases 2–3.
- **Placeholder scan:** `<DATABASE_ID>` and `<dev>` secrets are explicit manual inputs (prerequisites), not plan gaps. All code steps contain full code.
- **Type consistency:** `verifyAccessToken(token, env)` signature preserved for `src/index.ts`; `verifyToken(token, keySet, opts)` is the tested seam; `computeFocusStats(rows, weekStart)` used identically in test, lib, and route; `FocusStats` shape unchanged from the old Supabase path.
- **Known highest-risk area:** the per-request `getAuth()` + `nextCookies()` + OpenNext cookie lifecycle (A3–A7). Test sign-in cookie-setting end-to-end during the manual cutover; if server-action cookies don't stick, verify `nextCookies()` is last and that `getSession` reads `headers()`.
