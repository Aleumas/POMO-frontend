import {
  getCurrentSessionState,
  getCurrentTimerState,
} from "./session-machine-utils";
import { socket } from "../socket";
import { createClient } from "./supabase/client";
import { focusSessionFromContext, insertFocusSession } from "./focus-session";

const CHIME_SOUND_PATH = "/sounds/done.mp3" as const;

// Audio-related actions
export const playChime = () => {
  try {
    const chime = new Audio(CHIME_SOUND_PATH);
    chime.play().catch((e) => console.log("Could not play sound:", e));
  } catch (error) {
    console.log("Sound file not found:", error);
  }
};

export const broadcastTimerState = (context) => {
  if (!context || !socket.connected) {
    return;
  }

  try {
    const payload = {
      context,
      timestamp: Date.now(),
    };

    socket.emit("timer:broadcast", payload);
  } catch (error) {
    console.error("Error broadcasting timer state:", error);
  }
};

const recordCompletedWorkSession = (context) => {
  const row = focusSessionFromContext(context);
  if (!row) {
    return;
  }
  insertFocusSession(createClient(), row).catch((error) => {
    console.error("Failed to record focus session:", error);
  });
};

// XState action creators
export const createSessionMachineActions = () => ({
  onTimerComplete: ({ context, event }) => {
    playChime();
  },
  onSessionComplete: ({ context, event }) => {
    playChime();
    recordCompletedWorkSession(context);
  },
  broadcastTimerState: ({ context, event }) => {
    broadcastTimerState(context);
  },
});
