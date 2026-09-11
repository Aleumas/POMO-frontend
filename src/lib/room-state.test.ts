import { describe, expect, it } from "vitest";
import { DEFAULT_TIMER, RoomParticipant } from "@/lib/room-protocol";
import { initialRoomState, reduceRoom } from "@/lib/room-state";

const alice: RoomParticipant = {
  uid: "alice",
  displayName: "Alice",
  avatar: "",
  timer: DEFAULT_TIMER,
};
const bob: RoomParticipant = {
  uid: "bob",
  displayName: "Bob",
  avatar: "",
  timer: DEFAULT_TIMER,
};

const withSnapshot = reduceRoom(initialRoomState, {
  type: "message",
  receivedAt: 1_000,
  message: {
    type: "snapshot",
    serverTime: 1_250,
    you: "alice",
    participants: [alice, bob],
  },
});

describe("reduceRoom", () => {
  it("tracks connection state", () => {
    expect(reduceRoom(initialRoomState, { type: "connected" }).connected).toBe(
      true,
    );
    expect(
      reduceRoom(
        { ...initialRoomState, connected: true },
        { type: "disconnected" },
      ).connected,
    ).toBe(false);
  });

  it("replaces everything on snapshot and records the clock offset", () => {
    expect(withSnapshot.selfUid).toBe("alice");
    expect(withSnapshot.participants.map((p) => p.uid)).toEqual([
      "alice",
      "bob",
    ]);
    expect(withSnapshot.offsetMs).toBe(250);
  });

  it("upserts on participantJoined", () => {
    const renamed = { ...bob, displayName: "Bobby" };
    const next = reduceRoom(withSnapshot, {
      type: "message",
      receivedAt: 2_000,
      message: {
        type: "participantJoined",
        serverTime: 2_000,
        participant: renamed,
      },
    });
    expect(next.participants).toHaveLength(2);
    expect(next.participants.find((p) => p.uid === "bob")?.displayName).toBe(
      "Bobby",
    );
  });

  it("removes on participantLeft", () => {
    const next = reduceRoom(withSnapshot, {
      type: "message",
      receivedAt: 2_000,
      message: { type: "participantLeft", serverTime: 2_000, uid: "bob" },
    });
    expect(next.participants.map((p) => p.uid)).toEqual(["alice"]);
  });

  it("updates a participant's timer on timerUpdated and ignores unknown uids", () => {
    const running = {
      ...DEFAULT_TIMER,
      status: "running" as const,
      endsAt: 99,
    };
    const next = reduceRoom(withSnapshot, {
      type: "message",
      receivedAt: 2_000,
      message: {
        type: "timerUpdated",
        serverTime: 2_000,
        uid: "bob",
        timer: running,
      },
    });
    expect(next.participants.find((p) => p.uid === "bob")?.timer).toEqual(
      running,
    );

    const ignored = reduceRoom(withSnapshot, {
      type: "message",
      receivedAt: 2_000,
      message: {
        type: "timerUpdated",
        serverTime: 2_000,
        uid: "ghost",
        timer: running,
      },
    });
    expect(ignored.participants).toEqual(withSnapshot.participants);
  });
});
