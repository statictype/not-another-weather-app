import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetUnitSystemForTests } from "@/hooks/use-unit-system";
import { NavUnitToggle } from "./nav-unit-toggle";

const metric = () => screen.getByRole("button", { name: /metric units/i });
const imperial = () => screen.getByRole("button", { name: /imperial units/i });

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(navigator, "language", { configurable: true, value: "en-GB" });
  __resetUnitSystemForTests("metric");
});

describe("NavUnitToggle", () => {
  it("names the group and each option by what the control does", () => {
    render(<NavUnitToggle vertical={false} />);

    expect(screen.getByRole("group", { name: "Units" })).toBeInTheDocument();
    expect(metric()).toHaveTextContent("C");
    expect(imperial()).toHaveTextContent("F");
  });

  it("leads each accessible name with the visible character", () => {
    render(<NavUnitToggle vertical={false} />);

    expect(metric()).toHaveAccessibleName("C, metric units");
    expect(imperial()).toHaveAccessibleName("F, imperial units");
  });

  it("reflects the active system through aria-pressed", async () => {
    const user = userEvent.setup();
    render(<NavUnitToggle vertical={false} />);

    expect(metric()).toHaveAttribute("aria-pressed", "true");
    expect(imperial()).toHaveAttribute("aria-pressed", "false");

    await user.click(imperial());

    expect(metric()).toHaveAttribute("aria-pressed", "false");
    expect(imperial()).toHaveAttribute("aria-pressed", "true");
  });

  it("lays the letters along the bar's long axis", () => {
    const { rerender } = render(<NavUnitToggle vertical />);
    const group = () => screen.getByRole("group", { name: "Units" });

    expect(group()).toHaveClass("flex-col");

    rerender(<NavUnitToggle vertical={false} />);

    expect(group()).toHaveClass("flex-row");
  });

  it("gives each letter the bar's 44 px cell", () => {
    render(<NavUnitToggle vertical={false} />);

    expect(metric()).toHaveStyle({ width: "44px", height: "44px" });
    expect(imperial()).toHaveStyle({ width: "44px", height: "44px" });
  });
});
