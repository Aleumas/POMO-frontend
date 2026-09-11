import type { ReactNode } from "react";
import ParticipantCard from "@/components/ui/participant-card";
import type { Participant, TimerState } from "@/lib/room-protocol";

export default ({
  self,
  participants,
  timerStates,
}: {
  self: ReactNode;
  participants: Participant[];
  timerStates: Map<string, TimerState>;
}) => {
  return (
    <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <div className="ring-accent-work rounded-2xl ring-2">{self}</div>
      {participants.map((participant) => (
        <ParticipantCard
          key={participant.uid}
          displayName={participant.displayName}
          avatar={participant.avatar}
          timerState={timerStates.get(participant.uid)}
          layout="tile"
        />
      ))}
    </div>
  );
};
