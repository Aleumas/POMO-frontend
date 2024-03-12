import { socket } from "@/socket";
import { useEffect, useState } from "react";

export default ({
  size,
  preset = 0,
  participantId,
}: {
  size: string;
  preset: number;
  participantId?: string;
}) => {
  const [time, setTime] = useState(secondsToTime(preset));

  useEffect(() => {
    socket.emit("updateTimer", preset, participantId);
  }, [preset]);

  useEffect(() => {
    socket.on(`timeUpdate:${participantId}`, (secondsRemaining) => {
      setTime(secondsToTime(secondsRemaining));
    });

    return () => {
      socket.off(`timeUpdate:${participantId}`);
    };
  }, [participantId]);

  return (
    <div className="flex grow items-center justify-center">
      <p className={`${size}`}>{time}</p>
    </div>
  );
};

const secondsToTime = (secs: number) => {
  const hours = Math.floor(secs / (60 * 60));
  const minutes = Math.floor((secs % (60 * 60)) / 60);
  const seconds = Math.floor(secs % 60);
  return `${hours}:${minutes}:${seconds}`;
};
