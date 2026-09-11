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
