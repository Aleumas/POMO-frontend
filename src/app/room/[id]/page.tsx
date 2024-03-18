"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { useEffect, useState, useRef } from "react";
import { useMachine } from "@xstate/react";
import { toast } from "sonner";

import ClockFace from "@/components/ui/clock-face";
import { Button } from "@/components/ui/button";
import NumberInput from "@/components/ui/number-input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import ParticipantCard from "@/components/ui/participant-card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

import SessionMachine, {
  TimerMachineState,
  TimerMachineTransition,
  SessionMachineState,
  SessionMachineTransition,
  transitionsToTargetState,
} from "@/components/session-machine";

import { socket } from "@/socket";

export default ({ params }: { params: { id: string } }) => {
  const { user, isLoading } = useUser();

  const [isSocketConnected, setSocketConnectionState] = useState(false);

  const [workPreset, setWorkPreset] = useState(1);
  const [breakPreset, setBreakPreset] = useState(0.5);

  const [otherParticipants, setOtherParticipants] = useState([]);
  const [progress, updateProgress] = useState(0);
  const [
    directionParticipantPanelDirection,
    setDirectionParticipantPanelDirection,
  ] = useState<Direction>("vertical");

  const [snapshot, send] = useMachine(SessionMachine);

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

  let room = params.id;

  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

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
    if (!isLoading && user && !isSocketConnected) {
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
        socket.emit("syncMachines", snapshot);
      });

      socket.on(`setMachineSnapshot:${user.sub}`, (snapshot) => {
        const transitions = transitionsToTargetState(snapshot.value);
        transitions.forEach((transition) => {
          send({ type: transition });
        });
      });

      socket.on(`sessionCompletion:${user.sub}`, () => {
        var chime = new Audio("sounds/done.mp3");
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
          participants.filter((p) => p.participant !== participant),
        );
      });

      socket.on("addExistingParticipants", (existingParticipants) => {
        setOtherParticipants(
          existingParticipants.filter((p) => p.participant != user?.sub),
        );
      });

      setSocketConnectionState(socket.connected);
    }
  }, [isLoading, user]);

  return (
    <>
      <div className="h-full w-full">
        <ResizablePanelGroup
          direction={directionParticipantPanelDirection}
          className="w-full rounded-lg border"
        >
          <ResizablePanel
            defaultSize={80}
            className="flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-5">
              <Progress
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
                  onClick={() =>
                    socket.emit(
                      "startTimer",
                      user.sub,
                      currentPreset * 60,
                      TimerMachineTransition.start,
                      [
                        nextSessionTransitionRef.current,
                        TimerMachineTransition.stop,
                      ],
                    )
                  }
                  disabled={!isSocketConnected}
                >
                  Start
                </Button>
              )}

              {(currentTimerMachineState === TimerMachineState.running ||
                currentTimerMachineState === TimerMachineState.paused) && (
                <div className="flex justify-center gap-5">
                  {currentTimerMachineState == TimerMachineState.running && (
                    <Button
                      onClick={() => socket.emit("pauseTimer", user.sub)}
                      disabled={!isSocketConnected}
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
                      disabled={!isSocketConnected}
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
                    disabled={!isSocketConnected}
                  >
                    Stop
                  </Button>
                </div>
              )}
              {currentTimerMachineState === TimerMachineState.idle && (
                <div className="flex flex-col gap-3">
                  <NumberInput
                    label="work"
                    value={workPreset}
                    onChange={(newValue) => {
                      setWorkPreset(newValue);
                    }}
                  />
                  <NumberInput
                    label="break"
                    value={breakPreset}
                    onChange={(newValue) => {
                      setBreakPreset(newValue);
                    }}
                  />
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
                    ({ participant, socketId, avatar }, index) => {
                      return (
                        <>
                          <ParticipantCard
                            participant={participant}
                            participantSocket={socketId}
                            avatar={avatar}
                            room={room}
                            key={index}
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
