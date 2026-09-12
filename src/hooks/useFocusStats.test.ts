import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FocusStats } from "@/lib/focus-stats";

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));
vi.mock("@/app/providers/AuthContext", () => ({
  useAuth: useAuthMock,
}));

const { fetchFocusStatsMock } = vi.hoisted(() => ({
  fetchFocusStatsMock: vi.fn(),
}));
vi.mock("@/lib/focus-stats", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/focus-stats")>(
      "@/lib/focus-stats",
    );
  return { ...actual, fetchFocusStats: fetchFocusStatsMock };
});

import { useFocusStats } from "@/hooks/useFocusStats";

function setUser(id: string | null) {
  useAuthMock.mockReturnValue({
    user: id ? { id } : null,
    loading: false,
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  useAuthMock.mockReset();
  fetchFocusStatsMock.mockReset();
});

describe("useFocusStats", () => {
  it("loads and resolves stats on initial render", async () => {
    setUser("user-1");
    const stats: FocusStats = {
      totalSessions: 1,
      totalMinutes: 25,
      sessionsThisWeek: 1,
    };
    fetchFocusStatsMock.mockResolvedValueOnce(stats);

    const { result } = renderHook(() => useFocusStats());

    expect(result.current.loading).toBe(true);
    expect(result.current.stats).toBeNull();
    expect(result.current.error).toBeNull();

    await waitFor(() => expect(result.current.stats).toEqual(stats));
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("resets to loading with cleared stats/error when the user id changes", async () => {
    setUser("user-1");
    const statsA: FocusStats = {
      totalSessions: 1,
      totalMinutes: 25,
      sessionsThisWeek: 1,
    };
    fetchFocusStatsMock.mockResolvedValueOnce(statsA);

    const { result, rerender } = renderHook(() => useFocusStats());
    await waitFor(() => expect(result.current.stats).toEqual(statsA));

    const statsB: FocusStats = {
      totalSessions: 5,
      totalMinutes: 125,
      sessionsThisWeek: 2,
    };
    const next = deferred<FocusStats>();
    fetchFocusStatsMock.mockReturnValueOnce(next.promise);

    setUser("user-2");
    rerender();

    expect(result.current.stats).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(true);

    await act(async () => {
      next.resolve(statsB);
    });
    expect(result.current.stats).toEqual(statsB);
  });

  it("clears stats and error when the user logs out", async () => {
    setUser("user-1");
    const stats: FocusStats = {
      totalSessions: 3,
      totalMinutes: 75,
      sessionsThisWeek: 1,
    };
    fetchFocusStatsMock.mockResolvedValueOnce(stats);

    const { result, rerender } = renderHook(() => useFocusStats());
    await waitFor(() => expect(result.current.stats).toEqual(stats));

    setUser(null);
    rerender();

    expect(result.current.stats).toBeNull();
    expect(result.current.error).toBeNull();
    expect(fetchFocusStatsMock).toHaveBeenCalledTimes(1);
  });

  it("clears a stale error once a retry succeeds", async () => {
    setUser("user-1");
    fetchFocusStatsMock.mockRejectedValueOnce(new Error("network down"));

    const { result, rerender } = renderHook(() => useFocusStats());
    await waitFor(() => expect(result.current.error).toBe("network down"));

    const stats: FocusStats = {
      totalSessions: 2,
      totalMinutes: 50,
      sessionsThisWeek: 1,
    };
    fetchFocusStatsMock.mockResolvedValueOnce(stats);

    setUser("user-2");
    rerender();

    // Cleared immediately at the start of the retry, before it resolves.
    expect(result.current.error).toBeNull();

    await waitFor(() => expect(result.current.stats).toEqual(stats));
    expect(result.current.error).toBeNull();
  });

  it("clears stale stats once a subsequent fetch fails", async () => {
    setUser("user-1");
    const stats: FocusStats = {
      totalSessions: 4,
      totalMinutes: 100,
      sessionsThisWeek: 2,
    };
    fetchFocusStatsMock.mockResolvedValueOnce(stats);

    const { result, rerender } = renderHook(() => useFocusStats());
    await waitFor(() => expect(result.current.stats).toEqual(stats));

    fetchFocusStatsMock.mockRejectedValueOnce(new Error("permission denied"));
    setUser("user-2");
    rerender();

    // Cleared immediately at the start of the new fetch, before it fails.
    expect(result.current.stats).toBeNull();

    await waitFor(() => expect(result.current.error).toBe("permission denied"));
    expect(result.current.stats).toBeNull();
  });

  it("ignores a stale response when the user changes before it resolves", async () => {
    setUser("user-1");
    const first = deferred<FocusStats>();
    fetchFocusStatsMock.mockReturnValueOnce(first.promise);

    const { result, rerender } = renderHook(() => useFocusStats());

    const statsB: FocusStats = {
      totalSessions: 9,
      totalMinutes: 225,
      sessionsThisWeek: 3,
    };
    fetchFocusStatsMock.mockResolvedValueOnce(statsB);
    setUser("user-2");
    rerender();

    await waitFor(() => expect(result.current.stats).toEqual(statsB));

    await act(async () => {
      first.resolve({
        totalSessions: 1,
        totalMinutes: 1,
        sessionsThisWeek: 1,
      });
    });

    expect(result.current.stats).toEqual(statsB);
  });

  it("surfaces a plain object's message instead of the generic fallback", async () => {
    setUser("user-1");
    fetchFocusStatsMock.mockRejectedValueOnce({ message: "rls denied" });

    const { result } = renderHook(() => useFocusStats());

    await waitFor(() => expect(result.current.error).toBe("rls denied"));
    expect(result.current.stats).toBeNull();
  });
});
