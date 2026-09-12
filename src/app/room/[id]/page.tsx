"use client";

import { useEffect, useMemo, useState, use } from "react";
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
import {
  getParticipantStatus,
  statusPillClasses,
  statusDotClasses,
} from "@/lib/participant-status";
import {
  getStoredRoomView,
  setStoredRoomView,
  RoomView,
} from "@/lib/room-view";
import {
  DEFAULT_TIMER,
  type Participant,
  type TimerState,
} from "@/lib/room-protocol";
import { formatTime, progressPercent, toTimerState } from "@/lib/timer-view";
import { playChime } from "@/lib/chime";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRoom } from "@/hooks/useRoom";
import { useServerNow } from "@/hooks/useServerNow";

const baseUrl =
  process.env.NEXT_PUBLIC_MODE == "development"
    ? process.env.NEXT_PUBLIC_DEVELOPMENT_BASE_URL
    : process.env.NEXT_PUBLIC_PRODUCTION_BASE_URL;

const getToken = async () =>
  (await createClient().auth.getSession()).data.session?.access_token ?? null;

export default ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const { user, displayName, avatarUrl, isAnonymous } = useCurrentUser();
  const router = useRouter();
  const room = id;

  const identity = useMemo(
    () => (user?.id ? { displayName, avatar: avatarUrl, getToken } : null),
    [user?.id, displayName, avatarUrl],
  );

  const { connected, self, others, offsetMs, send } = useRoom(room, identity, {
    onSessionCompleted: (m) => {
      if (m.uid === user?.id) {
        playChime();
        toast.success("Session completed!");
        return;
      }
      const who = others.find((p) => p.uid === m.uid)?.displayName ?? "Someone";
      toast(
        `${who} finished a ${m.phase === "work" ? "focus" : "break"} session`,
      );
    },
    onParticipantJoined: (p) => toast(`${p.displayName} joined room`),
    onParticipantLeft: (uid) => {
      const who = others.find((p) => p.uid === uid)?.displayName ?? "Someone";
      toast(`${who} left room`);
    },
  });

  const timer = self?.timer ?? DEFAULT_TIMER;
  const now = useServerNow(offsetMs, timer.status === "running");
  const timerState = toTimerState(timer, now);
  const progress = progressPercent(timer, now);
  const isWork = timer.phase === "work";
  const selfStatus = getParticipantStatus(timerState);

  const participants: Participant[] = others.map(
    ({ uid, displayName, avatar }) => ({
      uid,
      displayName,
      avatar,
    }),
  );
  const timerStates = new Map<string, TimerState>(
    others.map((p) => [p.uid, toTimerState(p.timer, now)]),
  );
  const hasOthers = others.length > 0;

  const [view, setView] = useState<RoomView>("focus");
  useEffect(() => {
    setView(getStoredRoomView());
  }, []);
  const changeView = (next: RoomView) => {
    setView(next);
    setStoredRoomView(next);
  };

  useEffect(() => {
    if (timer.status !== "idle") {
      document.title = formatTime(timerState.remainingTime);
    }
  }, [timer.status, timerState.remainingTime]);

  const timerCard = (
    <div className="border-hairline bg-surface relative w-full overflow-hidden rounded-3xl border px-8 pt-8 pb-9">
      <span
        className={`mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${
          isWork
            ? "bg-accent-work-tint text-accent-work"
            : "bg-accent-break-tint text-accent-break"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${isWork ? "bg-accent-work" : "bg-accent-break"}`}
        />
        {isWork ? "Focus Session" : "Break"}
      </span>
      <div className="flex justify-center">
        <ClockFace
          size="text-8xl"
          participantId={user?.id}
          preset={timerState.duration / 60}
          animated={true}
          remainingTime={timerState.remainingTime}
          textColorClassName="text-ink"
        />
      </div>
      <div className="bg-ink/5 mt-6 h-2 w-full overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-linear ${
            isWork ? "bg-accent-work" : "bg-accent-break"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );

  const selfTile = (
    <div className="bg-surface flex flex-col items-center gap-2 rounded-2xl p-4">
      <span className="text-accent-work text-xs font-semibold">You</span>
      <ClockFace
        size="text-3xl"
        preset={timerState.duration / 60}
        animated={false}
        remainingTime={timerState.remainingTime}
        textColorClassName="text-ink"
      />
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusPillClasses(
          selfStatus.variant,
        )}`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${statusDotClasses(selfStatus.variant)}`}
        />
        {selfStatus.label}
      </span>
    </div>
  );

  const controlsDisabled = !connected || !self;

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
                      onClick={() => router.push(`${baseUrl}/auth/login`)}
                    >
                      Login
                    </Button>
                  ) : (
                    <Button
                      className="mt-3 w-full"
                      onClick={() => router.push(`${baseUrl}/auth/logout`)}
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
                  connected
                    ? "bg-accent-work-tint text-accent-work"
                    : "text-ink-muted bg-ink/5"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-accent-work" : "bg-ink-muted"}`}
                />
                {connected ? "Connected" : "Offline"}
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

                  {timer.status === "idle" && (
                    <Button
                      className="bg-accent-work hover:bg-accent-work/90 w-full rounded-full font-semibold text-white"
                      disabled={controlsDisabled}
                      onClick={() => send({ type: "start" })}
                    >
                      Start
                    </Button>
                  )}

                  {timer.status !== "idle" && (
                    <div className="flex w-full justify-center gap-3">
                      {timer.status === "running" && (
                        <Button
                          disabled={controlsDisabled}
                          onClick={() => send({ type: "pause" })}
                          className="bg-accent-work hover:bg-accent-work/90 flex-1 rounded-full font-semibold text-white"
                        >
                          Pause
                        </Button>
                      )}
                      {timer.status === "paused" && (
                        <Button
                          disabled={controlsDisabled}
                          onClick={() => send({ type: "resume" })}
                          className="bg-accent-work hover:bg-accent-work/90 flex-1 rounded-full font-semibold text-white"
                        >
                          Resume
                        </Button>
                      )}
                      <Button
                        disabled={controlsDisabled}
                        onClick={() => send({ type: "stop" })}
                        variant="outline"
                        className="border-hairline text-ink-muted hover:border-red-200 hover:bg-red-50 hover:text-red-600 flex-1 rounded-full bg-transparent font-semibold"
                      >
                        Stop
                      </Button>
                    </div>
                  )}

                  {timer.status === "idle" && (
                    <div className="flex w-full flex-col gap-3">
                      {isWork ? (
                        <SessionLengthChips
                          value={timer.workDurationMs / 60_000}
                          presets={[15, 25, 45, 60]}
                          variant="work"
                          onChange={(minutes) =>
                            send({
                              type: "setPreset",
                              phase: "work",
                              durationMs: minutes * 60_000,
                            })
                          }
                        />
                      ) : (
                        <SessionLengthChips
                          value={timer.breakDurationMs / 60_000}
                          presets={[5, 10, 15, 20]}
                          variant="break"
                          onChange={(minutes) =>
                            send({
                              type: "setPreset",
                              phase: "break",
                              durationMs: minutes * 60_000,
                            })
                          }
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
