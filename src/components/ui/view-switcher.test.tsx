import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ViewSwitcher from "@/components/ui/view-switcher";

describe("ViewSwitcher", () => {
  it("calls onChange with gallery when Gallery is clicked", () => {
    const onChange = vi.fn();
    render(<ViewSwitcher value="focus" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Gallery" }));
    expect(onChange).toHaveBeenCalledWith("gallery");
  });

  it("marks the active view as pressed", () => {
    render(<ViewSwitcher value="gallery" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Gallery" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
