import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_TIMER } from "@/lib/room-protocol";
import { useRoom } from "@/hooks/useRoom";

const { sockets, FakeSocket } = vi.hoisted(() => {
  class FakeSocket extends EventTarget {
    sent: string[] = [];
    closed = false;
    send(data: string) {
      this.sent.push(data);
    }
    close() {
      this.closed = true;
    }
    open() {
      this.dispatchEvent(new Event("open"));
    }
    receive(message: unknown) {
      this.dispatchEvent(
        new MessageEvent("message", { data: JSON.stringify(message) }),
      );
    }
  }
  return { sockets: [] as InstanceType<typeof FakeSocket>[], FakeSocket };
});

vi.mock("@/lib/room-socket", () => ({
  createRoomSocket: vi.fn(() => {
    const s = new FakeSocket();
    sockets.push(s);
    return s;
  }),
}));

const identity = {
  displayName: "Alice",
  avatar: "",
  getToken: async () => "tok",
};
const alice = {
  uid: "alice",
  displayName: "Alice",
  avatar: "",
  timer: DEFAULT_TIMER,
};
const bob = {
  uid: "bob",
  displayName: "Bob",
  avatar: "",
  timer: DEFAULT_TIMER,
};

describe("useRoom", () => {
  beforeEach(() => {
    sockets.length = 0;
  });

  it("does not connect without an identity", () => {
    renderHook(() => useRoom("r1", null));
    expect(sockets).toHaveLength(0);
  });

  it("connects, applies snapshot, and splits self from others", () => {
    const { result } = renderHook(() => useRoom("r1", identity));
    expect(sockets).toHaveLength(1);
    act(() => {
      sockets[0].open();
      sockets[0].receive({
        type: "snapshot",
        serverTime: Date.now(),
        you: "alice",
        participants: [alice, bob],
      });
    });
    expect(result.current.connected).toBe(true);
    expect(result.current.self?.uid).toBe("alice");
    expect(result.current.others.map((p) => p.uid)).toEqual(["bob"]);
  });

  it("sends intents as JSON", () => {
    const { result } = renderHook(() => useRoom("r1", identity));
    act(() => result.current.send({ type: "start" }));
    expect(sockets[0].sent).toEqual([JSON.stringify({ type: "start" })]);
  });

  it("fires handlers for completion and for genuinely new joins/leaves", () => {
    const onSessionCompleted = vi.fn();
    const onParticipantJoined = vi.fn();
    const onParticipantLeft = vi.fn();
    renderHook(() =>
      useRoom("r1", identity, {
        onSessionCompleted,
        onParticipantJoined,
        onParticipantLeft,
      }),
    );
    act(() => {
      sockets[0].receive({
        type: "snapshot",
        serverTime: 1,
        you: "alice",
        participants: [alice],
      });
      sockets[0].receive({
        type: "participantJoined",
        serverTime: 2,
        participant: bob,
      });
      sockets[0].receive({
        type: "participantJoined",
        serverTime: 3,
        participant: bob,
      });
      sockets[0].receive({
        type: "sessionCompleted",
        serverTime: 4,
        uid: "bob",
        phase: "work",
        durationMs: 1,
      });
      sockets[0].receive({
        type: "participantLeft",
        serverTime: 5,
        uid: "bob",
      });
    });
    expect(onParticipantJoined).toHaveBeenCalledTimes(1);
    expect(onSessionCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "bob" }),
    );
    expect(onParticipantLeft).toHaveBeenCalledWith("bob");
  });

  it("closes the socket on unmount", () => {
    const { unmount } = renderHook(() => useRoom("r1", identity));
    unmount();
    expect(sockets[0].closed).toBe(true);
  });
});
