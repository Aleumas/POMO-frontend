import { io } from "socket.io-client";

const URL =
  process.env.NODE_ENV === "production" ? "" : "http://localhost:3000";

export const socket = io(URL, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
});
