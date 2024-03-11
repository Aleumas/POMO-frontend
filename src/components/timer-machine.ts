import { createMachine } from "xstate";
import { socket } from "@/socket";

const TimerMachine = createMachine(
  {
    id: "timer",
    initial: "idle",
    states: {
      idle: {
        on: {
          START: {
            target: "running",
            actions: "startTimer",
          },
        },
      },
      running: {
        on: {
          PAUSE: {
            target: "paused",
            actions: "pauseTimer",
          },
          STOP: {
            target: "idle",
            actions: "stopTimer",
          },
        },
      },
      paused: {
        on: {
          RESUME: {
            target: "running",
            actions: "resumeTimer",
          },
          STOP: {
            target: "idle",
            actions: "stopTimer",
          },
        },
      },
    },
  },
  {
    actions: {
      startTimer: (context) => {
        console.log(context);
        socket.emit(
          "startTimer",
          context.event.participantId,
          context.event.preset,
        );
      },
      stopTimer: (context) => {
        socket.emit("stopTimer", context.event.participantId);
      },
      pauseTimer: (context) => {
        socket.emit("stopTimer", context.event.participantId);
      },
      resumeTimer: (context) => {
        socket.emit("resumeTimer", context.event.participantId);
      },
    },
  },
);

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

export default TimerMachine;
