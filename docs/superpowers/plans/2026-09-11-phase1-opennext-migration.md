# Phase 1 — Frontend to Cloudflare Workers (OpenNext) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the POMO Next.js app off Netlify onto Cloudflare Workers using the OpenNext adapter, with Supabase auth/data left fully in place and working.

**Architecture:** Bump Next.js to 14.2.x, add `@opennextjs/cloudflare` + Wrangler config, and run the app in the Workers runtime. No auth, data, or realtime changes in this phase — this is purely the hosting platform move, done in isolation to de-risk it before Better Auth/D1.

**Tech Stack:** Next.js 14.2.x (App Router, React 18), `@opennextjs/cloudflare`, Wrangler, Cloudflare Workers + R2 (incremental cache).

**Repo:** `POMO-frontend` only.

## Global Constraints

- Do NOT touch Supabase, auth, realtime, or `focus_session` in this phase. The app must behave identically, just hosted on Workers.
- `compatibility_date` = `2025-04-01` (satisfies OpenNext's `2024-09-23`+ floor and enables reliable `process.env` population).
- `compatibility_flags` MUST include `nodejs_compat`.
- Worker `name` = `pomo-frontend`.
- Do NOT use Turbopack (`next build`, never `next build --turbo`); OpenNext is incompatible with it.
- No `export const runtime = "edge"` anywhere (already none — keep it that way).
- `@opennextjs/cloudflare` is a prod dependency; `wrangler` (≥ 3.99.0) is a devDependency.
- Keep the existing Vitest suite green at every commit.
- Netlify config (`netlify.toml`) stays until Phase 3 cutover verification; do not delete it yet.

---

### Task 1: Bump Next.js to 14.2.x

**Files:**
- Modify: `package.json` (`next`, `eslint-config-next` versions)

**Interfaces:**
- Produces: an app that builds and tests green on Next 14.2.x (prerequisite for the OpenNext adapter, which only supports the latest 14 minors).

- [ ] **Step 1: Pin Next.js and eslint-config-next to latest 14.2.x**

```bash
cd /Users/llama/Documents/Development/POMO-frontend
npm install next@^14.2.0 eslint-config-next@^14.2.0
```

- [ ] **Step 2: Verify the production build passes**

Run: `npm run build`
Expected: `next build` completes with "Compiled successfully" and no type errors.

- [ ] **Step 3: Verify the existing test suite passes**

Run: `npm test`
Expected: all existing Vitest tests pass (same count as before the bump).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: bump Next.js to 14.2.x for OpenNext compatibility"
```

---

### Task 2: Add the OpenNext Cloudflare adapter and Wrangler config

**Files:**
- Create: `wrangler.jsonc`
- Create: `open-next.config.ts`
- Create: `.dev.vars`
- Create: `public/_headers`
- Modify: `next.config.mjs`
- Modify: `package.json` (scripts)
- Modify: `.gitignore`

**Interfaces:**
- Produces: `npm run preview` builds the app for the Workers runtime and serves it locally; `getCloudflareContext().env` becomes available to server code (used in Phase 2).

- [ ] **Step 1: Install the adapter and Wrangler**

```bash
npm install @opennextjs/cloudflare@latest
npm install --save-dev wrangler@latest
```

- [ ] **Step 2: Create `wrangler.jsonc`**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "main": ".open-next/worker.js",
  "name": "pomo-frontend",
  "compatibility_date": "2025-04-01",
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "services": [
    {
      "binding": "WORKER_SELF_REFERENCE",
      "service": "pomo-frontend"
    }
  ],
  "r2_buckets": [
    {
      "binding": "NEXT_INC_CACHE_R2_BUCKET",
      "bucket_name": "pomo-frontend-inc-cache"
    }
  ]
}
```

- [ ] **Step 3: Create `open-next.config.ts`**

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
```

- [ ] **Step 4: Wrap `next.config.mjs` with `initOpenNextCloudflareForDev`**

```js
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: false,
  async headers() {
    return [];
  },
};

initOpenNextCloudflareForDev();

