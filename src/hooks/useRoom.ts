import { useCallback, useEffect, useReducer, useRef } from "react";
import { createRoomSocket, type RoomSocket } from "@/lib/room-socket";
import { initialRoomState, reduceRoom } from "@/lib/room-state";
import {
  parseServerMessage,
  type Intent,
  type RoomParticipant,
  type ServerMessage,
} from "@/lib/room-protocol";

export interface RoomIdentity {
  displayName: string;
  avatar: string;
  getToken: () => Promise<string | null>;
}

export interface RoomEventHandlers {
  onSessionCompleted?: (
    m: Extract<ServerMessage, { type: "sessionCompleted" }>,
  ) => void;
  onParticipantJoined?: (p: RoomParticipant) => void;
  onParticipantLeft?: (uid: string) => void;
}

export function useRoom(
  room: string,
  identity: RoomIdentity | null,
  handlers: RoomEventHandlers = {},
) {
  const [state, dispatch] = useReducer(reduceRoom, initialRoomState);
  const socketRef = useRef<RoomSocket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  // Tracked synchronously here (not from React state) so two joins inside one
  // render batch still resolve "is this uid new?" correctly.
  const knownUidsRef = useRef(new Set<string>());
  const getTokenRef = useRef(identity?.getToken);
  getTokenRef.current = identity?.getToken;

  const hasIdentity = identity !== null;
  const displayName = identity?.displayName ?? "";
  const avatar = identity?.avatar ?? "";

  useEffect(() => {
    if (!hasIdentity) return;

    const socket = createRoomSocket({
      room,
      displayName,
      avatar,
      getToken: () => getTokenRef.current?.() ?? Promise.resolve(null),
    });
    socketRef.current = socket;

    const onOpen = () => dispatch({ type: "connected" });
    const onClose = () => dispatch({ type: "disconnected" });
    const onMessage = (event: Event) => {
      const message = parseServerMessage(String((event as MessageEvent).data));
      if (!message) return;
      dispatch({ type: "message", message, receivedAt: Date.now() });
      const known = knownUidsRef.current;
      switch (message.type) {
        case "snapshot":
          knownUidsRef.current = new Set(
            message.participants.map((p) => p.uid),
          );
          break;
        case "sessionCompleted":
          handlersRef.current.onSessionCompleted?.(message);
          break;
        case "participantJoined":
          if (!known.has(message.participant.uid)) {
            known.add(message.participant.uid);
            handlersRef.current.onParticipantJoined?.(message.participant);
          }
          break;
        case "participantLeft":
          known.delete(message.uid);
          handlersRef.current.onParticipantLeft?.(message.uid);
          break;
      }
    };

    socket.addEventListener("open", onOpen);
    socket.addEventListener("close", onClose);
    socket.addEventListener("message", onMessage);

    return () => {
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("close", onClose);
      socket.removeEventListener("message", onMessage);
      socket.close();
      socketRef.current = null;
      dispatch({ type: "disconnected" });
    };
  }, [room, hasIdentity, displayName, avatar]);

  const send = useCallback((intent: Intent) => {
    socketRef.current?.send(JSON.stringify(intent));
  }, []);

  const self = state.participants.find((p) => p.uid === state.selfUid);
  const others = state.participants.filter((p) => p.uid !== state.selfUid);

  return {
    connected: state.connected,
    self,
    others,
    offsetMs: state.offsetMs,
    send,
  };
}
