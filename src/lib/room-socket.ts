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
  return new PartySocket({
    host: process.env.NEXT_PUBLIC_REALTIME_HOST!,
    party: "room-server",
    room: opts.room,
    query: async () => ({
      token: await opts.getToken(),
      displayName: opts.displayName,
      avatar: opts.avatar,
    }),
  });
}
