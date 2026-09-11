# Statistics, Achievements, and Anonymous Account Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record every completed work session per user, show it back to them on a Statistics page and the existing Achievements page, and let an anonymous user upgrade to an email account without losing that history.

**Architecture:** The client writes one `focus_session` row to Supabase when the work timer reaches zero (hooked into the existing XState `onSessionComplete` action). Stats are read directly from Supabase via a `get_focus_stats` RPC protected by RLS, so a user can only ever see their own rows; the unauthenticated Express endpoint is removed. Sign-up upgrades the current anonymous Supabase user in place with `auth.updateUser` (same user ID, so history carries over) instead of creating a second user with `auth.signUp`.

**Tech Stack:** Next.js 14 (App Router, client components), React 18, TypeScript (non-strict), XState 5, `@supabase/ssr` + `@supabase/supabase-js`, Supabase CLI 2.x (migrations), Tailwind + shadcn-style components, Bun 1.2 as the package runner, Vitest + React Testing Library (added in Task 1). Backend: Node 26, Express 4, Socket.IO 4.

## Global Constraints

- Frontend repo: `/Users/llama/Documents/Development/POMO-frontend`. Backend repo: `/Users/llama/Documents/Development/POMO-backend`. Each task says which repo it runs in.
- Use `bun` for installs and scripts in the frontend (`bun add`, `bun run`, `bunx`). Backend uses `npm`.
- Path alias `@/*` → `./src/*` (see `tsconfig.json`). New source files use it.
- `tsconfig.json` has `"strict": false`. Do not turn it on.
- Formatting: `bun run lint` runs Prettier (`npx prettier . --write`). Run it before every commit that touches frontend files.
- A "session" for stats means a **completed work session** (the work timer reached zero). Break sessions are never recorded. Stopping a timer early is never recorded.
- Stats to show, in this order and with these labels: "Sessions completed", "Minutes focused", "Sessions this week". Week starts Monday 00:00 in the user's local timezone.
- All stats reads go directly to Supabase from the client, never through the Express backend.
- Supabase project must have **Allow anonymous sign-ins** enabled (it already is; `useEnsureAnonUser` relies on it) and **email confirmation** enabled for the upgrade flow.
- Do not add explanatory comments that restate the code. Comment only non-obvious "why" or gotchas.
- Commit after every task with the exact message given. Do not amend earlier commits.
- **Decision recorded in Task 7:** the hCaptcha widget is removed from the sign-up form. `auth.updateUser` (the upgrade path) has no captcha parameter, so keeping the widget would only guard the fallback path and mislead users. Abuse protection for `signInAnonymously` is out of scope for this plan.

---

## File Structure

Frontend (`POMO-frontend`):

| File                                                  | Responsibility                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| `vitest.config.ts` (create)                           | Vitest config: jsdom, `@` alias, setup file                       |
| `vitest.setup.ts` (create)                            | Registers jest-dom matchers                                       |
| `package.json` (modify)                               | `test` script, dev deps                                           |
| `supabase/config.toml` (create, via `supabase init`)  | CLI project config                                                |
| `supabase/migrations/<ts>_focus_session.sql` (create) | `focus_session` table, RLS, `get_focus_stats` RPC                 |
| `src/lib/focus-session.ts` (create)                   | Turn timer context into an insert row; insert it                  |
| `src/lib/focus-session.test.ts` (create)              | Tests for the above                                               |
| `src/lib/session-machine-actions.ts` (modify)         | Call `insertFocusSession` from `onSessionComplete`                |
| `src/lib/focus-stats.ts` (create)                     | `startOfWeek`, `fetchFocusStats` (RPC call)                       |
| `src/lib/focus-stats.test.ts` (create)                | Tests for the above                                               |
| `src/hooks/useFocusStats.ts` (create)                 | React hook: load stats for the current user                       |
| `src/components/focus-stats-cards.tsx` (create)       | Presentational 3-card grid                                        |
| `src/components/focus-stats-cards.test.tsx` (create)  | Render test                                                       |
| `src/app/statistics/page.tsx` (create)                | Statistics route                                                  |
| `src/app/room/[id]/page.tsx` (modify)                 | Wire Statistics + Achievements buttons; remove dead session check |
| `src/app/achievements/page.tsx` (modify)              | Use `useFocusStats` instead of commented axios fetch              |
| `src/lib/auth/sign-up.ts` (create)                    | `signUpOrUpgrade`: upgrade anon user or create new one            |
| `src/lib/auth/sign-up.test.ts` (create)               | Tests for the above                                               |
| `src/components/sign-up-form.tsx` (modify)            | Use `signUpOrUpgrade`; drop hCaptcha                              |
| `src/hooks/useCurrentUser.ts` (modify)                | `isAnonymous` from `user.is_anonymous`                            |
| `src/app/auth/sign-up-success/page.tsx` (modify)      | Copy fits the upgrade flow                                        |
| `src/lib/supabase/session-utils.ts` (delete)          | Dead code querying the old `session` table                        |

Backend (`POMO-backend`):

| File                             | Responsibility                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| `server.js` (modify)             | Remove `/:user_sub/total_sessions` and the join-time `session` insert; load dotenv directly |
| `supabase/supabase.mjs` (delete) | No longer used                                                                              |
| `package.json` (modify)          | Drop `@supabase/supabase-js`                                                                |

