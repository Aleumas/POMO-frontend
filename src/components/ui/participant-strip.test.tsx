import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ParticipantStrip from "@/components/ui/participant-strip";
import type { Participant, TimerState } from "@/lib/room-protocol";

const participants: Participant[] = [
  { uid: "maya", displayName: "Maya", avatar: "" },
  { uid: "sam", displayName: "Sam", avatar: "" },
];

describe("ParticipantStrip", () => {
  it("renders a card per participant", () => {
    render(
      <ParticipantStrip
        participants={participants}
        timerStates={new Map<string, TimerState>()}
      />,
    );
    expect(screen.getByText("Maya")).toBeInTheDocument();
    expect(screen.getByText("Sam")).toBeInTheDocument();
  });

  it("renders nothing when empty", () => {
    const { container } = render(
      <ParticipantStrip participants={[]} timerStates={new Map()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
