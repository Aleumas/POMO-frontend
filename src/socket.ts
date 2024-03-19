import { io } from "socket.io-client";

const URL =
  process.env.NODE_ENV === "production" ? "" : "http://localhost:3000";

export const socket = io(URL, {
  reconnection: true,
  reconnectionDelay: 500,
  reconnectionAttempts: 10,
});
