import { useEffect, useRef, useState } from "react";
import { socket } from "@/socket";

export interface Participant {
  uid: string;
  displayName: string;
  socketId: string;
  avatar: string;
}

export interface TimerState {
  sessionState: string;
  timerState: string;
  remainingTime: number;
  duration: number;
}

export const dedupeParticipants = (
  raw: string[],
  currentUserId?: string,
): Participant[] => {
  const parsed: Participant[] = raw
    .map((entry) => JSON.parse(entry) as Participant)
    .filter((entry) => entry.uid !== currentUserId);

  const byUid = parsed.reduce((map, participant) => {
    const existing = map.get(participant.uid);
    if (!existing || participant.socketId > existing.socketId) {
      map.set(participant.uid, participant);
    }
    return map;
  }, new Map<string, Participant>());

  return Array.from(byUid.values());
};

export const useRoomParticipants = (currentUserId?: string) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [timerStates, setTimerStates] = useState<Map<string, TimerState>>(
    new Map(),
  );
  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    function onAddExistingParticipants(existing: string[]) {
      setParticipants(dedupeParticipants(existing, currentUserIdRef.current));
    }

    function onRemoveParticipant(participantId: string) {
      setParticipants((prev) => prev.filter((x) => x.uid !== participantId));
      setTimerStates((prev) => {
        const next = new Map(prev);
        next.delete(participantId);
        return next;
      });
    }

    function onTimerStateUpdate(data: {
      userId: string;
      state: TimerState;
      timestamp: number;
    }) {
      if (data.userId === currentUserIdRef.current) return;

      setParticipants((prev) => {
        if (prev.some((x) => x.uid === data.userId)) return prev;
        return [
          ...prev,
          {
            uid: data.userId,
            displayName: "User",
            socketId: `auto-${data.userId}`,
            avatar: "",
          },
        ];
      });

      setTimerStates((prev) => {
        const next = new Map(prev);
        next.set(data.userId, data.state);
        return next;
      });
    }

    socket.on("addExistingParticipants", onAddExistingParticipants);
    socket.on("removeParticipant", onRemoveParticipant);
    socket.on("timerStateUpdate", onTimerStateUpdate);

    return () => {
      socket.off("addExistingParticipants", onAddExistingParticipants);
      socket.off("removeParticipant", onRemoveParticipant);
      socket.off("timerStateUpdate", onTimerStateUpdate);
    };
  }, []);

  return { participants, timerStates };
};
