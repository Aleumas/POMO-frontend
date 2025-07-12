import ClockFace from "./clock-face";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { SessionMachineState } from "@/lib/session-machine-types";

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
  displayName: string;
  preset?: number;
  machineState?: any;
}) => {
  const modeBorderColor = {
    idle: "border-white",
    running:
      Object.keys(machineState?.value ?? {})[0] == SessionMachineState.work
        ? "border-rose-600"
        : "border-green-600",
    paused: "border-orange-400",
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger
          className={`${modeBorderColor[Object.values(machineState?.value ?? {})[0] as string]} bg-background hover:bg-accent hover:text-accent-foreground m-2 flex shrink-0 basis-1/4 flex-col items-center justify-center gap-2 rounded-lg border-2 p-2`}
        >
          <Avatar>
            <AvatarImage src={avatar} alt={participant + "'s avatar"} />
            <AvatarFallback></AvatarFallback>
          </Avatar>
          <ClockFace
            size="text-xl"
            participantId={participant}
            preset={preset}
            remainingTime={machineState?.context?.remainingTime}
            animated={false}
          />
          <div className="font-medium text-sm text-center">{displayName}</div>
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
