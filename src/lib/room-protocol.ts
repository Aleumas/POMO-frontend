export type Phase = "work" | "break";
export type Status = "idle" | "running" | "paused";

export interface Timer {
  phase: Phase;
  status: Status;
  workDurationMs: number;
  breakDurationMs: number;
  durationMs: number;
  remainingMs: number;
  endsAt: number | null;
}

export interface RoomParticipant {
  uid: string;
  displayName: string;
  avatar: string;
  timer: Timer;
}

export type Intent =
  | { type: "start" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "stop" }
  | { type: "setPreset"; phase: Phase; durationMs: number };

export type ServerMessage =
  | {
      type: "snapshot";
      serverTime: number;
      you: string;
      participants: RoomParticipant[];
    }
  | {
      type: "participantJoined";
      serverTime: number;
      participant: RoomParticipant;
    }
  | { type: "participantLeft"; serverTime: number; uid: string }
  | { type: "timerUpdated"; serverTime: number; uid: string; timer: Timer }
  | {
      type: "sessionCompleted";
      serverTime: number;
      uid: string;
      phase: Phase;
      durationMs: number;
    }
  | { type: "error"; serverTime: number; message: string };

export const DEFAULT_TIMER: Timer = {
  phase: "work",
  status: "idle",
  workDurationMs: 25 * 60_000,
  breakDurationMs: 5 * 60_000,
  durationMs: 25 * 60_000,
  remainingMs: 25 * 60_000,
  endsAt: null,
};

export interface Participant {
  uid: string;
  displayName: string;
  avatar: string;
}

export interface TimerState {
  sessionState: string;
  timerState: string;
  remainingTime: number;
  duration: number;
}

const MESSAGE_TYPES = new Set<ServerMessage["type"]>([
  "snapshot",
  "participantJoined",
  "participantLeft",
  "timerUpdated",
  "sessionCompleted",
  "error",
]);

export function parseServerMessage(raw: string): ServerMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const { type, serverTime } = parsed as {
    type?: unknown;
    serverTime?: unknown;
  };
  if (
    typeof type !== "string" ||
    !MESSAGE_TYPES.has(type as ServerMessage["type"])
  ) {
    return null;
  }
  if (typeof serverTime !== "number") return null;
  return parsed as ServerMessage;
}