export default nextConfig;
```

- [ ] **Step 5: Create `.dev.vars`**

```
NEXTJS_ENV=development
```

- [ ] **Step 6: Create `public/_headers`** (static assets bypass the Worker, so caching is set here)

```
/_next/static/*
  Cache-Control: public,max-age=31536000,immutable
```

- [ ] **Step 7: Add scripts to `package.json`** (keep existing `dev`, `build`, `start`, `lint`, `test`)

```json
"preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
"deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
"cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"
```

- [ ] **Step 8: Update `.gitignore`**

```
node_modules
.next
.env
.env.local
.open-next
.dev.vars
cloudflare-env.d.ts
```

- [ ] **Step 9: Commit**

```bash
git add wrangler.jsonc open-next.config.ts public/_headers next.config.mjs package.json package-lock.json .gitignore
git commit -m "feat: add OpenNext Cloudflare adapter and Wrangler config"
```

---

### Task 3: Generate Cloudflare types and verify the Workers build

**Files:**
- Create: `cloudflare-env.d.ts` (generated, git-ignored)

**Interfaces:**
- Consumes: the config from Task 2.
- Produces: a confirmed OpenNext build + local Workers-runtime boot.

- [ ] **Step 1: Generate Cloudflare env types**

Run: `npm run cf-typegen`
Expected: `cloudflare-env.d.ts` is written with an `interface CloudflareEnv` (includes `ASSETS`, `NEXT_INC_CACHE_R2_BUCKET`).

- [ ] **Step 2: Build with the OpenNext adapter**

Run: `npx opennextjs-cloudflare build`
Expected: build completes and produces `.open-next/worker.js` and `.open-next/assets/`. No "edge runtime not supported" errors.

- [ ] **Step 3: Serve in the local Workers runtime and smoke-test**

Run: `npm run preview`
Then in another shell:
```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:8770/
```
(Use whatever port `wrangler dev` reports.) Expected: `200`. Manually load the home page and one room page in a browser; confirm the app renders and Supabase auth still initializes (anonymous session created as before). Stop the preview server when done.

- [ ] **Step 4: Verify the standard build and tests are still green**

Run: `npm run build && npm test`
Expected: both pass.

- [ ] **Step 5: Commit** (only if any tracked files changed; `.open-next`/`cloudflare-env.d.ts` are git-ignored)

```bash
git add -A
git commit -m "chore: verify OpenNext Workers build" --allow-empty
```

---

### Task 4 (MANUAL — requires your Cloudflare account): First deploy

This task cannot be run by an agent; it needs your authenticated Cloudflare account.

- [ ] Authenticate Wrangler: `npx wrangler login`.
- [ ] Create the R2 bucket referenced in `wrangler.jsonc`: `npx wrangler r2 bucket create pomo-frontend-inc-cache`.
- [ ] Move any required public build-time env vars into `.env`/Next `.env` files (the app currently reads `NEXT_PUBLIC_*` — these must be present at build). Confirm `npm run build` still succeeds locally with them.
- [ ] Deploy: `npm run deploy`.
- [ ] Smoke-test the deployed URL: home page, create/join a room (Supabase realtime still points at the existing backend via `NEXT_PUBLIC_REALTIME_HOST`), confirm anonymous auth and stats work exactly as on Netlify.
- [ ] Decide on the final domain (custom domain or `pomo-frontend.<subdomain>.workers.dev`); note it — Phase 2 needs it for OAuth redirect URIs and `BETTER_AUTH_URL`.

**Do not decommission Netlify yet** — that happens in Phase 3 after the full cutover is verified.

---

## Self-Review

- **Spec coverage:** Implements spec Phase 1 ("App → Workers (OpenNext), Supabase untouched") and Decision #6 (OpenNext + Next 14.2.x bump). No auth/data/realtime changes — matches "Supabase untouched."
- **Placeholder scan:** `<DATABASE_ID>` etc. not used here; the R2 bucket name is concrete. Task 4 is explicitly manual, not a placeholder.
- **Type consistency:** Binding names (`ASSETS`, `NEXT_INC_CACHE_R2_BUCKET`, `WORKER_SELF_REFERENCE`) are consistent between `wrangler.jsonc` and the caching override.
- **Known risk:** if the app uses ISR/`revalidateTag` with Sanity content, on-demand revalidation also needs a queue + tag cache (see spec/OpenNext caching docs); plain SSR works with the R2 incremental cache alone. Verify during Task 3 preview whether any route logs a missing-cache error and, if so, add `doQueue` + `d1NextTagCache` per the OpenNext caching docs before Task 4.
