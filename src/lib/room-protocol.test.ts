import { describe, expect, it } from "vitest";
import { parseServerMessage } from "@/lib/room-protocol";

describe("parseServerMessage", () => {
  it("parses known message types", () => {
    const raw = JSON.stringify({
      type: "participantLeft",
      serverTime: 1,
      uid: "u1",
    });
    expect(parseServerMessage(raw)).toEqual({
      type: "participantLeft",
      serverTime: 1,
      uid: "u1",
    });
  });

  it("returns null for malformed or unknown messages", () => {
    expect(parseServerMessage("not json")).toBeNull();
    expect(
      parseServerMessage(JSON.stringify({ type: "dance", serverTime: 1 })),
    ).toBeNull();
    expect(parseServerMessage(JSON.stringify({ type: "snapshot" }))).toBeNull();
  });
});
