import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useServerNow } from "@/hooks/useServerNow";

describe("useServerNow", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns Date.now() + offset", () => {
    vi.setSystemTime(10_000);
    const { result } = renderHook(() => useServerNow(500, false));
    expect(result.current).toBe(10_500);
  });

  it("ticks while running and stops when not", () => {
    vi.setSystemTime(10_000);
    const { result, rerender } = renderHook(
      ({ ticking }) => useServerNow(0, ticking),
      {
        initialProps: { ticking: true },
      },
    );
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current).toBe(11_000);

    rerender({ ticking: false });
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(result.current).toBeLessThan(12_000);
  });

  it("schedules an extra update exactly at endsAt, ahead of the next 500ms tick", () => {
    vi.setSystemTime(10_000);
    const { result } = renderHook(() =>
      useServerNow(0, true, /* endsAt */ 10_300),
    );
    expect(result.current).toBe(10_000);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    // Without the deadline timeout this would still read 10_000 (interval
    // hasn't fired yet at t=300) and only catch up at t=500.
    expect(result.current).toBe(10_300);
  });

  it("doesn't schedule a deadline that's already in the past", () => {
    vi.setSystemTime(10_000);
    const { result } = renderHook(() =>
      useServerNow(0, true, /* endsAt */ 9_000),
    );
    expect(result.current).toBe(10_000);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe(10_500);
  });
});
