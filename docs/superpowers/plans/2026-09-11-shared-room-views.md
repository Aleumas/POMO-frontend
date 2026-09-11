# Shared Room Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the shared room a Zoom-style two-view layout — a **Focus view** (your timer large, others as a bottom filmstrip) and a **Gallery view** (everyone as equal tiles) — with a switcher, all reskinned to the Teak visual style.

**Architecture:** Lift the participant socket logic out of `ParticipantsPanel` into a `useRoomParticipants` hook so both views share one data source. Reskin `ParticipantCard` to the Teak style with a `layout` prop (`tile` for the gallery grid, `strip` for the filmstrip). The room page holds a `view` state (`focus` | `gallery`), persisted to `localStorage`, and renders either `ParticipantStrip` (focus) or `RoomGallery` (gallery). The old `ResizablePanelGroup` docked panel is removed; the two fixed views replace it.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind 3.4, XState 5 (`@xstate/react`), Socket.IO client, framer-motion, Vitest + Testing Library, Bun.

## Global Constraints

- Two accent colors only: `accent-work` (indigo `#4F46E5`) for focus, `accent-break` (amber `#F59E0B`) for break. Muted red is destructive-only. All other surfaces neutral (`canvas`, `surface`, `ink`, `ink-muted`, `hairline`). Tokens live in `tailwind.config.ts`.
- Cards: `bg-surface border-hairline rounded-3xl` (tiles may use `rounded-2xl`), shadow only on hover.
- Pills/tags: tint background + dot + label, fully rounded.
- Type: Space Grotesk everywhere via `font-sans`; digits use `tabular-nums` (already handled inside `ClockFace`). `firaCode` only for small mono labels (room code).
- Voice: short, friendly, Discord-style microcopy ("Focusing", "Break").
- Do NOT change the Socket.IO event contract. Event names in use (from backend `server.js`): `addExistingParticipants`, `removeParticipant`, `timerStateUpdate`, `showToast`, `joinedRoom`. There is no live "session completed" broadcast in `server.js` today (the `sessionCompletion:${userId}` method in `socket/timer.mjs` is legacy and unused), so the **spotlight moment is out of scope for this plan** (see Deferred).
- Verification commands: type-check `npx tsc --noEmit`; format `npx prettier . --write`; tests `bun run test`. All must pass before each commit.
- Follow the existing default-export component style used across `src/components/ui`.

---

## File Structure

- `src/lib/participant-status.ts` — **Create.** Pure mapping from a participant `TimerState` to a display status (`label` + `variant`) plus the pill/dot class maps. Shared by all participant UI.
- `src/lib/room-view.ts` — **Create.** `RoomView` type + `getStoredRoomView` / `setStoredRoomView` localStorage helpers.
- `src/hooks/useRoomParticipants.ts` — **Create.** Owns the participant socket subscription (moved out of `ParticipantsPanel`). Exports the hook plus the pure `dedupeParticipants` helper.
- `src/components/ui/participant-card.tsx` — **Rewrite.** Teak reskin, `layout: "tile" | "strip"` prop, consumes `participant-status`.
- `src/components/ui/view-switcher.tsx` — **Create.** Segmented Focus/Gallery control.
- `src/components/ui/participant-strip.tsx` — **Create.** Horizontal filmstrip of `strip` cards for Focus view.
- `src/components/ui/room-gallery.tsx` — **Create.** Responsive grid: self tile (highlighted) + `tile` cards for others.
- `src/components/ui/participants-panel.tsx` — **Delete.** Logic moves to `useRoomParticipants`; rendering moves to strip/gallery.
- `src/app/room/[id]/page.tsx` — **Modify.** Consume the hook, add `view` state + switcher, render the two views, remove the resizable panel.

### Shared types (used across files)

```ts
export interface Participant {
  uid: string;
  displayName: string;
  socketId: string;
  avatar: string;
}

export interface TimerState {
  sessionState: string; // "work" | "break"
  timerState: string; // "idle" | "running" | "paused"
  remainingTime: number;
  duration: number;
}
```

