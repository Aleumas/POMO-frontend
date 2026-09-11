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
