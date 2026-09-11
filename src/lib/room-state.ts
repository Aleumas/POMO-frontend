import type { RoomParticipant, ServerMessage } from "@/lib/room-protocol";

export interface RoomState {
  connected: boolean;
  selfUid: string | null;
  participants: RoomParticipant[];
  offsetMs: number;
}

export const initialRoomState: RoomState = {
  connected: false,
  selfUid: null,
  participants: [],
  offsetMs: 0,
};

export type RoomAction =
  | { type: "connected" }
  | { type: "disconnected" }
  | { type: "message"; message: ServerMessage; receivedAt: number };

export function reduceRoom(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case "connected":
      return { ...state, connected: true };
    case "disconnected":
      return { ...state, connected: false };
    case "message": {
      const { message } = action;
      const offsetMs = message.serverTime - action.receivedAt;
      switch (message.type) {
        case "snapshot":
          return {
            ...state,
            offsetMs,
            selfUid: message.you,
            participants: message.participants,
          };
        case "participantJoined": {
          const exists = state.participants.some(
            (p) => p.uid === message.participant.uid,
          );
          return {
            ...state,
            offsetMs,
            participants: exists
              ? state.participants.map((p) =>
                  p.uid === message.participant.uid ? message.participant : p,
                )
              : [...state.participants, message.participant],
          };
        }
        case "participantLeft":
          return {
            ...state,
            offsetMs,
            participants: state.participants.filter(
              (p) => p.uid !== message.uid,
            ),
          };
        case "timerUpdated":
          return {
            ...state,
            offsetMs,
            participants: state.participants.map((p) =>
              p.uid === message.uid ? { ...p, timer: message.timer } : p,
            ),
          };
        case "sessionCompleted":
        case "error":
          return { ...state, offsetMs };
      }
    }
  }
}
