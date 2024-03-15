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
  let room = "room";

  const [snapshot, send] = useMachine(SessionMachine);
  const currentTimerMachineState = Object.values(snapshot.value)[0];
  const currentSessionMachineState = Object.keys(snapshot.value)[0];
  const nextTransition =
    currentSessionMachineState == SessionMachineState.work
      ? SessionMachineTransition.break
      : SessionMachineTransition.work;
  const currentPreset =
    currentSessionMachineState == SessionMachineState.work
      ? workPreset
      : breakPreset;

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

      socket.on(`sessionCompletion:${user.sub}`, () => {
        var chime = new Audio("done.mp3");
        chime.play();
      });

      socket.on(`machineTransition:${user.sub}`, (transition) => {
        send({ type: transition });
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
              <ClockFace
                size="text-8xl"
                participantId={user?.sub}
                preset={currentPreset}
              />
              {currentTimerMachineState === TimerMachineState.idle && (
                <Button
                  onClick={() =>
                    send({
                      type: TimerMachineTransition.start,
                      participantId: user.sub,
                      preset: currentPreset * 60,
                      transition: nextTransition,
                    })
                  }
                  disabled={!isSocketConnected}
                >
                  Start
                </Button>
              )}

              {(currentTimerMachineState === TimerMachineState.running ||
                currentTimerMachineState == TimerMachineState.paused) && (
                <div className="flex justify-center gap-5">
                  {currentTimerMachineState == TimerMachineState.running && (
                    <Button
                      onClick={() =>
                        send({
                          type: TimerMachineTransition.pause,
                          participantId: user.sub,
                        })
                      }
                      disabled={!isSocketConnected}
                    >
                      Pause
                    </Button>
                  )}

                  {currentTimerMachineState == TimerMachineState.paused && (
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
                        participantId: user.sub,
                        transition: nextTransition,
                      })
                    }
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
