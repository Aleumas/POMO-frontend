"use client";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useRouter } from "next/navigation";

export default () => {
  const router = useRouter();
  const createRoom = () => {
    axios.post("http://localhost:3000/room").then((res) => {
      const roomId = res.data as string;
      router.push(`http://localhost:3001/room/${roomId}`);
    });
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <Button onClick={createRoom}>Create Room</Button>
    </div>
  );
};
