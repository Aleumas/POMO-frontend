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
