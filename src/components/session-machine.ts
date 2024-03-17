import { createMachine } from "xstate";

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

export enum SessionMachineState {
  work = "work",
  break = "break",
}

export enum SessionMachineTransition {
  work = "WORK",
  break = "BREAK",
}

const TimerMachine = {
  id: "timer",
  initial: TimerMachineState.idle,
  states: {
    [TimerMachineState.idle]: {
      on: {
        [TimerMachineTransition.start]: {
          target: TimerMachineState.running,
        },
      },
    },
    [TimerMachineState.running]: {
      on: {
        [TimerMachineTransition.pause]: {
          target: TimerMachineState.paused,
        },
        [TimerMachineTransition.stop]: {
          target: TimerMachineState.idle,
          actions: "resetProgress",
        },
      },
    },
    [TimerMachineState.paused]: {
      on: {
        [TimerMachineTransition.resume]: {
          target: TimerMachineState.running,
        },
        [TimerMachineTransition.stop]: {
          target: TimerMachineState.idle,
        },
      },
    },
  },
};

const SessionMachine = createMachine({
  id: "session",
  initial: SessionMachineState.work,
  states: {
    [SessionMachineState.work]: {
      on: {
        [SessionMachineTransition.break]: {
          target: SessionMachineState.break,
        },
      },
      ...TimerMachine,
    },
    [SessionMachineState.break]: {
      on: {
        [SessionMachineTransition.work]: {
          target: SessionMachineState.work,
        },
      },
      ...TimerMachine,
    },
  },
});

export default SessionMachine;
