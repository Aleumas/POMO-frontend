import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FocusStatsCards } from "@/components/focus-stats-cards";

describe("FocusStatsCards", () => {
  it("shows the three stats with their labels", () => {
    render(
      <FocusStatsCards
        stats={{ totalSessions: 12, totalMinutes: 300, sessionsThisWeek: 3 }}
      />,
    );

    expect(screen.getByText("Sessions completed")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Minutes focused")).toBeInTheDocument();
    expect(screen.getByText("300")).toBeInTheDocument();
    expect(screen.getByText("Sessions this week")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows labels but no numbers while loading", () => {
    render(<FocusStatsCards stats={null} />);

    expect(screen.getByText("Sessions completed")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).toBeNull();
  });
});
