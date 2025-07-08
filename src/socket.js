import { io } from "socket.io-client";

const URL =
  process.env.NEXT_PUBLIC_MODE === "development"
    ? process.env.NEXT_PUBLIC_DEVELOPMENT_SERVER_BASE_URL
    : process.env.NEXT_PUBLIC_PRODUCTION_SERVER_BASE_URL;

export const socket = io(URL, {
  autoConnect: false,
});
