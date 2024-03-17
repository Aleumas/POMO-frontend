"use client";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useEffect, useState, useRef } from "react";
import ClockFace from "@/components/ui/clock-face";
import { Button } from "@/components/ui/button";
import NumberInput from "@/components/ui/number-input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { socket } from "@/socket";
import { toast } from "sonner";
import ParticipantCard from "@/components/ui/participant-card";
import { useMachine } from "@xstate/react";
import SessionMachine, {
  TimerMachineState,
  TimerMachineTransition,
  SessionMachineState,
  SessionMachineTransition,
} from "@/components/session-machine";
import { Progress } from "@/components/ui/progress";

export default () => {
  const { user, isLoading } = useUser();

  const [isSocketConnected, setSocketConnectionState] = useState(false);
  const [workPreset, setWorkPreset] = useState(1);
  const [breakPreset, setBreakPreset] = useState(0.5);
  const [otherParticipants, setOtherParticipants] = useState([]);
  const [progress, updateProgress] = useState(0);

  const [snapshot, send] = useMachine(SessionMachine);

  const currentTimerMachineState = Object.values(snapshot.value)[0];
  const currentSessionMachineState = Object.keys(snapshot.value)[0];
  const nextSessionTransition =
    currentSessionMachineState == SessionMachineState.work
      ? SessionMachineTransition.break
      : SessionMachineTransition.work;
  const currentPreset =
    currentSessionMachineState == SessionMachineState.work
      ? workPreset
      : breakPreset;

  const currentPresetRef = useRef(currentPreset);
  const nextSessionTransitionRef = useRef(nextSessionTransition);
  const currentTimerMachineRef = useRef(Object.values(snapshot.value)[0]);

  let room = "room";

  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    currentPresetRef.current = currentPreset;
    nextSessionTransitionRef.current = nextSessionTransition;
    currentTimerMachineRef.current = Object.values(snapshot.value)[0];
  }, [snapshot]);

  useEffect(() => {
    if (!isLoading && user && !isSocketConnected) {
      socket.emit("joinRoom", room, user.name, user.sub);

      socket.on("showToast", (message) => {
        toast(message);
      });

      socket.on("addParticipant", (participant, socketId) => {
        setOtherParticipants((participants) => [
          ...participants,
          { participant: participant, socketId: socketId },
        ]);
      });

      socket.on(`sessionCompletion:${user.sub}`, () => {
        var chime = new Audio("sounds/done.mp3");
        chime.play();
      });

      socket.on(`machineTransition:${user.sub}`, (transition) => {
        send({ type: transition });
        if (transition === TimerMachineTransition.stop) {
          updateProgress(0); // reset
        }
      });

      socket.on("removeParticipant", (participant) => {
        setOtherParticipants((participants) =>
          participants.filter((p) => p.participant !== participant),
        );
      });

      socket.on("addExistingParticipants", (existingParticipants) => {
        setOtherParticipants(existingParticipants);
      });

      setSocketConnectionState(socket.connected);
    }
  }, [isLoading, user]);

  return (
    <>
      <div className="h-full w-full">
        <ResizablePanelGroup
          direction="horizontal"
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
                    label="session"
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
            <ResizablePanel defaultSize={20}>
              {otherParticipants.map(({ participant, socketId }, index) => {
                return (
                  <>
                    <ParticipantCard
                      participant={participant}
                      participantSocket={socketId}
                      avatar={user.picture}
                      room={room}
                      key={index}
                    />
                  </>
                );
              })}
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>
    </>
  );
};
