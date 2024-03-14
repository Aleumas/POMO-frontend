"use client";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useEffect, useState } from "react";
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

export default () => {
  const { user, isLoading } = useUser();
  const [isSocketConnected, setSocketConnectionState] = useState(false);
  const [workPreset, setWorkPreset] = useState(25);
  const [breakPreset, setBreakPreset] = useState(5);
  const [otherParticipants, setOtherParticipants] = useState([]);
  const [sessionMode, sessionModeUpdate] = useState<SessionMachineState>(
    SessionMachineState.work,
  );
  let room = "room";

  const [current, send] = useMachine(SessionMachine);
  const currentPreset = (): number => {
    return sessionMode == SessionMachineState.work ? workPreset : breakPreset;
  };

  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

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

      socket.on("removeParticipant", (participant) => {
        setOtherParticipants((participants) =>
          participants.filter((p) => p.participant !== participant),
        );
      });

      socket.on(`syncSessionState:${user.sub}`, (sessionMode, timerMode) => {
        if (sessionMode === SessionMachineState.work) {
          send({ type: SessionMachineTransition.work });
          updateSessionMode(SessionMachineState.work);
        } else {
          send({ type: SessionMachineTransition.break });
          updateSessionMode(SessionMachineState.break);
        }

        switch (timerMode) {
          case TimerMachineState.running:
            if (current.value[sessionMode] == TimerMachineState.idle) {
              send({
                type: TimerMachineTransition.start,
                participantId: user.sub,
                preset: currentPreset(),
                currentSessionMode: sessionMode,
              });
            } else {
              send({
                type: TimerMachineTransition.resume,
                participantId: user.sub,
                preset: currentPreset(),
                currentSessionMode: sessionMode,
              });
            }
          case TimerMachineState.paused:
            send({
              type: TimerMachineTransition.pause,
              participantId: user.sub,
              preset: currentPreset(),
              currentSessionMode: sessionMode,
            });
          case TimerMachineState.idle:
            send({
              type: TimerMachineTransition.stop,
              participantId: user.sub,
              preset: currentPreset(),
              currentSessionMode: sessionMode,
            });
        }
      });

      socket.on("addExistingParticipants", (existingParticipants) => {
        setOtherParticipants(existingParticipants);
      });

      socket.on(
        "syncRequest",
        (targetSocketId, participantId, participantDisplayName) => {
          toast(`${participantDisplayName} would like to sync timers`, {
            description: `syncing will give ${participantDisplayName} control over the timer`,
            action: {
              label: "accept",
              onClick: () => {
                socket.emit(
                  "syncAcceptance",
                  room,
                  user.sub,
                  targetSocketId,
                  participantId,
                );
              },
            },
          });
        },
      );

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
            <div className="flex flex-col items-center">
              <ClockFace
                size="text-8xl"
                participantId={user?.sub}
                preset={currentPreset()}
              />
              {current.value[sessionMode] === TimerMachineState.idle && (
                <Button
                  onClick={() =>
                    send({
                      type: TimerMachineTransition.start,
                      participantId: user.sub,
                      preset: currentPreset(),
                      currentSessionMode: sessionMode,
                    })
                  }
                  disabled={!isSocketConnected}
                >
                  Start
                </Button>
              )}

              {(current.value[sessionMode] === TimerMachineState.running ||
                current.value[sessionMode] == TimerMachineState.paused) && (
                <div className="flex justify-center gap-5">
                  {current.value[sessionMode] == TimerMachineState.running && (
                    <Button
                      onClick={() =>
                        send({
                          type: TimerMachineTransition.pause,
                          currentSessionMode: sessionMode,
                          participantId: user.sub,
                        })
                      }
                      disabled={!isSocketConnected}
                    >
                      Pause
                    </Button>
                  )}

                  {current.value[sessionMode] == TimerMachineState.paused && (
                    <Button
                      onClick={() =>
                        send({
                          type: TimerMachineTransition.resume,
                          participantId: user.sub,
                        })
                      }
                      disabled={!isSocketConnected}
                    >
                      resume
                    </Button>
                  )}

                  <Button
                    onClick={() =>
                      send({
                        type: TimerMachineTransition.stop,
                        currentSessionMode: sessionMode,
                        participantId: user.sub,
                      })
                    }
                    disabled={!isSocketConnected}
                  >
                    Stop
                  </Button>
                </div>
              )}
              {current.value[sessionMode] === TimerMachineState.idle && (
                <div>
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
          <ResizableHandle withHandle />
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
        </ResizablePanelGroup>
      </div>
    </>
  );
};
