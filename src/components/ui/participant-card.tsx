import ClockFace from "./clock-face";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TimerState } from "@/hooks/useRoomParticipants";
import {
  getParticipantStatus,
  statusPillClasses,
  statusDotClasses,
} from "@/lib/participant-status";

const getInitials = (displayName: string): string => {
  if (!displayName) return "";
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
};

export default ({
  displayName,
  avatar,
  timerState,
  layout = "tile",
}: {
  displayName: string;
  avatar: string;
  timerState?: TimerState;
  layout?: "tile" | "strip";
}) => {
  const status = getParticipantStatus(timerState);
  const initials = getInitials(displayName);

  const StatusPill = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusPillClasses(
        status.variant,
      )}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${statusDotClasses(status.variant)}`}
      />
      {status.label}
    </span>
  );

  if (layout === "strip") {
    return (
      <div className="border-hairline bg-surface flex shrink-0 items-center gap-3 rounded-2xl border px-3 py-2">
        <Avatar className="h-9 w-9">
          <AvatarImage src={avatar} alt={`${displayName}'s avatar`} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-ink text-sm font-semibold">{displayName}</span>
          <ClockFace
            size="text-sm"
            preset={0}
            animated={false}
            remainingTime={timerState?.remainingTime}
            textColorClassName="text-ink-muted"
          />
        </div>
        <span
          className={`ml-1 h-2 w-2 rounded-full ${statusDotClasses(status.variant)}`}
        />
      </div>
    );
  }

  return (
    <div className="border-hairline bg-surface flex flex-col items-center gap-2 rounded-2xl border p-4 transition-shadow hover:shadow-sm">
      <Avatar className="h-12 w-12">
        <AvatarImage src={avatar} alt={`${displayName}'s avatar`} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <span className="text-ink text-sm font-semibold">{displayName}</span>
      <ClockFace
        size="text-2xl"
        preset={0}
        animated={false}
        remainingTime={timerState?.remainingTime}
        textColorClassName="text-ink"
      />
      {StatusPill}
    </div>
  );
};
