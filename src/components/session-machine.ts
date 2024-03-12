import { createMachine } from "xstate";
import { socket } from "@/socket";

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
          actions: "startTimer",
        },
      },
    },
    [TimerMachineState.running]: {
      on: {
        [TimerMachineTransition.pause]: {
          target: TimerMachineState.paused,
          actions: "pauseTimer",
        },
        [TimerMachineTransition.stop]: {
          target: TimerMachineState.idle,
          actions: "stopTimer",
        },
      },
    },
    [TimerMachineState.paused]: {
      on: {
        [TimerMachineTransition.resume]: {
          target: TimerMachineState.running,
          actions: "resumeTimer",
        },
        [TimerMachineTransition.stop]: {
          target: TimerMachineState.idle,
          actions: "stopTimer",
        },
      },
    },
  },
};

const SessionMachine = createMachine(
  {
    id: "session",
    initial: SessionMachineState.work,
    states: {
      [SessionMachineState.work]: {
        on: {
          [SessionMachineTransition.break]: {
            target: SessionMachineState.break,
            actions: "startBreak",
          },
        },
        ...TimerMachine,
      },
      [SessionMachineState.break]: {
        on: {
          [SessionMachineTransition.work]: {
            target: SessionMachineState.work,
            actions: "startWork",
          },
        },
        ...TimerMachine,
      },
    },
  },
  {
    actions: {
      startTimer: (context) => {
        socket.emit(
          "startTimer",
          context.event.participantId,
          context.event.preset,
          context.event.currentSessionMode,
        );
      },
      stopTimer: (context) => {
        socket.emit(
          "stopTimer",
          context.event.currentSessionMode,
          context.event.participantId,
        );
      },
      pauseTimer: (context) => {
        socket.emit(
          "pauseTimer",
          context.event.currentSessionMode,
          context.event.participantId,
        );
      },
      resumeTimer: (context) => {
        socket.emit("resumeTimer", context.event.participantId);
      },
      startWork: (context) => {
        socket.emit("startWork", context.event.participantId);
      },
      startBreak: (context) => {
        socket.emit("startBreak", context.event.participantId);
      },
    },
  },
);

export default SessionMachine;
