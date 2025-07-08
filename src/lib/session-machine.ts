import { createMachine, assign, fromCallback } from "xstate";
import {
  TimerMachineState,
  TimerMachineTransition,
  TimerMachineInternalTransition,
  SessionMachineState,
  SessionMachineTransition,
  TimerContext,
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
      currentSessionState: SessionMachineState.work,
      currentTimerState: TimerMachineState.idle,
    } as TimerContext,
    on: {
      SET_USER_ID: {
        actions: assign({
          userId: ({ event }: { event: any }) => event.userId,
        }),
      },
      SET_ROOM_ID: {
        actions: assign({
          roomId: ({ event }: { event: any }) => event.roomId,
        }),
      },
    },
    states: {
      [SessionMachineState.work]: {
        initial: TimerMachineState.idle,
        entry: [
          assign({
            duration: ({ context }) => context.workDuration,
            remainingTime: ({ context }) => context.workDuration,
            currentSessionState: SessionMachineState.work,
            currentTimerState: TimerMachineState.idle,
          }),
          "broadcastTimerState",
        ],
        on: {
          [SessionMachineTransition.break]: {
            target: SessionMachineState.break,
          },
          SET_WORK_DURATION: {
            actions: [
              assign({
                workDuration: ({ event }: { event: any }) => event.duration,
                duration: ({ event }: { event: any }) => event.duration,
                remainingTime: ({ event }: { event: any }) => event.duration,
              }),
              "broadcastTimerState",
            ],
          },
        },
        states: {
          [TimerMachineState.idle]: {
            entry: [
              assign({
                currentTimerState: TimerMachineState.idle,
              }),
              "broadcastTimerState",
            ],
            on: {
              [TimerMachineTransition.start]: {
                target: TimerMachineState.running,
              },
            },
          },
          [TimerMachineState.running]: {
            entry: [
              assign({
                currentTimerState: TimerMachineState.running,
              }),
              "broadcastTimerState",
            ],
            invoke: {
              src: "timerInterval",
              onDone: {
                target: TimerMachineState.idle,
                actions: ["onTimerComplete", "broadcastTimerState"],
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
                    "broadcastTimerState",
                  ],
                },
                {
                  guard: ({ context }) => context.remainingTime <= 1,
                  target: `#session.${SessionMachineState.break}`,
                  actions: [
                    "onSessionComplete",
                    "broadcastTimerState",
                    assign({
                      remainingTime: ({ context }) => 0,
                    }),
                  ],
                },
              ],
              [TimerMachineTransition.pause]: {
                target: TimerMachineState.paused,
              },
              [TimerMachineTransition.stop]: {
                target: TimerMachineState.idle,
                actions: [
                  assign({
                    remainingTime: ({ context }) => context.duration,
                  }),
                  "broadcastTimerState",
                ],
              },
              [TimerMachineInternalTransition.complete]: {
                target: `#session.${SessionMachineState.break}`,
                actions: ["onSessionComplete", "broadcastTimerState"],
              },
            },
          },
          [TimerMachineState.paused]: {
            entry: [
              assign({
                currentTimerState: TimerMachineState.paused,
              }),
              "broadcastTimerState",
            ],
            on: {
              [TimerMachineTransition.resume]: {
                target: TimerMachineState.running,
              },
              [TimerMachineTransition.stop]: {
                target: TimerMachineState.idle,
                actions: [
                  assign({
                    remainingTime: ({ context }) => context.duration,
                  }),
                  "broadcastTimerState",
                ],
              },
            },
          },
        },
      },
      [SessionMachineState.break]: {
        initial: TimerMachineState.idle,
        entry: [
          assign({
            duration: ({ context }) => context.breakDuration,
            remainingTime: ({ context }) => context.breakDuration,
            currentSessionState: SessionMachineState.break,
            currentTimerState: TimerMachineState.idle,
          }),
          "broadcastTimerState",
        ],
        on: {
          [SessionMachineTransition.work]: {
            target: SessionMachineState.work,
          },
          SET_BREAK_DURATION: {
            actions: [
              assign({
                breakDuration: ({ event }: { event: any }) => event.duration,
                duration: ({ event }: { event: any }) => event.duration,
                remainingTime: ({ event }: { event: any }) => event.duration,
              }),
              "broadcastTimerState",
            ],
          },
        },
        states: {
          [TimerMachineState.idle]: {
            entry: [
              assign({
                currentTimerState: TimerMachineState.idle,
              }),
              "broadcastTimerState",
            ],
            on: {
              [TimerMachineTransition.start]: {
                target: TimerMachineState.running,
              },
            },
          },
          [TimerMachineState.running]: {
            entry: [
              assign({
                currentTimerState: TimerMachineState.running,
              }),
              "broadcastTimerState",
            ],
            invoke: {
              src: "timerInterval",
              onDone: {
                target: TimerMachineState.idle,
                actions: ["onTimerComplete", "broadcastTimerState"],
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
                    "broadcastTimerState",
                  ],
                },
                {
                  guard: ({ context }) => context.remainingTime <= 1,
                  target: `#session.${SessionMachineState.work}`,
                  actions: [
                    "onSessionComplete",
                    "broadcastTimerState",
                    assign({
                      remainingTime: ({ context }) => 0,
                    }),
                  ],
                },
              ],
              [TimerMachineTransition.pause]: {
                target: TimerMachineState.paused,
              },
              [TimerMachineTransition.stop]: {
                target: TimerMachineState.idle,
                actions: [
                  assign({
                    remainingTime: ({ context }) => context.duration,
                  }),
                  "broadcastTimerState",
                ],
              },
              [TimerMachineInternalTransition.complete]: {
                target: `#session.${SessionMachineState.work}`,
                actions: ["onSessionComplete", "broadcastTimerState"],
              },
            },
          },
          [TimerMachineState.paused]: {
            entry: [
              assign({
                currentTimerState: TimerMachineState.paused,
              }),
              "broadcastTimerState",
            ],
            on: {
              [TimerMachineTransition.resume]: {
                target: TimerMachineState.running,
              },
              [TimerMachineTransition.stop]: {
                target: TimerMachineState.idle,
                actions: [
                  assign({
                    remainingTime: ({ context }) => context.duration,
                  }),
                  "broadcastTimerState",
                ],
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
  },
);

export default SessionMachine;