These already exist inline in `participants-panel.tsx`. Task 3 relocates them to `src/hooks/useRoomParticipants.ts` and exports them; later files import from there.

---

## Task 1: Participant status util

**Files:**
- Create: `src/lib/participant-status.ts`
- Test: `src/lib/participant-status.test.ts`

**Interfaces:**
- Produces:
  - `type ParticipantStatusVariant = "work" | "break" | "paused" | "idle"`
  - `interface ParticipantStatus { label: string; variant: ParticipantStatusVariant }`
  - `getParticipantStatus(timerState?: { sessionState: string; timerState: string }): ParticipantStatus`
  - `statusPillClasses(variant: ParticipantStatusVariant): string`
  - `statusDotClasses(variant: ParticipantStatusVariant): string`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import {
  getParticipantStatus,
  statusPillClasses,
  statusDotClasses,
} from "@/lib/participant-status";

describe("getParticipantStatus", () => {
  it("returns Idle when there is no timer state", () => {
    expect(getParticipantStatus(undefined)).toEqual({
      label: "Idle",
      variant: "idle",
    });
  });

  it("returns Idle when the timer is idle", () => {
    expect(
      getParticipantStatus({ sessionState: "work", timerState: "idle" }),
    ).toEqual({ label: "Idle", variant: "idle" });
  });

  it("returns Focusing when running a work session", () => {
    expect(
      getParticipantStatus({ sessionState: "work", timerState: "running" }),
    ).toEqual({ label: "Focusing", variant: "work" });
  });

  it("returns Break when running a break session", () => {
    expect(
      getParticipantStatus({ sessionState: "break", timerState: "running" }),
    ).toEqual({ label: "Break", variant: "break" });
  });

  it("returns Paused when paused", () => {
    expect(
      getParticipantStatus({ sessionState: "work", timerState: "paused" }),
    ).toEqual({ label: "Paused", variant: "paused" });
  });
});