---

### Task 1: Frontend test runner (Vitest + React Testing Library)

Repo: `POMO-frontend`

**Files:**

- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Modify: `package.json` (scripts + devDependencies)
- Create: `src/lib/smoke.test.ts` (deleted again at the end of this task)

**Interfaces:**

- Produces: `bun run test` runs all `src/**/*.test.{ts,tsx}` files under jsdom with `@/` imports resolving to `src/`.

- [ ] **Step 1: Install dev dependencies**

Run:

```bash
cd /Users/llama/Documents/Development/POMO-frontend
bun add -d vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom
```

Expected: `package.json` `devDependencies` gains those six entries; `bun.lock` updates.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add the `test` script to `package.json`**

Change the `scripts` block to:

```json
"scripts": {
  "dev": "next dev -p 3001",
  "build": "next build",
  "start": "next start -p 3001",
  "lint": "npx prettier . --write",
  "test": "vitest run"
}
```

- [ ] **Step 5: Write a smoke test**

Create `src/lib/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatTime } from "@/lib/session-machine-utils";

describe("vitest smoke", () => {
  it("resolves the @ alias and runs", () => {
    expect(formatTime(90)).toBe("01:30");
  });
});
```

- [ ] **Step 6: Run it**

Run: `bun run test`
Expected: `✓ src/lib/smoke.test.ts (1 test)` and `Test Files  1 passed`.

- [ ] **Step 7: Delete the smoke test and commit**

```bash
rm src/lib/smoke.test.ts
bun run lint
git add vitest.config.ts vitest.setup.ts package.json bun.lock
git commit -m "chore: add vitest and testing library"
```

---

### Task 2: Supabase schema — `focus_session` table and `get_focus_stats` RPC

Repo: `POMO-frontend`

**Files:**

- Create: `supabase/config.toml` (generated by `supabase init`)
- Create: `supabase/migrations/<timestamp>_focus_session.sql` (generated name; content below)

**Interfaces:**

- Produces table `public.focus_session(id uuid, user_id uuid, room_id text, duration_seconds int, completed_at timestamptz)` with RLS: authenticated users may insert/select only rows where `user_id = auth.uid()`.
- Produces RPC `public.get_focus_stats(week_start timestamptz)` returning exactly one row `{ total_sessions bigint, total_minutes bigint, sessions_this_week bigint }` for the calling user.

- [ ] **Step 1: Initialise the CLI project if `supabase/config.toml` is missing**

Run:

```bash
cd /Users/llama/Documents/Development/POMO-frontend
test -f supabase/config.toml || supabase init
```

Expected: `supabase/config.toml` exists. Answer "N" to any prompt about generating IDE settings.

- [ ] **Step 2: Link to the hosted project**

Run: `supabase link --project-ref <your-project-ref>` (the ref is the subdomain of `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`, e.g. `abcdefghijklmnop` from `https://abcdefghijklmnop.supabase.co`). Enter the database password when prompted.
Expected: `Finished supabase link.`

- [ ] **Step 3: Create the migration file**

Run: `supabase migration new focus_session`
Expected: prints the created path, e.g. `supabase/migrations/20260910230000_focus_session.sql`.

- [ ] **Step 4: Write the migration**

Replace the contents of the generated file with:

```sql
create table public.focus_session (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  room_id text not null,
  duration_seconds integer not null check (duration_seconds > 0),
  completed_at timestamptz not null default now()
);

create index focus_session_user_completed_idx
  on public.focus_session (user_id, completed_at desc);

alter table public.focus_session enable row level security;

create policy "focus_session_insert_own"
  on public.focus_session
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "focus_session_select_own"
  on public.focus_session
  for select
  to authenticated
  using (auth.uid() = user_id);

-- week_start is passed by the client so "this week" respects the user's timezone.
create or replace function public.get_focus_stats(week_start timestamptz)
returns table (
  total_sessions bigint,
  total_minutes bigint,
  sessions_this_week bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*)::bigint as total_sessions,
    (coalesce(sum(duration_seconds), 0) / 60)::bigint as total_minutes,
    (count(*) filter (where completed_at >= week_start))::bigint as sessions_this_week
  from public.focus_session
  where user_id = auth.uid();
$$;

revoke execute on function public.get_focus_stats(timestamptz) from public, anon;
grant execute on function public.get_focus_stats(timestamptz) to authenticated;
```

- [ ] **Step 5: Push the migration**

Run: `supabase db push`
Expected: lists the new migration, asks `Do you want to push these migrations to the remote database? [Y/n]`, answer `Y`, then `Finished supabase db push.`

- [ ] **Step 6: Verify the RPC returns a zero row for a fresh user**

In the Supabase dashboard SQL editor run:

```sql
select * from public.get_focus_stats(now());
```

Expected: one row, all three columns `0` (the dashboard runs as `postgres`, so `auth.uid()` is null and no rows match; the point is the function compiles and returns a single row).

- [ ] **Step 7: Commit**

```bash
git add supabase/config.toml supabase/migrations
git commit -m "feat: add focus_session table and get_focus_stats rpc"
```

---

### Task 3: Record a completed work session

Repo: `POMO-frontend`

**Files:**

