"use client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Spline from "@splinetool/react-spline";
import { v4 as uuidv4 } from "uuid";

const baseUrl =
  process.env.MODE == "development"
    ? process.env.DEVELOPMENT_BASE_URL
    : process.env.PRODUCTION_BASE_URL;

export default () => {
  const router = useRouter();
  const createRoom = () => {
    const roomId = uuidv4();
    router.push(`/room/${roomId}`);
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="flex h-min w-1/3 flex-col items-center justify-start gap-10">
        <div className="h-96 w-96">
          <Spline
            scene={
              "https://prod.spline.design/Vnz4sk1Rid1uD893/scene.splinecode"
            }
          />
        </div>
        <div className="flex h-full flex-col gap-3">
          <h1 className="text-center text-3xl font-bold">
            Enter Your Collaborative Focus Room
          </h1>
          <h2 className="text-center">
            Step into your dedicated Pomodoro space to track time and maintain
            momentum. It's just a click away.
          </h2>
        </div>
        <Button className="w-full" onClick={createRoom}>
          Enter
        </Button>
      </div>
    </div>
  );
};
