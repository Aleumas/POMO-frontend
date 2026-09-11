"use client";

import { useEffect, useState } from "react";
import { useMachine } from "@xstate/react";
import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { Share2Icon } from "@radix-ui/react-icons";

import ClockFace from "@/components/ui/clock-face";
import { Button } from "@/components/ui/button";
import SessionLengthChips from "@/components/ui/session-length-chips";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import ViewSwitcher from "@/components/ui/view-switcher";
import ParticipantStrip from "@/components/ui/participant-strip";
import RoomGallery from "@/components/ui/room-gallery";

import SessionMachine from "@/lib/session-machine";
import {
  TimerMachineState,
  TimerMachineTransition,
  SessionMachineState,
} from "@/lib/session-machine-types";
import {
  getCurrentTimerState,
  getCurrentSessionState,
  formatTime,
} from "@/lib/session-machine-utils";
import {
  getStoredRoomView,
  setStoredRoomView,
  RoomView,
} from "@/lib/room-view";

import { socket } from "@/socket";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRoomParticipants } from "@/hooks/useRoomParticipants";

const baseUrl =
  process.env.NEXT_PUBLIC_MODE == "development"
    ? process.env.NEXT_PUBLIC_DEVELOPMENT_BASE_URL
    : process.env.NEXT_PUBLIC_PRODUCTION_BASE_URL;

