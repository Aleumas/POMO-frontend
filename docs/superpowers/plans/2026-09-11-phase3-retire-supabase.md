# Phase 3 — Retire Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all Supabase code, dependencies, config, and env from both repos, decommission Netlify, and retire the hosted Supabase project — leaving an all-Cloudflare stack.

**Architecture:** Pure cleanup. By this point (after Phase 2) nothing reads or writes Supabase at runtime; this phase deletes the now-dead code/deps and the external services.

**Tech Stack:** Cloudflare Workers (App + realtime), D1, Better Auth.

**Repos:** `POMO-frontend` and `POMO-backend`.

## Global Constraints

- Only run this phase after Phase 2 is deployed and verified end-to-end. Deletion here is safe *only* because nothing uses Supabase anymore.
- Both test suites and typechecks MUST stay green after each task.
- Do not remove `partysocket` (still used) or any Cloudflare/Better Auth deps.
- Decommissioning external services (Supabase project, Netlify site) is MANUAL and irreversible — do it last, after code cleanup is merged and production is confirmed healthy on Cloudflare.

---

### Task 1: Remove Supabase from the frontend

**Files:**
- Delete: `src/lib/supabase/` (`client.ts`, `server.ts`, `middleware.ts`), `src/middleware.ts`, `supabase/` (migrations/config), `netlify.toml`
- Modify: `package.json` (drop `@supabase/ssr`, `@supabase/supabase-js`)
- Modify: any file with a lingering `@supabase` import

**Interfaces:**
- Produces: a frontend with zero Supabase references.

- [ ] **Step 1: Find every remaining Supabase reference**

Run: `rg -n "@supabase|supabase" src supabase netlify.toml next.config.mjs`
Record the list; every match must be gone by end of task (except unrelated words, if any).

- [ ] **Step 2: Delete Supabase files**

```bash
cd /Users/llama/Documents/Development/POMO-frontend
git rm -r src/lib/supabase src/middleware.ts supabase netlify.toml
```
Note: `src/middleware.ts` only existed to refresh Supabase sessions. If any non-Supabase middleware behavior is still needed, re-create a minimal middleware; otherwise its deletion is correct.

- [ ] **Step 3: Remove leftover imports** — for each remaining match from Step 1 (e.g. `useEnsureAnonUser` should already be gone; check `NEXT_PUBLIC_SUPABASE_*` usages in `.env.local`), edit the file to drop the Supabase usage.

- [ ] **Step 4: Uninstall deps**

```bash
npm uninstall @supabase/ssr @supabase/supabase-js
```

- [ ] **Step 5: Remove Supabase env keys** from `.env.local` / `.dev.vars` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).

- [ ] **Step 6: Verify**

Run: `rg -n "@supabase|SUPABASE|supabase" src .env.local || echo "clean"`
Expected: `clean` (no matches).
Run: `npx tsc --noEmit && npm test && npm run build`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove Supabase from frontend (deps, clients, middleware, config)"
```

---

### Task 2: Remove Supabase remnants from the backend

**Files:**
- Modify: `POMO-backend/wrangler.jsonc`, `.dev.vars` (confirm no Supabase keys remain — most removed in Phase 2 B4)
- Delete: any Supabase-specific test fixtures/helpers no longer used

**Interfaces:**
- Produces: a realtime Worker with zero Supabase references.

- [ ] **Step 1: Search**

Run: `cd /Users/llama/Documents/Development/POMO-backend && rg -n "SUPABASE|supabase"`
Expected after Phase 2: at most stale test fixtures/comments.

- [ ] **Step 2: Remove any remaining matches** (env keys, dead test helpers, comments referencing Supabase). The `SupabaseEnv` interface should already be gone (Phase 2 B2).

- [ ] **Step 3: Verify**

Run: `rg -n "SUPABASE|supabase" || echo "clean"`
Expected: `clean`.
Run: `npx tsc --noEmit && npm test`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove Supabase remnants from realtime worker"
```

---

### Task 3 (MANUAL — requires your accounts): Decommission external services

Do this only after both repos are merged and production is confirmed healthy on Cloudflare.

- [ ] Remove Supabase secrets from the realtime Worker if any remain: `wrangler secret delete SUPABASE_SECRET_KEY` (ignore if already absent).
- [ ] Confirm the deployed App Worker + realtime Worker function end-to-end with no Supabase env present.
- [ ] Delete the Netlify site (or disconnect the repo) — DNS/domain now points at the App Worker.
- [ ] Pause, then delete the Supabase project from the Supabase dashboard (export anything you want to keep first; per spec, data is disposable).
- [ ] Rotate/revoke any Supabase keys that were ever committed historically (the old `SUPABASE_PUBLISHABLE_KEY` was in `wrangler.jsonc` git history).

---

## Self-Review

- **Spec coverage:** Implements spec Phase 4 ("Delete all Supabase code/deps/env, `supabase/` dir, and the hosted project; final verification").
- **Placeholder scan:** none — all steps are concrete commands. Task 3 is explicitly manual.
- **Safety:** deletion is gated on Phase 2 being live and verified; external-service teardown is last and irreversible, with a data-export reminder and a key-rotation reminder for historically-committed keys.