describe("status class maps", () => {
  it("uses indigo tint for work", () => {
    expect(statusPillClasses("work")).toContain("accent-work");
    expect(statusDotClasses("work")).toContain("bg-accent-work");
  });

  it("uses amber tint for break", () => {
    expect(statusPillClasses("break")).toContain("accent-break");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/lib/participant-status.test.ts`
Expected: FAIL — cannot resolve `@/lib/participant-status`.

- [ ] **Step 3: Write minimal implementation**

```ts
export type ParticipantStatusVariant = "work" | "break" | "paused" | "idle";

export interface ParticipantStatus {
  label: string;
  variant: ParticipantStatusVariant;
}

export const getParticipantStatus = (timerState?: {
  sessionState: string;
  timerState: string;
}): ParticipantStatus => {
  if (!timerState || timerState.timerState === "idle") {
    return { label: "Idle", variant: "idle" };
  }
  if (timerState.timerState === "paused") {
    return { label: "Paused", variant: "paused" };
  }
  if (timerState.sessionState === "break") {
    return { label: "Break", variant: "break" };
  }
  return { label: "Focusing", variant: "work" };
};

export const statusPillClasses = (variant: ParticipantStatusVariant): string => {
  switch (variant) {
    case "work":
      return "bg-accent-work-tint text-accent-work";
    case "break":
      return "bg-accent-break-tint text-accent-break";
    default:
      return "bg-ink/5 text-ink-muted";
  }
};

export const statusDotClasses = (variant: ParticipantStatusVariant): string => {
  switch (variant) {
    case "work":
      return "bg-accent-work";
    case "break":
      return "bg-accent-break";
    default:
      return "bg-ink-muted";
  }
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test src/lib/participant-status.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/participant-status.ts src/lib/participant-status.test.ts
git commit -m "feat: add participant status util for room views"
```

---

## Task 2: Room view persistence util

**Files:**
- Create: `src/lib/room-view.ts`
- Test: `src/lib/room-view.test.ts`

**Interfaces:**
- Produces:
  - `type RoomView = "focus" | "gallery"`
  - `getStoredRoomView(): RoomView` (defaults to `"focus"`, tolerates unavailable/broken storage)
  - `setStoredRoomView(view: RoomView): void`

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { getStoredRoomView, setStoredRoomView } from "@/lib/room-view";

describe("room view persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to focus when nothing is stored", () => {
    expect(getStoredRoomView()).toBe("focus");
  });

  it("round-trips a stored view", () => {
    setStoredRoomView("gallery");
    expect(getStoredRoomView()).toBe("gallery");
  });

  it("falls back to focus on an invalid stored value", () => {
    localStorage.setItem("pomo:roomView", "bogus");
    expect(getStoredRoomView()).toBe("focus");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/lib/room-view.test.ts`
Expected: FAIL — cannot resolve `@/lib/room-view`.

- [ ] **Step 3: Write minimal implementation**

```ts
export type RoomView = "focus" | "gallery";

const STORAGE_KEY = "pomo:roomView";

export const getStoredRoomView = (): RoomView => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "gallery" || stored === "focus" ? stored : "focus";
  } catch {
    return "focus";
  }
};

export const setStoredRoomView = (view: RoomView): void => {
  try {
    localStorage.setItem(STORAGE_KEY, view);
  } catch {
    // storage unavailable (private mode / SSR) — ignore
  }
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test src/lib/room-view.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/room-view.ts src/lib/room-view.test.ts
git commit -m "feat: persist room view selection"
```

---

## Task 3: useRoomParticipants hook

**Files:**
- Create: `src/hooks/useRoomParticipants.ts`
- Test: `src/hooks/useRoomParticipants.test.ts`

**Interfaces:**
- Consumes: `socket` from `@/socket` (events `addExistingParticipants`, `removeParticipant`, `timerStateUpdate`).
- Produces:
  - `interface Participant { uid: string; displayName: string; socketId: string; avatar: string }`
  - `interface TimerState { sessionState: string; timerState: string; remainingTime: number; duration: number }`
  - `dedupeParticipants(raw: string[], currentUserId?: string): Participant[]` — parses JSON strings, drops the current user, dedups by `uid` keeping the higher `socketId`.
  - `useRoomParticipants(currentUserId?: string): { participants: Participant[]; timerStates: Map<string, TimerState> }`

This moves the socket logic currently in `participants-panel.tsx` (lines 45–122) into the hook. Only the pure `dedupeParticipants` helper is unit-tested; the hook wiring is verified via the app build and existing behavior.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { dedupeParticipants } from "@/hooks/useRoomParticipants";

const p = (uid: string, socketId: string) =>
  JSON.stringify({ uid, socketId, displayName: uid, avatar: "" });

describe("dedupeParticipants", () => {
  it("drops the current user", () => {
    const result = dedupeParticipants([p("me", "s1"), p("maya", "s2")], "me");
    expect(result.map((x) => x.uid)).toEqual(["maya"]);
  });

  it("dedups by uid keeping the higher socketId", () => {
    const result = dedupeParticipants([p("maya", "s1"), p("maya", "s2")], "me");
    expect(result).toHaveLength(1);
    expect(result[0].socketId).toBe("s2");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/hooks/useRoomParticipants.test.ts`
Expected: FAIL — cannot resolve `@/hooks/useRoomParticipants`.

- [ ] **Step 3: Write minimal implementation**

```ts
import { useEffect, useRef, useState } from "react";
import { socket } from "@/socket";

export interface Participant {
  uid: string;
  displayName: string;
  socketId: string;
  avatar: string;
}

export interface TimerState {
  sessionState: string;
  timerState: string;
  remainingTime: number;
  duration: number;
}

export const dedupeParticipants = (
  raw: string[],
  currentUserId?: string,
): Participant[] => {
  const parsed: Participant[] = raw
    .map((entry) => JSON.parse(entry) as Participant)
    .filter((entry) => entry.uid !== currentUserId);

  const byUid = parsed.reduce((map, participant) => {
    const existing = map.get(participant.uid);
    if (!existing || participant.socketId > existing.socketId) {
      map.set(participant.uid, participant);
    }
    return map;
  }, new Map<string, Participant>());

  return Array.from(byUid.values());
};

export const useRoomParticipants = (currentUserId?: string) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [timerStates, setTimerStates] = useState<Map<string, TimerState>>(
    new Map(),
  );
  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    function onAddExistingParticipants(existing: string[]) {
      setParticipants(dedupeParticipants(existing, currentUserIdRef.current));
    }

    function onRemoveParticipant(participantId: string) {
      setParticipants((prev) => prev.filter((x) => x.uid !== participantId));
      setTimerStates((prev) => {
        const next = new Map(prev);
        next.delete(participantId);
        return next;
      });
    }

    function onTimerStateUpdate(data: {
      userId: string;
      state: TimerState;
      timestamp: number;
    }) {
      if (data.userId === currentUserIdRef.current) return;

      setParticipants((prev) => {
        if (prev.some((x) => x.uid === data.userId)) return prev;
        return [
          ...prev,
          {
            uid: data.userId,
            displayName: "User",
            socketId: `auto-${data.userId}`,
            avatar: "",
          },
        ];
      });

      setTimerStates((prev) => {
        const next = new Map(prev);
        next.set(data.userId, data.state);
        return next;
      });
    }

    socket.on("addExistingParticipants", onAddExistingParticipants);
    socket.on("removeParticipant", onRemoveParticipant);
    socket.on("timerStateUpdate", onTimerStateUpdate);

    return () => {
      socket.off("addExistingParticipants", onAddExistingParticipants);
      socket.off("removeParticipant", onRemoveParticipant);
      socket.off("timerStateUpdate", onTimerStateUpdate);
    };
  }, []);

  return { participants, timerStates };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test src/hooks/useRoomParticipants.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useRoomParticipants.ts src/hooks/useRoomParticipants.test.ts
git commit -m "feat: add useRoomParticipants hook"
```

---

## Task 4: Reskin ParticipantCard (Teak, layout prop)

**Files:**
- Modify (rewrite): `src/components/ui/participant-card.tsx`
- Test: `src/components/ui/participant-card.test.tsx`

**Interfaces:**
- Consumes: `getParticipantStatus`, `statusPillClasses`, `statusDotClasses` (Task 1); `TimerState` (Task 3); existing `ClockFace` (`src/components/ui/clock-face.tsx`) and `Avatar` (`src/components/ui/avatar.tsx`).
- Produces:
  ```ts
  function ParticipantCard(props: {
    displayName: string;
    avatar: string;
    timerState?: TimerState;
    layout?: "tile" | "strip";
  }): JSX.Element
  ```

Removed props vs. old version: `participant`, `participantSocket`, `preset`, `machineState`, and the `ContextMenu` wrapper. Callers (Tasks 6 & 7) pass `timerState` directly.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ParticipantCard from "@/components/ui/participant-card";

describe("ParticipantCard", () => {
  it("shows the name and Focusing status for a running work session", () => {
    render(
      <ParticipantCard
        displayName="Maya"
        avatar=""
        timerState={{
          sessionState: "work",
          timerState: "running",
          remainingTime: 1450,
          duration: 1500,
        }}
      />,
    );
    expect(screen.getByText("Maya")).toBeInTheDocument();
    expect(screen.getByText("Focusing")).toBeInTheDocument();
  });

  it("shows Idle when there is no timer state", () => {
    render(<ParticipantCard displayName="Sam" avatar="" />);
    expect(screen.getByText("Idle")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/components/ui/participant-card.test.tsx`
Expected: FAIL — the current component renders `machineState`-based markup and no "Focusing"/"Idle" text.

- [ ] **Step 3: Write minimal implementation**

```tsx
import ClockFace from "./clock-face";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TimerState } from "@/hooks/useRoomParticipants";
import {
  getParticipantStatus,
  statusPillClasses,
  statusDotClasses,
} from "@/lib/participant-status";

export default ({
  displayName,
  avatar,
  timerState,
  layout = "tile",
}: {
  displayName: string;
  avatar: string;
  timerState?: TimerState;
  layout?: "tile" | "strip";
}) => {
  const status = getParticipantStatus(timerState);

  const StatusPill = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusPillClasses(
        status.variant,
      )}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${statusDotClasses(status.variant)}`}
      />
      {status.label}
    </span>
  );

  if (layout === "strip") {
    return (
      <div className="border-hairline bg-surface flex shrink-0 items-center gap-3 rounded-2xl border px-3 py-2">
        <Avatar className="h-9 w-9">
          <AvatarImage src={avatar} alt={`${displayName}'s avatar`} />
          <AvatarFallback />
        </Avatar>
        <div className="flex flex-col">
          <span className="text-ink text-sm font-semibold">{displayName}</span>
          <ClockFace
            size="text-sm"
            preset={0}
            animated={false}
            remainingTime={timerState?.remainingTime}
            textColorClassName="text-ink-muted"
          />
        </div>
        <span
          className={`ml-1 h-2 w-2 rounded-full ${statusDotClasses(status.variant)}`}
        />
      </div>
    );
  }

  return (
    <div className="border-hairline bg-surface flex flex-col items-center gap-2 rounded-2xl border p-4 transition-shadow hover:shadow-sm">
      <Avatar className="h-12 w-12">
        <AvatarImage src={avatar} alt={`${displayName}'s avatar`} />
        <AvatarFallback />
      </Avatar>
      <span className="text-ink text-sm font-semibold">{displayName}</span>
      <ClockFace
        size="text-2xl"
        preset={0}
        animated={false}
        remainingTime={timerState?.remainingTime}
        textColorClassName="text-ink"
      />
      {StatusPill}
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test src/components/ui/participant-card.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/participant-card.tsx src/components/ui/participant-card.test.tsx
git commit -m "feat: reskin ParticipantCard to Teak style with layout prop"
```

---

## Task 5: ViewSwitcher

**Files:**
- Create: `src/components/ui/view-switcher.tsx`
- Test: `src/components/ui/view-switcher.test.tsx`

**Interfaces:**
- Consumes: `RoomView` (Task 2).
- Produces:
  ```ts
  function ViewSwitcher(props: {
    value: RoomView;
    onChange: (view: RoomView) => void;
  }): JSX.Element
  ```

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ViewSwitcher from "@/components/ui/view-switcher";

describe("ViewSwitcher", () => {
  it("calls onChange with gallery when Gallery is clicked", async () => {
    const onChange = vi.fn();
    render(<ViewSwitcher value="focus" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Gallery" }));
    expect(onChange).toHaveBeenCalledWith("gallery");
  });

  it("marks the active view as pressed", () => {
    render(<ViewSwitcher value="gallery" onChange={() => {}} />);
    expect(
      screen.getByRole("button", { name: "Gallery" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/components/ui/view-switcher.test.tsx`
Expected: FAIL — cannot resolve `@/components/ui/view-switcher`.

- [ ] **Step 3: Write minimal implementation**

```tsx
"use client";

import { RoomView } from "@/lib/room-view";

const OPTIONS: { value: RoomView; label: string }[] = [
  { value: "focus", label: "Focus" },
  { value: "gallery", label: "Gallery" },
];

export default ({
  value,
  onChange,
}: {
  value: RoomView;
  onChange: (view: RoomView) => void;
}) => {
  return (
    <div className="bg-ink/5 inline-flex items-center gap-1 rounded-full p-1">
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              active
                ? "bg-accent-work text-white"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test src/components/ui/view-switcher.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/view-switcher.tsx src/components/ui/view-switcher.test.tsx
git commit -m "feat: add Focus/Gallery view switcher"
```

---

## Task 6: ParticipantStrip (Focus view filmstrip)

**Files:**
- Create: `src/components/ui/participant-strip.tsx`
- Test: `src/components/ui/participant-strip.test.tsx`

**Interfaces:**
- Consumes: `Participant`, `TimerState` (Task 3); `ParticipantCard` with `layout="strip"` (Task 4).
- Produces:
  ```ts
  function ParticipantStrip(props: {
    participants: Participant[];
    timerStates: Map<string, TimerState>;
  }): JSX.Element | null
  ```
  Returns `null` when there are no participants.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ParticipantStrip from "@/components/ui/participant-strip";
import type { Participant, TimerState } from "@/hooks/useRoomParticipants";

const participants: Participant[] = [
  { uid: "maya", displayName: "Maya", socketId: "s1", avatar: "" },
  { uid: "sam", displayName: "Sam", socketId: "s2", avatar: "" },
];

describe("ParticipantStrip", () => {
  it("renders a card per participant", () => {
    render(
      <ParticipantStrip
        participants={participants}
        timerStates={new Map<string, TimerState>()}
      />,
    );
    expect(screen.getByText("Maya")).toBeInTheDocument();
    expect(screen.getByText("Sam")).toBeInTheDocument();
  });

  it("renders nothing when empty", () => {
    const { container } = render(
      <ParticipantStrip participants={[]} timerStates={new Map()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/components/ui/participant-strip.test.tsx`
Expected: FAIL — cannot resolve `@/components/ui/participant-strip`.

- [ ] **Step 3: Write minimal implementation**

```tsx
import ParticipantCard from "@/components/ui/participant-card";
import type { Participant, TimerState } from "@/hooks/useRoomParticipants";

export default ({
  participants,
  timerStates,
}: {
  participants: Participant[];
  timerStates: Map<string, TimerState>;
}) => {
  if (participants.length === 0) return null;

  return (
    <div className="flex w-full gap-3 overflow-x-auto px-2 pb-2">
      {participants.map((participant) => (
        <ParticipantCard
          key={participant.uid}
          displayName={participant.displayName}
          avatar={participant.avatar}
          timerState={timerStates.get(participant.uid)}
          layout="strip"
        />
      ))}
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test src/components/ui/participant-strip.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/participant-strip.tsx src/components/ui/participant-strip.test.tsx
git commit -m "feat: add participant filmstrip for focus view"
```

---

## Task 7: RoomGallery (Gallery view grid)

**Files:**
- Create: `src/components/ui/room-gallery.tsx`
- Test: `src/components/ui/room-gallery.test.tsx`

**Interfaces:**
- Consumes: `Participant`, `TimerState` (Task 3); `ParticipantCard` with `layout="tile"` (Task 4).
- Produces:
  ```ts
  function RoomGallery(props: {
    self: React.ReactNode;
    participants: Participant[];
    timerStates: Map<string, TimerState>;
  }): JSX.Element
  ```
  Renders a responsive grid: the `self` node first inside an indigo-ringed wrapper, then a tile per participant.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RoomGallery from "@/components/ui/room-gallery";
import type { Participant, TimerState } from "@/hooks/useRoomParticipants";

const participants: Participant[] = [
  { uid: "maya", displayName: "Maya", socketId: "s1", avatar: "" },
];

describe("RoomGallery", () => {
  it("renders the self tile and each participant tile", () => {
    render(
      <RoomGallery
        self={<div>You</div>}
        participants={participants}
        timerStates={new Map<string, TimerState>()}
      />,
    );
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Maya")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/components/ui/room-gallery.test.tsx`
Expected: FAIL — cannot resolve `@/components/ui/room-gallery`.

- [ ] **Step 3: Write minimal implementation**

```tsx
import type { ReactNode } from "react";
import ParticipantCard from "@/components/ui/participant-card";
import type { Participant, TimerState } from "@/hooks/useRoomParticipants";

export default ({
  self,
  participants,
  timerStates,
}: {
  self: ReactNode;
  participants: Participant[];
  timerStates: Map<string, TimerState>;
}) => {
  return (
    <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <div className="ring-accent-work rounded-2xl ring-2">{self}</div>
      {participants.map((participant) => (
        <ParticipantCard
          key={participant.uid}
          displayName={participant.displayName}
          avatar={participant.avatar}
          timerState={timerStates.get(participant.uid)}
          layout="tile"
        />
      ))}
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test src/components/ui/room-gallery.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/room-gallery.tsx src/components/ui/room-gallery.test.tsx
git commit -m "feat: add gallery grid for shared room"
```

---

## Task 8: Wire the two views into the room page

**Files:**
- Modify: `src/app/room/[id]/page.tsx`
- Delete: `src/components/ui/participants-panel.tsx`

**Interfaces:**
- Consumes: `useRoomParticipants` (Task 3), `ViewSwitcher` (Task 5), `ParticipantStrip` (Task 6), `RoomGallery` (Task 7), `getStoredRoomView`/`setStoredRoomView`/`RoomView` (Task 2).

This is an integration task (no new unit test); it is verified by type-check, the full test suite, and a manual two-window check.

- [ ] **Step 1: Remove the old panel wiring**

In `src/app/room/[id]/page.tsx`:
- Delete the imports of `ResizableHandle`, `ResizablePanel`, `ResizablePanelGroup`, and `ParticipantsPanel`.
- Delete the `hasOtherParticipants` state, the `directionParticipantPanelDirection` state, the `handleResize` effect (lines ~137–151), the `onAddExistingParticipants` handler + its `socket.on/off` registrations inside the first effect, and the `handleParticipantCountChange` function.

- [ ] **Step 2: Add the hook, view state, and imports**

Add imports:

```tsx
import ViewSwitcher from "@/components/ui/view-switcher";
import ParticipantStrip from "@/components/ui/participant-strip";
import RoomGallery from "@/components/ui/room-gallery";
import { useRoomParticipants } from "@/hooks/useRoomParticipants";
import {
  getStoredRoomView,
  setStoredRoomView,
  RoomView,
} from "@/lib/room-view";
```

Inside the component, after `const room = params.id;`:

```tsx
const { participants, timerStates } = useRoomParticipants(user?.id);
const hasOthers = participants.length > 0;
const [view, setView] = useState<RoomView>("focus");

useEffect(() => {
  setView(getStoredRoomView());
}, []);

const changeView = (next: RoomView) => {
  setView(next);
  setStoredRoomView(next);
};
```

- [ ] **Step 3: Add the switcher to the top bar**

In the top-bar `<div className="m-5 flex items-center gap-2">`, insert the switcher before the Share button, shown only when there are others:

```tsx
{hasOthers && <ViewSwitcher value={view} onChange={changeView} />}
```

- [ ] **Step 4: Factor the timer card into a reusable node**

Extract the existing timer-card markup (the `<div className="border-hairline bg-surface ... rounded-3xl ...">` block containing the session pill, `ClockFace`, and progress bar) into a `const timerCard = ( ... )` declared before the `return`. Reuse the current values (`currentSessionMachineState`, `currentPreset`, `snapshot.context.remainingTime`, `progress`). For the gallery self tile, also build a compact version:

```tsx
const selfTile = (
  <div className="bg-surface flex flex-col items-center gap-2 rounded-2xl p-4">
    <span className="text-accent-work text-xs font-semibold">You</span>
    <ClockFace
      size="text-3xl"
      preset={currentPreset}
      animated={false}
      remainingTime={snapshot.context.remainingTime}
      textColorClassName="text-ink"
    />
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        currentSessionMachineState === SessionMachineState.work
          ? "bg-accent-work-tint text-accent-work"
          : "bg-accent-break-tint text-accent-break"
      }`}
    >
      {currentSessionMachineState === SessionMachineState.work
        ? "Focusing"
        : "Break"}
    </span>
  </div>
);
```

- [ ] **Step 5: Replace the body with the two views**

Replace the `ResizablePanelGroup` block (everything from `<ResizablePanelGroup ...>` to its close) with:

```tsx
<div className="flex h-full flex-col">
  <div className="flex flex-row justify-between">
    {/* keep the existing avatar Sheet block unchanged */}
    {/* keep the existing room-code + connection + ViewSwitcher + Share block */}
  </div>

  {view === "gallery" && hasOthers ? (
    <div className="flex-1 overflow-y-auto p-6">
      <RoomGallery
        self={selfTile}
        participants={participants}
        timerStates={timerStates}
      />
    </div>
  ) : (
    <>
      <div className="flex-1" />
      <div className="flex flex-col items-center justify-center gap-6">
        <div className="flex w-full max-w-md flex-col items-center gap-6">
          {timerCard}
          {/* keep the existing Start / Pause+Resume+Stop / chips blocks unchanged */}
        </div>
      </div>
      <div className="flex-1" />
      {hasOthers && (
        <div className="pb-4">
          <ParticipantStrip
            participants={participants}
            timerStates={timerStates}
          />
        </div>
      )}
    </>
  )}
</div>
```

Keep the account `Sheet`, the top-bar pills, and the timer control buttons/chips exactly as they are today — only their container changes.

- [ ] **Step 6: Delete the retired panel**

```bash
git rm src/components/ui/participants-panel.tsx
```

- [ ] **Step 7: Verify type-check, format, and tests**

Run:
```bash
npx tsc --noEmit && npx prettier . --write && bun run test
```
Expected: `tsc` clean; prettier writes formatting; all test files pass (the new suites from Tasks 1–7 plus the 6 pre-existing suites).

- [ ] **Step 8: Manual check**

Run the app (`bun run dev`) with two browser windows joined to the same room. Verify:
- Alone: only the timer shows, no switcher.
- With a second participant: switcher appears; Focus view shows the timer + a bottom filmstrip card for the other person with a live countdown and status; Gallery view shows your ringed self tile plus a tile per participant.
- Toggling the switcher persists across reload.

- [ ] **Step 9: Commit**

```bash
git add src/app/room/[id]/page.tsx
git commit -m "feat: add Focus/Gallery views to shared room"
```

---

## Deferred (future plan): Spotlight moment

Not in scope here because `server.js` broadcasts only `timerStateUpdate` — there is no live session-completion event, and the sticker/achievement system it celebrates does not exist yet. When those land, a follow-up plan should:

1. Emit (or client-derive from a participant's timer reaching `remainingTime === 0`) a completion signal per participant.
2. Add a transient spotlight overlay in `RoomGallery`/`ParticipantStrip` that enlarges the finishing participant's tile, shows the earned sticker, and a "`<name>` finished a session!" caption, then settles back.
3. Reuse the `Sticker` component (`src/components/sticker.tsx`) for the badge pop.

---

## Self-Review

- **Spec coverage:** Two views (Focus = Tasks 4/6/8; Gallery = Tasks 4/7/8), switcher (Task 5), Teak reskin of participants (Task 4), persisted view (Task 2), shared data source (Task 3), status vocabulary (Task 1). Spotlight explicitly deferred with rationale. Covered.
- **Placeholder scan:** No TBD/"handle edge cases"/vague steps; every code step shows full code.
- **Type consistency:** `Participant`/`TimerState` defined in Task 3 and imported everywhere; `RoomView` from Task 2; `getParticipantStatus`/`statusPillClasses`/`statusDotClasses` from Task 1 used in Task 4; `ParticipantCard` new prop shape (`displayName`, `avatar`, `timerState`, `layout`) consistent across Tasks 4, 6, 7. `ViewSwitcher`/`ParticipantStrip`/`RoomGallery` signatures match their Task-8 call sites.
