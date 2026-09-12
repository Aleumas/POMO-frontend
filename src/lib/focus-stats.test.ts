import { describe, it, expect } from "vitest";
import { computeFocusStats, startOfWeek } from "@/lib/focus-stats";

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

describe("computeFocusStats", () => {
  it("aggregates totals and this-week count", () => {
    const weekStart = new Date("2026-09-07T00:00:00.000Z");
    const rows = [
      { duration_seconds: 1500, completed_at: "2026-09-08T10:00:00.000Z" },
      { duration_seconds: 1500, completed_at: "2026-09-01T10:00:00.000Z" },
      { duration_seconds: 300, completed_at: "2026-09-09T10:00:00.000Z" },
    ];
    expect(computeFocusStats(rows, weekStart)).toEqual({
      totalSessions: 3,
      totalMinutes: 55, // (1500+1500+300)/60 = 55
      sessionsThisWeek: 2,
    });
  });

  it("handles empty history", () => {
    expect(computeFocusStats([], new Date())).toEqual({
      totalSessions: 0,
      totalMinutes: 0,
      sessionsThisWeek: 0,
    });
  });
});
