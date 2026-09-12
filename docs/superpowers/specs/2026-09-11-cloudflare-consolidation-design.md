# Design: Cloudflare Consolidation — retire Supabase (OpenNext + Better Auth + D1)

**Date:** 2026-09-11
**Status:** Draft (awaiting user review)
**Scope:** Both repos — `POMO-frontend` (Next.js app) and `POMO-backend` (realtime Worker / Durable Object)

## Goal

Move POMO fully onto Cloudflare and retire Supabase entirely. Concretely:

- Host the Next.js app on Cloudflare Workers (via OpenNext) instead of Netlify.
- Replace Supabase Auth with **Better Auth** (social-only), running in the app Worker with **D1** as its database.
- Move `focus_session` and focus-stats from Supabase Postgres to **D1**.
- Repoint the realtime Worker to verify Better Auth JWTs and write completed sessions to D1.
- Delete all Supabase code, dependencies, env vars, and the Supabase project.

Motivation: single vendor, same-origin auth (no cross-site cookie complexity), and local JWT verification on the realtime edge (no per-connect network hop to an auth server).

## Decisions (locked with the user)

1. **Topology:** full consolidation — move the Next.js app to Cloudflare Workers so app + auth + D1 are one same-origin Cloudflare deployment.
2. **Auth methods:** social sign-in only — **Google, Discord, GitHub**. No email/password, no magic link/OTP, no transactional email.
3. **Anonymous-first:** keep it. Lazily create an anonymous user on first identity-need; upgrading via a social provider preserves the same user id and focus history (Better Auth anonymous plugin, `onLink: "promote"`).
4. **User/data migration:** none. No real users exist yet; existing focus data is disposable. Clean slate.
5. **Session recording:** the realtime Worker writes completed sessions **directly to D1** (same D1 bound to the realtime Worker), keeping the existing outbox pattern.
6. **Next.js:** bump to a current OpenNext-supported version as part of this work.
7. **One spec:** the frontend move and the auth+data cutover are designed together (this document), built in phases.

## Current state (what Supabase provides today)

Auth (`@supabase/ssr`, hosted Supabase):
- Anonymous sign-in on page load (`useEnsureAnonUser` → `signInAnonymously`).
- Anonymous → permanent upgrade preserving id (`signUpOrUpgrade` → `updateUser` with email/password on an anon user).
- Email/password sign-up + email verification (`/auth/confirm` → `verifyOtp`), login (`signInWithPassword`), password reset (`resetPasswordForEmail`), update password, logout.
- SSR cookie sessions via `@supabase/ssr` + Next middleware (`src/middleware.ts` → `lib/supabase/middleware.ts`), server/browser clients, `AuthContext`.
- A JWT access token the realtime Worker verifies on connect (`POMO-backend/src/auth.ts` → `GET /auth/v1/user`).

Data (Supabase Postgres, `supabase/migrations/20260911001729_focus_session.sql`):
- `focus_session (id uuid, user_id uuid → auth.users, room_id text, duration_seconds int, completed_at timestamptz)` with RLS (insert/select own) and an index on `(user_id, completed_at desc)`.
- `get_focus_stats(week_start timestamptz)` SQL function returning `total_sessions`, `total_minutes`, `sessions_this_week`, scoped to `auth.uid()`.
- Client reads stats via `supabase.rpc("get_focus_stats", ...)` (`lib/focus-stats.ts`).
- The realtime Worker inserts completed **work** sessions server-side via REST using the Supabase secret key (`POMO-backend/src/focus-session.ts`).

## Target architecture

Two Cloudflare Workers + one D1, all same vendor:

- **App Worker** (`POMO-frontend` via `@opennextjs/cloudflare`): serves the Next.js UI and hosts Better Auth at `/api/auth/*`. Binds D1. Same origin as the browser → Better Auth cookies work without cross-site handling.
- **Realtime Worker** (`POMO-backend`, existing `RoomServer` Durable Object): unchanged in spirit. Binds the **same** D1 for session writes. Verifies a Better Auth JWT on connect (replacing the Supabase verification call).
- **D1** (single database): Better Auth tables (`user`, `session`, `account`, `verification`, `jwks`) **and** `focus_session`.

