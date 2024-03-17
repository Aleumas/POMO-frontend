import { socket } from "@/socket";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default ({
  size,
  preset = 0,
  animated,
  participantId,
  updateProgress,
}: {
  size: string;
  preset: number;
  animated: boolean;
  participantId?: string;
  updateProgress?: (timer: number) => void;
}) => {
  const [timerDigits, setTimerDigits] = useState(
    secondsToTime(preset * 60).split(""),
  );
  useEffect(() => {
    socket.emit("updateTimer", preset * 60, participantId);
  }, [preset]);

  useEffect(() => {
    socket.on(`timeUpdate:${participantId}`, (time) => {
      if (updateProgress != null) {
        updateProgress(time);
      }
      setTimerDigits(secondsToTime(time).split(""));
    });

    return () => {
      socket.off(`timeUpdate:${participantId}`);
    };
  }, [participantId]);

  return (
    <div className="flex grow items-center justify-center">
      <div className={`${size} font-firaCode flex`}>
        {timerDigits.map((digit, index) => (
          <div
            className={`relative flex items-center justify-center ${digit === ":" ? "w-auto" : ""}`}
            key={`digit-wrapper-${index}`}
          >
            <AnimatePresence key={index} mode="wait">
              {animated ? (
                <motion.span
                  key={digit + index}
                  initial={{ y: -30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 30, opacity: 0 }}
                  transition={{ duration: 0.2, type: "tween" }}
                >
                  {digit}
                </motion.span>
              ) : (
                <div>{digit}</div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
};

const secondsToTime = (total_seconds: number) => {
  let minutes = Math.floor(total_seconds / 60);
  let seconds = total_seconds % 60;

  let formatted_time =
    String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  return formatted_time;
};
