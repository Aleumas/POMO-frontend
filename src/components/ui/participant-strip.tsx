import ParticipantCard from "@/components/ui/participant-card";
import type { Participant, TimerState } from "@/hooks/useRoomParticipants";

export default ({
  participants,
  timerStates,
}: {
  participants: Participant[];
  timerStates: Map<string, TimerState>;
}) => {
  if (participants.length === 0) return null;

  return (
    <div className="flex w-full gap-3 overflow-x-auto px-2 pb-2">
      {participants.map((participant) => (
        <ParticipantCard
          key={participant.uid}
          displayName={participant.displayName}
          avatar={participant.avatar}
          timerState={timerStates.get(participant.uid)}
          layout="strip"
        />
      ))}
    </div>
  );
};
