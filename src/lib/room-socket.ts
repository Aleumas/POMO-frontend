import PartySocket from "partysocket";

export interface RoomSocketOptions {
  room: string;
  displayName: string;
  avatar: string;
  getToken: () => Promise<string | null>;
}

export type RoomSocket = Pick<
  WebSocket,
  "send" | "close" | "addEventListener" | "removeEventListener"
>;

export function createRoomSocket(opts: RoomSocketOptions): RoomSocket {
  const host = process.env.NEXT_PUBLIC_REALTIME_HOST ?? "localhost:8787";
  return new PartySocket({
    host,
    party: "room-server",
    room: opts.room,
    query: async () => ({
      token: await opts.getToken(),
      displayName: opts.displayName,
      avatar: opts.avatar,
    }),
  });
}
