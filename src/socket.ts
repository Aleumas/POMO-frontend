import { io } from "socket.io-client";

const serverUrl =
  process.env.MODE == "development"
    ? process.env.DEVELOPMENT_SERVER_BASE_URL
    : process.env.PRODUCTION_SERVER_BASE_URL;

export const socket = io(serverUrl, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
});
