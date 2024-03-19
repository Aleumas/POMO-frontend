"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { useEffect, useState, useRef } from "react";
import { useMachine } from "@xstate/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import ClockFace from "@/components/ui/clock-face";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import ParticipantCard from "@/components/ui/participant-card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import SessionSlider from "@/components/ui/session-slider";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import SessionMachine, {
  TimerMachineState,
  TimerMachineTransition,
  SessionMachineState,
  SessionMachineTransition,
  transitionsToTargetState,
} from "@/components/session-machine";

import { socket } from "@/socket";

export default ({ params }: { params: { id: string } }) => {
  const { user } = useUser();
  const router = useRouter();

  const [workPreset, setWorkPreset] = useState(25);
  const [breakPreset, setBreakPreset] = useState(0.1);

  const [otherParticipants, setOtherParticipants] = useState([]);
  const [progress, updateProgress] = useState(0);
  const [
    directionParticipantPanelDirection,
    setDirectionParticipantPanelDirection,
  ] = useState<Direction>("vertical");

  const [snapshot, send, actor] = useMachine(SessionMachine);

  const currentTimerMachineState = Object.values(snapshot.value)[0];
  const currentSessionMachineState = Object.keys(snapshot.value)[0];
  const nextSessionTransition =
    currentSessionMachineState == SessionMachineState.work
      ? SessionMachineTransition.break
      : SessionMachineTransition.work;

  var currentPreset =
    currentSessionMachineState == SessionMachineState.work
      ? workPreset
      : breakPreset;

  const currentPresetRef = useRef(currentPreset);
  const nextSessionTransitionRef = useRef(nextSessionTransition);
  const currentTimerMachineRef = useRef(currentTimerMachineState);
  const currentSessionMachineRef = useRef(currentSessionMachineState);
  const isSocketConnected = useRef(false);

  let room = params.id;

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 768) {
        setDirectionParticipantPanelDirection("vertical");
      } else {
        setDirectionParticipantPanelDirection("horizontal");
      }
    }

    window.addEventListener("resize", handleResize);

    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    currentPresetRef.current = currentPreset;
    nextSessionTransitionRef.current = nextSessionTransition;
    currentTimerMachineRef.current = Object.values(snapshot.value)[0];
    currentSessionMachineRef.current = Object.keys(snapshot.value)[0];
  }, [snapshot]);

  useEffect(() => {
    if (!user) {
      return;
    }

    socket.connect();
    socket.on("connect", () => {
      if (isSocketConnected.current) {
        return;
      }

      isSocketConnected.current = true;

      socket.emit("joinRoom", room, user.name, user.picture, user.sub);

      socket.on("showToast", (message, type) => {
        switch (type) {
          case "error":
            toast.error(message);
            break;
          case "success":
            toast.success(message);
            break;
          default:
            toast(message);
        }
      });
      socket.on("showSyncRequest", (source) => {
        toast.message(`${source.displayName} wants to sync timers.`, {
          description: `User will be able to control your timer.`,
          duration: 5000,
          action: {
            label: "Accept",
            onClick: () => {
              socket.emit("acceptSyncRequest", room, source.socketId);
            },
          },
          onAutoClose: () => {
            socket.emit("declineSyncRequest", source.socketId);
          },
        });
      });
      socket.on("syncMachines", () => {
        socket.emit("syncMachines", actor.getSnapshot());
      });
      socket.on(`setMachineSnapshot:${user.sub}`, (snapshot) => {
        const transitions = transitionsToTargetState(snapshot.value);
        transitions.forEach((transition) => {
          send({ type: transition });
        });
      });
      socket.on(`sessionCompletion:${user.sub}`, () => {
        var chime = new Audio("../sounds/done.mp3");
        chime.play();
      });
      socket.on(`machineTransition:${user?.sub}`, (transition) => {
        send({ type: transition });
        if (transition === TimerMachineTransition.stop) {
          updateProgress(0);
          socket.emit("updateTimer", currentPresetRef.current * 60, user?.sub);
        }
      });
      socket.on("removeParticipant", (participant) => {
        setOtherParticipants((participants) =>
          participants.filter((p) => p.uid !== participant),
        );
      });
      socket.on("addExistingParticipants", (existingParticipants) => {
        setOtherParticipants(
          existingParticipants.filter((p) => p.uid != user?.sub),
        );
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return (
    <>
      <div className="h-full w-full">
        <ResizablePanelGroup
          direction={directionParticipantPanelDirection}
          className="w-full rounded-lg border"
        >
          <ResizablePanel
            defaultSize={80}
            className="flex flex-col items-center justify-center gap-5"
          >
            <Sheet>
              <SheetTrigger>
                <Avatar className="fixed left-5 top-5">
                  <AvatarImage src={user?.picture} />
                  <AvatarFallback />
                </Avatar>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Options</SheetTitle>
                  <Button
                    className="mt-3 w-full"
                    onClick={() => {
                      router.push("http://localhost:3001/api/auth/logout");
                    }}
                  >
                    Logout
                  </Button>
                </SheetHeader>
              </SheetContent>
            </Sheet>

            <h1
              className={`${currentSessionMachineState === SessionMachineState.work ? "decoration-rose-600" : "decoration-green-600"} text-lg font-semibold underline decoration-solid decoration-4 underline-offset-8`}
            >
              {currentSessionMachineState}
            </h1>
            <div className="flex flex-col items-center gap-5">
              <Progress
                hidden={
                  currentTimerMachineState != TimerMachineState.running &&
                  currentTimerMachineState != TimerMachineState.paused
                }
                value={progress}
                className="w-full"
                color={
                  currentSessionMachineState === SessionMachineState.work
                    ? "bg-rose-600"
                    : "bg-green-600"
                }
              />
              <ClockFace
                size="text-8xl"
                participantId={user?.sub}
                preset={currentPreset}
                animated={true}
                updateProgress={(time) => {
                  if (
                    !(
                      currentTimerMachineRef.current ===
                      TimerMachineState.running
                    )
                  ) {
                    return;
                  }
                  const preset = currentPresetRef.current * 60;
                  updateProgress(((preset - time) / preset) * 100);
                }}
              />
              {currentTimerMachineState === TimerMachineState.idle && (
                <Button
                  className="w-full"
                  onClick={() =>
                    socket.emit(
                      "startTimer",
                      user?.sub,
                      currentPreset * 60,
                      TimerMachineTransition.start,
                      [
                        nextSessionTransitionRef.current,
                        TimerMachineTransition.stop,
                      ],
                    )
                  }
                  disabled={!isSocketConnected.current}
                >
                  Start
                </Button>
              )}

              {(currentTimerMachineState === TimerMachineState.running ||
                currentTimerMachineState === TimerMachineState.paused) && (
                <div className="flex w-full justify-center gap-5">
                  {currentTimerMachineState == TimerMachineState.running && (
                    <Button
                      onClick={() => socket.emit("pauseTimer", user.sub)}
                      disabled={!isSocketConnected.current}
                      className="flex-1"
                    >
                      Pause
                    </Button>
                  )}

                  {currentTimerMachineState === TimerMachineState.paused && (
                    <Button
                      onClick={() =>
                        socket.emit(
                          "resumeTimer",
                          user.sub,
                          TimerMachineTransition.resume,
                          [
                            nextSessionTransitionRef.current,
                            TimerMachineTransition.stop,
                          ],
                        )
                      }
                      disabled={!isSocketConnected.current}
                      className="flex-1"
                    >
                      resume
                    </Button>
                  )}

                  <Button
                    onClick={() => {
                      socket.emit("stopTimer", user.sub, [
                        nextSessionTransitionRef.current,
                        TimerMachineTransition.stop,
                      ]);
                    }}
                    disabled={!isSocketConnected.current}
                    className="flex-1"
                  >
                    Stop
                  </Button>
                </div>
              )}
              {currentTimerMachineState === TimerMachineState.idle && (
                <div className="flex w-full flex-col gap-3">
                  {currentSessionMachineState === SessionMachineState.work && (
                    <SessionSlider
                      value={workPreset}
                      color="bg-rose-600"
                      onChange={(newValue) => {
                        setWorkPreset(newValue);
                      }}
                    />
                  )}
                  {currentSessionMachineState === SessionMachineState.break && (
                    <SessionSlider
                      value={breakPreset}
                      color="bg-green-600"
                      onChange={(newValue) => {
                        setBreakPreset(newValue);
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          </ResizablePanel>
          {otherParticipants.length > 0 && <ResizableHandle withHandle />}
          {otherParticipants.length > 0 && (
            <ResizablePanel defaultSize={15} minSize={15} maxSize={20}>
              <ScrollArea className="h-full w-full p-2">
                <div className="flex overflow-x-auto md:flex-col">
                  {otherParticipants.map(
                    ({ uid, socketId, avatar, displayName }, index) => {
                      return (
                        <>
                          <ParticipantCard
                            participant={uid}
                            participantSocket={socketId}
                            avatar={avatar}
                            room={room}
                            key={index}
                            displayName={displayName}
                          />
                        </>
                      );
                    },
                  )}
                </div>
              </ScrollArea>
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>
    </>
  );
};

type Direction = "vertical" | "horizontal";