- Create: `src/lib/focus-session.ts`
- Create: `src/lib/focus-session.test.ts`
- Modify: `src/lib/session-machine-actions.ts:1-47`

**Interfaces:**

- Consumes: `TimerContext`, `SessionMachineState` from `@/lib/session-machine-types`; `createClient()` from `@/lib/supabase/client`; table `focus_session` from Task 2.
- Produces:
  - `type FocusSessionInsert = { user_id: string; room_id: string; duration_seconds: number }`
  - `focusSessionFromContext(context: TimerContext): FocusSessionInsert | null`
  - `insertFocusSession(supabase: Pick<SupabaseClient, "from">, row: FocusSessionInsert): Promise<void>`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/focus-session.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import {
  focusSessionFromContext,
  insertFocusSession,
} from "@/lib/focus-session";
import {
  SessionMachineState,
  TimerMachineState,
  TimerContext,
} from "@/lib/session-machine-types";

const workContext: TimerContext = {
  remainingTime: 1,
  duration: 1500,
  workDuration: 1500,
  breakDuration: 300,
  userId: "user-1",
  roomId: "room-1",
  currentSessionState: SessionMachineState.work,
  currentTimerState: TimerMachineState.running,
};

describe("focusSessionFromContext", () => {
  it("builds an insert row from a completed work session", () => {
    expect(focusSessionFromContext(workContext)).toEqual({
      user_id: "user-1",
      room_id: "room-1",
      duration_seconds: 1500,
    });
  });

  it("returns null for a break session", () => {
    expect(
      focusSessionFromContext({
        ...workContext,
        currentSessionState: SessionMachineState.break,
      }),
    ).toBeNull();
  });

  it("returns null when the user or room is unknown", () => {
    expect(
      focusSessionFromContext({ ...workContext, userId: undefined }),
    ).toBeNull();
    expect(
      focusSessionFromContext({ ...workContext, roomId: undefined }),
    ).toBeNull();
  });

  it("returns null when the duration is not positive", () => {
    expect(focusSessionFromContext({ ...workContext, duration: 0 })).toBeNull();
  });
});

describe("insertFocusSession", () => {
  const row = { user_id: "user-1", room_id: "room-1", duration_seconds: 1500 };

  it("inserts into focus_session", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });

    await insertFocusSession({ from }, row);

    expect(from).toHaveBeenCalledWith("focus_session");
    expect(insert).toHaveBeenCalledWith(row);
  });

  it("throws the supabase error", async () => {
    const error = new Error("rls denied");
    const from = vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error }),
    });

    await expect(insertFocusSession({ from }, row)).rejects.toBe(error);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun run test src/lib/focus-session.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/focus-session"`.

- [ ] **Step 3: Implement `src/lib/focus-session.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { SessionMachineState, TimerContext } from "./session-machine-types";

export type FocusSessionInsert = {
  user_id: string;
  room_id: string;
  duration_seconds: number;
};

export function focusSessionFromContext(
  context: TimerContext,
): FocusSessionInsert | null {
  if (context.currentSessionState !== SessionMachineState.work) {
    return null;
  }
  if (!context.userId || !context.roomId) {
    return null;
  }
  if (!(context.duration > 0)) {
    return null;
  }
  return {
    user_id: context.userId,
    room_id: context.roomId,
    duration_seconds: context.duration,
  };
}

export async function insertFocusSession(
  supabase: Pick<SupabaseClient, "from">,
  row: FocusSessionInsert,
): Promise<void> {
  const { error } = await supabase.from("focus_session").insert(row);
  if (error) {
    throw error;
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `bun run test src/lib/focus-session.test.ts`
Expected: `6 passed`.

- [ ] **Step 5: Hook it into the state machine action**

Replace the whole of `src/lib/session-machine-actions.ts` with:

```ts
import {
  getCurrentSessionState,
  getCurrentTimerState,
} from "./session-machine-utils";
import { socket } from "../socket";
import { createClient } from "./supabase/client";
import { focusSessionFromContext, insertFocusSession } from "./focus-session";

const CHIME_SOUND_PATH = "/sounds/done.mp3" as const;

// Audio-related actions
export const playChime = () => {
  try {
    const chime = new Audio(CHIME_SOUND_PATH);
    chime.play().catch((e) => console.log("Could not play sound:", e));
  } catch (error) {
    console.log("Sound file not found:", error);
  }
};

export const broadcastTimerState = (context) => {
  if (!context || !socket.connected) {
    return;
  }

  try {
    const payload = {
      context,
      timestamp: Date.now(),
    };

    socket.emit("timer:broadcast", payload);
  } catch (error) {
    console.error("Error broadcasting timer state:", error);
  }
};

const recordCompletedWorkSession = (context) => {
  const row = focusSessionFromContext(context);
  if (!row) {
    return;
  }
  insertFocusSession(createClient(), row).catch((error) => {
    console.error("Failed to record focus session:", error);
  });
};

