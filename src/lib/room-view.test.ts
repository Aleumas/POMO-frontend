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
