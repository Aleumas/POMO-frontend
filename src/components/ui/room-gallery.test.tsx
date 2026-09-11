import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RoomGallery from "@/components/ui/room-gallery";
import type { Participant, TimerState } from "@/hooks/useRoomParticipants";

const participants: Participant[] = [
  { uid: "maya", displayName: "Maya", socketId: "s1", avatar: "" },
];

describe("RoomGallery", () => {
  it("renders the self tile and each participant tile", () => {
    render(
      <RoomGallery
        self={<div>You</div>}
        participants={participants}
        timerStates={new Map<string, TimerState>()}
      />,
    );
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Maya")).toBeInTheDocument();
  });
});
