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
  const [sessionMachineState, setSessionMachineState] =
    useState<SessionMachineState>(SessionMachineState.work);
  const [timerMachineState, setTimerMachineState] = useState<TimerMachineState>(
    TimerMachineState.idle,
  );
  const [remainingTime, setRemainingTime] = useState(0);
  const modeBorderColor = {
    idle: "border-white",
    running:
      sessionMachineState == SessionMachineState.work
        ? "border-rose-600"
        : "border-green-600",
    paused: "border-orange-400",
  };

  console.log(avatar)

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
        </ContextMenuTrigger>

        {/*<ContextMenuContent className="w-30">*/}
        {/*  <ContextMenuItem*/}
        {/*    inset*/}
        {/*    onClick={() => {*/}
        {/*      // Socket sync functionality disabled for clean approach*/}
        {/*      console.log("Sync functionality disabled in clean mode");*/}
        {/*    }}*/}
        {/*  >*/}
        {/*    {inSync ? "Unsync" : "Sync"}*/}
        {/*  </ContextMenuItem>*/}
        {/*</ContextMenuContent>*/}
      </ContextMenu>
    </>
  );
};
