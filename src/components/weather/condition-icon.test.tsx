import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConditionIcon } from "./condition-icon";

const cases: Array<{ text: string; isDay: boolean; expected: string }> = [
  { text: "Thunderstorm", isDay: true, expected: "lucide-cloud-lightning" },
  { text: "Light snow", isDay: true, expected: "lucide-cloud-snow" },
  { text: "Mist", isDay: true, expected: "lucide-cloud-fog" },
  { text: "Patchy rain", isDay: true, expected: "lucide-cloud-sun-rain" },
  { text: "Patchy rain", isDay: false, expected: "lucide-cloud-moon-rain" },
  { text: "Light drizzle", isDay: true, expected: "lucide-cloud-drizzle" },
  { text: "Torrential rain shower", isDay: true, expected: "lucide-cloud-rain-wind" },
  { text: "Moderate rain", isDay: true, expected: "lucide-cloud-rain" },
  { text: "Partly cloudy", isDay: true, expected: "lucide-cloud-sun" },
  { text: "Partly cloudy", isDay: false, expected: "lucide-cloud-moon" },
  { text: "Overcast", isDay: true, expected: "lucide-cloud" },
  { text: "Clear", isDay: false, expected: "lucide-moon-star" },
];

describe("ConditionIcon", () => {
  for (const { text, isDay, expected } of cases) {
    it(`${text} (isDay=${isDay}) → ${expected}`, () => {
      const { container } = render(<ConditionIcon text={text} isDay={isDay} />);
      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute("class") ?? "").toContain(expected);
    });
  }
});
