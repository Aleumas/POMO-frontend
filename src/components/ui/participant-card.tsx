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
} from "@/components/session-machine";

export default ({
  participant,
  participantSocket,
  room,
  avatar,
  preset,
}: {
  participant: string;
  participantSocket: string;
  preset: number;
  avatar: string;
  room: string;
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

  useEffect(() => {
    socket.on(`machineTransition:${participant}`, (transition) => {
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
    });

    socket.on("syncStatusUpdate", (status) => {
      setSyncStatus(status);
    });

    return () => {
      socket.off(`modeUpdate:${participant}`);
      socket.off("syncStatusUpdate");
    };
  }, [participant]);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger
          className={`${modeBorderColor[timerMachineState]} border-input bg-background hover:bg-accent hover:text-accent-foreground m-2 flex basis-1/4 flex-col items-center justify-center gap-2 rounded-lg border-2 p-2`}
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
                  socket.emit("unsync", room, user.sub, participantSocket);
                } else {
                  socket.emit(
                    "syncRequest",
                    participantSocket,
                    user.sub,
                    user.name,
                  );
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
