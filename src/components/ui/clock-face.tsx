import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default ({
  size,
  preset = 0,
  animated,
  participantId,
  remainingTime,
  updateProgress,
  updateTitle,
}: {
  size: string;
  preset: number;
  animated: boolean;
  participantId?: string;
  remainingTime?: number;
  updateProgress?: (time: number) => void;
  updateTitle?: (formattedTime: string) => void;
}) => {
  const [timerDigits, setTimerDigits] = useState(
    secondsToTime(preset * 60).split(""),
  );
  
  useEffect(() => {
    if (remainingTime !== undefined) {
      const formattedTime = secondsToTime(remainingTime);
      setTimerDigits(formattedTime.split(""));
    } else {
      // Use preset time when remainingTime is not provided
      const formattedTime = secondsToTime(preset * 60);
      setTimerDigits(formattedTime.split(""));
    }
  }, [remainingTime, preset]);

  return (
    <div className="flex grow items-center justify-center">
      <div className={`${size} font-firaCode flex`}>
        {timerDigits.map((digit, index) => (
          <div
            className={`relative flex items-center justify-center ${digit === ":" ? "w-auto" : ""}`}
            key={`digit-wrapper-${index}`}
          >
            <AnimatePresence key={index} mode="popLayout">
              {animated ? (
                <motion.span
                  key={digit + index}
                  initial={{ y: -30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 30, opacity: 0 }}
                  transition={{ duration: 0.1, type: "tween" }}
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
  const minutes = Math.floor(total_seconds / 60);
  const seconds = total_seconds % 60;

  const formatted_time =
    String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  return formatted_time;
};
