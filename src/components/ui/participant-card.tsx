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
import { TimerMachineState } from "@/components/session-machine";

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
  const [mode, setMode] = useState<TimerMachineState>(TimerMachineState.idle);
  const [inSync, setSyncStatus] = useState(false);

  useEffect(() => {
    socket.on(`timerModeUpdate:${participant}`, (mode) => {
      setMode(mode);
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
          className={`${modeBorderColor[mode]} border-input bg-background hover:bg-accent hover:text-accent-foreground m-2 flex basis-1/4 flex-col items-center justify-center gap-2 rounded-lg border-2 p-2`}
        >
          <Avatar>
            <AvatarImage src={avatar} alt={participant + "'s avatar"} />
            <AvatarFallback></AvatarFallback>
          </Avatar>
          <ClockFace
            size="text-xl"
            participantId={participant}
            preset={preset}
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

const modeBorderColor = {
  idle: "border-zinc-300",
  running: "border-orange-800",
  paused: "border-emerald-800",
};