Supabase (Auth + Postgres) is removed entirely.

```
Browser ──cookies (same-origin)──► App Worker (Next.js + Better Auth) ──► D1
   │                                     ▲ (mints JWT via /api/auth/token)
   │  JWT in connect query               │ JWKS (/api/auth/jwks)
   └──WebSocket──► Realtime Worker (RoomServer DO) ──verify JWT, write sessions──► D1
```

## Auth design (Better Auth)

- **Library:** Better Auth ≥ 1.5 (native D1 support: pass the D1 binding as `database`; auto-detected Kysely dialect; no interactive transactions → uses `batch()`). Auth instance created per request (env is request-scoped on Workers).
- **Providers:** Google, Discord, GitHub (built-in social providers). Client ids/secrets in Worker secrets. Redirect URIs = `<app-origin>/api/auth/callback/<provider>`.
- **Plugins:**
  - `anonymous({ onLink: "promote" })` — upgrade the anon user in place on first social sign-in: same id, sessions re-pointed, `focus_session` rows stay valid.
  - `jwt` — exposes `/api/auth/token` (mint a JWKS-verifiable JWT for the realtime Worker) and `/api/auth/jwks`.
- **Anonymous-first behavior:** create the anon user **lazily** the first time identity is needed (e.g. joining a room), not on every page load, to avoid junk users. This is a deliberate improvement over the current on-load `signInAnonymously`.
- **Sessions:** Better Auth cookie sessions. A Next middleware handles session/route needs; the current Supabase middleware and `@supabase/ssr` usage are removed.
- **No** email/password, password reset, update-password, or email verification flows, and **no** transactional email provider.

### UI / client changes

- Login and sign-up forms become "Continue with Google / Discord / GitHub" buttons.
- Remove: `forgot-password-form`, `update-password-form`, email/password fields in `login-form`/`sign-up-form`, `/auth/confirm` route.
- `AuthContext` / `useCurrentUser` rewired to the Better Auth client (`useSession`/`authClient`).
- Anonymous display name + avatar continue to be generated client-side (`utils/user.ts`, dicebear + unique-names) and passed on connect. (Optional, non-blocking: persist them to Better Auth user metadata for stability across reconnects.)

## Data design (D1)

- **`focus_session`** table in D1: `id` (text, `crypto.randomUUID()`), `user_id` (text, = Better Auth user id), `room_id` (text), `duration_seconds` (int, > 0), `completed_at` (text, UTC ISO-8601 — lexicographic comparison works for the `week_start` filter). Index on `(user_id, completed_at)`.
- **Stats:** `get_focus_stats` is replaced by a server-side aggregation query in the App Worker (which holds the D1 binding), scoped to the session user. Inputs mirror today: a client-provided `week_start` so "this week" respects the user's timezone. Outputs unchanged: `totalSessions`, `totalMinutes`, `sessionsThisWeek`. The client-side `supabase.rpc` read path is removed; stats are fetched from the app server (route handler / server action).
- **Access control (replaces RLS):** enforced in code, not the database.
  - App reads: only `where user_id = <authenticated session user>`.
  - Realtime Worker writes: only the verified user's own rows (`user_id` = verified JWT `sub`).
- **No data migration:** existing Supabase `focus_session` rows are discarded.

## Realtime Worker integration (`POMO-backend`)

- **Connect auth:** client mints a Better Auth JWT via `/api/auth/token` and passes it in the PartySocket connect query — the exact slot the Supabase token uses today. Anonymous sessions can mint a JWT too, so anon users can still join rooms.
- **Verification:** the Worker verifies the JWT locally with `jose` + `createRemoteJWKSet(<app-origin>/api/auth/jwks)` (cached), checking issuer/audience, and sets `x-user-id` from the verified `sub`. Because the realtime Worker is a **different** origin from the app, this cross-origin JWKS fetch is fine (no self-fetch problem). This replaces the `GET /auth/v1/user` Supabase call and removes the per-connect network round-trip (only JWKS refresh hits the network). The DO trust model is unchanged: the DO trusts only `x-user-id`.
- **Session writes:** the outbox writes completed work sessions to **D1** (bound to the realtime Worker) instead of Supabase REST. Retry/max-attempt semantics unchanged. The Supabase secret key and REST insert are removed.

