export type ParticipantStatusVariant = "work" | "break" | "paused" | "idle";

export interface ParticipantStatus {
  label: string;
  variant: ParticipantStatusVariant;
}

export const getParticipantStatus = (timerState?: {
  sessionState: string;
  timerState: string;
}): ParticipantStatus => {
  if (!timerState || timerState.timerState === "idle") {
    return { label: "Idle", variant: "idle" };
  }
  if (timerState.timerState === "paused") {
    return { label: "Paused", variant: "paused" };
  }
  if (timerState.sessionState === "break") {
    return { label: "Break", variant: "break" };
  }
  return { label: "Focusing", variant: "work" };
};

export const statusPillClasses = (
  variant: ParticipantStatusVariant,
): string => {
  switch (variant) {
    case "work":
      return "bg-accent-work-tint text-accent-work";
    case "break":
      return "bg-accent-break-tint text-accent-break";
    default:
      return "bg-ink/5 text-ink-muted";
  }
};

export const statusDotClasses = (variant: ParticipantStatusVariant): string => {
  switch (variant) {
    case "work":
      return "bg-accent-work";
    case "break":
      return "bg-accent-break";
    default:
      return "bg-ink-muted";
  }
};
