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

export const transitionsToTargetState = (targetState: { string: string }) => {
  const sessionState = Object.keys(targetState)[0];
  const timerState = Object.values(targetState)[0];
  const timerTransitionMap = {
    [TimerMachineState.idle]: [TimerMachineTransition.stop],
    [TimerMachineState.running]: [
      TimerMachineTransition.stop,
      TimerMachineTransition.start,
    ],
    [TimerMachineState.paused]: [
      TimerMachineTransition.stop,
      TimerMachineTransition.start,
      TimerMachineTransition.pause,
    ],
  };
  const sessionTransitionMap = {
    [SessionMachineState.work]: SessionMachineTransition.work,
    [SessionMachineState.break]: SessionMachineTransition.break,
  };
  return [
    sessionTransitionMap[sessionState],
    ...timerTransitionMap[timerState],
  ];
};

export default SessionMachine;