// XState action creators
export const createSessionMachineActions = () => ({
  onTimerComplete: ({ context, event }) => {
    playChime();
  },
  onSessionComplete: ({ context, event }) => {
    playChime();
    recordCompletedWorkSession(context);
  },
  broadcastTimerState: ({ context, event }) => {
    broadcastTimerState(context);
  },
});
```

Why this works: in `session-machine.ts` the work-state `TICK` branch with `remainingTime <= 1` runs `onSessionComplete` **before** the `assign` that zeroes `remainingTime`, and `context.currentSessionState` is still `work` at that moment. The same action runs on break→work but `focusSessionFromContext` returns `null` for break contexts.

- [ ] **Step 6: Manual verification**

Run `bun run dev`, open `http://localhost:3001`, click **Enter**, drag the work slider to 1 minute, click **Start**, wait for the chime. In the Supabase dashboard, Table Editor → `focus_session`: expect one row with `duration_seconds = 60`, `room_id` equal to the UUID in the URL, and `user_id` equal to the anonymous user's id (Authentication → Users). Then start a 1-minute **break** and let it finish: expect no new row.

- [ ] **Step 7: Commit**

```bash
bun run lint
git add src/lib/focus-session.ts src/lib/focus-session.test.ts src/lib/session-machine-actions.ts
git commit -m "feat: record completed work sessions to supabase"
```

---

### Task 4: Stats query and hook

Repo: `POMO-frontend`

**Files:**

- Create: `src/lib/focus-stats.ts`
- Create: `src/lib/focus-stats.test.ts`
- Create: `src/hooks/useFocusStats.ts`

**Interfaces:**

- Consumes: RPC `get_focus_stats(week_start)` from Task 2; `useAuth()` from `@/app/providers/AuthContext`; `createClient()` from `@/lib/supabase/client`.
- Produces:
  - `type FocusStats = { totalSessions: number; totalMinutes: number; sessionsThisWeek: number }`
  - `startOfWeek(date: Date): Date` — Monday 00:00:00.000 local time of the week containing `date`
  - `fetchFocusStats(supabase: Pick<SupabaseClient, "rpc">, now?: Date): Promise<FocusStats>`
  - `useFocusStats(): { stats: FocusStats | null; error: string | null; loading: boolean }`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/focus-stats.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { fetchFocusStats, startOfWeek } from "@/lib/focus-stats";

describe("startOfWeek", () => {
  it("returns Monday 00:00 for a midweek date", () => {
    const wednesday = new Date(2026, 8, 9, 15, 30, 12); // Wed 9 Sep 2026
    expect(startOfWeek(wednesday)).toEqual(new Date(2026, 8, 7, 0, 0, 0, 0));
  });

  it("returns the previous Monday for a Sunday", () => {
    const sunday = new Date(2026, 8, 13, 23, 59); // Sun 13 Sep 2026
    expect(startOfWeek(sunday)).toEqual(new Date(2026, 8, 7, 0, 0, 0, 0));
  });

  it("returns the same day at midnight for a Monday", () => {
    const monday = new Date(2026, 8, 7, 8, 0);
    expect(startOfWeek(monday)).toEqual(new Date(2026, 8, 7, 0, 0, 0, 0));
  });

  it("does not mutate its input", () => {
    const input = new Date(2026, 8, 9, 15, 30);
    startOfWeek(input);
    expect(input).toEqual(new Date(2026, 8, 9, 15, 30));
  });
});

describe("fetchFocusStats", () => {
  it("calls the rpc with the local week start and maps the row", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { total_sessions: 12, total_minutes: 300, sessions_this_week: 3 },
      error: null,
    });
    const rpc = vi.fn().mockReturnValue({ single });
    const now = new Date(2026, 8, 9, 15, 30);

    const stats = await fetchFocusStats({ rpc }, now);

    expect(rpc).toHaveBeenCalledWith("get_focus_stats", {
      week_start: new Date(2026, 8, 7, 0, 0, 0, 0).toISOString(),
    });
    expect(stats).toEqual({
      totalSessions: 12,
      totalMinutes: 300,
      sessionsThisWeek: 3,
    });
  });

  it("coerces string bigints to numbers", async () => {
    const rpc = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: {
          total_sessions: "7",
          total_minutes: "175",
          sessions_this_week: "0",
        },
        error: null,
      }),
    });

    expect(await fetchFocusStats({ rpc })).toEqual({
      totalSessions: 7,
      totalMinutes: 175,
      sessionsThisWeek: 0,
    });
  });

  it("throws the supabase error", async () => {
    const error = new Error("permission denied");
    const rpc = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: null, error }),
    });

    await expect(fetchFocusStats({ rpc })).rejects.toBe(error);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun run test src/lib/focus-stats.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/focus-stats"`.

- [ ] **Step 3: Implement `src/lib/focus-stats.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type FocusStats = {
  totalSessions: number;
  totalMinutes: number;
  sessionsThisWeek: number;
};

export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  // getDay(): Sunday = 0. Shift so Monday = 0.
  const daysSinceMonday = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - daysSinceMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}

export async function fetchFocusStats(
  supabase: Pick<SupabaseClient, "rpc">,
  now: Date = new Date(),
): Promise<FocusStats> {
  const { data, error } = await supabase
    .rpc("get_focus_stats", { week_start: startOfWeek(now).toISOString() })
    .single();

  if (error) {
    throw error;
  }

  return {
    totalSessions: Number(data.total_sessions),
    totalMinutes: Number(data.total_minutes),
    sessionsThisWeek: Number(data.sessions_this_week),
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `bun run test src/lib/focus-stats.test.ts`
Expected: `7 passed`.

- [ ] **Step 5: Create the hook `src/hooks/useFocusStats.ts`**

```ts
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/providers/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fetchFocusStats, FocusStats } from "@/lib/focus-stats";

