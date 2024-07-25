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
      entry: "update_hero_state",
      on: {
        [TimerMachineTransition.start]: {
          target: TimerMachineState.running,
        },
      },
    },
    [TimerMachineState.running]: {
      entry: "update_hero_state",
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
      entry: "update_hero_state",
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

let attackingInterval = null;

const startAttacking = () => {
  attackingInterval = setInterval(function () {
    if (window[0].change_state) {
      window[0].change_state("Attack");
    }
  }, 5000);
};

const stopAttacking = () => {
  clearInterval(attackingInterval);
  attackingInterval = null;
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
  },
  {
    actions: {
      update_hero_state(context) {
        setTimeout(() => {
          let snapshot = context.self.getSnapshot().value;
          const sessionState = Object.keys(snapshot)[0];
          const timerState = Object.values(snapshot)[0];
          console.log(`session: ${sessionState} \ntimer: ${timerState}`);
          if (window[0].change_state) {
            if (timerState == "idle") {
              window[0].change_state("Idle");
              if (sessionState == "break") {
                window[0].change_state("Cheer");
                stopAttacking();
              }
            }
            if (sessionState == "work" && timerState == "running") {
              window[0].change_state("Run");
              startAttacking();
            }
            if (sessionState == "break" && timerState == "running") {
              window[0].change_state("Rest");
            }
            if (timerState == "paused") {
              window[0].change_state("Idle");
              stopAttacking();
            }
          }
        }, 0);
      },
    },
  },
);

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
