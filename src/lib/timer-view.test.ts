import { describe, expect, it } from "vitest";
import { DEFAULT_TIMER, Timer } from "@/lib/room-protocol";
import {
  formatTime,
  progressPercent,
  remainingSeconds,
  toTimerState,
} from "@/lib/timer-view";

const running: Timer = { ...DEFAULT_TIMER, status: "running", endsAt: 100_000 };

describe("remainingSeconds", () => {
  it("rounds up from endsAt while running and never goes negative", () => {
    expect(remainingSeconds(running, 100_000 - 1_500)).toBe(2);
    expect(remainingSeconds(running, 100_000 - 1_000)).toBe(1);
    expect(remainingSeconds(running, 100_000 + 5_000)).toBe(0);
  });

  it("uses remainingMs while idle or paused", () => {
    expect(remainingSeconds(DEFAULT_TIMER, 0)).toBe(25 * 60);
    expect(
      remainingSeconds(
        { ...DEFAULT_TIMER, status: "paused", remainingMs: 61_400 },
        0,
      ),
    ).toBe(61);
  });
});

describe("toTimerState", () => {
  it("maps to the legacy view shape in seconds", () => {
    expect(toTimerState(running, 100_000 - 60_000)).toEqual({
      sessionState: "work",
      timerState: "running",
      remainingTime: 60,
      duration: 25 * 60,
    });
  });
});

describe("progressPercent", () => {
  it("is 0 when idle and grows while running", () => {
    expect(progressPercent(DEFAULT_TIMER, 0)).toBe(0);
    expect(progressPercent(running, 100_000 - 12.5 * 60_000)).toBeCloseTo(50);
    expect(progressPercent(running, 200_000)).toBe(100);
  });
});

describe("formatTime", () => {
  it("formats mm:ss", () => {
    expect(formatTime(65)).toBe("01:05");
    expect(formatTime(0)).toBe("00:00");
  });
});