export function useFocusStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<FocusStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let cancelled = false;

    fetchFocusStats(createClient())
      .then((result) => {
        if (!cancelled) setStats(result);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Failed to load statistics",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { stats, error, loading: stats === null && error === null };
}
```

- [ ] **Step 6: Commit**

```bash
bun run lint
git add src/lib/focus-stats.ts src/lib/focus-stats.test.ts src/hooks/useFocusStats.ts
git commit -m "feat: add focus stats query and hook"
```

---

### Task 5: Statistics page and navigation from the room

Repo: `POMO-frontend`

**Files:**

- Create: `src/components/focus-stats-cards.tsx`
- Create: `src/components/focus-stats-cards.test.tsx`
- Create: `src/app/statistics/page.tsx`
- Modify: `src/app/room/[id]/page.tsx:121-129` (delete dead block) and `:263-277` (buttons)

**Interfaces:**

- Consumes: `FocusStats` from `@/lib/focus-stats`; `useFocusStats` from `@/hooks/useFocusStats`; `Card`, `CardDescription`, `CardTitle` from `@/components/ui/card`; `Skeleton` from `@/components/ui/skeleton`; `Button` from `@/components/ui/button`.
- Produces: `FocusStatsCards({ stats: FocusStats | null })` component; route `/statistics`.

- [ ] **Step 1: Write the failing render test**

Create `src/components/focus-stats-cards.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FocusStatsCards } from "@/components/focus-stats-cards";

