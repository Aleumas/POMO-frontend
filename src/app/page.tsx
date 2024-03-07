"use client";

import { io, Socket } from "socket.io-client";
import { useEffect, useState } from "react";

export default function Page() {
  const [seconds, updateSeconds] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [socket, setSocket] = useState<Socket>();

  useEffect(() => {
    const socket = io(process.env.SOCKET_SERVER_URL || "http://localhost:3000");
    setSocket(socket);

    socket.emit("create-room");

    socket.on("update-timer", (time: number) => {
      updateSeconds(time);
    });

    socket.on("room-created", (room: string) => {
      console.log("room created: ", room);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <>
      <h1>Pomodoro: {seconds}</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          socket?.emit("start-timer", startTime);
        }}
      >
        <input
          onChange={(e) => setStartTime(parseInt(e.target.value))}
          type="number"
        />
        <button type="submit">Start Timer</button>
      </form>
    </>
  );
}
