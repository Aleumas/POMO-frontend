import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ParticipantCard from "@/components/ui/participant-card";

describe("ParticipantCard", () => {
  it("shows the name and Focusing status for a running work session", () => {
    render(
      <ParticipantCard
        displayName="Maya"
        avatar=""
        timerState={{
          sessionState: "work",
          timerState: "running",
          remainingTime: 1450,
          duration: 1500,
        }}
      />,
    );
    expect(screen.getByText("Maya")).toBeInTheDocument();
    expect(screen.getByText("Focusing")).toBeInTheDocument();
  });

  it("shows Idle when there is no timer state", () => {
    render(<ParticipantCard displayName="Sam" avatar="" />);
    expect(screen.getByText("Idle")).toBeInTheDocument();
  });
});
