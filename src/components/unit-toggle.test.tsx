import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetUnitSystemForTests } from "@/hooks/use-unit-system";
import { UnitToggle } from "./unit-toggle";

const metric = () => screen.getByRole("button", { name: /metric units/i });
const imperial = () => screen.getByRole("button", { name: /imperial units/i });

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(navigator, "language", { configurable: true, value: "en-GB" });
  __resetUnitSystemForTests("metric");
});

describe("UnitToggle", () => {
  it("names the group and each option by what the control does", () => {
    render(<UnitToggle collapsed={false} />);

    expect(screen.getByRole("group", { name: "Units" })).toBeInTheDocument();
    expect(metric()).toHaveTextContent("°C");
    expect(imperial()).toHaveTextContent("°F");
  });

  it("reflects the active system through aria-pressed", async () => {
    const user = userEvent.setup();
    render(<UnitToggle collapsed={false} />);

    expect(metric()).toHaveAttribute("aria-pressed", "true");
    expect(imperial()).toHaveAttribute("aria-pressed", "false");

    await user.click(imperial());

    expect(metric()).toHaveAttribute("aria-pressed", "false");
    expect(imperial()).toHaveAttribute("aria-pressed", "true");
  });
});