describe("FocusStatsCards", () => {
  it("shows the three stats with their labels", () => {
    render(
      <FocusStatsCards
        stats={{ totalSessions: 12, totalMinutes: 300, sessionsThisWeek: 3 }}
      />,
    );

    expect(screen.getByText("Sessions completed")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Minutes focused")).toBeInTheDocument();
    expect(screen.getByText("300")).toBeInTheDocument();
    expect(screen.getByText("Sessions this week")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows labels but no numbers while loading", () => {
    render(<FocusStatsCards stats={null} />);

    expect(screen.getByText("Sessions completed")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun run test src/components/focus-stats-cards.test.tsx`
Expected: FAIL with `Failed to resolve import "@/components/focus-stats-cards"`.

- [ ] **Step 3: Implement `src/components/focus-stats-cards.tsx`**

```tsx
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FocusStats } from "@/lib/focus-stats";

type Props = {
  stats: FocusStats | null;
};

export function FocusStatsCards({ stats }: Props) {
  const items = [
    { label: "Sessions completed", value: stats?.totalSessions },
    { label: "Minutes focused", value: stats?.totalMinutes },
    { label: "Sessions this week", value: stats?.sessionsThisWeek },
  ];

  return (
    <div className="grid w-full gap-5 sm:grid-cols-3">
      {items.map(({ label, value }) => (
        <Card key={label} className="flex flex-col gap-2 p-6">
          <CardDescription>{label}</CardDescription>
          {value === undefined ? (
            <Skeleton className="h-10 w-24" />
          ) : (
            <CardTitle className="text-4xl">{value}</CardTitle>
          )}
        </Card>
      ))}
    </div>
  );
}
```

`CardTitle` (`src/components/ui/card.tsx:32-40`) renders an `<h3>`, so `queryByRole("heading")` in the loading test finds nothing when only skeletons are shown.

- [ ] **Step 4: Run to verify pass**

Run: `bun run test src/components/focus-stats-cards.test.tsx`
Expected: `2 passed`.

- [ ] **Step 5: Create the page `src/app/statistics/page.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FocusStatsCards } from "@/components/focus-stats-cards";
import { useFocusStats } from "@/hooks/useFocusStats";

export default function StatisticsPage() {
  const router = useRouter();
  const { stats, error } = useFocusStats();

  return (
    <div className="flex h-screen w-screen flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Statistics</h2>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <FocusStatsCards stats={stats} />
    </div>
  );
}
```

- [ ] **Step 6: Wire the room page buttons and delete the dead session check**

In `src/app/room/[id]/page.tsx`:

(a) Delete lines 121–129 (the commented-out `checkSessionExists` effect) and the now-unused import on line 41:

```ts
import { session } from "@/lib/supabase/session-utils";
```

(b) Replace the two buttons (currently lines 266–276):

```tsx
                    <Button className="mt-3 w-full" onClick={() => {}}>
                      Statistics
                    </Button>
                    <Button
                      className="mt-3 w-full hidden"
                      onClick={() => {
                        router.push(`${baseUrl}/achievements`);
                      }}
                    >
                      Achievements
                    </Button>
```

with:

```tsx
                    <Button
                      className="mt-3 w-full"
                      onClick={() => router.push("/statistics")}
                    >
                      Statistics
                    </Button>
                    <Button
                      className="mt-3 w-full"
                      onClick={() => router.push("/achievements")}
                    >
                      Achievements
                    </Button>
```

Leave the Login/Logout buttons and the `baseUrl` constant as they are.

- [ ] **Step 7: Delete the dead helper**

```bash
rm src/lib/supabase/session-utils.ts
```

Run: `rg -n "session-utils" src` — Expected: no output.

- [ ] **Step 8: Manual verification**

`bun run dev`, open a room, open the avatar sheet, click **Statistics**. Expect three cards; after Task 3's manual test you should see `Sessions completed: 1`, `Minutes focused: 1`, `Sessions this week: 1`. **Back** returns to the room. Click **Achievements** — the page loads (still shows skeletons until Task 6).

- [ ] **Step 9: Commit**

```bash
bun run lint
git add src/components/focus-stats-cards.tsx src/components/focus-stats-cards.test.tsx src/app/statistics/page.tsx "src/app/room/[id]/page.tsx"
git rm -q src/lib/supabase/session-utils.ts
git commit -m "feat: add statistics page and wire account sheet navigation"
```

---

### Task 6: Achievements page reads real data

Repo: `POMO-frontend`

**Files:**

- Modify: `src/app/achievements/page.tsx:1-40, 90-93`

**Interfaces:**

- Consumes: `useFocusStats()` from Task 4.

- [ ] **Step 1: Replace the imports and setup (lines 1–39)**

Replace everything from line 1 through the closing `//  }, [user]);` on line 39 with:

```tsx
"use client";
import { Button } from "@/components/ui/button";
import milestones from "../../../public/achievements/milestones/file.json";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Spline from "@splinetool/react-spline";
import { useRouter } from "next/navigation";
import { RWebShare } from "react-web-share";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";
import { useFocusStats } from "@/hooks/useFocusStats";

const hiddenMilestoneMedel =
  "https://prod.spline.design/G9KwJ8ipTOZ3kUOc/scene.splinecode";

export default () => {
  const router = useRouter();
  const { stats, error } = useFocusStats();
  const isLoading = stats === null && error === null;
  const totalSessionCount = stats?.totalSessions ?? 0;
```

This removes the `axios`, `useState`, `useEffect` imports, the `serverBaseUrl` constant, and the commented-out Auth0-era fetch.

- [ ] **Step 2: Add a Back button and error line to the header**

Replace:

```tsx
<h2 className="text-2xl font-bold	">Milestones</h2>
```

with:

```tsx
<div className="flex items-center justify-between">
  <h2 className="text-2xl font-bold">Milestones</h2>
  <Button variant="outline" onClick={() => router.back()}>
    Back
  </Button>
</div>;
{
  error && <p className="text-sm text-red-500">{error}</p>;
}
```

- [ ] **Step 3: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors mentioning `src/app/achievements/page.tsx`. (Pre-existing errors elsewhere, if any, are out of scope.)

- [ ] **Step 4: Manual verification**

`bun run dev`, room → avatar sheet → **Achievements**. Skeletons should fade into the three milestone cards. With fewer than 10 sessions, all three show the hidden-medal Spline and the requirement text. Temporarily run 10 one-minute work sessions (or insert rows in the dashboard) to see the first card flip to the unlocked state, then delete those rows.

- [ ] **Step 5: Commit**

```bash
bun run lint
git add src/app/achievements/page.tsx
git commit -m "feat: drive achievements from recorded focus sessions"
```

---

### Task 7: Upgrade the anonymous user on sign-up

Repo: `POMO-frontend`

**Files:**

- Create: `src/lib/auth/sign-up.ts`
- Create: `src/lib/auth/sign-up.test.ts`
- Modify: `src/components/sign-up-form.tsx`
- Modify: `src/hooks/useCurrentUser.ts:18`
- Modify: `src/app/auth/sign-up-success/page.tsx:22-25`

**Interfaces:**

- Consumes: `useAuth()` from `@/app/providers/AuthContext` (gives the current `User | null`); `createClient()` from `@/lib/supabase/client`.
- Produces:
  - `type SignUpInput = { email: string; password: string; displayName: string; emailRedirectTo: string }`
  - `type SignUpOutcome = "upgraded" | "created"`
  - `signUpOrUpgrade(supabase: Pick<SupabaseClient, "auth">, currentUser: User | null, input: SignUpInput): Promise<SignUpOutcome>`

Background: a Supabase anonymous user has `user.is_anonymous === true` and no email. Calling `auth.updateUser({ email, password })` on that session sends a confirmation email; once confirmed, the same user ID becomes a permanent account, so every `focus_session` row written while anonymous stays attached. `auth.signUp` would instead create a second, empty user.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/auth/sign-up.test.ts`:

```ts
import type { User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { signUpOrUpgrade } from "@/lib/auth/sign-up";

const input = {
  email: "ada@example.com",
  password: "correct horse battery",
  displayName: "  Ada  ",
  emailRedirectTo: "http://localhost:3001/protected",
};

const anonUser = { id: "anon-1", is_anonymous: true } as User;
const permanentUser = { id: "perm-1", is_anonymous: false } as User;

function fakeAuth() {
  return {
    updateUser: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null }),
  };
}

describe("signUpOrUpgrade", () => {
  it("upgrades an anonymous user in place", async () => {
    const auth = fakeAuth();

    const outcome = await signUpOrUpgrade({ auth } as any, anonUser, input);

    expect(outcome).toBe("upgraded");
    expect(auth.updateUser).toHaveBeenCalledWith(
      {
        email: "ada@example.com",
        password: "correct horse battery",
        data: { full_name: "Ada" },
      },
      { emailRedirectTo: "http://localhost:3001/protected" },
    );
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("creates a new account when there is no current user", async () => {
    const auth = fakeAuth();

    const outcome = await signUpOrUpgrade({ auth } as any, null, input);

    expect(outcome).toBe("created");
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "correct horse battery",
      options: {
        emailRedirectTo: "http://localhost:3001/protected",
        data: { full_name: "Ada" },
      },
    });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("creates a new account when the current user is already permanent", async () => {
    const auth = fakeAuth();

    await signUpOrUpgrade({ auth } as any, permanentUser, input);

    expect(auth.signUp).toHaveBeenCalledTimes(1);
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("omits full_name when the display name is blank", async () => {
    const auth = fakeAuth();

    await signUpOrUpgrade({ auth } as any, anonUser, {
      ...input,
      displayName: "   ",
    });

    expect(auth.updateUser.mock.calls[0][0]).toEqual({
      email: "ada@example.com",
      password: "correct horse battery",
      data: {},
    });
  });

  it("throws the supabase error", async () => {
    const error = new Error("Email rate limit exceeded");
    const auth = fakeAuth();
    auth.updateUser.mockResolvedValue({ error });

    await expect(
      signUpOrUpgrade({ auth } as any, anonUser, input),
    ).rejects.toBe(error);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun run test src/lib/auth/sign-up.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/auth/sign-up"`.

- [ ] **Step 3: Implement `src/lib/auth/sign-up.ts`**

```ts
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type SignUpInput = {
  email: string;
  password: string;
  displayName: string;
  emailRedirectTo: string;
};

export type SignUpOutcome = "upgraded" | "created";

export async function signUpOrUpgrade(
  supabase: Pick<SupabaseClient, "auth">,
  currentUser: User | null,
  input: SignUpInput,
): Promise<SignUpOutcome> {
  const trimmedName = input.displayName.trim();
  const data = trimmedName ? { full_name: trimmedName } : {};

  if (currentUser?.is_anonymous) {
    const { error } = await supabase.auth.updateUser(
      { email: input.email, password: input.password, data },
      { emailRedirectTo: input.emailRedirectTo },
    );
    if (error) {
      throw error;
    }
    return "upgraded";
  }

  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { emailRedirectTo: input.emailRedirectTo, data },
  });
  if (error) {
    throw error;
  }
  return "created";
}
```

- [ ] **Step 4: Run to verify pass**

Run: `bun run test src/lib/auth/sign-up.test.ts`
Expected: `5 passed`.

- [ ] **Step 5: Rewrite the form to use it**

Replace the whole of `src/components/sign-up-form.tsx` with:

```tsx
"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { signUpOrUpgrade } from "@/lib/auth/sign-up";
import { useAuth } from "@/app/providers/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      await signUpOrUpgrade(createClient(), user, {
        email,
        password,
        displayName,
        emailRedirectTo: `${window.location.origin}/protected`,
      });
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>
            Create an account to keep your focus history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="display-name">Display Name</Label>
                  </div>
                  <Input
                    id="display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">Repeat Password</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating an account..." : "Sign up"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link href="/auth/login" className="underline underline-offset-4">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

This drops the `HCaptcha` import, `captchaToken` state, `captcha` ref, and widget (see Global Constraints for why). Leave `@hcaptcha/react-hcaptcha` in `package.json`; removing the dependency is not part of this plan.

- [ ] **Step 6: Make `isAnonymous` use the Supabase flag**

In `src/hooks/useCurrentUser.ts` replace line 18:

```ts
const isAnonymous = !!user && !user.email;
```

with:

```ts
const isAnonymous = !!user?.is_anonymous;
```

Why: after `updateUser({ email })` but before the confirmation link is clicked, Supabase keeps `is_anonymous = true` and stores the pending address in `new_email`. Checking `!user.email` would already be correct here, but `is_anonymous` is the field Supabase defines for exactly this question and will stay correct if the auth flow changes.

- [ ] **Step 7: Fix the success-page copy**

In `src/app/auth/sign-up-success/page.tsx` replace:

```tsx
<p className="text-sm text-muted-foreground">
  You&apos;ve successfully signed up. Please check your email to confirm your
  account before signing in.
</p>
```

with:

```tsx
<p className="text-sm text-muted-foreground">
  Please check your email and click the confirmation link. Your sessions and
  achievements so far stay with your account.
</p>
```

- [ ] **Step 8: Manual verification (end-to-end)**

1. `bun run dev`, open a room in a fresh private window, complete one 1-minute work session (creates a `focus_session` row for the anonymous user; note the `user_id`).
2. Avatar sheet → **Login** → **Sign up**. Enter a display name, a real email you control, a password. Submit.
3. Expect redirect to `/auth/sign-up-success`. In Supabase → Authentication → Users, the **same** user ID now shows the email as pending/confirmed and `is_anonymous` still `true` until confirmed.
4. Click the link in the confirmation email. Expect landing on `/protected` showing `Hello <email>`.
5. Navigate to `/statistics`. Expect `Sessions completed: 1` — the anonymous history survived the upgrade.
6. Back in a room, the avatar sheet now shows **Logout** (not Login) and the display name from step 2 appears in the participants list for other users.

- [ ] **Step 9: Commit**

```bash
bun run lint
git add src/lib/auth/sign-up.ts src/lib/auth/sign-up.test.ts src/components/sign-up-form.tsx src/hooks/useCurrentUser.ts src/app/auth/sign-up-success/page.tsx
git commit -m "feat: upgrade anonymous users in place on sign-up"
```

---

### Task 8: Retire the unauthenticated stats endpoint and join-time session insert

Repo: `POMO-backend`

**Files:**

- Modify: `server.js:1-5, 250-254, 332-350`
- Delete: `supabase/supabase.mjs`
- Modify: `package.json` (dependencies)

**Interfaces:**

- Removes: `GET /:user_sub/total_sessions` and the `session` table insert on `joinRoom`. Nothing in the frontend calls either after Tasks 5–6 (`rg -n "total_sessions|from\(\"session\"\)" ../POMO-frontend/src` must return nothing before starting this task).

Why the dotenv move matters: `import "dotenv/config"` currently lives only in `supabase/supabase.mjs`, and it is what loads `.env` for the Redis variables. Deleting that file without re-adding the import breaks local development.

- [ ] **Step 1: Confirm the frontend no longer depends on the old paths**

Run:

```bash
cd /Users/llama/Documents/Development/POMO-frontend
rg -n "total_sessions|from\(\"session\"\)|session-utils" src
```

Expected: no output. If there is output, finish Tasks 5–6 first.

- [ ] **Step 2: Replace the imports at the top of `server.js`**

Replace lines 1–7:

```js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { supabase } from "./supabase/supabase.mjs";

import { createClient } from "redis";
```

with:

```js
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { createClient } from "redis";
```

- [ ] **Step 3: Remove the join-time insert**

In the `joinRoom` handler delete these four lines (currently 251–254) and the blank line before them:

```js
await supabase.from("session").insert({
  id: room,
  user_id: id,
});
```

so that `io.to(room).emit("addExistingParticipants", ...)`, `socket.in(room).emit("showToast", ...)` and `socket.emit('joinedRoom', ...)` follow each other directly.

- [ ] **Step 4: Remove the endpoint**

Delete the whole block (currently lines 332–350):

```js
app.get("/:user_sub/total_sessions", async (req, res) => {
  const { user_sub } = req.params;

  try {
    const { data, error } = await supabase.rpc("get_total_sessions", {
      user_sub: user_sub,
    });

    if (!error) {
      res.status(200).send(data);
    } else {
      console.error("Supabase error:", error);
      res.status(422).json({ error: "Failed to fetch total sessions" });
    }
  } catch (error) {
    console.error("Error fetching total sessions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
```

- [ ] **Step 5: Delete the Supabase client module and dependency**

```bash
cd /Users/llama/Documents/Development/POMO-backend
git rm -q supabase/supabase.mjs
npm uninstall @supabase/supabase-js
```

Expected: `package.json` `dependencies` no longer lists `@supabase/supabase-js`; `dotenv` remains.

- [ ] **Step 6: Verify no dangling references**

Run: `rg -n "supabase" server.js`
Expected: no output.

- [ ] **Step 7: Boot the server locally**

Run (needs a reachable Redis per `.env`): `npm run dev`
Expected: `Redis Client Connected` and `Server running on port 3000`. `curl -s localhost:3000/health` returns JSON with `"redis":"connected"`. `curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/anything/total_sessions` returns `404`. Stop with Ctrl-C and expect `Graceful shutdown completed`.

- [ ] **Step 8: Commit**

```bash
git add server.js package.json package-lock.json
git commit -m "refactor: remove unauthenticated total_sessions endpoint and join-time session insert"
```

---

## Self-Review

**Spec coverage**

- Completed work sessions recorded with duration → Task 3 (writes), Task 2 (table).
- Stats: total sessions, total minutes, sessions this week (Mon-start, local tz) → Task 2 RPC + Task 4 `startOfWeek` + Task 5 labels.
- Stats live on a `/statistics` page reached from the account sheet → Task 5.
- Achievements page reads real data → Task 6.
- Anonymous-to-account upgrade preserving history → Task 7 (`updateUser` keeps the user ID; RLS rows are keyed on that ID).
- Direct Supabase reads with RLS; Express endpoint retired → Task 2 (RLS/grants) + Task 8.
- Vitest + RTL → Task 1; every new logic file has a test (Tasks 3, 4, 5, 7).

**Placeholder scan** — no TBD/TODO. Every code step shows the code. The only user-supplied value is `<your-project-ref>` in Task 2 Step 2, with instructions on where to find it.

**Type consistency** — `FocusStats` (camelCase) is produced by `fetchFocusStats` and consumed by `useFocusStats`, `FocusStatsCards`, and the achievements page. RPC columns are snake_case (`total_sessions`, `total_minutes`, `sessions_this_week`) in both the SQL and `fetchFocusStats`. `FocusSessionInsert` field names match the table columns. `signUpOrUpgrade` signature is identical in test, implementation, and form.

**Known limitations, not addressed by this plan**

- No captcha on sign-up or anonymous sign-in after Task 7.
- The random anonymous display name regenerates on every page load (pre-existing).
- A user who completes a work session offline or while the Supabase request fails loses that session; there is no retry queue.
