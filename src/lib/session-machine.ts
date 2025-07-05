import { createMachine, assign, fromCallback } from "xstate";
import { 
  TimerMachineState, 
  TimerMachineTransition, 
  TimerMachineInternalTransition,
  SessionMachineState, 
  SessionMachineTransition,
  TimerContext
} from "./session-machine-types";
import { createSessionMachineActions } from "./session-machine-actions";

const SessionMachine = createMachine(
  {
    id: "session",
    initial: SessionMachineState.work,
    context: {
      remainingTime: 25 * 60,
      duration: 25 * 60,
      workDuration: 25 * 60,
      breakDuration: 5 * 60,
      userId: undefined,
      roomId: undefined,
    } as TimerContext,
    on: {
      'SET_USER_ID': {
        actions: assign({
          userId: ({ event }: { event: any }) => event.userId,
        }),
      },
      'SET_ROOM_ID': {
        actions: assign({
          roomId: ({ event }: { event: any }) => event.roomId,
        }),
      },
    },
    states: {
      [SessionMachineState.work]: {
        initial: TimerMachineState.idle,
        entry: assign({
          duration: ({ context }) => context.workDuration,
          remainingTime: ({ context }) => context.workDuration,
        }),
        on: {
          [SessionMachineTransition.break]: {
            target: SessionMachineState.break,
          },
          SET_WORK_DURATION: {
            actions: assign({
              workDuration: ({ event }: { event: any }) => event.duration,
              duration: ({ event }: { event: any }) => event.duration,
              remainingTime: ({ event }: { event: any }) => event.duration,
            }),
          },
        },
        states: {
          [TimerMachineState.idle]: {
            on: {
              [TimerMachineTransition.start]: {
                target: TimerMachineState.running,
              },
            },
          },
          [TimerMachineState.running]: {
            invoke: {
              src: "timerInterval",
              onDone: {
                target: TimerMachineState.idle,
                actions: "onTimerComplete",
              },
            },
            on: {
              [TimerMachineInternalTransition.tick]: [
                {
                  guard: ({ context }) => context.remainingTime > 1,
                  actions: [
                    assign({
                      remainingTime: ({ context }) => context.remainingTime - 1,
                    }),
                    "broadcastTick"
                  ],
                },
                {
                  guard: ({ context }) => context.remainingTime <= 1,
                  target: `#session.${SessionMachineState.break}`,
                  actions: ["onSessionComplete", "broadcastComplete", assign({
                    remainingTime: ({ context }) => 0,
                  })],
                },
              ],
              [TimerMachineTransition.pause]: {
                target: TimerMachineState.paused,
              },
              [TimerMachineTransition.stop]: {
                target: TimerMachineState.idle,
                actions: assign({
                  remainingTime: ({ context }) => context.duration,
                }),
              },
              [TimerMachineInternalTransition.complete]: {
                target: `#session.${SessionMachineState.break}`,
                actions: ["onSessionComplete", "broadcastComplete"],
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
                actions: assign({
                  remainingTime: ({ context }) => context.duration,
                }),
              },
            },
          },
        },
      },
      [SessionMachineState.break]: {
        initial: TimerMachineState.idle,
        entry: assign({
          duration: ({ context }) => context.breakDuration,
          remainingTime: ({ context }) => context.breakDuration,
        }),
        on: {
          [SessionMachineTransition.work]: {
            target: SessionMachineState.work,
          },
          SET_BREAK_DURATION: {
            actions: assign({
              breakDuration: ({ event }: { event: any }) => event.duration,
              duration: ({ event }: { event: any }) => event.duration,
              remainingTime: ({ event }: { event: any }) => event.duration,
            }),
          },
        },
        states: {
          [TimerMachineState.idle]: {
            on: {
              [TimerMachineTransition.start]: {
                target: TimerMachineState.running,
              },
            },
          },
          [TimerMachineState.running]: {
            invoke: {
              src: "timerInterval",
              onDone: {
                target: TimerMachineState.idle,
                actions: "onTimerComplete",
              },
            },
            on: {
              [TimerMachineInternalTransition.tick]: [
                {
                  guard: ({ context }) => context.remainingTime > 1,
                  actions: [
                    assign({
                      remainingTime: ({ context }) => context.remainingTime - 1,
                    }),
                    "broadcastTick"
                  ],
                },
                {
                  guard: ({ context }) => context.remainingTime <= 1,
                  target: `#session.${SessionMachineState.work}`,
                  actions: ["onSessionComplete", "broadcastComplete", assign({
                    remainingTime: ({ context }) => 0,
                  })],
                },
              ],
              [TimerMachineTransition.pause]: {
                target: TimerMachineState.paused,
              },
              [TimerMachineTransition.stop]: {
                target: TimerMachineState.idle,
                actions: assign({
                  remainingTime: ({ context }) => context.duration,
                }),
              },
              [TimerMachineInternalTransition.complete]: {
                target: `#session.${SessionMachineState.work}`,
                actions: ["onSessionComplete", "broadcastComplete"],
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
                actions: assign({
                  remainingTime: ({ context }) => context.duration,
                }),
              },
            },
          },
        },
      },
    },
  },
  {
    actors: {
      timerInterval: fromCallback(({ sendBack, receive }) => {
        const interval = setInterval(() => {
          sendBack({ type: TimerMachineInternalTransition.tick });
        }, 1000);

        return () => clearInterval(interval);
      }),
    },
    actions: createSessionMachineActions(),
  }
);

export default SessionMachine;