## Deployment & configuration

- **App Worker:** OpenNext build/deploy via Wrangler. Bindings: `DB` (D1). Secrets/vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (app origin), `GOOGLE_CLIENT_ID/SECRET`, `DISCORD_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`. OpenNext incremental cache may need an R2/KV binding (confirm at plan time).
- **Realtime Worker:** bindings `RoomServer` (DO, existing), `DB` (same D1). Vars: app origin (for JWKS + issuer/audience), keep `ALLOWED_ORIGINS`. Remove `SUPABASE_URL/PUBLISHABLE_KEY/SECRET_KEY`.
- **Frontend env:** remove all `NEXT_PUBLIC_SUPABASE_*`; keep `NEXT_PUBLIC_REALTIME_HOST` (points at the realtime Worker).
- **Domain:** the app is served from a single origin (custom domain or `workers.dev`; TBD at deploy). OAuth redirect URIs and the cookie domain are configured to that origin.
- **Retire:** delete the Supabase project, Netlify site, `supabase/` migrations/config, `@supabase/*` deps.

## Phasing (single spec, build order)

1. **App → Workers (OpenNext), Supabase untouched.** Add the OpenNext adapter + Wrangler config, bump Next.js, get the app running/deployed on Workers with Supabase auth/data still in place. De-risks the platform move in isolation.
2. **D1 + Better Auth in the App Worker.** Provision D1, add Better Auth (social providers + anonymous + jwt), build the social sign-in + anon-upgrade UI, move `focus_session` + stats to D1 (app-side read). App now uses Better Auth end-to-end; Supabase auth/data no longer read by the app.
3. **Repoint the realtime Worker.** JWT verification via JWKS; outbox writes to D1. Bind the same D1.
4. **Retire Supabase.** Delete Supabase code/deps/env, `supabase/` dir, and the hosted project; final verification.

## Testing strategy

- Unit: the D1 stats aggregation query (boundary cases: week_start, empty history); auth helper/config where logic exists; realtime Worker JWT verification (valid/invalid/expired, issuer/audience mismatch) using the existing Vitest Workers-pool setup with a stubbed JWKS.
- Integration/manual: OAuth round-trip per provider (Google, Discord, GitHub); anonymous → social upgrade preserves id + focus history; two-window room smoke test (join, timer, work→break completion, a completed session row in D1).
- Keep the realtime Worker's existing test suite green as its verification/write paths change.

## Risks & mitigations

- **OpenNext / Next.js compatibility.** Bumping Next.js may surface App Router/middleware/runtime issues. Mitigate by doing Phase 1 in isolation (Supabase still in place) and verifying a full deploy before touching auth/data.
- **Anonymous `onLink: "promote"`.** Highest-risk behavior; if promotion ever fails it must not lose data (Better Auth keeps both rows on failure). Cover with explicit tests and manual verification per provider.
- **OAuth setup.** Three provider apps must be registered with correct redirect URIs/secrets on the final app origin; a wrong origin breaks callback. Track domain as a deploy parameter.
- **D1 limitations.** No interactive transactions (Better Auth uses `batch()`); SQLite semantics for the stats query (integer division for minutes, timezone handled via client `week_start`).
- **JWKS fetch.** Realtime Worker must point JWKS at the app origin (a different origin) and cache it; never self-fetch.

## Out of scope / non-goals

- Merging the app Worker and realtime Worker into one deployment (they stay separate).
- Any new auth methods beyond the three social providers (no email/password, magic link, passkeys).
- New product features (spotlight moment, achievements, leaderboards).
- Migrating existing Supabase users or focus data (clean slate).
