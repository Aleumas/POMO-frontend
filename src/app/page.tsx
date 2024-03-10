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

export default () => {
  const { user, isLoading } = useUser();
  const [isSocketConnected, setSocketConnectionState] = useState(false);
  const [sessionPreset, setSessionPreset] = useState(25);
  const [breakPreset, setBreakPreset] = useState(5);
  const [otherParticipants, setOtherParticipants] = useState([]);
  let room = "room";

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
                preset={sessionPreset}
              />
              <Button
                onClick={() => {
                  socket.emit("startTimer", user.sub, sessionPreset);
                }}
                disabled={!isSocketConnected}
              >
                Start
              </Button>
              <NumberInput
                label="session"
                value={sessionPreset}
                onChange={(newValue) => {
                  setSessionPreset(newValue);
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
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={20}>
            {otherParticipants.map(({ participant, socketId }, index) => {
              return (
                <>
                  <ParticipantCard
                    participant={participant}
                    participantSocket={socketId}
                    preset={sessionPreset}
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
