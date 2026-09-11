import type { Timer, TimerState } from "@/lib/room-protocol";

export function remainingSeconds(timer: Timer, now: number): number {
  if (timer.status === "running" && timer.endsAt !== null) {
    return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
  }
  return Math.round(timer.remainingMs / 1000);
}

export function toTimerState(timer: Timer, now: number): TimerState {
  return {
    sessionState: timer.phase,
    timerState: timer.status,
    remainingTime: remainingSeconds(timer, now),
    duration: Math.round(timer.durationMs / 1000),
  };
}

export function progressPercent(timer: Timer, now: number): number {
  if (timer.status === "idle" || timer.durationMs <= 0) return 0;
  const remainingMs =
    timer.status === "running" && timer.endsAt !== null
      ? Math.max(0, timer.endsAt - now)
      : timer.remainingMs;
  const pct = ((timer.durationMs - remainingMs) / timer.durationMs) * 100;
  return Math.min(100, Math.max(0, pct));
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${rest.toString().padStart(2, "0")}`;
}
