export enum TimerMachineState {
  idle = "idle",
  running = "running",
  paused = "paused",
}

export enum TimerMachineTransition {
  start = "START",
  stop = "STOP",
  pause = "PAUSE",
  resume = "RESUME",
}

export enum TimerMachineInternalTransition {
  tick = "TICK",
  complete = "COMPLETE",
}

export enum SessionMachineState {
  work = "work",
  break = "break",
}

export enum SessionMachineTransition {
  work = "WORK",
  break = "BREAK",
}

export type TimerContext = {
  remainingTime: number;
  duration: number;
  workDuration: number;
  breakDuration: number;
  userId?: string;
  roomId?: string;
  currentSessionState: SessionMachineState;
  currentTimerState: TimerMachineState;
};
