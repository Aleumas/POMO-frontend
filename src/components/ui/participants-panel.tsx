import { useEffect, useState, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ParticipantCard from "@/components/ui/participant-card";
import { socket } from "@/socket";

interface Participant {
  uid: string;
  displayName: string;
  socketId: string;
  avatar: string;
}

interface TimerState {
  sessionState: string;
  timerState: string;
  remainingTime: number;
  duration: number;
}

interface ParticipantTimerState {
  userId: string;
  timerState: TimerState;
  lastUpdate: number;
}

interface ParticipantsPanelProps {
  currentUserId?: string;
  onParticipantCountChange?: (count: number) => void;
}

export default function ParticipantsPanel({ currentUserId, onParticipantCountChange }: ParticipantsPanelProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantTimerStates, setParticipantTimerStates] = useState<Map<string, ParticipantTimerState>>(new Map());
  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    function onAddExistingParticipants(existingParticipants: string[]) {
      const parsedParticipants = existingParticipants
        .map(p => JSON.parse(p))
        .filter((p: Participant) => p.uid !== currentUserIdRef.current);
      
      const deduplicatedParticipants = Array.from(
        parsedParticipants.reduce((map, participant) => {
          const existing = map.get(participant.uid);
          if (!existing || participant.socketId > existing.socketId) {
            map.set(participant.uid, participant);
          }
          return map;
        }, new Map<string, Participant>())
      ).map(([_, participant]) => participant);
      
      setParticipants(deduplicatedParticipants);
    }

    function onRemoveParticipant(participantId: string) {
      setParticipants(prev => prev.filter(p => p.uid !== participantId));
      setParticipantTimerStates(prev => {
        const newStates = new Map(prev);
        newStates.delete(participantId);
        return newStates;
      });
    }

    function onTimerStateUpdate(data: { userId: string; event: string; state: TimerState; timestamp: number }) {
      if (data.userId === currentUserIdRef.current) {
        return;
      }
      
      setParticipants(prev => {
        const existingParticipant = prev.find(p => p.uid === data.userId);
        if (!existingParticipant) {
          const newParticipant: Participant = {
            uid: data.userId,
            displayName: 'User',
            socketId: `auto-${data.userId}`,
            avatar: '',
          };
          return [...prev, newParticipant];
        }
        return prev;
      });
      
      setParticipantTimerStates(prev => {
        const newStates = new Map(prev);
        newStates.set(data.userId, {
          userId: data.userId,
          timerState: data.state,
          lastUpdate: data.timestamp,
        });
        return newStates;
      });
    }

    function onShowToast(message: string) {
      // Handle toast messages if needed
    }

    socket.on('addExistingParticipants', onAddExistingParticipants);
    socket.on('removeParticipant', onRemoveParticipant);
    socket.on('timerStateUpdate', onTimerStateUpdate);
    socket.on('showToast', onShowToast);

    return () => {
      socket.off('addExistingParticipants', onAddExistingParticipants);
      socket.off('removeParticipant', onRemoveParticipant);
      socket.off('timerStateUpdate', onTimerStateUpdate);
      socket.off('showToast', onShowToast);
    };
  }, []);

  useEffect(() => {
    onParticipantCountChange?.(participants.length);
  }, [participants.length, onParticipantCountChange]);

  if (participants.length === 0) {
    return <div className="hidden" />;
  }
  return (
    <ScrollArea className="h-full w-full p-2">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-muted-foreground px-2">
          Participants ({participants.length})
        </h3>
        {participants.map((participant) => {
          const timerState = participantTimerStates.get(participant.uid);
          const machineState = timerState ? {
            value: timerState.timerState.timerState === 'idle' 
              ? timerState.timerState.timerState 
              : { [timerState.timerState.sessionState]: timerState.timerState.timerState },
            context: {
              remainingTime: timerState.timerState.remainingTime,
              duration: timerState.timerState.duration,
            }
          } : undefined;

          return (
            <ParticipantCard
              key={participant.uid}
              participant={participant.uid}
              participantSocket={participant.socketId}
              avatar={participant.avatar}
              displayName={participant.displayName}
              room=""
              preset={25}
              machineState={machineState}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
} 