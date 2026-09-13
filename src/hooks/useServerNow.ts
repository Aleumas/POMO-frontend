import { useEffect, useState } from "react";

export function useServerNow(
  offsetMs: number,
  ticking: boolean,
  endsAt: number | null = null,
): number {
  const [now, setNow] = useState(() => Date.now() + offsetMs);

  useEffect(() => {
    const update = () => setNow(Date.now() + offsetMs);
    update();
    document.addEventListener("visibilitychange", update);
    const interval = ticking ? setInterval(update, 500) : undefined;

    // The 500ms interval alone can skip straight over the instant remaining
    // time hits zero: the server's own phase-transition message tends to
    // arrive on the very next tick and swaps in the next phase's timer
    // before that tick ever renders "0:00". Schedule one extra update timed
    // to land exactly at endsAt so the countdown visibly reaches zero first.
    let deadline: ReturnType<typeof setTimeout> | undefined;
    if (ticking && endsAt !== null) {
      const delay = endsAt - (Date.now() + offsetMs);
      if (delay > 0) deadline = setTimeout(update, delay);
    }

    return () => {
      document.removeEventListener("visibilitychange", update);
      if (interval) clearInterval(interval);
      if (deadline) clearTimeout(deadline);
    };
  }, [offsetMs, ticking, endsAt]);

  return now;
}
