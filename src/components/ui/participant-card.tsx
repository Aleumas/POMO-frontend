import ClockFace from "./clock-face";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { socket } from "@/socket";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useUser } from "@auth0/nextjs-auth0/client";
import {
  SessionMachineState,
  TimerMachineState,
  SessionMachineTransition,
  TimerMachineTransition,
  transitionsToTargetState,
} from "@/components/session-machine";

export default ({
  participant,
  participantSocket,
  room,
  avatar,
  displayName,
  preset = 0,
}: {
  participant: string;
  participantSocket: string;
  avatar: string;
  room: string;
  displayName: string;
  preset?: number;
}) => {
  const { user, isLoading } = useUser();
  const [sessionMachineState, setSessionMachineState] =
    useState<SessionMachineState>(SessionMachineState.work);
  const [timerMachineState, setTimerMachineState] = useState<TimerMachineState>(
    TimerMachineState.idle,
  );
  const [inSync, setSyncStatus] = useState(false);
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

  useEffect(() => {
    socket.on(`machineTransition:${participant}`, (transition) => {
      updateMachineState(transition);
    });

    socket.on(`setMachineSnapshot:${participant}`, (snapshot) => {
      const transitions = transitionsToTargetState(snapshot.value);
      transitions.forEach((transition) => {
        updateMachineState(transition);
      });
    });

    socket.on(`syncStatusUpdate:${participant}`, (status) => {
      setSyncStatus(status);
    });

    return () => {
      socket.off(`machineTransition:${participant}`);
      socket.off(`setMachineSnapshot:${participant}`);
      socket.off(`syncStatusUpdate:${participant}`);
    };
  }, [participant]);

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
            animated={false}
          />
        </ContextMenuTrigger>

        <ContextMenuContent className="w-30">
          <ContextMenuItem
            inset
            onClick={() => {
              if (!isLoading && user) {
                if (inSync) {
                  socket.emit("unsync", room, participantSocket);
                } else {
                  socket.emit("syncRequest", room, participantSocket);
                }
              }
            }}
          >
            {inSync ? "Unsync" : "Sync"}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
};