export default ({ params }: { params: { id: string } }) => {
  const { user, displayName, avatarUrl, isAnonymous } = useCurrentUser();
  const router = useRouter();
  const room = params.id;

  const { participants, timerStates } = useRoomParticipants(user?.id);
  const hasOthers = participants.length > 0;
  const [view, setView] = useState<RoomView>("focus");

  useEffect(() => {
    setView(getStoredRoomView());
  }, []);

  const changeView = (next: RoomView) => {
    setView(next);
    setStoredRoomView(next);
  };

  const [workPreset, setWorkPreset] = useState(25);
  const [breakPreset, setBreakPreset] = useState(5);
  const [progress, updateProgress] = useState(0);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isRoomJoined, setIsRoomJoined] = useState(false);

  const [snapshot, send, actor] = useMachine(SessionMachine);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
      setIsRoomJoined(false);
    }

    function onJoinedRoom(data) {
      setIsRoomJoined(true);
    }

    function onError(error) {
      console.error("Socket error:", error);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("joinedRoom", onJoinedRoom);
    socket.on("error", onError);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("joinedRoom", onJoinedRoom);
      socket.off("error", onError);
    };
  }, []);

  useEffect(() => {
    if (isConnected && user?.id && room && !isRoomJoined) {
      socket.emit("joinRoom", room, displayName, avatarUrl, user.id);
    }
  }, [isConnected, user?.id, room, isRoomJoined]);

  useEffect(() => {
    if (user?.id) {
      send({ type: "SET_USER_ID", userId: user.id });
    }
  }, [user?.id, send]);

  useEffect(() => {
    if (room) {
      send({ type: "SET_ROOM_ID", roomId: room });
    }
  }, [room, send]);

  const currentTimerMachineState = getCurrentTimerState(snapshot);
  const currentSessionMachineState = getCurrentSessionState(snapshot);

  const currentPreset =
    currentSessionMachineState == SessionMachineState.work
      ? workPreset
      : breakPreset;

  useEffect(() => {
    if (currentSessionMachineState === SessionMachineState.work) {
      send({ type: "SET_WORK_DURATION", duration: workPreset * 60 });
    }
  }, [workPreset, currentSessionMachineState, send]);

  useEffect(() => {
    if (currentSessionMachineState === SessionMachineState.break) {
      send({ type: "SET_BREAK_DURATION", duration: breakPreset * 60 });
    }
  }, [breakPreset, currentSessionMachineState, send]);

  useEffect(() => {
    if (
      currentTimerMachineState === TimerMachineState.running ||
      currentTimerMachineState === TimerMachineState.paused
    ) {
      const { remainingTime, duration } = snapshot.context;
      const progressValue =
        duration > 0 ? ((duration - remainingTime) / duration) * 100 : 0;
      updateProgress(progressValue);

      const formattedTime = formatTime(remainingTime);
      document.title = formattedTime;
    } else {
      updateProgress(0);
    }
  }, [snapshot.context, currentTimerMachineState]);

  useEffect(() => {
    send({ type: "SET_WORK_DURATION", duration: workPreset * 60 });
    send({ type: "SET_BREAK_DURATION", duration: breakPreset * 60 });
  }, []);

  useEffect(() => {
    const sessionTransitionOccurred =
      (currentSessionMachineState === SessionMachineState.work &&
        currentTimerMachineState === TimerMachineState.idle &&
        snapshot.context.remainingTime === 0) ||
      (currentSessionMachineState === SessionMachineState.break &&
        currentTimerMachineState === TimerMachineState.idle &&
        snapshot.context.remainingTime === 0);

    if (sessionTransitionOccurred && user?.id) {
      toast.success("Session completed!");
    }
  }, [
    currentSessionMachineState,
    currentTimerMachineState,
    snapshot.context,
    user?.id,
  ]);

  const startTimer = () => {
    send({ type: TimerMachineTransition.start });
  };

  const stopTimer = () => {
    send({ type: TimerMachineTransition.stop });
  };

  const pauseTimer = () => {
    send({ type: TimerMachineTransition.pause });
  };

  const resumeTimer = () => {
    send({ type: TimerMachineTransition.resume });
  };

  const timerCard = (
    <div className="border-hairline bg-surface relative w-full overflow-hidden rounded-3xl border px-8 pt-8 pb-9">
      <span
        className={`mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${
          currentSessionMachineState === SessionMachineState.work
            ? "bg-accent-work-tint text-accent-work"
            : "bg-accent-break-tint text-accent-break"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            currentSessionMachineState === SessionMachineState.work
              ? "bg-accent-work"
              : "bg-accent-break"
          }`}
        />
        {currentSessionMachineState === SessionMachineState.work
          ? "Focus Session"
          : "Break"}
      </span>
      <div className="flex justify-center">
        <ClockFace
          size="text-8xl"
          participantId={user?.id}
          preset={currentPreset}
          animated={true}
          remainingTime={snapshot.context.remainingTime}
          textColorClassName="text-ink"
        />
      </div>
      <div className="bg-ink/5 mt-6 h-2 w-full overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-linear ${
            currentSessionMachineState === SessionMachineState.work
              ? "bg-accent-work"
              : "bg-accent-break"
          }`}
          style={{
            width: `${Math.min(Math.max(progress, 0), 100)}%`,
          }}
        />
      </div>
    </div>
  );

  const selfTile = (
    <div className="bg-surface flex flex-col items-center gap-2 rounded-2xl p-4">
      <span className="text-accent-work text-xs font-semibold">You</span>
      <ClockFace
        size="text-3xl"
        preset={currentPreset}
        animated={false}
        remainingTime={snapshot.context.remainingTime}
        textColorClassName="text-ink"
      />
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          currentSessionMachineState === SessionMachineState.work
            ? "bg-accent-work-tint text-accent-work"
            : "bg-accent-break-tint text-accent-break"
        }`}
      >
        {currentSessionMachineState === SessionMachineState.work
          ? "Focusing"
          : "Break"}
      </span>
    </div>
  );

  return (
    <>
      <div className="bg-canvas relative h-full w-full">
        <div className="flex h-full flex-col">
          <div className="flex flex-row justify-between">
            <Sheet>
              <SheetTrigger>
                <Avatar className="m-5">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback />
                </Avatar>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Account</SheetTitle>
                  <Button
                    className="mt-3 w-full"
                    onClick={() => router.push("/statistics")}
                  >
                    Statistics
                  </Button>
                  <Button
                    className="mt-3 w-full"
                    onClick={() => router.push("/achievements")}
                  >
                    Achievements
                  </Button>
                  {isAnonymous ? (
                    <Button
                      className="mt-3 w-full"
                      onClick={() => {
                        router.push(`${baseUrl}/auth/login`);
                      }}
                    >
                      Login
                    </Button>
                  ) : (
                    <Button
                      className="mt-3 w-full"
                      onClick={() => {
                        router.push(`${baseUrl}/auth/logout`);
                      }}
                    >
                      Logout
                    </Button>
                  )}
                </SheetHeader>
              </SheetContent>
            </Sheet>
            <div className="m-5 flex items-center gap-2">
              <span className="text-ink-muted bg-ink/5 font-firaCode rounded-full px-3 py-1 text-xs tracking-widest uppercase">
                Room {room.slice(0, 8)}
              </span>
              <span
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  isConnected
                    ? "bg-accent-work-tint text-accent-work"
                    : "text-ink-muted bg-ink/5"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-accent-work" : "bg-ink-muted"}`}
                />
                {isConnected ? "Connected" : "Offline"}
              </span>
              {hasOthers && <ViewSwitcher value={view} onChange={changeView} />}
              <Button
                variant="outline"
                size="icon"
                className="border-hairline text-ink hover:bg-ink/5 rounded-full bg-transparent"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied to clipboard!");
                }}
              >
                <Share2Icon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {view === "gallery" && hasOthers ? (
            <div className="flex-1 overflow-y-auto p-6">
              <RoomGallery
                self={selfTile}
                participants={participants}
                timerStates={timerStates}
              />
            </div>
          ) : (
            <>
              <div className="flex-1" />
              <div className="flex flex-col items-center justify-center gap-6">
                <div className="flex w-full max-w-md flex-col items-center gap-6">
                  {timerCard}
                  {currentTimerMachineState === TimerMachineState.idle && (
                    <Button
                      className="bg-accent-work hover:bg-accent-work/90 w-full rounded-full font-semibold text-white"
                      onClick={startTimer}
                    >
                      Start
                    </Button>
                  )}

                  {(currentTimerMachineState === TimerMachineState.running ||
                    currentTimerMachineState === TimerMachineState.paused) && (
                    <div className="flex w-full justify-center gap-3">
                      {currentTimerMachineState ==
                        TimerMachineState.running && (
                        <Button
                          onClick={pauseTimer}
                          className="bg-accent-work hover:bg-accent-work/90 flex-1 rounded-full font-semibold text-white"
                        >
                          Pause
                        </Button>
                      )}

                      {currentTimerMachineState ===
                        TimerMachineState.paused && (
                        <Button
                          onClick={resumeTimer}
                          className="bg-accent-work hover:bg-accent-work/90 flex-1 rounded-full font-semibold text-white"
                        >
                          Resume
                        </Button>
                      )}

                      <Button
                        onClick={stopTimer}
                        variant="outline"
                        className="border-hairline text-ink-muted hover:border-red-200 hover:bg-red-50 hover:text-red-600 flex-1 rounded-full bg-transparent font-semibold"
                      >
                        Stop
                      </Button>
                    </div>
                  )}
                  {currentTimerMachineState === TimerMachineState.idle && (
                    <div className="flex w-full flex-col gap-3">
                      {currentSessionMachineState ===
                        SessionMachineState.work && (
                        <SessionLengthChips
                          value={workPreset}
                          presets={[15, 25, 45, 60]}
                          variant="work"
                          onChange={setWorkPreset}
                        />
                      )}
                      {currentSessionMachineState ===
                        SessionMachineState.break && (
                        <SessionLengthChips
                          value={breakPreset}
                          presets={[5, 10, 15, 20]}
                          variant="break"
                          onChange={setBreakPreset}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1" />
              {hasOthers && (
                <div className="pb-4">
                  <ParticipantStrip
                    participants={participants}
                    timerStates={timerStates}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};
