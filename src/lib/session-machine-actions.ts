import { getCurrentSessionState, getCurrentTimerState } from './session-machine-utils';
import { socket } from '../socket';

const CHIME_SOUND_PATH = "/sounds/done.mp3" as const;

// Audio-related actions
export const playChime = () => {
  try {
    const chime = new Audio(CHIME_SOUND_PATH);
    chime.play().catch(e => console.log("Could not play sound:", e));
  } catch (error) {
    console.log("Sound file not found:", error);
  }
};

export const broadcastTimerState = (snapshot: any, event: string, userId?: string, roomId?: string) => {
  if (!userId || !roomId || !socket.connected) {
    return;
  }

  try {
    const sessionState = getCurrentSessionState(snapshot);
    const timerState = getCurrentTimerState(snapshot);
    const { remainingTime, duration } = snapshot.context;

    const payload = {
      userId,
      roomId,
      event,
      state: {
        sessionState,
        timerState,
        remainingTime,
        duration,
      },
      timestamp: Date.now(),
    };

    socket.emit('timer:broadcast', payload);
  } catch (error) {
    console.error("Error broadcasting timer state:", error);
  }
};

// XState action creators
export const createSessionMachineActions = () => ({
  onTimerComplete: ({ context }) => {
    playChime();
  },
  onSessionComplete: ({ context }) => {
    playChime();
  },
  broadcastTick: ({ context, self }) => {
    const snapshot = self.getSnapshot();
    broadcastTimerState(snapshot, "TICK", context.userId, context.roomId);
  },
  broadcastComplete: ({ context, self }) => {
    const snapshot = self.getSnapshot();
    broadcastTimerState(snapshot, "COMPLETE", context.userId, context.roomId);
  },
}); 