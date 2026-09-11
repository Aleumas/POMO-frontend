import { describe, expect, it } from "vitest";
import { dedupeParticipants } from "@/hooks/useRoomParticipants";

const p = (uid: string, socketId: string) =>
  JSON.stringify({ uid, socketId, displayName: uid, avatar: "" });

describe("dedupeParticipants", () => {
  it("drops the current user", () => {
    const result = dedupeParticipants([p("me", "s1"), p("maya", "s2")], "me");
    expect(result.map((x) => x.uid)).toEqual(["maya"]);
  });

  it("dedups by uid keeping the higher socketId", () => {
    const result = dedupeParticipants([p("maya", "s1"), p("maya", "s2")], "me");
    expect(result).toHaveLength(1);
    expect(result[0].socketId).toBe("s2");
  });
});
