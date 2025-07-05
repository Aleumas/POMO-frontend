"use client";

import { useEffect, useState, useRef } from "react";
import { useMachine } from "@xstate/react";
import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { Share2Icon } from "@radix-ui/react-icons";

import ClockFace from "@/components/ui/clock-face";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Progress } from "@/components/ui/progress";
import SessionSlider from "@/components/ui/session-slider";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import ParticipantsPanel from "@/components/ui/participants-panel";

import SessionMachine from "@/lib/session-machine";
import {
  TimerMachineState,
  TimerMachineTransition,
  SessionMachineState,
  SessionMachineTransition,
} from "@/lib/session-machine-types";
import {
  getCurrentTimerState,
  getCurrentSessionState,
  formatTime,
} from "@/lib/session-machine-utils";

import { useAuth } from '@/app/providers/AuthContext';
import { socket } from '@/socket';

const baseUrl =
  process.env.NEXT_PUBLIC_MODE == "development"
    ? process.env.NEXT_PUBLIC_DEVELOPMENT_BASE_URL
    : process.env.NEXT_PUBLIC_PRODUCTION_BASE_URL;

export default ({ params }: { params: { id: string } }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const room = params.id;

  const [workPreset, setWorkPreset] = useState(25);
  const [breakPreset, setBreakPreset] = useState(5);
  const [progress, updateProgress] = useState(0);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isRoomJoined, setIsRoomJoined] = useState(false);
  const [hasOtherParticipants, setHasOtherParticipants] = useState(false);

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
      console.error('Socket error:', error);
    }

    function onAddExistingParticipants(existingParticipants) {
      const parsedParticipants = existingParticipants
        .map(p => JSON.parse(p))
        .filter(p => p.uid !== user?.id);
      
      const uniqueParticipants = Array.from(
        parsedParticipants.reduce((map, participant) => {
          map.set(participant.uid, participant);
          return map;
        }, new Map())
      ).map(([_, participant]) => participant);
      
      setHasOtherParticipants(uniqueParticipants.length > 0);
    }



    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('joinedRoom', onJoinedRoom);
    socket.on('error', onError);
    socket.on('addExistingParticipants', onAddExistingParticipants);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('joinedRoom', onJoinedRoom);
      socket.off('error', onError);
      socket.off('addExistingParticipants', onAddExistingParticipants);
    };
  }, []);

  useEffect(() => {
    if (isConnected && user?.id && room && !isRoomJoined) {
      const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'user';
      const avatar = user.user_metadata?.picture || user.user_metadata?.avatar_url || '';
      
      socket.emit('joinRoom', room, displayName, avatar, user.id);
    }
  }, [isConnected, user?.id, room, isRoomJoined]);

  useEffect(() => {
    if (user?.id) {
      send({ type: 'SET_USER_ID', userId: user.id });
    }
  }, [user?.id, send]);

  useEffect(() => {
    if (room) {
      send({ type: 'SET_ROOM_ID', roomId: room });
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
      send({ type: 'SET_WORK_DURATION', duration: workPreset * 60 });
    }
  }, [workPreset, currentSessionMachineState, send]);

  useEffect(() => {
    if (currentSessionMachineState === SessionMachineState.break) {
      send({ type: 'SET_BREAK_DURATION', duration: breakPreset * 60 });
    }
  }, [breakPreset, currentSessionMachineState, send]);

  useEffect(() => {
    if (currentTimerMachineState === TimerMachineState.running || 
        currentTimerMachineState === TimerMachineState.paused) {
      const { remainingTime, duration } = snapshot.context;
      const progressValue = duration > 0 ? ((duration - remainingTime) / duration) * 100 : 0;
      updateProgress(progressValue);
      
      const formattedTime = formatTime(remainingTime);
      document.title = formattedTime;
    }
  }, [snapshot.context, currentTimerMachineState]);

  useEffect(() => {
    send({ type: 'SET_WORK_DURATION', duration: workPreset * 60 });
    send({ type: 'SET_BREAK_DURATION', duration: breakPreset * 60 });
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
  }, [currentSessionMachineState, currentTimerMachineState, snapshot.context, user?.id]);

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

  const handleParticipantCountChange = (count: number) => {
    setHasOtherParticipants(count > 0);
  };

  return (
    <>
      <div className="h-full w-full">
        <ResizablePanelGroup
          direction="horizontal"
          className="w-full rounded-lg border"
        >
          <ResizablePanel defaultSize={hasOtherParticipants ? 85 : 100} className="flex flex-col">
            <div className="flex flex-row justify-between">
              <Sheet>
                <SheetTrigger>
                  <Avatar className="m-5">
                    <AvatarImage src={user?.user_metadata?.picture} />
                    <AvatarFallback />
                  </Avatar>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle>Options</SheetTitle>
                    <Button
                      className="mt-3 w-full"
                      onClick={() => {
                        router.push(`${baseUrl}/achievements`);
                      }}
                    >
                      Achievements
                    </Button>
                    <Button
                      className="mt-3 w-full"
                      onClick={() => {
                        router.push(`${baseUrl}/api/auth/logout`);
                      }}
                    >
                      Logout
                    </Button>
                  </SheetHeader>
                </SheetContent>
              </Sheet>
              <div className="m-5 flex items-center gap-2">
                {isConnected ? (
                  <span className="text-sm text-green-600">● Connected</span>
                ) : (
                  <span className="text-sm text-red-600">● Disconnected</span>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Link copied to clipboard!");
                  }}
                >
                  <Share2Icon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex flex-col items-center justify-center gap-5">
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
                  participantId={user?.id}
                  preset={currentPreset}
                  animated={true}
                  remainingTime={snapshot.context.remainingTime}
                />
                {currentTimerMachineState === TimerMachineState.idle && (
                  <Button
                    className="w-full"
                    onClick={startTimer}
                  >
                    Start
                  </Button>
                )}

                {(currentTimerMachineState === TimerMachineState.running ||
                  currentTimerMachineState === TimerMachineState.paused) && (
                  <div className="flex w-full justify-center gap-5">
                    {currentTimerMachineState == TimerMachineState.running && (
                      <Button
                        onClick={pauseTimer}
                        className="flex-1"
                      >
                        Pause
                      </Button>
                    )}

                    {currentTimerMachineState === TimerMachineState.paused && (
                      <Button
                        onClick={resumeTimer}
                        className="flex-1"
                      >
                        Resume
                      </Button>
                    )}

                    <Button
                      onClick={stopTimer}
                      className="flex-1"
                    >
                      Stop
                    </Button>
                  </div>
                )}
                {currentTimerMachineState === TimerMachineState.idle && (
                  <div className="flex w-full flex-col gap-3">
                    {currentSessionMachineState ===
                      SessionMachineState.work && (
                      <SessionSlider
                        value={workPreset}
                        color="bg-rose-600"
                        onChange={(newValue) => {
                          setWorkPreset(newValue);
                        }}
                      />
                    )}
                    {currentSessionMachineState ===
                      SessionMachineState.break && (
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
            </div>
            <div className="flex-1" />
          </ResizablePanel>
          
          {/* Always render the resizable panel structure, but control visibility */}
          <>
            <ResizableHandle className={hasOtherParticipants ? "" : "hidden"} />
            <ResizablePanel 
              defaultSize={hasOtherParticipants ? 15 : 0} 
              minSize={hasOtherParticipants ? 15 : 0} 
              maxSize={hasOtherParticipants ? 25 : 0}
              className={hasOtherParticipants ? "" : "hidden"}
            >
              <ParticipantsPanel 
                currentUserId={user?.id} 
                onParticipantCountChange={handleParticipantCountChange}
              />
            </ResizablePanel>
          </>
        </ResizablePanelGroup>
      </div>
    </>
  );
};
