import ClockFace from "./clock-face";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  SessionMachineState,
  TimerMachineState,
  SessionMachineTransition,
  TimerMachineTransition,
} from "@/lib/session-machine-types";
import {
  transitionsToTargetState,
} from "@/lib/session-machine-utils";
import {useAuth} from "@/app/providers/AuthContext";

export default ({
  participant,
  participantSocket,
  room,
  avatar,
  displayName,
  preset = 0,
  machineState,
}: {
  participant: string;
  participantSocket: string;
  avatar: string;
  room: string;
  displayName: string;
  preset?: number;
  machineState?: any;
}) => {
  const { user, loading } = useAuth();
  const [sessionMachineState, setSessionMachineState] =
    useState<SessionMachineState>(SessionMachineState.work);
  const [timerMachineState, setTimerMachineState] = useState<TimerMachineState>(
    TimerMachineState.idle,
  );
  const [inSync, setSyncStatus] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const modeBorderColor = {
    idle: "border-white",
    running:
      sessionMachineState == SessionMachineState.work
        ? "border-rose-600"
        : "border-green-600",
    paused: "border-orange-400",
  };

  const updateMachineState = (transition: string) => {
    switch (transition) {
      case TimerMachineTransition.start:
      case TimerMachineTransition.resume:
        setTimerMachineState(TimerMachineState.running);
        break;
      case TimerMachineTransition.pause:
        setTimerMachineState(TimerMachineState.paused);
        break;
      case TimerMachineTransition.stop:
        setTimerMachineState(TimerMachineState.idle);
        break;
      case SessionMachineTransition.break:
        setSessionMachineState(SessionMachineState.break);
        break;
      case SessionMachineTransition.work:
        setSessionMachineState(SessionMachineState.work);
    }
  };

  // Update state from machineState prop
  useEffect(() => {
    if (machineState && machineState.value) {
      const sessionState = typeof machineState.value === 'string' ? machineState.value : Object.keys(machineState.value)[0];
      const timerState = typeof machineState.value === 'string' ? 'idle' : Object.values(machineState.value)[0];
      
      if (sessionState === SessionMachineState.work) {
        setSessionMachineState(SessionMachineState.work);
      } else if (sessionState === SessionMachineState.break) {
        setSessionMachineState(SessionMachineState.break);
      }
      
      if (timerState === TimerMachineState.running) {
        setTimerMachineState(TimerMachineState.running);
      } else if (timerState === TimerMachineState.paused) {
        setTimerMachineState(TimerMachineState.paused);
      } else {
        setTimerMachineState(TimerMachineState.idle);
      }
      
      if (machineState.context && machineState.context.remainingTime) {
        setRemainingTime(machineState.context.remainingTime);
      }
    }
  }, [machineState]);

  // Socket event listeners - disabled for clean approach
  // useEffect(() => {
  //   socket.on(`machineStateUpdate:${participant}`, (data) => {
  //     if (data.state && data.state.value) {
  //       const sessionState = typeof data.state.value === 'string' ? data.state.value : Object.keys(data.state.value)[0];
  //       const timerState = typeof data.state.value === 'string' ? 'idle' : Object.values(data.state.value)[0];
  //       
  //       if (sessionState === SessionMachineState.work) {
  //         setSessionMachineState(SessionMachineState.work);
  //       } else if (sessionState === SessionMachineState.break) {
  //         setSessionMachineState(SessionMachineState.break);
  //       }
  //       
  //       if (timerState === TimerMachineState.running) {
  //         setTimerMachineState(TimerMachineState.running);
  //       } else if (timerState === TimerMachineState.paused) {
  //         setTimerMachineState(TimerMachineState.paused);
  //       } else {
  //         setTimerMachineState(TimerMachineState.idle);
  //       }
  //       
  //       if (data.state.context && data.state.context.remainingTime) {
  //         setRemainingTime(data.state.context.remainingTime);
  //       }
  //     }
  //   });

  //   socket.on(`machineTransition:${participant}`, (transition) => {
  //     updateMachineState(transition);
  //   });

  //   socket.on(`setMachineSnapshot:${participant}`, (snapshot) => {
  //     const transitions = transitionsToTargetState(snapshot.value);
  //     transitions.forEach((transition) => {
  //       updateMachineState(transition);
  //     });
  //   });

  //   socket.on(`syncStatusUpdate:${participant}`, (status) => {
  //     setSyncStatus(status);
  //   });

  //   return () => {
  //     socket.off(`machineStateUpdate:${participant}`);
  //     socket.off(`machineTransition:${participant}`);
  //     socket.off(`setMachineSnapshot:${participant}`);
  //     socket.off(`syncStatusUpdate:${participant}`);
  //   };
  // }, [participant]);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger
          className={`${modeBorderColor[timerMachineState]} bg-background hover:bg-accent hover:text-accent-foreground m-2 flex shrink-0 basis-1/4 flex-col items-center justify-center gap-2 rounded-lg border-2 p-2`}
        >
          <Avatar>
            <AvatarImage src={avatar} alt={participant + "'s avatar"} />
            <AvatarFallback></AvatarFallback>
          </Avatar>
          <ClockFace
            size="text-xl"
            participantId={participant}
            preset={preset}
            remainingTime={remainingTime}
            animated={false}
          />
          <div className="text-xs text-center">
            {displayName}
          </div>
          <div className="text-xs text-center capitalize">
            {sessionMachineState}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-30">
          <ContextMenuItem
            inset
            onClick={() => {
              // Socket sync functionality disabled for clean approach
              console.log("Sync functionality disabled in clean mode");
            }}
          >
            {inSync ? "Unsync" : "Sync"}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
};
