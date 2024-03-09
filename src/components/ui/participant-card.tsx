import ClockFace from "./clock-face";
import { TimerMode } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { socket } from "@/socket";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export default ({
  participant,
  avatar,
  preset,
}: {
  participant: string;
  preset: number;
  avatar: string;
}) => {
  const [mode, setMode] = useState<TimerMode>(TimerMode.idle);

  useEffect(() => {
    socket.on(`modeUpdate:${participant}`, (newMode) => {
      setMode(newMode);
    });

    return () => {
      socket.off(`modeUpdate:${participant}`);
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
              socket.emit("syncTimer", participant);
            }}
          >
            Sync
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
};

const modeBorderColor = {
  idle: "border-zinc-300",
  work: "border-orange-800",
  beak: "border-emerald-800",
};
