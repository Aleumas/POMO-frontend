import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { PartySocketMock } = vi.hoisted(() => ({
  PartySocketMock: vi.fn(),
}));

vi.mock("partysocket", () => ({
  default: PartySocketMock,
}));

describe("createRoomSocket", () => {
  const originalHost = process.env.NEXT_PUBLIC_REALTIME_HOST;

  beforeEach(() => {
    PartySocketMock.mockClear();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_REALTIME_HOST = originalHost;
  });

  it("falls back to localhost:8787 when the env var is unset", async () => {
    delete process.env.NEXT_PUBLIC_REALTIME_HOST;
    const { createRoomSocket } = await import("./room-socket");

    createRoomSocket({
      room: "r1",
      displayName: "Alice",
      avatar: "",
      getToken: async () => "tok",
    });

    expect(PartySocketMock).toHaveBeenCalledWith(
      expect.objectContaining({ host: "localhost:8787" }),
    );
  });
});
