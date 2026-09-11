import { useEffect, useState } from "react";

export function useServerNow(offsetMs: number, ticking: boolean): number {
  const [now, setNow] = useState(() => Date.now() + offsetMs);

  useEffect(() => {
    const update = () => setNow(Date.now() + offsetMs);
    update();
    document.addEventListener("visibilitychange", update);
    const interval = ticking ? setInterval(update, 500) : undefined;
    return () => {
      document.removeEventListener("visibilitychange", update);
      if (interval) clearInterval(interval);
    };
  }, [offsetMs, ticking]);

  return now;
}
