import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App (smoke)", () => {
  it("renders the app heading", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /oasis/i })).toBeInTheDocument();
  });
});
